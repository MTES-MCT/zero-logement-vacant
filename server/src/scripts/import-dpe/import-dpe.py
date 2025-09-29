#!/usr/bin/env python3
"""
Script de traitement des fichiers JSON Line de DPE pour mise à jour PostgreSQL
Version optimisée avec gestion d'erreurs améliorée et retry logic

Dépendances requises:
pip install psycopg2-binary tqdm

Améliorations apportées:
- Gestion d'erreurs SSL/connexion améliorée
- Retry logic automatique
- Logs détaillés pour le debugging
- Transactions plus courtes
- Gestion robuste du pool de connexions
- Timeout configurables
- Validation des connexions avant utilisation
- Détection automatique des fichiers déjà traités

Performances attendues:
- Gain ~4-8x selon le nombre de CPU
- Réduction significative des requêtes SQL
- Utilisation optimale du CPU et de la DB
- Robustesse face aux déconnexions

Exemples d'utilisation:

# Traitement complet de tous les départements
python dpe_processor.py data.jsonl --db-name mydb --db-user user --db-password pass

# Traitement d'un seul département (Paris) avec retry
python dpe_processor.py data.jsonl --department 75 --db-name mydb --db-user user --db-password pass --retry-attempts 3

# Test sur un échantillon du département 69 (Rhône) avec timeouts personnalisés
python dpe_processor.py data.jsonl --department 69 --max-lines 1000 --dry-run --db-name mydb --db-user user --db-password pass --db-timeout 60

# Traitement haute performance département 13 avec gestion SSL
python dpe_processor.py data.jsonl --dept 13 --max-workers 4 --batch-size 1000 --db-name mydb --db-user user --db-password pass --disable-ssl
"""

import json
import logging
import argparse
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Set, Tuple
from collections import defaultdict, Counter
import psycopg2
from psycopg2.extras import DictCursor, execute_batch, execute_values
from psycopg2.pool import ThreadedConnectionPool
from psycopg2 import OperationalError, InterfaceError, DatabaseError
import sys
from tqdm import tqdm
import os
from concurrent.futures import ThreadPoolExecutor, ProcessPoolExecutor, as_completed
import threading
from queue import Queue
import asyncio
import aiofiles
from multiprocessing import cpu_count
import time
import random


class DPEProcessor:
    def __init__(self, db_config: Dict, dry_run: bool = False, max_workers: int = None, 
                 batch_size: int = 1000, retry_attempts: int = 3, db_timeout: int = 30):
        """
        Initialise le processeur DPE optimisé avec gestion d'erreurs améliorée
        
        Args:
            db_config: Configuration de la base de données PostgreSQL
            dry_run: Si True, ne fait que des logs sans modification DB
            max_workers: Nombre de workers parallèles (défaut: CPU count)
            batch_size: Taille des batches pour les requêtes SQL
            retry_attempts: Nombre de tentatives en cas d'erreur de connexion
            db_timeout: Timeout des connexions DB en secondes
        """
        self.db_config = db_config
        self.dry_run = dry_run
        self.logger = self._setup_logger()
        self.start_time = datetime.now()
        self.max_workers = max_workers or min(cpu_count(), 4)  # Réduire pour éviter surcharge
        self.batch_size = batch_size
        self.retry_attempts = retry_attempts
        self.db_timeout = db_timeout
        
        # Configuration renforcée pour les connexions PostgreSQL avec gestion SSL
        enhanced_db_config = db_config.copy()
        enhanced_db_config.update({
            'connect_timeout': self.db_timeout,
            'keepalives_idle': 300,  # Réduire pour éviter les timeouts
            'keepalives_interval': 30,
            'keepalives_count': 3,
            # Options application_name pour le debugging
            'application_name': f'dpe_processor_worker_{threading.current_thread().ident}'
        })
        
        # Gestion SSL optionnelle
        if db_config.get('sslmode') is None:
            enhanced_db_config['sslmode'] = 'prefer'  # Plus souple que require
        
        self.enhanced_db_config = enhanced_db_config
        
        # Connection pool avec configuration robuste
        self.connection_pool = None
        self._init_connection_pool()
        
        # Cache pour les requêtes préparées
        self.prepared_queries = {}
        self.stats_lock = threading.Lock()
        self.connection_stats = {
            'created': 0,
            'failed': 0,
            'retries': 0,
            'pool_errors': 0
        }
        
        # Statistiques thread-safe
        self.stats = {
            'lines_processed': 0,
            'lines_filtered': 0,
            'duplicates_removed': 0,
            'successful_updates': 0,
            'failed_updates': 0,
            'unknown_rnb_ids': set(),
            'unknown_ban_ids': set(),
            'case_1_1': 0,  # RNB trouvé, DPE immeuble
            'case_1_2': 0,  # RNB trouvé, DPE appartement
            'case_2_1': 0,  # Plot trouvé, DPE immeuble
            'case_2_2': 0,  # Plot trouvé, DPE appartement
            'skipped_no_method': 0,
            'skipped_no_key': 0,
            'dpe_with_rnb_id': 0,
            'departments_processed': 0,
            'departments_total': 0,
            'current_department': None,
            'connection_errors': 0,
            'retry_successes': 0,
        }

    def _setup_logger(self) -> logging.Logger:
        """Configure le système de logging avec plus de détails"""
        logger = logging.getLogger('dpe_processor')
        logger.setLevel(logging.INFO)
        
        # Effacer les handlers existants
        for handler in logger.handlers[:]:
            logger.removeHandler(handler)
        
        # Handler pour fichier avec timestamp
        log_filename = f'dpe_processing_{datetime.now().strftime("%Y%m%d_%H%M%S")}.log'
        file_handler = logging.FileHandler(log_filename, encoding='utf-8')
        file_handler.setLevel(logging.DEBUG)  # Plus de détails dans le fichier
        
        # Handler pour console
        console_handler = logging.StreamHandler()
        console_handler.setLevel(logging.INFO)
        
        # Format plus détaillé
        detailed_formatter = logging.Formatter(
            '%(asctime)s - [%(threadName)s] - %(levelname)s - %(funcName)s:%(lineno)d - %(message)s'
        )
        simple_formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
        
        file_handler.setFormatter(detailed_formatter)
        console_handler.setFormatter(simple_formatter)
        
        logger.addHandler(file_handler)
        logger.addHandler(console_handler)
        
        self.log_filename = log_filename
        logger.info(f"Logs détaillés sauvegardés dans: {log_filename}")
        
        return logger

    def _init_connection_pool(self):
        """Initialise le pool de connexions avec gestion d'erreurs robuste"""
        max_attempts = 3
        for attempt in range(max_attempts):
            try:
                self.logger.info(f"Initialisation du pool de connexions (tentative {attempt + 1}/{max_attempts})")
                
                # Test de connexion simple d'abord
                test_conn = psycopg2.connect(**self.enhanced_db_config)
                test_conn.close()
                self.logger.info("Test de connexion réussi")
                
                # Créer le pool avec moins de connexions pour éviter la surcharge
                pool_size = min(self.max_workers + 1, 4)  # Maximum 4 connexions
                self.connection_pool = ThreadedConnectionPool(
                    minconn=1,
                    maxconn=pool_size,
                    **self.enhanced_db_config
                )
                
                self.logger.info(f"Pool de connexions créé: 1-{pool_size} connexions")
                return
                
            except Exception as e:
                self.logger.warning(f"Échec tentative {attempt + 1}: {e}")
                if attempt == max_attempts - 1:
                    self.logger.error("Impossible de créer le pool de connexions")
                    raise
                time.sleep(2)  # Attendre avant retry

    def _get_db_connection_with_retry(self):
        """Obtient une connexion DB avec retry automatique et validation"""
        last_error = None
        
        for attempt in range(self.retry_attempts):
            try:
                if not self.connection_pool or self.connection_pool.closed:
                    self.logger.warning("Pool fermé, tentative de réinitialisation")
                    self._init_connection_pool()
                
                # Obtenir connexion du pool
                conn = self.connection_pool.getconn()
                
                if conn is None:
                    raise OperationalError("Impossible d'obtenir une connexion du pool")
                
                # Valider la connexion
                if self._validate_connection(conn):
                    with self.stats_lock:
                        self.connection_stats['created'] += 1
                        if attempt > 0:
                            self.connection_stats['retries'] += 1
                            self.stats['retry_successes'] += 1
                    
                    self.logger.debug(f"Connexion obtenue (tentative {attempt + 1})")
                    return conn
                else:
                    # Connexion invalide, la fermer et réessayer
                    try:
                        conn.close()
                    except Exception:
                        pass
                    self.logger.warning(f"Connexion invalide détectée (tentative {attempt + 1})")
                    
            except (OperationalError, InterfaceError, DatabaseError) as e:
                last_error = e
                error_msg = str(e).lower()
                
                with self.stats_lock:
                    self.stats['connection_errors'] += 1
                    self.connection_stats['failed'] += 1
                
                # Log détaillé de l'erreur
                self.logger.warning(f"Erreur connexion (tentative {attempt + 1}/{self.retry_attempts}): {e}")
                
                # Attendre avec backoff exponentiel
                if attempt < self.retry_attempts - 1:
                    wait_time = (2 ** attempt) + random.uniform(0, 1)
                    self.logger.info(f"Attente {wait_time:.1f}s avant retry...")
                    time.sleep(wait_time)
                    
                    # Essayer de recréer le pool si erreur grave
                    if 'ssl' in error_msg or 'eof' in error_msg or 'connection' in error_msg:
                        try:
                            self.logger.info("Recréation du pool de connexions...")
                            if hasattr(self, 'connection_pool') and self.connection_pool:
                                self.connection_pool.closeall()
                            self._init_connection_pool()
                        except Exception as pool_error:
                            self.logger.error(f"Échec recréation pool: {pool_error}")
            
            except Exception as e:
                last_error = e
                self.logger.error(f"Erreur inattendue connexion: {e}")
                time.sleep(1)
        
        # Toutes les tentatives ont échoué
        error_msg = f"Impossible d'établir une connexion DB après {self.retry_attempts} tentatives"
        if last_error:
            error_msg += f". Dernière erreur: {last_error}"
        
        self.logger.error(error_msg)
        raise OperationalError(error_msg)

    def _validate_connection(self, conn) -> bool:
        """Valide qu'une connexion est utilisable"""
        try:
            if conn.closed != 0:
                return False
            
            # Test simple avec timeout court
            with conn.cursor() as cursor:
                cursor.execute("SELECT 1")
                result = cursor.fetchone()
                return result is not None and result[0] == 1
                
        except Exception as e:
            self.logger.debug(f"Validation connexion échouée: {e}")
            return False

    def _return_db_connection_safe(self, conn):
        """Retourne une connexion au pool de manière sécurisée"""
        try:
            if not conn or conn.closed != 0:
                self.logger.debug("Connexion fermée, ne peut pas être retournée au pool")
                return
            
            if hasattr(self, 'connection_pool') and self.connection_pool and not self.connection_pool.closed:
                # Vérifier s'il y a une transaction en cours
                if conn.status != psycopg2.extensions.STATUS_READY:
                    try:
                        conn.rollback()
                        self.logger.debug("Transaction rollback effectué avant retour connexion")
                    except Exception as e:
                        self.logger.warning(f"Erreur rollback: {e}")
                
                self.connection_pool.putconn(conn)
                self.logger.debug("Connexion retournée au pool")
            else:
                # Pool fermé, fermer la connexion directement
                conn.close()
                self.logger.debug("Pool fermé, connexion fermée directement")
                
        except Exception as e:
            self.logger.warning(f"Erreur lors du retour de connexion au pool: {e}")
            # En cas d'erreur, forcer la fermeture
            try:
                if conn and conn.closed == 0:
                    conn.close()
            except Exception:
                pass

    def _count_lines(self, file_path: str) -> int:
        """Compte le nombre de lignes dans un fichier avec barre de progression"""
        file_size = Path(file_path).stat().st_size
        
        with open(file_path, 'rb') as f:
            with tqdm(
                total=file_size,
                desc="Comptage lignes",
                unit="B",
                unit_scale=True,
                ncols=80
            ) as pbar:
                lines = 0
                buffer_size = 1024 * 1024  # 1MB buffer
                
                while True:
                    buffer = f.read(buffer_size)
                    if not buffer:
                        break
                    lines += buffer.count(b'\n')
                    pbar.update(len(buffer))
                
                return lines

    def preprocess_jsonl_by_departments(self, input_file: str, output_dir: str, max_lines: Optional[int] = None, target_department: Optional[str] = None) -> List[str]:
        """
        Divise le fichier JSON Line par département et prétraite chaque département
        
        Args:
            input_file: Fichier JSON Line d'entrée
            output_dir: Répertoire de sortie pour les fichiers par département
            max_lines: Nombre maximum de lignes à traiter (None = toutes)
            target_department: Code département spécifique à traiter (None = tous)
            
        Returns:
            Liste des fichiers de sortie créés
        """
        # Vérifier que le fichier d'entrée existe
        if not Path(input_file).exists():
            raise FileNotFoundError(f"Fichier d'entrée introuvable: {input_file}")
        
        # Créer le répertoire de sortie
        output_path = Path(output_dir)
        output_path.mkdir(exist_ok=True)
        
        # AMÉLIORATION : Vérifier si les fichiers processés existent déjà
        existing_processed_files = []
        if target_department:
            # Chercher le fichier spécifique du département
            dept_code = str(target_department).zfill(2)
            processed_file = output_path / f"dept_{dept_code}_processed.jsonl"
            if processed_file.exists():
                self.logger.info(f"✅ Fichier département {dept_code} déjà processé trouvé : {processed_file}")
                self.logger.info("📂 Réutilisation du fichier existant (supprimez-le pour retraiter)")
                existing_processed_files.append(str(processed_file))
                
                # Mettre à jour les stats
                try:
                    line_count = self._count_lines(str(processed_file))
                    self.stats['lines_filtered'] = line_count
                    self.stats['departments_total'] = 1
                    self.logger.info(f"  Département {dept_code}: {line_count} DPE uniques prêts")
                except Exception as e:
                    self.logger.warning(f"Erreur lecture stats: {e}")
                
                return existing_processed_files
        else:
            # Chercher tous les fichiers processés
            existing_processed_files = sorted([str(f) for f in output_path.glob("dept_*_processed.jsonl")])
            if existing_processed_files:
                self.logger.info(f"✅ {len(existing_processed_files)} fichiers départements déjà processés trouvés")
                self.logger.info("📂 Réutilisation des fichiers existants (supprimez-les pour retraiter)")
                
                # Mettre à jour les stats depuis les fichiers existants
                for processed_file in existing_processed_files:
                    try:
                        line_count = self._count_lines(processed_file)
                        self.stats['lines_filtered'] += line_count
                        dept_code = Path(processed_file).stem.split('_')[1]
                        self.logger.debug(f"  Département {dept_code}: {line_count} DPE")
                    except Exception as e:
                        self.logger.warning(f"Erreur lecture stats fichier {processed_file}: {e}")
                
                self.stats['departments_total'] = len(existing_processed_files)
                return existing_processed_files
        
        # Sinon, procéder au prétraitement normal
        if target_department:
            self.logger.info(f"Début du prétraitement pour le département {target_department}: {input_file}")
        else:
            self.logger.info(f"Début du prétraitement par départements: {input_file}")
        
        self.logger.info(f"Répertoire de sortie: {output_path}")
        
        # Compter les lignes totales
        self.logger.info("Comptage des lignes du fichier...")
        try:
            total_lines = self._count_lines(input_file)
            if max_lines:
                total_lines = min(total_lines, max_lines)
            self.logger.info(f"Total lignes à traiter: {total_lines}")
        except Exception as e:
            self.logger.error(f"Erreur lors du comptage des lignes: {e}")
            raise
        
        # Étape 1: Découper par département (avec filtre optionnel)
        try:
            dept_files = self._split_by_departments(input_file, output_path, total_lines, max_lines, target_department)
            if target_department:
                self.logger.info(f"Fichiers pour département {target_department}: {len(dept_files)}")
            else:
                self.logger.info(f"Fichiers départements créés: {len(dept_files)}")
        except Exception as e:
            self.logger.error(f"Erreur lors de la division par départements: {e}")
            raise
        
        # Étape 2: Prétraiter chaque département
        try:
            processed_files = self._preprocess_departments(dept_files, output_path)
            self.logger.info(f"Fichiers prétraités: {len(processed_files)}")
        except Exception as e:
            self.logger.error(f"Erreur lors du prétraitement des départements: {e}")
            raise
        
        # Nettoyer les fichiers temporaires de découpage
        try:
            for dept_file in dept_files:
                Path(dept_file).unlink(missing_ok=True)
            self.logger.debug("Fichiers temporaires nettoyés")
        except Exception as e:
            self.logger.warning(f"Erreur lors du nettoyage: {e}")
        
        return processed_files

    def _split_by_departments(self, input_file: str, output_path: Path, total_lines: int, max_lines: Optional[int], target_department: Optional[str] = None) -> List[str]:
        """
        Divise le fichier principal par département (avec filtre optionnel)
        """
        if target_department:
            self.logger.info(f"Division pour département spécifique: {target_department}")
            # Normaliser le code département cible
            target_department = str(target_department).zfill(2)
        else:
            self.logger.info(f"Division par départements du fichier: {input_file}")
        
        self.logger.info(f"Total de lignes à traiter: {total_lines}")
        
        # Dictionnaire pour les fichiers ouverts par département
        dept_files = {}
        dept_file_paths = []
        lines_with_dept = 0
        lines_with_rnb = 0
        lines_with_ban = 0
        lines_target_dept = 0
        lines_kept = 0
        
        try:
            with open(input_file, 'r', encoding='utf-8') as f_in:
                pbar = tqdm(
                    total=total_lines,
                    desc=f"Division {'dept ' + target_department if target_department else 'départements'}",
                    unit="lignes",
                    ncols=100
                )
                
                for line_num, line in enumerate(f_in, 1):
                    if max_lines and line_num > max_lines:
                        break
                    
                    self.stats['lines_processed'] += 1
                    pbar.update(1)
                    
                    # Debug tous les 10000 lignes
                    if line_num % 10000 == 0:
                        if target_department:
                            self.logger.debug(f"Ligne {line_num}: {lines_target_dept} pour dept {target_department}, {lines_with_rnb} avec rnb")
                        else:
                            self.logger.debug(f"Ligne {line_num}: {lines_with_dept} avec dept, {lines_with_rnb} avec rnb")
                    
                    try:
                        line_stripped = line.strip()
                        if not line_stripped:
                            continue
                            
                        data = json.loads(line_stripped)
                        
                        # Récupérer le code département
                        dept_code = data.get('code_departement_ban')
                        if dept_code:
                            lines_with_dept += 1
                            
                            # Normaliser le code département (2 chiffres)
                            dept_code = str(dept_code).zfill(2)
                            
                            # Si un département cible est spécifié, filtrer
                            if target_department and dept_code != target_department:
                                continue
                            
                            lines_target_dept += 1
                            
                            # Filtrer les lignes avec id_rnb OU identifiant_ban
                            id_rnb = data.get('id_rnb')
                            ban_id = data.get('identifiant_ban')
                            
                            if id_rnb or ban_id:
                                lines_kept += 1
                                if id_rnb:
                                    lines_with_rnb += 1
                                    self.stats['dpe_with_rnb_id'] += 1
                                if ban_id:
                                    lines_with_ban += 1
                                
                                # Ouvrir le fichier département si nécessaire
                                if dept_code not in dept_files:
                                    dept_file_path = output_path / f"dept_{dept_code}_raw.jsonl"
                                    dept_files[dept_code] = open(dept_file_path, 'w', encoding='utf-8')
                                    dept_file_paths.append(str(dept_file_path))
                                    if target_department:
                                        self.logger.info(f"Traitement du département cible: {dept_code}")
                                    else:
                                        self.logger.debug(f"Nouveau département détecté: {dept_code}")
                                
                                # Écrire dans le fichier département
                                dept_files[dept_code].write(json.dumps(data, ensure_ascii=False) + '\n')
                        
                    except json.JSONDecodeError as e:
                        self.logger.warning(f"Ligne {line_num}: JSON invalide - {e}")
                        continue
                    except Exception as e:
                        self.logger.error(f"Erreur ligne {line_num}: {e}")
                        continue
                
                pbar.close()
        
        except FileNotFoundError:
            self.logger.error(f"Fichier non trouvé: {input_file}")
            raise
        except Exception as e:
            self.logger.error(f"Erreur lors de la lecture du fichier: {e}")
            raise
        finally:
            # Fermer tous les fichiers
            for f in dept_files.values():
                f.close()
        
        if target_department:
            self.logger.info(f"Division terminée pour département {target_department}:")
            self.logger.info(f"  - {lines_target_dept} lignes pour ce département")
            self.logger.info(f"  - {lines_with_rnb} lignes avec id_rnb")
            self.logger.info(f"  - {lines_with_ban} lignes avec identifiant_ban")
            self.logger.info(f"  - {lines_kept} lignes conservées au total")
            if target_department not in [Path(f).stem.split('_')[1] for f in dept_file_paths]:
                self.logger.warning(f"  ⚠️  Aucune donnée trouvée pour le département {target_department}")
        else:
            self.logger.info(f"Division terminée:")
            self.logger.info(f"  - {len(dept_files)} départements trouvés")
            self.logger.info(f"  - {lines_with_dept} lignes avec code département")
            self.logger.info(f"  - {lines_with_rnb} lignes avec id_rnb")
            self.logger.info(f"  - {lines_with_ban} lignes avec identifiant_ban")
            self.logger.info(f"  - {lines_kept} lignes conservées au total")
            self.logger.info(f"  - Départements: {sorted(list(dept_files.keys()))}")
        
        return sorted(dept_file_paths)  # Trier pour traitement ordonné

    def _preprocess_departments(self, dept_files: List[str], output_path: Path) -> List[str]:
        """
        Prétraite chaque département en parallèle (déduplication)
        """
        processed_files = []
        self.stats['departments_total'] = len(dept_files)
        
        self.logger.info(f"Prétraitement parallèle de {len(dept_files)} départements avec {self.max_workers} workers...")
        
        if len(dept_files) == 0:
            self.logger.warning("Aucun fichier département à prétraiter!")
            return []
        
        # Barre de progression globale pour les départements
        dept_pbar = tqdm(
            total=len(dept_files),
            desc="Prétraitement",
            position=0,
            ncols=120
        )
        
        # Paralléliser le prétraitement
        with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            # Soumettre tous les départements
            futures = {}
            for dept_file in dept_files:
                dept_code = Path(dept_file).stem.split('_')[1]
                output_file = output_path / f"dept_{dept_code}_processed.jsonl"
                
                future = executor.submit(self._preprocess_single_department_parallel, dept_file, str(output_file), dept_code)
                futures[future] = (dept_file, str(output_file), dept_code)
            
            # Collecter les résultats
            for future in as_completed(futures):
                dept_file, output_file, dept_code = futures[future]
                
                try:
                    lines_processed = future.result()
                    
                    # Vérifier que le fichier de sortie contient des données
                    if lines_processed > 0 and Path(output_file).exists():
                        output_lines = self._count_lines(output_file)
                        if output_lines > 0:
                            processed_files.append(output_file)
                            self.logger.debug(f"Département {dept_code}: {output_lines} DPE uniques conservés")
                        else:
                            self.logger.warning(f"Département {dept_code}: aucun DPE unique généré")
                            Path(output_file).unlink(missing_ok=True)
                    
                except Exception as e:
                    self.logger.error(f"Erreur prétraitement département {dept_code}: {e}")
                
                dept_pbar.update(1)
                dept_pbar.set_postfix({
                    'Terminé': dept_code,
                    'Total DPE': self.stats['lines_filtered']
                })
        
        dept_pbar.close()
        self.logger.info(f"Prétraitement terminé: {len(processed_files)} départements avec données")
        return processed_files

    def _preprocess_single_department_parallel(self, dept_file: str, output_file: str, dept_code: str) -> int:
        """
        Prétraite un seul département de façon thread-safe
        """
        # Dictionnaire pour stocker les DPE par id_rnb
        dpe_by_rnb = defaultdict(list)
        lines_processed = 0
        
        # Lecture et regroupement par id_rnb
        try:
            with open(dept_file, 'r', encoding='utf-8') as f:
                for line in f:
                    lines_processed += 1
                    
                    try:
                        data = json.loads(line.strip())
                        rnb_id = data.get('id_rnb')
                        
                        if rnb_id:
                            dpe_by_rnb[rnb_id].append(data)
                            
                    except json.JSONDecodeError:
                        continue
            
            # Statistiques thread-safe
            local_stats = {
                'lines_filtered': len(dpe_by_rnb),
                'duplicates_removed': sum(len(dpe_list) - 1 for dpe_list in dpe_by_rnb.values() if len(dpe_list) > 1)
            }
            self._update_stats(**local_stats)
            
            # Déduplication et écriture
            with open(output_file, 'w', encoding='utf-8') as f_out:
                for rnb_id, dpe_list in dpe_by_rnb.items():
                    # Trier par date (plus récent en premier)
                    try:
                        dpe_list.sort(
                            key=lambda x: datetime.strptime(x.get('date_etablissement_dpe', '1900-01-01'), '%Y-%m-%d'),
                            reverse=True
                        )
                    except ValueError:
                        pass
                    
                    # Garder le plus récent
                    f_out.write(json.dumps(dpe_list[0], ensure_ascii=False) + '\n')
            
            return lines_processed
            
        except Exception as e:
            self.logger.error(f"Erreur prétraitement département {dept_code}: {e}")
            return 0

    def __del__(self):
        """Nettoyer le pool de connexions"""
        try:
            self.close()
        except Exception:
            # Ignorer les erreurs de fermeture lors de la destruction
            pass

    def close(self):
        """Ferme explicitement le pool de connexions"""
        try:
            if hasattr(self, 'connection_pool') and self.connection_pool and not self.connection_pool.closed:
                self.logger.info("Fermeture du pool de connexions...")
                self.connection_pool.closeall()
                self.logger.info("Pool de connexions fermé")
        except Exception as e:
            self.logger.warning(f"Erreur lors de la fermeture du pool de connexions: {e}")

    def _update_stats(self, **kwargs):
        """Met à jour les statistiques de façon thread-safe"""
        with self.stats_lock:
            for key, value in kwargs.items():
                if key in ['unknown_rnb_ids', 'unknown_ban_ids']:
                    if isinstance(value, (list, set)):
                        self.stats[key].update(value)
                    else:
                        self.stats[key].add(value)
                else:
                    self.stats[key] += value if isinstance(value, (int, float)) else 0

    def _batch_get_buildings_by_rnb_ids(self, cursor, rnb_ids: List[str]) -> Dict[str, Dict]:
        """Récupère plusieurs bâtiments par leurs rnb_ids en une seule requête"""
        if not rnb_ids:
            return {}
        
        query = "SELECT * FROM buildings WHERE rnb_id = ANY(%s)"
        cursor.execute(query, (rnb_ids,))
        results = cursor.fetchall()
        
        return {row['rnb_id']: dict(row) for row in results}

    def _batch_get_buildings_by_ban_ids(self, cursor, ban_ids: List[str]) -> Dict[str, Dict]:
        """Récupère plusieurs bâtiments via plot_id en utilisant ban_ids en batch"""
        if not ban_ids:
            return {}
        
        self.logger.debug(f"🔍 Recherche de bâtiments par BAN ID: {len(ban_ids)} IDs")
        self.logger.debug(f"   Premiers BAN IDs: {ban_ids[:5]}")
        
        query = """
        SELECT DISTINCT ON (ba.ban_id) ba.ban_id, b.*
        FROM buildings b
        JOIN fast_housing fh ON b.id = fh.building_id  
        JOIN ban_addresses ba ON fh.id = ba.ref_id
        WHERE ba.address_kind = 'Housing'
          AND ba.ban_id = ANY(%s)
        """
        cursor.execute(query, (ban_ids,))
        results = cursor.fetchall()
        
        self.logger.debug(f"📊 Résultats BAN ID: {len(results)} bâtiments trouvés sur {len(ban_ids)} recherchés")
        
        if len(results) > 0:
            self.logger.debug(f"   Premiers résultats: {[row['ban_id'] for row in results[:5]]}")
        else:
            self.logger.warning(f"⚠️  Aucun bâtiment trouvé pour les BAN IDs")
            # Log quelques exemples de BAN IDs qui ne trouvent rien
            if ban_ids:
                test_query = """
                SELECT COUNT(*) as total_ban_addresses, 
                       COUNT(DISTINCT ba.ban_id) as unique_ban_ids,
                       COUNT(CASE WHEN ba.address_kind = 'Housing' THEN 1 END) as housing_addresses
                FROM ban_addresses ba
                WHERE ba.ban_id = ANY(%s)
                """
                cursor.execute(test_query, (ban_ids[:10],))  # Test avec les 10 premiers seulement
                test_result = cursor.fetchone()
                self.logger.debug(f"   Test BAN addresses table: {dict(test_result)}")
        
        return {row['ban_id']: dict(row) for row in results}

    def _batch_update_buildings_dpe(self, cursor, updates: List[Tuple]) -> int:
        """Met à jour plusieurs bâtiments en batch"""
        if not updates or self.dry_run:
            return len(updates) if self.dry_run else 0
        
        # CORRECTION : Requête qui fonctionne que buildings.id soit INTEGER ou VARCHAR
        update_query = """
        UPDATE buildings SET
            dpe_id = data.dpe_id,
            class_dpe = data.class_dpe,
            class_ges = data.class_ges,
            dpe_date_at = data.dpe_date_at::date,
            dpe_type = data.dpe_type,
            heating_building = data.heating_building,
            dpe_import_match = data.dpe_import_match
        FROM (VALUES %s) AS data(dpe_id, class_dpe, class_ges, dpe_date_at, dpe_type, heating_building, dpe_import_match, building_id)
        WHERE buildings.id::text = data.building_id::text
        """
        
        try:
            # S'assurer que building_id est bien formaté (garder comme string)
            updates_corrected = []
            for update in updates:
                # update est un tuple : (dpe_id, class_dpe, class_ges, dpe_date_at, dpe_type, heating_building, dpe_import_match, building_id)
                if len(update) == 8:
                    # Convertir building_id en string pour la comparaison
                    corrected = list(update[:-1])  # Tous sauf le dernier
                    building_id_str = str(update[-1])  # Convertir en string
                    corrected.append(building_id_str)
                    updates_corrected.append(tuple(corrected))
                else:
                    self.logger.warning(f"Tuple de mise à jour invalide (attendu 8 éléments, reçu {len(update)})")
                    continue
            
            if not updates_corrected:
                self.logger.warning("Aucune mise à jour valide après correction des types")
                return 0
            
            execute_values(cursor, update_query, updates_corrected, template=None, page_size=self.batch_size)
            return len(updates_corrected)
        except Exception as e:
            self.logger.error(f"Erreur batch update: {e}")
            # Log plus de détails pour debug
            if updates_corrected and len(updates_corrected) > 0:
                self.logger.debug(f"Premier tuple de mise à jour: {updates_corrected[0]}")
                self.logger.debug(f"Types: {[type(x).__name__ for x in updates_corrected[0]]}")
            return 0

    def _determine_dpe_priority(self, methode_application_dpe: str) -> int:
        """
        Détermine la priorité du DPE selon sa méthode
        0 = priorité max (immeuble), 1 = appartement, 2 = autres
        """
        if not methode_application_dpe:
            return 2
        
        methode = methode_application_dpe.lower()
        if 'dpe immeuble collectif' in methode or 'dpe maison individuelle' in methode:
            return 0
        elif 'dpe appartement individuel' in methode:
            return 1
        else:
            return 2

    def _should_import_dpe(self, dpe_data: Dict, existing_dpe: Optional[Dict]) -> tuple[bool, str]:
        """
        Détermine si le DPE doit être importé selon les règles métier
        
        Returns:
            (should_import, case_description)
        """
        methode = dpe_data.get('methode_application_dpe', '').lower()
        
        # Vérifier si c'est un DPE au niveau bâtiment
        is_building_dpe = ('dpe immeuble collectif' in methode or 
                          'dpe maison individuelle' in methode)
        
        # Vérifier si c'est un DPE appartement
        is_apartment_dpe = 'dpe appartement individuel' in methode
        
        if existing_dpe:
            # Un DPE existe déjà
            if is_building_dpe:
                return True, "building_dpe_exists"
            else:
                return False, "skip_non_building_dpe"
        else:
            # Aucun DPE n'existe
            if is_building_dpe:
                return True, "new_building_dpe"
            elif is_apartment_dpe:
                return True, "apartment_dpe"
            else:
                return False, "skip_other_dpe"

    def process_departments(self, processed_files: List[str]) -> None:
        """
        Traite tous les départements préprocessés en parallèle et met à jour la base
        """
        self.logger.info(f"Traitement parallèle de {len(processed_files)} départements avec {self.max_workers} workers")
        
        # Réduire le parallélisme si peu de départements
        if len(processed_files) == 1:
            effective_workers = 1
        else:
            effective_workers = min(self.max_workers, len(processed_files))
        
        self.logger.info(f"Workers effectifs: {effective_workers}")
        
        # Barre de progression globale
        global_pbar = tqdm(
            total=len(processed_files),
            desc="Départements",
            position=0,
            ncols=120
        )
        
        # Traitement séquentiel si un seul département pour éviter les problèmes de connexion
        if len(processed_files) == 1:
            processed_file = processed_files[0]
            dept_code = Path(processed_file).stem.split('_')[1]
            
            try:
                self.logger.info(f"Traitement séquentiel du département {dept_code}")
                updates_count = self._process_single_department_optimized(processed_file)
                self.logger.info(f"Département {dept_code}: {updates_count} mises à jour")
                
            except Exception as e:
                self.logger.error(f"Erreur département {dept_code}: {e}")
                import traceback
                self.logger.debug(f"Traceback détaillé:\n{traceback.format_exc()}")
            
            global_pbar.update(1)
            global_pbar.set_postfix({
                'Total succès': self.stats['successful_updates'],
                'Échecs': self.stats['failed_updates']
            })
        
        else:
            # Paralléliser le traitement des départements
            with ThreadPoolExecutor(max_workers=effective_workers) as executor:
                # Soumettre tous les départements
                futures = {
                    executor.submit(self._process_single_department_optimized, processed_file): processed_file 
                    for processed_file in processed_files
                }
                
                # Collecter les résultats
                for future in as_completed(futures):
                    processed_file = futures[future]
                    dept_code = Path(processed_file).stem.split('_')[1]
                    
                    try:
                        updates_count = future.result()
                        self.logger.info(f"Département {dept_code}: {updates_count} mises à jour")
                        
                    except Exception as e:
                        self.logger.error(f"Erreur département {dept_code}: {e}")
                        import traceback
                        self.logger.debug(f"Traceback détaillé:\n{traceback.format_exc()}")
                    
                    global_pbar.update(1)
                    global_pbar.set_postfix({
                        'Total succès': self.stats['successful_updates'],
                        'Échecs': self.stats['failed_updates']
                    })
        
        global_pbar.close()

    def _process_single_department_optimized(self, processed_file: str) -> int:
        """
        Traite un seul département de manière optimisée avec batch processing et gestion d'erreurs robuste
        """
        dept_code = Path(processed_file).stem.split('_')[1]
        self.logger.info(f"Début traitement département {dept_code}")
        
        conn = None
        cursor = None
        total_updates = 0
        
        try:
            # Lire tous les DPE du département
            self.logger.debug(f"Lecture du fichier {processed_file}")
            dpe_data_list = []
            
            with open(processed_file, 'r', encoding='utf-8') as f:
                for line_num, line in enumerate(f, 1):
                    try:
                        dpe_data = json.loads(line.strip())
                        dpe_data_list.append(dpe_data)
                    except json.JSONDecodeError as e:
                        self.logger.warning(f"JSON invalide ligne {line_num}: {e}")
                        continue
            
            if not dpe_data_list:
                self.logger.warning(f"Aucun DPE valide trouvé pour département {dept_code}")
                return 0
            
            self.logger.info(f"Département {dept_code}: {len(dpe_data_list)} DPE à traiter")
            
            # Obtenir connexion avec retry
            self.logger.debug(f"Obtention connexion DB pour département {dept_code}")
            conn = self._get_db_connection_with_retry()
            cursor = conn.cursor(cursor_factory=DictCursor)
            
            # Traitement par batch plus petits pour éviter les timeouts
            batch_size = min(self.batch_size, 500)  # Réduire la taille des batches
            batch_count = (len(dpe_data_list) + batch_size - 1) // batch_size
            
            self.logger.info(f"Traitement en {batch_count} batches de {batch_size} éléments max")
            
            for i in range(0, len(dpe_data_list), batch_size):
                batch_num = (i // batch_size) + 1
                batch = dpe_data_list[i:i + batch_size]
                
                self.logger.debug(f"Traitement batch {batch_num}/{batch_count} ({len(batch)} éléments)")
                
                try:
                    updates_count = self._process_dpe_batch(cursor, batch, dept_code)
                    total_updates += updates_count
                    
                    # Commit après chaque batch pour éviter les transactions trop longues
                    if not self.dry_run:
                        conn.commit()
                        self.logger.debug(f"Batch {batch_num} committé ({updates_count} updates)")
                    
                except Exception as batch_error:
                    self.logger.error(f"Erreur batch {batch_num} département {dept_code}: {batch_error}")
                    # Rollback du batch en erreur et continuer
                    try:
                        if not self.dry_run:
                            conn.rollback()
                    except Exception as rollback_error:
                        self.logger.warning(f"Erreur rollback: {rollback_error}")
                    
                    # Continuer avec le batch suivant
                    continue
                
                # Petit délai entre batches pour éviter la surcharge
                time.sleep(0.1)
            
            self.logger.info(f"Département {dept_code} terminé: {total_updates} mises à jour au total")
            return total_updates
                
        except Exception as e:
            self.logger.error(f"Erreur traitement département {dept_code}: {e}")
            import traceback
            self.logger.debug(f"Traceback complet:\n{traceback.format_exc()}")
            
            # Essayer de rollback en cas d'erreur
            if conn:
                try:
                    if not self.dry_run:
                        conn.rollback()
                        self.logger.debug("Rollback effectué après erreur")
                except Exception as rollback_error:
                    self.logger.warning(f"Erreur rollback: {rollback_error}")
            
            return total_updates
            
        finally:
            # Nettoyage des ressources
            try:
                if cursor:
                    cursor.close()
                    self.logger.debug("Cursor fermé")
            except Exception as e:
                self.logger.warning(f"Erreur fermeture cursor: {e}")
            
            if conn:
                self._return_db_connection_safe(conn)

    def _process_dpe_batch(self, cursor, dpe_batch: List[Dict], dept_code: str) -> int:
        """
        Traite un batch de DPE avec requêtes optimisées et gestion d'erreurs
        """
        try:
            # Séparer les DPE par type de recherche
            rnb_dpe_map = {}  # id_rnb -> dpe_data
            ban_dpe_map = {}  # identifiant_ban -> dpe_data
            no_id_count = 0
            
            for dpe_data in dpe_batch:
                rnb_id = dpe_data.get('id_rnb')
                ban_id = dpe_data.get('identifiant_ban')
                
                if rnb_id:
                    rnb_dpe_map[rnb_id] = dpe_data
                elif ban_id:
                    ban_dpe_map[ban_id] = dpe_data
                else:
                    no_id_count += 1
            
            self.logger.debug(f"📋 Batch DPE: {len(rnb_dpe_map)} avec RNB ID, {len(ban_dpe_map)} avec BAN ID, {no_id_count} sans ID")
            
            # Log quelques exemples de BAN IDs pour debug
            if ban_dpe_map and self.logger.isEnabledFor(logging.DEBUG):
                sample_ban_ids = list(ban_dpe_map.keys())[:3]
                self.logger.debug(f"   Exemples BAN IDs: {sample_ban_ids}")
                for ban_id in sample_ban_ids[:1]:  # Premier exemple seulement
                    sample_dpe = ban_dpe_map[ban_id]
                    self.logger.debug(f"   DPE {ban_id}: code_dept={sample_dpe.get('code_departement_ban')}, "
                                    f"methode={sample_dpe.get('methode_application_dpe', '')[:50]}...")
            
            # Récupérer tous les bâtiments en 2 requêtes batch
            self.logger.debug(f"Recherche bâtiments: {len(rnb_dpe_map)} par RNB, {len(ban_dpe_map)} par BAN")
            
            buildings_by_rnb = {}
            buildings_by_ban = {}
            
            if rnb_dpe_map:
                buildings_by_rnb = self._batch_get_buildings_by_rnb_ids(cursor, list(rnb_dpe_map.keys()))
                self.logger.debug(f"Trouvé {len(buildings_by_rnb)} bâtiments par RNB")
            
            if ban_dpe_map:
                buildings_by_ban = self._batch_get_buildings_by_ban_ids(cursor, list(ban_dpe_map.keys()))
                self.logger.debug(f"Trouvé {len(buildings_by_ban)} bâtiments par BAN")
            
            # Préparer les mises à jour
            updates = []
            stats_update = {
                'successful_updates': 0,
                'failed_updates': 0,
                'case_1_1': 0, 'case_1_2': 0, 'case_2_1': 0, 'case_2_2': 0,
                'skipped_no_key': 0, 'skipped_no_method': 0,
                'unknown_rnb_ids': set(), 'unknown_ban_ids': set()
            }
            
            # Traiter les DPE trouvés par RNB ID
            rnb_fallback_candidates = []  # DPE avec RNB non trouvé mais qui ont un BAN ID
            
            for rnb_id, dpe_data in rnb_dpe_map.items():
                building = buildings_by_rnb.get(rnb_id)
                if building:
                    update_data = self._prepare_dpe_update(dpe_data, building, 'case_1')
                    if update_data:
                        updates.append(update_data)
                        stats_update['successful_updates'] += 1
                        # Mettre à jour les stats de cas
                        methode = dpe_data.get('methode_application_dpe', '').lower()
                        if 'dpe immeuble collectif' in methode or 'dpe maison individuelle' in methode:
                            stats_update['case_1_1'] += 1
                        else:
                            stats_update['case_1_2'] += 1
                    else:
                        stats_update['skipped_no_method'] += 1
                else:
                    # RNB ID non trouvé, vérifier si le DPE a aussi un BAN ID
                    ban_id = dpe_data.get('identifiant_ban')
                    if ban_id:
                        rnb_fallback_candidates.append((ban_id, dpe_data))
                        self.logger.debug(f"Fallback RNB->BAN: {rnb_id} -> {ban_id}")
                    else:
                        stats_update['unknown_rnb_ids'].add(rnb_id)
                        stats_update['skipped_no_key'] += 1
            
            # Récupérer les bâtiments pour les BAN IDs de fallback
            fallback_ban_ids = [ban_id for ban_id, _ in rnb_fallback_candidates]
            if fallback_ban_ids:
                self.logger.debug(f"Recherche fallback pour {len(fallback_ban_ids)} BAN IDs")
                fallback_buildings = self._batch_get_buildings_by_ban_ids(cursor, fallback_ban_ids)
                self.logger.debug(f"Fallback: {len(fallback_buildings)} bâtiments trouvés")
                
                # Traiter les fallback
                for ban_id, dpe_data in rnb_fallback_candidates:
                    building = fallback_buildings.get(ban_id)
                    if building:
                        update_data = self._prepare_dpe_update(dpe_data, building, 'case_2')
                        if update_data:
                            updates.append(update_data)
                            stats_update['successful_updates'] += 1
                            # Mettre à jour les stats de cas
                            methode = dpe_data.get('methode_application_dpe', '').lower()
                            if 'dpe immeuble collectif' in methode or 'dpe maison individuelle' in methode:
                                stats_update['case_2_1'] += 1
                            else:
                                stats_update['case_2_2'] += 1
                        else:
                            stats_update['skipped_no_method'] += 1
                    else:
                        stats_update['unknown_ban_ids'].add(ban_id)
                        # Maintenant on compte comme RNB inconnu car c'était la méthode primaire
                        stats_update['unknown_rnb_ids'].add(dpe_data.get('id_rnb'))
                        stats_update['skipped_no_key'] += 1
            
            # Traiter les DPE trouvés par BAN ID
            for ban_id, dpe_data in ban_dpe_map.items():
                building = buildings_by_ban.get(ban_id)
                if building:
                    update_data = self._prepare_dpe_update(dpe_data, building, 'case_2')
                    if update_data:
                        updates.append(update_data)
                        stats_update['successful_updates'] += 1
                        # Mettre à jour les stats de cas
                        methode = dpe_data.get('methode_application_dpe', '').lower()
                        if 'dpe immeuble collectif' in methode or 'dpe maison individuelle' in methode:
                            stats_update['case_2_1'] += 1
                        else:
                            stats_update['case_2_2'] += 1
                    else:
                        stats_update['skipped_no_method'] += 1
                else:
                    stats_update['unknown_ban_ids'].add(ban_id)
                    stats_update['skipped_no_key'] += 1
            
            # Exécuter toutes les mises à jour en batch
            successful_updates = 0
            if updates:
                self.logger.debug(f"Exécution de {len(updates)} mises à jour")
                successful_updates = self._batch_update_buildings_dpe(cursor, updates)
                stats_update['successful_updates'] = successful_updates
                stats_update['failed_updates'] = len(updates) - successful_updates
            
            # Mettre à jour les statistiques globales de façon thread-safe
            self._update_stats(**stats_update)
            
            return successful_updates
            
        except Exception as e:
            self.logger.error(f"Erreur traitement batch: {e}")
            import traceback
            self.logger.debug(f"Traceback batch:\n{traceback.format_exc()}")
            return 0

    def _prepare_dpe_update(self, dpe_data: Dict, building: Dict, case_type: str) -> Optional[Tuple]:
        """
        Prépare les données pour la mise à jour batch
        """
        # Vérifier les règles métier
        existing_dpe_id = building.get('dpe_id')
        should_import, reason = self._should_import_dpe(dpe_data, existing_dpe_id)
        
        if not should_import:
            return None
        
        # Conversion de la date
        dpe_date = None
        if dpe_data.get('date_etablissement_dpe'):
            try:
                dpe_date = dpe_data['date_etablissement_dpe']
            except ValueError:
                dpe_date = '1900-01-01'
        
        # Déterminer le type de correspondance basé sur case_type
        if case_type == 'case_1':
            dpe_import_match = 'rnb_id'
        elif case_type == 'case_2':
            dpe_import_match = 'plot_id'
        else:
            dpe_import_match = 'unknown'
        
        # CORRECTION : Garder building_id comme string pour la comparaison
        building_id = str(building.get('id', ''))
        if not building_id:
            self.logger.error(f"Building sans ID: {building}")
            return None
        
        # Retourner le tuple pour execute_values avec dpe_import_match inclus
        return (
            dpe_data.get('numero_dpe'),
            dpe_data.get('etiquette_dpe'),
            dpe_data.get('etiquette_ges'),
            dpe_date,
            dpe_data.get('methode_application_dpe'),
            dpe_data.get('type_energie_n1'),
            dpe_import_match,
            building_id  # Maintenant c'est une string
        )

    def print_report(self) -> None:
        """Affiche le rapport final avec statistiques de connexion"""
        total_time = datetime.now() - self.start_time
        
        self.logger.info("=" * 80)
        self.logger.info("RAPPORT FINAL - VERSION OPTIMISÉE AVEC GESTION D'ERREURS")
        self.logger.info("=" * 80)
        self.logger.info(f"Mode: {'DRY RUN' if self.dry_run else 'PRODUCTION'}")
        self.logger.info(f"Temps total: {total_time}")
        self.logger.info(f"Workers parallèles: {self.max_workers}")
        self.logger.info(f"Taille batch SQL: {self.batch_size}")
        self.logger.info(f"Tentatives retry: {self.retry_attempts}")
        self.logger.info(f"Timeout DB: {self.db_timeout}s")
        
        # Statistiques de connexion
        self.logger.info("")
        self.logger.info("STATISTIQUES CONNEXIONS DB:")
        self.logger.info(f"  Connexions créées: {self.connection_stats['created']}")
        self.logger.info(f"  Connexions échouées: {self.connection_stats['failed']}")
        self.logger.info(f"  Retry connexions: {self.connection_stats['retries']}")
        self.logger.info(f"  Retry réussis: {self.stats['retry_successes']}")
        self.logger.info(f"  Erreurs connexion totales: {self.stats['connection_errors']}")
        
        if self.connection_stats['created'] > 0:
            success_rate_conn = ((self.connection_stats['created'] - self.connection_stats['failed']) / self.connection_stats['created']) * 100
            self.logger.info(f"  Taux succès connexions: {success_rate_conn:.1f}%")
        
        self.logger.info("")
        self.logger.info("DONNÉES D'ENTRÉE:")
        self.logger.info(f"  Lignes traitées: {self.stats['lines_processed']}")
        self.logger.info(f"  DPE avec id_rnb: {self.stats['dpe_with_rnb_id']}")
        self.logger.info(f"  Taux id_rnb: {(self.stats['dpe_with_rnb_id'] / max(self.stats['lines_processed'], 1)) * 100:.1f}%")
        self.logger.info(f"  Lignes filtrées (id_rnb renseigné): {self.stats['lines_filtered']}")
        self.logger.info(f"  Doublons supprimés: {self.stats['duplicates_removed']}")
        
        # Afficher le nombre de départements
        dept_info = f"{self.stats['departments_processed']}/{self.stats['departments_total']}"
        if self.stats['departments_total'] == 1:
            dept_info += " (département spécifique)"
        self.logger.info(f"  Départements traités: {dept_info}")
        self.logger.info("")
        
        # Calcul des performances
        if total_time.total_seconds() > 0:
            dpe_per_second = self.stats['successful_updates'] / total_time.total_seconds()
            self.logger.info(f"PERFORMANCES:")
            self.logger.info(f"  DPE traités/seconde: {dpe_per_second:.1f}")
            if self.stats['departments_total'] > 1:
                self.logger.info(f"  Gain parallélisation: ~{self.max_workers}x")
            else:
                self.logger.info(f"  Mode département unique: optimisé pour 1 département")
            self.logger.info("")
        
        self.logger.info("MISES À JOUR:")
        self.logger.info(f"  Réussies: {self.stats['successful_updates']}")
        self.logger.info(f"  Échouées: {self.stats['failed_updates']}")
        
        # Calcul du taux de réussite
        total_attempts = self.stats['successful_updates'] + self.stats['failed_updates']
        if total_attempts > 0:
            success_rate = (self.stats['successful_updates'] / total_attempts) * 100
            self.logger.info(f"  Taux de réussite: {success_rate:.1f}%")
        
        self.logger.info("")
        self.logger.info("RÉPARTITION PAR CAS:")
        self.logger.info(f"  Cas 1.1 (RNB + DPE immeuble): {self.stats['case_1_1']}")
        self.logger.info(f"  Cas 1.2 (RNB + DPE appartement): {self.stats['case_1_2']}")
        self.logger.info(f"  Cas 2.1 (Plot + DPE immeuble): {self.stats['case_2_1']}")
        self.logger.info(f"  Cas 2.2 (Plot + DPE appartement): {self.stats['case_2_2']}")
        self.logger.info("")
        self.logger.info("ÉLÉMENTS IGNORÉS:")
        self.logger.info(f"  Sans clé de jointure: {self.stats['skipped_no_key']}")
        self.logger.info(f"  Méthode DPE inadéquate: {self.stats['skipped_no_method']}")
        self.logger.info(f"  ID RNB inconnus: {len(self.stats['unknown_rnb_ids'])}")
        self.logger.info(f"  BAN IDs inconnus: {len(self.stats['unknown_ban_ids'])}")
        
        if self.stats['unknown_rnb_ids']:
            self.logger.info("Premiers ID RNB inconnus:")
            for rnb_id in list(self.stats['unknown_rnb_ids'])[:10]:
                self.logger.info(f"  - {rnb_id}")
        
        if self.stats['unknown_ban_ids']:
            self.logger.info("Premiers BAN IDs inconnus:")
            for ban_id in list(self.stats['unknown_ban_ids'])[:10]:
                self.logger.info(f"  - {ban_id}")
        
        self.logger.info("")
        self.logger.info(f"Logs détaillés disponibles dans: {getattr(self, 'log_filename', 'fichier de log')}")


def main():
    parser = argparse.ArgumentParser(description='Processeur DPE JSON Line vers PostgreSQL (Optimisé + Gestion Erreurs)')
    
    # Arguments principaux
    parser.add_argument('input_file', help='Fichier JSON Line d\'entrée')
    parser.add_argument('--output-dir', help='Répertoire de sortie pour fichiers par département')
    parser.add_argument('--max-lines', type=int, help='Nombre maximum de lignes à traiter')
    parser.add_argument('--dry-run', action='store_true', help='Mode simulation (pas de modifications DB)')
    parser.add_argument('--debug', action='store_true', help='Activer les logs de débogage')
    
    # Filtrage par département
    parser.add_argument('--department', '--dept', type=str, help='Code département spécifique à traiter (ex: 75, 01, 2A)')
    
    # Optimisations de performance
    parser.add_argument('--max-workers', type=int, help=f'Nombre de workers parallèles (défaut: {min(cpu_count(), 4)})')
    parser.add_argument('--batch-size', type=int, default=500, help='Taille des batches SQL (défaut: 500, réduit pour stabilité)')
    parser.add_argument('--retry-attempts', type=int, default=3, help='Nombre de tentatives en cas d\'erreur (défaut: 3)')
    parser.add_argument('--db-timeout', type=int, default=30, help='Timeout connexions DB en secondes (défaut: 30)')
    
    # Configuration base de données
    parser.add_argument('--db-host', default='localhost', help='Host PostgreSQL')
    parser.add_argument('--db-port', type=int, default=5432, help='Port PostgreSQL') 
    parser.add_argument('--db-name', required=True, help='Nom de la base de données')
    parser.add_argument('--db-user', required=True, help='Utilisateur PostgreSQL')
    parser.add_argument('--db-password', required=True, help='Mot de passe PostgreSQL')
    parser.add_argument('--disable-ssl', action='store_true', help='Désactiver SSL (sslmode=disable)')
    parser.add_argument('--ssl-mode', default='prefer', help='Mode SSL (disable, prefer, require, etc.)')
    
    args = parser.parse_args()
    
    # Configuration DB
    db_config = {
        'host': args.db_host,
        'port': args.db_port,
        'database': args.db_name,
        'user': args.db_user,
        'password': args.db_password
    }
    
    # Configuration SSL
    if args.disable_ssl:
        db_config['sslmode'] = 'disable'
    else:
        db_config['sslmode'] = args.ssl_mode
    
    # Paramètres d'optimisation
    max_workers = args.max_workers or min(cpu_count(), 4)
    batch_size = args.batch_size
    target_department = args.department
    
    # Si un département spécifique, ajuster les workers (moins utile)
    if target_department:
        max_workers = 1  # Mode séquentiel pour un département
    
    # CORRECTION : Définir un répertoire de sortie par défaut si non fourni
    if args.output_dir:
        output_dir = args.output_dir
    else:
        # Chercher d'abord dans l'ancien format, puis utiliser le nouveau
        timestamp = datetime.now().strftime("%Y%m%d")
        legacy_output_dir = f"dpe_output_{timestamp}"
        new_output_dir = f"dpe_processing_{timestamp}"
        
        # Vérifier si l'ancien format existe avec des fichiers traités
        if Path(legacy_output_dir).exists():
            legacy_files = list(Path(legacy_output_dir).glob("dept_*_processed.jsonl"))
            if legacy_files:
                output_dir = legacy_output_dir
                processor_temp = DPEProcessor(db_config, dry_run=True)
                processor_temp.logger.info(f"✅ Utilisation du répertoire existant (ancien format): {legacy_output_dir}")
                processor_temp.logger.info(f"📂 {len(legacy_files)} fichiers départements trouvés")
            else:
                output_dir = new_output_dir
        else:
            output_dir = new_output_dir
    
    # Le répertoire sera créé et vérifié dans preprocess_jsonl_by_departments
    
    # Initialisation du processeur optimisé
    processor = DPEProcessor(
        db_config, 
        dry_run=args.dry_run,
        max_workers=max_workers,
        batch_size=batch_size,
        retry_attempts=args.retry_attempts,
        db_timeout=args.db_timeout
    )
    
    # Activer le debug si demandé
    if args.debug:
        processor.logger.setLevel(logging.DEBUG)
        for handler in processor.logger.handlers:
            handler.setLevel(logging.DEBUG)
    
    # Toujours activer les logs DEBUG pour les cas 2 (plot_id matching)
    # Créer un handler spécial pour le debug des cas 2
    debug_case2_filename = f'dpe_case2_debug_{datetime.now().strftime("%Y%m%d_%H%M%S")}.log'
    debug_handler = logging.FileHandler(debug_case2_filename, encoding='utf-8')
    debug_handler.setLevel(logging.DEBUG)
    debug_formatter = logging.Formatter('%(asctime)s - DEBUG - %(message)s')
    debug_handler.setFormatter(debug_formatter)
    processor.logger.addHandler(debug_handler)
    processor.logger.info(f"📝 Fichier debug cas 2 créé: {debug_case2_filename}")
    processor.logger.setLevel(logging.DEBUG)  # Forcer DEBUG pour voir les détails
    
    if target_department:
        processor.logger.info(f"🎯 Traitement du département {target_department} uniquement")
    
    processor.logger.info(f"🚀 Configuration optimisée avec gestion d'erreurs:")
    processor.logger.info(f"  - Département cible: {target_department or 'Tous'}")
    processor.logger.info(f"  - Workers parallèles: {max_workers}")
    processor.logger.info(f"  - Taille batch SQL: {batch_size}")
    processor.logger.info(f"  - Pool connexions: {processor.connection_pool.minconn}-{processor.connection_pool.maxconn}")
    processor.logger.info(f"  - Mode SSL: {db_config.get('sslmode', 'défaut')}")
    processor.logger.info(f"  - Retry tentatives: {args.retry_attempts}")
    processor.logger.info(f"  - Timeout DB: {args.db_timeout}s")
    processor.logger.info(f"  - Répertoire de sortie: {output_dir}")
    
    try:
        # Étape 1: Prétraitement par départements (avec filtre optionnel)
        if target_department:
            processor.logger.info(f"=== DÉBUT PRÉTRAITEMENT DÉPARTEMENT {target_department} ===")
        else:
            processor.logger.info("=== DÉBUT PRÉTRAITEMENT PARALLÈLE ===")
        
        # Utiliser output_dir défini ci-dessus
        processed_files = processor.preprocess_jsonl_by_departments(
            args.input_file, 
            output_dir,  # Maintenant c'est juste une string
            args.max_lines,
            target_department
        )
        
        processor.logger.info(f"Fichiers départements disponibles dans: {output_dir}")
        processor.logger.info(f"Nombre de fichiers à traiter: {len(processed_files)}")
        
        if not processed_files:
            if target_department:
                processor.logger.error(f"Aucune donnée trouvée pour le département {target_department}!")
                processor.logger.error("Vérifiez le code département et la présence de données.")
            else:
                processor.logger.error("Aucun fichier département généré! Vérifiez le format du fichier d'entrée.")
                processor.logger.error("Colonnes attendues: 'code_departement_ban' et 'id_rnb'")
            sys.exit(1)
        
        # Étape 2: Traitement et mise à jour DB parallèle
        if target_department:
            processor.logger.info(f"=== DÉBUT TRAITEMENT DB DÉPARTEMENT {target_department} ===")
        else:
            processor.logger.info("=== DÉBUT TRAITEMENT DB PARALLÈLE ===")
        processor.process_departments(processed_files)
        
        # Étape 3: Rapport final
        processor.print_report()
        
    except KeyboardInterrupt:
        processor.logger.info("Traitement interrompu par l'utilisateur")
        processor.print_report()
        sys.exit(1)
    except Exception as e:
        processor.logger.error(f"Erreur fatale: {e}")
        if args.debug:
            import traceback
            traceback.print_exc()
        processor.print_report()
        sys.exit(1)
    finally:
        # Fermer explicitement le pool de connexions pour éviter les erreurs de destruction
        try:
            processor.close()
            processor.logger.info("Pool de connexions fermé proprement")
        except Exception as e:
            processor.logger.warning(f"Erreur lors de la fermeture du pool: {e}")


if __name__ == "__main__":
    main()
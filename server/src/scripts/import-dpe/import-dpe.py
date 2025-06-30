import pandas as pd
import psycopg2
import json
import logging
from datetime import datetime
import argparse
from typing import Dict, List, Optional, Tuple
import sys
from psycopg2.extras import RealDictCursor

# Configuration par défaut de la base de données
DB_CONFIG = {
    'host': 'localhost',
    'port': 5432,
    'database': 'copieprod',
    'user': 'postgres',
    'password': 'postgres'
}

# Configuration du logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('dpe_import.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

class DPEImporter:
    def __init__(self, db_config: Dict[str, str], dry_run: bool = False):
        """
        Initialise l'importeur DPE
        
        Args:
            db_config: Configuration de la base de données PostgreSQL
            dry_run: Mode simulation sans modification de la base
        """
        self.db_config = db_config
        self.dry_run = dry_run
        self.conn = None
        self.cursor = None
        
        # Statistiques
        self.stats = {
            'total_dpe_processed': 0,
            'buildings_updated': 0,
            'method_1_1': 0,  # RNB ID + DPE bâtiment
            'method_1_2': 0,  # RNB ID + DPE appartement
            'method_2_1': 0,  # Plot ID + DPE bâtiment
            'method_2_2': 0,  # Plot ID + DPE appartement
            'no_match': 0,
            'errors': 0
        }
        
        # Stockage des actions en mode DRY_RUN
        self.dry_run_actions = []
        
        if self.dry_run:
            logger.info("🧪 MODE DRY_RUN ACTIVÉ - Aucune modification ne sera effectuée")
    
    def connect_db(self):
        """Connexion à la base PostgreSQL"""
        try:
            self.conn = psycopg2.connect(**self.db_config)
            self.cursor = self.conn.cursor(cursor_factory=RealDictCursor)
            logger.info("✅ Connexion à PostgreSQL établie")
        except Exception as e:
            logger.error(f"❌ Erreur connexion PostgreSQL: {e}")
            raise
    
    def disconnect_db(self):
        """Fermeture de la connexion"""
        if self.cursor:
            self.cursor.close()
        if self.conn:
            self.conn.close()
        logger.info("🔌 Connexion PostgreSQL fermée")
    
    def load_dpe_data(self, jsonl_file: str) -> pd.DataFrame:
        """
        Charge les données DPE depuis le fichier JSON Lines
        
        Args:
            jsonl_file: Chemin vers le fichier JSONL
            
        Returns:
            DataFrame avec les données DPE
        """
        logger.info(f"📂 Chargement du fichier DPE: {jsonl_file}")
        
        try:
            df = pd.read_json(jsonl_file, lines=True)
            logger.info(f"📊 DPE chargés: {len(df):,} enregistrements")
            
            # Afficher les colonnes disponibles pour debug
            logger.info(f"🔍 Colonnes disponibles dans le fichier DPE:")
            rnb_related_cols = [col for col in df.columns if 'rnb' in col.lower()]
            plot_related_cols = [col for col in df.columns if 'plot' in col.lower()]
            
            if rnb_related_cols:
                logger.info(f"  📋 Colonnes RNB trouvées: {rnb_related_cols}")
            else:
                logger.warning(f"  ⚠️ Aucune colonne RNB trouvée")
            
            if plot_related_cols:
                logger.info(f"  📋 Colonnes Plot trouvées: {plot_related_cols}")
            else:
                logger.warning(f"  ⚠️ Aucune colonne Plot trouvée")
            
            # Convertir les dates
            if 'date_etablissement_dpe' in df.columns:
                df['date_etablissement_dpe'] = pd.to_datetime(df['date_etablissement_dpe'], errors='coerce')
            
            return df
        except Exception as e:
            logger.error(f"❌ Erreur chargement fichier DPE: {e}")
            raise
    
    def get_buildings_with_rnb_id(self) -> Dict[str, int]:
        """
        Récupère les bâtiments ZLV avec RNB ID
        
        Returns:
            Dictionnaire {rnb_id: building_id}
        """
        query = """
        SELECT id, rnb_id 
        FROM buildings 
        WHERE rnb_id IS NOT NULL AND rnb_id != ''
        """
        
        self.cursor.execute(query)
        results = self.cursor.fetchall()
        
        rnb_mapping = {row['rnb_id']: row['id'] for row in results}
        logger.info(f"🏠 Bâtiments ZLV avec RNB ID: {len(rnb_mapping):,}")
        
        return rnb_mapping
    
    def get_buildings_with_plot_id(self) -> Dict[str, List[int]]:
        """
        Récupère les bâtiments ZLV avec Plot ID via la table fast_housing
        
        Returns:
            Dictionnaire {plot_id: [building_ids]}
        """
        query = """
        SELECT DISTINCT b.id as building_id, h.plot_id
        FROM buildings b
        JOIN fast_housing h ON h.building_id = b.id
        WHERE h.plot_id IS NOT NULL AND h.plot_id != ''
        """
        
        self.cursor.execute(query)
        results = self.cursor.fetchall()
        
        plot_mapping = {}
        for row in results:
            plot_id = row['plot_id']
            building_id = row['building_id']
            
            if plot_id not in plot_mapping:
                plot_mapping[plot_id] = []
            plot_mapping[plot_id].append(building_id)
        
        logger.info(f"🏘️ Bâtiments ZLV avec Plot ID: {len(plot_mapping):,}")
        
        return plot_mapping
    
    def filter_latest_dpe(self, dpe_group: pd.DataFrame) -> pd.Series:
        """
        Filtre le DPE le plus récent d'un groupe
        
        Args:
            dpe_group: Groupe de DPE pour le même bâtiment
            
        Returns:
            Le DPE le plus récent
        """
        if len(dpe_group) == 1:
            return dpe_group.iloc[0]
        
        # Trier par date d'établissement (plus récent en premier)
        sorted_group = dpe_group.sort_values('date_etablissement_dpe', na_last=True, ascending=False)
        return sorted_group.iloc[0]
    
    def get_dpe_for_building(self, building_key: str, dpe_df: pd.DataFrame, key_column: str) -> Optional[pd.Series]:
        """
        Récupère le DPE approprié pour un bâtiment selon les règles
        
        Args:
            building_key: RNB ID ou Plot ID
            dpe_df: DataFrame des DPE
            key_column: Nom de la colonne clé dans les données DPE
            
        Returns:
            Le DPE sélectionné ou None
        """
        # Vérifier que la colonne existe
        if key_column not in dpe_df.columns:
            logger.warning(f"⚠️ Colonne '{key_column}' non trouvée dans les données DPE")
            return None
        
        # Filtrer les DPE pour ce bâtiment
        building_dpes = dpe_df[dpe_df[key_column] == building_key]
        
        if building_dpes.empty:
            return None
        
        # Cas 1 & 2.1 : DPE au niveau bâtiment
        building_level_dpes = building_dpes[
            building_dpes['methode_application_dpe'].isin([
                'dpe immeuble collectif',
                'dpe maison individuelle'
            ])
        ]
        
        if not building_level_dpes.empty:
            return self.filter_latest_dpe(building_level_dpes)
        
        # Cas 1.2 & 2.2 : DPE appartement individuel
        apartment_dpes = building_dpes[
            building_dpes['methode_application_dpe'] == 'dpe appartement individuel'
        ]
        
        if not apartment_dpes.empty:
            return self.filter_latest_dpe(apartment_dpes)
        
        # Aucun DPE valide trouvé
        return None
    
    def extract_dpe_info(self, dpe_row: pd.Series) -> Dict[str, any]:
        """
        Extrait les informations DPE à sauvegarder
        
        Args:
            dpe_row: Ligne DPE pandas
            
        Returns:
            Dictionnaire avec les infos à sauvegarder
        """
        # Déterminer la colonne RNB utilisée
        rnb_value = None
        possible_rnb_columns = ['rnb_id']
        for col in possible_rnb_columns:
            if col in dpe_row.index and pd.notna(dpe_row.get(col)):
                rnb_value = dpe_row.get(col)
                break
        
        return {
            'rnb_id': rnb_value,
            'rnb_id_score': None,  # À définir selon votre logique
            'dpe_id': dpe_row.get('_i'),  # ID interne ADEME
            'class_dpe': dpe_row.get('etiquette_dpe'),
            'class_ges': dpe_row.get('etiquette_ges'),
            'dpe_date_at': dpe_row.get('date_etablissement_dpe'),
            'dpe_type': dpe_row.get('methode_application_dpe'),
            'heating_building': dpe_row.get('type_energie_principale_chauffage')
        }
    
    def update_building_dpe(self, building_id: int, dpe_info: Dict[str, any]) -> bool:
        """
        Met à jour un bâtiment avec les informations DPE
        
        Args:
            building_id: ID du bâtiment ZLV
            dpe_info: Informations DPE à sauvegarder
            
        Returns:
            True si succès, False sinon
        """
        if self.dry_run:
            # Mode simulation : enregistrer l'action sans l'exécuter
            action = {
                'building_id': building_id,
                'action': 'UPDATE buildings',
                'data': dpe_info.copy()
            }
            self.dry_run_actions.append(action)
            
            # Log détaillé pour les 10 premiers
            if len(self.dry_run_actions) <= 10:
                logger.info(f"🧪 [DRY_RUN] UPDATE building {building_id}:")
                for key, value in dpe_info.items():
                    if value is not None:
                        logger.info(f"     {key}: {value}")
            elif len(self.dry_run_actions) == 11:
                logger.info("🧪 [DRY_RUN] ... (logs détaillés masqués pour les suivants)")
            
            return True
        
        try:
            update_query = """
            UPDATE buildings SET
                rnb_id = %(rnb_id)s,
                rnb_id_score = %(rnb_id_score)s,
                dpe_id = %(dpe_id)s,
                class_dpe = %(class_dpe)s,
                class_ges = %(class_ges)s,
                dpe_date_at = %(dpe_date_at)s,
                dpe_type = %(dpe_type)s,
                heating_building = %(heating_building)s
            WHERE id = %(building_id)s
            """
            
            params = dpe_info.copy()
            params['building_id'] = building_id
            
            self.cursor.execute(update_query, params)
            return True
            
        except Exception as e:
            logger.error(f"❌ Erreur mise à jour bâtiment {building_id}: {e}")
            return False
    
    def process_rnb_id_method(self, dpe_df: pd.DataFrame, rnb_mapping: Dict[str, int]):
        """
        Traite les bâtiments via RNB ID (Cas 1)
        """
        logger.info("🔄 Traitement via RNB ID (Cas 1)")
        
        # Déterminer le nom de la colonne RNB dans les données DPE
        rnb_column = None
        possible_rnb_columns = ['rnb_id', 'RNB_ID', 'identifiant_ban']
        
        for col in possible_rnb_columns:
            if col in dpe_df.columns:
                rnb_column = col
                logger.info(f"✅ Colonne RNB trouvée: {rnb_column}")
                break
        
        if rnb_column is None:
            logger.error("❌ Aucune colonne RNB trouvée dans les données DPE")
            logger.info(f"🔍 Colonnes disponibles: {list(dpe_df.columns)}")
            return set()
        
        processed_buildings = set()
        
        for rnb_id, building_id in rnb_mapping.items():
            if building_id in processed_buildings:
                continue
            
            # Récupérer le DPE approprié
            dpe_row = self.get_dpe_for_building(rnb_id, dpe_df, rnb_column)
            
            if dpe_row is not None:
                dpe_info = self.extract_dpe_info(dpe_row)
                
                if self.update_building_dpe(building_id, dpe_info):
                    processed_buildings.add(building_id)
                    self.stats['buildings_updated'] += 1
                    
                    # Statistiques par méthode
                    if dpe_row['methode_application_dpe'] in ['dpe immeuble collectif', 'dpe maison individuelle']:
                        self.stats['method_1_1'] += 1
                    else:
                        self.stats['method_1_2'] += 1
                else:
                    self.stats['errors'] += 1
            else:
                self.stats['no_match'] += 1
        
        logger.info(f"✅ Cas 1 terminé: {len(processed_buildings)} bâtiments traités")
        return processed_buildings
    
    def process_plot_id_method(self, dpe_df: pd.DataFrame, plot_mapping: Dict[str, List[int]], processed_buildings: set):
        """
        Traite les bâtiments via Plot ID (Cas 2)
        """
        logger.info("🔄 Traitement via Plot ID (Cas 2)")
        
        # Vérifier si plot_id existe dans les données DPE
        if 'plot_id' not in dpe_df.columns:
            logger.warning("⚠️ Colonne 'plot_id' non trouvée dans les données DPE")
            return
        
        new_processed = 0
        
        for plot_id, building_ids in plot_mapping.items():
            for building_id in building_ids:
                if building_id in processed_buildings:
                    continue
                
                # Récupérer le DPE approprié
                dpe_row = self.get_dpe_for_building(plot_id, dpe_df, 'plot_id')
                
                if dpe_row is not None:
                    dpe_info = self.extract_dpe_info(dpe_row)
                    
                    if self.update_building_dpe(building_id, dpe_info):
                        processed_buildings.add(building_id)
                        new_processed += 1
                        self.stats['buildings_updated'] += 1
                        
                        # Statistiques par méthode
                        if dpe_row['methode_application_dpe'] in ['dpe immeuble collectif', 'dpe maison individuelle']:
                            self.stats['method_2_1'] += 1
                        else:
                            self.stats['method_2_2'] += 1
                    else:
                        self.stats['errors'] += 1
                else:
                    self.stats['no_match'] += 1
        
        logger.info(f"✅ Cas 2 terminé: {new_processed} nouveaux bâtiments traités")
    
    def save_dry_run_report(self):
        """
        Sauvegarde un rapport détaillé du DRY_RUN
        """
        if not self.dry_run or not self.dry_run_actions:
            return
        
        report_file = f"dpe_import_dry_run_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        
        try:
            # Créer un rapport détaillé
            report = {
                'metadata': {
                    'timestamp': datetime.now().isoformat(),
                    'mode': 'DRY_RUN',
                    'total_actions': len(self.dry_run_actions),
                    'statistics': self.stats
                },
                'sample_actions': self.dry_run_actions[:100],  # 100 premiers exemples
                'building_updates_summary': {}
            }
            
            # Analyser les types de mises à jour
            update_types = {}
            for action in self.dry_run_actions:
                building_id = action['building_id']
                data = action['data']
                
                # Compter les champs non-null
                non_null_fields = [k for k, v in data.items() if v is not None]
                fields_key = ', '.join(sorted(non_null_fields))
                
                if fields_key not in update_types:
                    update_types[fields_key] = 0
                update_types[fields_key] += 1
            
            report['building_updates_summary'] = update_types
            
            # Sauvegarder le rapport
            with open(report_file, 'w', encoding='utf-8') as f:
                json.dump(report, f, indent=2, ensure_ascii=False, default=str)
            
            logger.info(f"📄 Rapport DRY_RUN sauvegardé: {report_file}")
            
            # Afficher un résumé des types de mises à jour
            logger.info("📊 Types de mises à jour prévues:")
            for fields, count in sorted(update_types.items(), key=lambda x: x[1], reverse=True):
                logger.info(f"  - {count:,} bâtiments: {fields}")
                
        except Exception as e:
            logger.error(f"❌ Erreur sauvegarde rapport DRY_RUN: {e}")

    def process_dpe_import(self, jsonl_file: str):
        """
        Processus principal d'import des DPE
        
        Args:
            jsonl_file: Chemin vers le fichier JSON Lines
        """
        start_time = datetime.now()
        logger.info(f"🚀 Début de l'import DPE: {start_time.strftime('%H:%M:%S')}")
        
        try:
            # Connexion à la base
            self.connect_db()
            
            # Chargement des données
            dpe_df = self.load_dpe_data(jsonl_file)
            self.stats['total_dpe_processed'] = len(dpe_df)
            
            # Récupération des mappings ZLV
            rnb_mapping = self.get_buildings_with_rnb_id()
            plot_mapping = self.get_buildings_with_plot_id()
            
            # Traitement Cas 1 : RNB ID
            processed_buildings = self.process_rnb_id_method(dpe_df, rnb_mapping)
            
            # Traitement Cas 2 : Plot ID
            self.process_plot_id_method(dpe_df, plot_mapping, processed_buildings)
            
            # Commit des changements (sauf en DRY_RUN)
            if not self.dry_run:
                self.conn.commit()
                logger.info("💾 Changements sauvegardés en base")
            else:
                logger.info("🧪 [DRY_RUN] Aucun changement appliqué en base")
                self.save_dry_run_report()
            
        except Exception as e:
            logger.error(f"❌ Erreur durant l'import: {e}")
            if self.conn and not self.dry_run:
                self.conn.rollback()
                logger.info("🔄 Rollback effectué")
            raise
        
        finally:
            self.disconnect_db()
            
            # Statistiques finales
            end_time = datetime.now()
            duration = end_time - start_time
            
            logger.info("="*60)
            logger.info("📊 STATISTIQUES FINALES")
            logger.info("="*60)
            logger.info(f"🧪 Mode: {'DRY_RUN (simulation)' if self.dry_run else 'PRODUCTION'}")
            logger.info(f"⏱️  Durée totale: {duration}")
            logger.info(f"📂 DPE traités: {self.stats['total_dpe_processed']:,}")
            logger.info(f"🏠 Bâtiments {'à mettre à jour' if self.dry_run else 'mis à jour'}: {self.stats['buildings_updated']:,}")
            logger.info(f"🔧 Méthode 1.1 (RNB + Bâtiment): {self.stats['method_1_1']:,}")
            logger.info(f"🔧 Méthode 1.2 (RNB + Appartement): {self.stats['method_1_2']:,}")
            logger.info(f"🔧 Méthode 2.1 (Plot + Bâtiment): {self.stats['method_2_1']:,}")
            logger.info(f"🔧 Méthode 2.2 (Plot + Appartement): {self.stats['method_2_2']:,}")
            logger.info(f"❌ Aucun match: {self.stats['no_match']:,}")
            logger.info(f"⚠️  Erreurs: {self.stats['errors']:,}")
            
            if self.dry_run:
                logger.info("="*60)
                logger.info("🧪 RAPPORT DRY_RUN")
                logger.info("="*60)
                logger.info(f"📝 Actions simulées: {len(self.dry_run_actions):,}")
                logger.info("💡 Pour exécuter réellement, relancez sans --dry-run")

def main():
    """Fonction principale"""
    parser = argparse.ArgumentParser(description='Import des DPE ADEME vers base ZLV PostgreSQL')
    parser.add_argument('jsonl_file', help='Fichier JSON Lines des DPE ADEME')
    parser.add_argument('--host', default=DB_CONFIG['host'], help=f'Host PostgreSQL (défaut: {DB_CONFIG["host"]})')
    parser.add_argument('--port', default=DB_CONFIG['port'], help=f'Port PostgreSQL (défaut: {DB_CONFIG["port"]})')
    parser.add_argument('--database', default=DB_CONFIG['database'], help=f'Nom de la base de données (défaut: {DB_CONFIG["database"]})')
    parser.add_argument('--user', default=DB_CONFIG['user'], help=f'Utilisateur PostgreSQL (défaut: {DB_CONFIG["user"]})')
    parser.add_argument('--password', default=DB_CONFIG['password'], help=f'Mot de passe PostgreSQL (défaut: {DB_CONFIG["password"]})')
    parser.add_argument('--dry-run', action='store_true', 
                       help='Mode simulation sans modification de la base (recommandé pour premier test)')
    
    args = parser.parse_args()
    
    # Configuration de la base
    db_config = {
        'host': args.host,
        'port': args.port,
        'database': args.database,
        'user': args.user,
        'password': args.password
    }
    
    # Afficher la configuration utilisée
    logger.info("🔧 Configuration PostgreSQL:")
    logger.info(f"  Host: {db_config['host']}")
    logger.info(f"  Port: {db_config['port']}")
    logger.info(f"  Database: {db_config['database']}")
    logger.info(f"  User: {db_config['user']}")
    logger.info(f"  Password: {'*' * len(str(db_config['password']))}")
    
    # Import des DPE
    importer = DPEImporter(db_config, dry_run=args.dry_run)
    importer.process_dpe_import(args.jsonl_file)

if __name__ == "__main__":
    main()
#!/usr/bin/env python3
"""
Analyseur de fichier DPE JSONL pour identifier les RNB_ID avec plusieurs DPE
où numero_dpe_remplace n'est pas vide.

Usage: python dpe_analyzer.py <fichier_jsonl>
"""

import json
import sys
import os
from collections import defaultdict
from typing import Dict, Set, Optional
import argparse
import time
from tqdm import tqdm

def get_file_size(file_path: str) -> int:
    """Retourne la taille du fichier en octets."""
    return os.path.getsize(file_path)

def count_lines(file_path: str) -> int:
    """Compte le nombre de lignes dans le fichier pour la barre de progression."""
    print("Comptage des lignes pour la barre de progression...")
    with open(file_path, 'r', encoding='utf-8') as file:
        return sum(1 for _ in file)

def analyze_dpe_file(file_path: str, chunk_size: int = 1000, show_progress: bool = True) -> Dict:
    """
    Analyse un fichier JSONL de DPE pour identifier les RNB_ID avec plusieurs DPE
    où numero_dpe_remplace n'est pas vide.
    
    Args:
        file_path: Chemin vers le fichier JSONL
        chunk_size: Nombre de lignes à traiter par batch (pour la mémoire)
        show_progress: Afficher la barre de progression
    
    Returns:
        Dictionnaire avec les statistiques d'analyse
    """
    
    # Structures de données pour l'analyse
    rnb_dpe_mapping = defaultdict(set)  # rnb_id -> set of numero_dpe
    dpe_remplace_data = {}  # numero_dpe -> numero_dpe_remplace
    
    # Compteurs pour les statistiques
    total_records = 0
    records_with_rnb = 0
    records_with_remplace = 0
    json_errors = 0
    
    start_time = time.time()
    
    try:
        # Comptage des lignes pour la barre de progression
        if show_progress:
            total_lines = count_lines(file_path)
            print(f"Fichier contient {total_lines:,} lignes")
        else:
            total_lines = None
        
        with open(file_path, 'r', encoding='utf-8') as file:
            # Initialisation de la barre de progression
            if show_progress:
                progress_bar = tqdm(
                    total=total_lines,
                    desc="Analyse DPE",
                    unit="lignes",
                    unit_scale=True,
                    ncols=100
                )
            
            for line_num, line in enumerate(file, 1):
                try:
                    # Parse de la ligne JSON
                    data = json.loads(line.strip())
                    total_records += 1
                    
                    # Extraction des champs nécessaires
                    rnb_id = data.get('rnb_id')
                    numero_dpe = data.get('numero_dpe')
                    numero_dpe_remplace = data.get('numero_dpe_remplace')
                    
                    # Traitement des données
                    if rnb_id and numero_dpe:
                        records_with_rnb += 1
                        rnb_dpe_mapping[rnb_id].add(numero_dpe)
                        
                        # Stockage des informations de remplacement
                        if numero_dpe_remplace:
                            records_with_remplace += 1
                            dpe_remplace_data[numero_dpe] = numero_dpe_remplace
                    
                    # Mise à jour de la barre de progression
                    if show_progress:
                        progress_bar.update(1)
                        
                        # Mise à jour des statistiques dans la barre
                        if line_num % chunk_size == 0:
                            elapsed = time.time() - start_time
                            rate = line_num / elapsed
                            progress_bar.set_postfix({
                                'Rate': f'{rate:.0f}/s',
                                'RNB': f'{records_with_rnb:,}',
                                'Rempl': f'{records_with_remplace:,}'
                            })
                        
                except json.JSONDecodeError as e:
                    json_errors += 1
                    if show_progress:
                        progress_bar.update(1)
                    continue
                except Exception as e:
                    json_errors += 1
                    if show_progress:
                        progress_bar.update(1)
                    continue
            
            # Fermeture de la barre de progression
            if show_progress:
                progress_bar.close()
    
    except FileNotFoundError:
        return {
            "error": f"Fichier non trouvé: {file_path}",
            "success": False
        }
    except Exception as e:
        return {
            "error": f"Erreur lors de la lecture du fichier: {str(e)}",
            "success": False
        }
    
    # Analyse des résultats
    print("\nAnalyse des résultats en cours...")
    
    # Identifier les RNB_ID avec plusieurs DPE
    rnb_multiple_dpe = {rnb_id: dpe_set for rnb_id, dpe_set in rnb_dpe_mapping.items() 
                        if len(dpe_set) > 1}
    
    # Identifier les RNB_ID avec plusieurs DPE ET au moins un DPE remplacé
    rnb_with_remplace = {}
    
    for rnb_id, dpe_set in rnb_multiple_dpe.items():
        # Vérifier si au moins un DPE de ce RNB_ID a un numero_dpe_remplace
        has_remplace = any(dpe in dpe_remplace_data for dpe in dpe_set)
        if has_remplace:
            # Collecter les DPE remplacés pour ce RNB_ID
            remplace_info = {dpe: dpe_remplace_data[dpe] for dpe in dpe_set 
                           if dpe in dpe_remplace_data}
            rnb_with_remplace[rnb_id] = {
                'tous_dpe': list(dpe_set),
                'nombre_dpe': len(dpe_set),
                'dpe_remplaces': remplace_info,
                'nombre_dpe_remplaces': len(remplace_info)
            }
    
    # Statistiques finales
    elapsed_time = time.time() - start_time
    file_size = get_file_size(file_path)
    
    results = {
        "success": True,
        "metadata": {
            "fichier_analyse": file_path,
            "taille_fichier_octets": file_size,
            "taille_fichier_mb": round(file_size / (1024 * 1024), 2),
            "taille_fichier_gb": round(file_size / (1024 * 1024 * 1024), 2),
            "temps_traitement_secondes": round(elapsed_time, 2),
            "vitesse_traitement_lignes_par_seconde": round(total_records / elapsed_time, 2) if elapsed_time > 0 else 0,
            "date_analyse": time.strftime("%Y-%m-%d %H:%M:%S")
        },
        "statistiques_generales": {
            "total_enregistrements": total_records,
            "enregistrements_avec_rnb_id": records_with_rnb,
            "enregistrements_avec_dpe_remplace": records_with_remplace,
            "erreurs_json": json_errors,
            "rnb_id_uniques": len(rnb_dpe_mapping),
            "rnb_id_avec_plusieurs_dpe": len(rnb_multiple_dpe)
        },
        "reponse_question": {
            "nombre_rnb_id_avec_plusieurs_dpe_et_remplace": len(rnb_with_remplace),
            "description": "Nombre de RNB_ID ayant plusieurs DPE associés ET au moins un numero_dpe_remplace non vide"
        },
        "exemples_detailles": {
            "nombre_exemples": min(10, len(rnb_with_remplace)),
            "exemples": dict(list(rnb_with_remplace.items())[:10])
        },
        "distribution_dpe_par_rnb": {},
        "top_rnb_avec_plus_de_dpe": []
    }
    
    # Analyse de la distribution
    if rnb_with_remplace:
        # Distribution du nombre de DPE par RNB_ID
        distribution = defaultdict(int)
        for info in rnb_with_remplace.values():
            distribution[info['nombre_dpe']] += 1
        
        results["distribution_dpe_par_rnb"] = dict(distribution)
        
        # Top 10 des RNB_ID avec le plus de DPE
        top_rnb = sorted(
            [(rnb_id, info['nombre_dpe']) for rnb_id, info in rnb_with_remplace.items()],
            key=lambda x: x[1],
            reverse=True
        )[:10]
        
        results["top_rnb_avec_plus_de_dpe"] = [
            {"rnb_id": rnb_id, "nombre_dpe": count} for rnb_id, count in top_rnb
        ]
    
    return results

def save_json_report(results: Dict, output_file: str):
    """Sauvegarde le rapport en format JSON."""
    try:
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(results, f, indent=2, ensure_ascii=False)
        print(f"Rapport JSON sauvegardé dans: {output_file}")
    except Exception as e:
        print(f"Erreur lors de la sauvegarde: {e}")

def print_summary(results: Dict):
    """Affiche un résumé des résultats."""
    if not results.get("success", False):
        print(f"ERREUR: {results.get('error', 'Erreur inconnue')}")
        return
    
    print("\n" + "="*60)
    print("RÉSUMÉ DE L'ANALYSE")
    print("="*60)
    
    meta = results["metadata"]
    stats = results["statistiques_generales"]
    reponse = results["reponse_question"]
    
    print(f"Fichier analysé: {meta['fichier_analyse']}")
    print(f"Taille du fichier: {meta['taille_fichier_gb']} GB")
    print(f"Temps de traitement: {meta['temps_traitement_secondes']} secondes")
    print(f"Vitesse: {meta['vitesse_traitement_lignes_par_seconde']:,.0f} lignes/seconde")
    print(f"Total enregistrements: {stats['total_enregistrements']:,}")
    print(f"Enregistrements avec RNB_ID: {stats['enregistrements_avec_rnb_id']:,}")
    print(f"RNB_ID uniques: {stats['rnb_id_uniques']:,}")
    print(f"RNB_ID avec plusieurs DPE: {stats['rnb_id_avec_plusieurs_dpe']:,}")
    
    if stats['erreurs_json'] > 0:
        print(f"Erreurs JSON: {stats['erreurs_json']:,}")
    
    print("\n" + "="*60)
    print("RÉPONSE À LA QUESTION")
    print("="*60)
    print(f"Nombre de RNB_ID avec plusieurs DPE ET au moins un DPE remplacé:")
    print(f">>> {reponse['nombre_rnb_id_avec_plusieurs_dpe_et_remplace']:,} <<<")
    
    # Distribution
    if results["distribution_dpe_par_rnb"]:
        print("\nDistribution (nombre de DPE par RNB_ID):")
        for nb_dpe, count in sorted(results["distribution_dpe_par_rnb"].items()):
            print(f"  {nb_dpe} DPE: {count:,} RNB_ID")

def main():
    """Fonction principale du script."""
    
    parser = argparse.ArgumentParser(
        description="Analyse un fichier JSONL de DPE pour identifier les RNB_ID avec plusieurs DPE remplacés"
    )
    parser.add_argument("file_path", help="Chemin vers le fichier JSONL à analyser")
    parser.add_argument("--chunk-size", type=int, default=1000, 
                       help="Taille des chunks pour le traitement (défaut: 1000)")
    parser.add_argument("--output", "-o", type=str, default="dpe_analysis_report.json",
                       help="Fichier de sortie JSON (défaut: dpe_analysis_report.json)")
    parser.add_argument("--no-progress", action="store_true",
                       help="Désactiver la barre de progression")
    parser.add_argument("--summary-only", action="store_true",
                       help="Afficher seulement le résumé (pas le JSON complet)")
    
    args = parser.parse_args()
    
    # Vérification du fichier
    if not os.path.exists(args.file_path):
        print(f"Erreur: Fichier non trouvé - {args.file_path}")
        sys.exit(1)
    
    # Analyse du fichier
    print(f"Début de l'analyse du fichier: {args.file_path}")
    results = analyze_dpe_file(
        args.file_path, 
        args.chunk_size, 
        show_progress=not args.no_progress
    )
    
    if results:
        # Sauvegarde du rapport JSON
        save_json_report(results, args.output)
        
        # Affichage du résumé
        print_summary(results)
        
        # Affichage JSON complet si demandé
        if not args.summary_only:
            print(f"\nPour voir le rapport JSON complet: cat {args.output}")
        else:
            print(f"\nRapport JSON complet sauvegardé dans: {args.output}")

if __name__ == "__main__":
    main()

# Version de test rapide
def quick_test_with_sample():
    """Test rapide avec des données échantillon."""
    sample_data = [
        {"rnb_id": "RNB001", "numero_dpe": "DPE001", "numero_dpe_remplace": ""},
        {"rnb_id": "RNB001", "numero_dpe": "DPE002", "numero_dpe_remplace": "DPE001"},
        {"rnb_id": "RNB002", "numero_dpe": "DPE003", "numero_dpe_remplace": ""},
        {"rnb_id": "RNB002", "numero_dpe": "DPE004", "numero_dpe_remplace": "DPE003"},
        {"rnb_id": "RNB003", "numero_dpe": "DPE005", "numero_dpe_remplace": ""},
    ]
    
    print("Test rapide avec données échantillon:")
    print("-" * 50)
    
    # Simulation du traitement
    rnb_dpe_mapping = defaultdict(set)
    dpe_remplace_data = {}
    
    for data in sample_data:
        rnb_id = data.get('rnb_id')
        numero_dpe = data.get('numero_dpe')
        numero_dpe_remplace = data.get('numero_dpe_remplace')
        
        if rnb_id and numero_dpe:
            rnb_dpe_mapping[rnb_id].add(numero_dpe)
            if numero_dpe_remplace:
                dpe_remplace_data[numero_dpe] = numero_dpe_remplace
    
    # Analyse
    rnb_multiple_dpe = {rnb_id: dpe_set for rnb_id, dpe_set in rnb_dpe_mapping.items() 
                        if len(dpe_set) > 1}
    
    count_with_remplace = 0
    for rnb_id, dpe_set in rnb_multiple_dpe.items():
        has_remplace = any(dpe in dpe_remplace_data for dpe in dpe_set)
        if has_remplace:
            count_with_remplace += 1
    
    result = {
        "test_data": sample_data,
        "rnb_multiple_dpe": len(rnb_multiple_dpe),
        "rnb_with_remplace": count_with_remplace
    }
    
    print(json.dumps(result, indent=2, ensure_ascii=False))
    return result

# Lancement du test si appelé directement sans arguments
if __name__ == "__main__" and len(sys.argv) == 1:
    quick_test_with_sample()
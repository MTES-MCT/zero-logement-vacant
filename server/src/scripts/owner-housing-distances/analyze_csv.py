#!/usr/bin/env python3
"""
Script indépendant pour analyser un fichier CSV avec country_detector.py
et générer un rapport statistique identique à celui de calculate_distances.py.

Usage:
    python analyze_csv.py <fichier.csv>
    python analyze_csv.py <fichier.csv> --column adresse
    python analyze_csv.py <fichier.csv> --limit 1000
"""

import argparse
import sys
import os
import pandas as pd
from datetime import datetime
from country_detector import CountryDetector

def analyze_csv_file(csv_file: str, address_column: str = None, limit: int = None):
    """
    Analyse un fichier CSV avec country_detector et génère des statistiques.

    Args:
        csv_file: Chemin vers le fichier CSV
        address_column: Nom de la colonne contenant les adresses (auto-détection si None)
        limit: Nombre maximum d'adresses à traiter (toutes si None)
    """

    print("="*60)
    print("ANALYSE CSV AVEC COUNTRY_DETECTOR")
    print("="*60)
    print(f"Fichier d'entrée: {csv_file}")
    print(f"Date d'analyse: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    # Charger le fichier CSV
    try:
        df = pd.read_csv(csv_file)
        print(f"CSV chargé avec succès: {len(df)} lignes")
    except Exception as e:
        print(f"❌ Erreur lors du chargement du CSV: {e}")
        return 1

    # Identifier la colonne d'adresse
    if address_column is None:
        # Auto-détection des colonnes possibles
        possible_columns = ['adresse', 'address', 'addr', 'rue', 'street', 'location']
        address_column = None

        for col in possible_columns:
            if col in df.columns:
                address_column = col
                break

        if address_column is None:
            print(f"❌ Colonne d'adresse non trouvée automatiquement.")
            print(f"Colonnes disponibles: {list(df.columns)}")
            print("Utilisez --column <nom_colonne> pour spécifier la colonne")
            return 1

    if address_column not in df.columns:
        print(f"❌ Colonne '{address_column}' non trouvée dans le CSV")
        print(f"Colonnes disponibles: {list(df.columns)}")
        return 1

    print(f"Colonne d'adresse utilisée: '{address_column}'")

    # Appliquer la limite si spécifiée
    if limit:
        df = df.head(limit)
        print(f"Limite appliquée: analyse des {len(df)} premières adresses")

    print(f"Nombre d'adresses à traiter: {len(df)}")

    # Initialiser CountryDetector exactement comme dans calculate_distances.py
    print(f"\n🔧 Initialisation du CountryDetector...")
    detector = CountryDetector(model_name="rule-based", use_llm=False)

    # Vérifier la version
    detector_version = detector.get_version()
    print(f"🔧 CountryDetector version: {detector_version}")

    # Reset des statistiques
    detector.reset_statistics()

    # Tests de validation (comme dans calculate_distances.py)
    print(f"\n🧪 Tests de validation:")
    test_result = detector.detect_country("25 SE 41253 BENZELIIGATAN GOTEBORG SUEDE")
    if test_result != "FOREIGN":
        print(f"❌ ALERTE: CountryDetector défaillant - Adresse suédoise classée {test_result} au lieu de FOREIGN")
        return 1
    else:
        print("✅ CountryDetector validation passed: corrections are active")

    # Test supplémentaire de contrôle
    test_addresses = [
        "VIA MARMENIA 30 ROMA RM 00178 ITALIE",
        "123 RUE DE LA PAIX 75001 PARIS"
    ]

    print("🔍 Test de contrôle CountryDetector:")
    for addr in test_addresses:
        result = detector.detect_country(addr)
        expected = "FOREIGN" if "ITALIE" in addr or "ROMA" in addr else "FRANCE"
        status = "✅" if result == expected else "❌"
        print(f"  {status} {addr} → {result}")

    # Ne PAS reset les stats ici pour inclure tous les appels dans les statistiques finales

    # Traitement des adresses du CSV
    print(f"\n📊 Analyse en cours...")

    france_count = 0
    foreign_count = 0
    processed_count = 0
    error_count = 0

    # Traitement avec barre de progression simple
    progress_step = max(1, len(df) // 20)  # Afficher le progrès toutes les 5%

    for i, row in df.iterrows():
        try:
            address = str(row[address_column]).strip()

            # Ignorer les adresses vides
            if not address or address.lower() in ['nan', 'null', '']:
                continue

            # Appeler country_detector
            result = detector.detect_country(address)

            if result == "FRANCE":
                france_count += 1
            elif result == "FOREIGN":
                foreign_count += 1

            processed_count += 1

            # Afficher le progrès
            if processed_count % progress_step == 0:
                progress = (processed_count / len(df)) * 100
                print(f"  Progression: {progress:.0f}% ({processed_count}/{len(df)})")

            # Afficher quelques exemples
            if processed_count <= 5:
                print(f"  Exemple {processed_count}: {address[:60]}{'...' if len(address) > 60 else ''} → {result}")

        except Exception as e:
            error_count += 1
            if error_count <= 5:  # Afficher seulement les 5 premières erreurs
                print(f"  ❌ Erreur ligne {i}: {e}")

    # Résultats de notre comptage manuel
    print(f"\n📊 RÉSULTATS DE L'ANALYSE:")
    print("-" * 40)
    print(f"Adresses traitées: {processed_count}")
    print(f"France détectées (comptage): {france_count}")
    print(f"Foreign détectées (comptage): {foreign_count}")
    print(f"Erreurs de traitement: {error_count}")

    if processed_count > 0:
        france_rate = (france_count / processed_count) * 100
        foreign_rate = (foreign_count / processed_count) * 100
        print(f"Taux France: {france_rate:.1f}%")
        print(f"Taux Foreign: {foreign_rate:.1f}%")

    # Statistiques du CountryDetector (comme dans calculate_distances.py)
    country_stats = detector.get_statistics()
    if country_stats['total_processed'] > 0:
        print("\nCOUNTRY DETECTION STATISTICS (FANTOIR-Enhanced)")
        print("-"*40)
        print(f"Total addresses analyzed: {country_stats['total_processed']}")
        print(f"France classifications: {country_stats['france_count']}")
        print(f"Foreign classifications: {country_stats['foreign_count']}")
        print(f"Rule-based used: {country_stats['rule_based_used']}")

        if country_stats['total_processed'] > 0:
            france_rate_stats = (country_stats['france_count'] / country_stats['total_processed']) * 100
            foreign_rate_stats = (country_stats['foreign_count'] / country_stats['total_processed']) * 100
            print(f"France rate: {france_rate_stats:.1f}%")
            print(f"Foreign rate: {foreign_rate_stats:.1f}%")

    # Vérification de cohérence
    print(f"\n🔍 VÉRIFICATION DE COHÉRENCE:")
    if processed_count != country_stats['total_processed']:
        print(f"❌ Différence dans le nombre total: {processed_count} vs {country_stats['total_processed']}")
    else:
        print(f"✅ Nombre total cohérent: {processed_count}")

    if france_count != country_stats['france_count']:
        print(f"❌ Différence France: {france_count} vs {country_stats['france_count']}")
    else:
        print(f"✅ Comptage France cohérent: {france_count}")

    if foreign_count != country_stats['foreign_count']:
        print(f"❌ Différence Foreign: {foreign_count} vs {country_stats['foreign_count']}")
    else:
        print(f"✅ Comptage Foreign cohérent: {foreign_count}")

    print("="*60)

    return 0

def main():
    """Fonction principale."""
    parser = argparse.ArgumentParser(
        description="Analyse un fichier CSV avec country_detector et génère des statistiques"
    )
    parser.add_argument(
        "csv_file",
        help="Chemin vers le fichier CSV à analyser"
    )
    parser.add_argument(
        "--column",
        help="Nom de la colonne contenant les adresses (auto-détection si non spécifié)"
    )
    parser.add_argument(
        "--limit",
        type=int,
        help="Nombre maximum d'adresses à traiter (toutes si non spécifié)"
    )

    args = parser.parse_args()

    # Vérifier que le fichier existe
    if not os.path.exists(args.csv_file):
        print(f"❌ Fichier non trouvé: {args.csv_file}")
        return 1

    # Analyser le fichier
    return analyze_csv_file(args.csv_file, args.column, args.limit)

if __name__ == "__main__":
    sys.exit(main())
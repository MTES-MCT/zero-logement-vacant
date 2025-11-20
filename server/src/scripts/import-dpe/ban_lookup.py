#!/usr/bin/env python3
"""
Script de recherche d'adresses BAN par identifiant.

Utilise le format Parquet pour des performances optimales.
Convertit automatiquement le CSV en Parquet lors de la première utilisation.

Usage:
    # Convertir CSV en Parquet (une seule fois)
    python ban_lookup.py --convert adresses-france.csv

    # Rechercher par identifiant BAN
    python ban_lookup.py --search 59414_1100_00738

    # Rechercher plusieurs identifiants
    python ban_lookup.py --search 59414_1100_00738 75119_2870_00034 13004_4016_00009

    # Rechercher depuis un fichier (un id par ligne)
    python ban_lookup.py --search-file missing_ban_ids.txt --output results.csv

    # Spécifier un fichier Parquet différent
    python ban_lookup.py --parquet /path/to/ban.parquet --search 59414_1100_00738

Dépendances:
    pip install pandas pyarrow tqdm
"""

import os
import sys
import argparse
from pathlib import Path
from concurrent.futures import ProcessPoolExecutor, as_completed
import multiprocessing

def convert_csv_to_parquet(csv_file, parquet_file=None):
    """Convertit un fichier CSV BAN en format Parquet."""
    try:
        import pandas as pd
    except ImportError:
        print("Erreur: pandas requis. Installation: pip install pandas pyarrow", file=sys.stderr)
        sys.exit(1)

    # Créer le fichier Parquet dans le même dossier que le CSV source
    csv_path = Path(csv_file)
    if parquet_file is None:
        parquet_file = csv_path.with_suffix('.parquet')
    else:
        # Si un nom de fichier Parquet est fourni sans chemin, le mettre dans le dossier du CSV
        parquet_path = Path(parquet_file)
        if not parquet_path.is_absolute() and parquet_path.parent == Path('.'):
            parquet_file = csv_path.parent / parquet_path.name

    print(f"Conversion de {csv_file} en Parquet...")
    print("  Cette opération peut prendre plusieurs minutes pour un fichier volumineux.")

    # Lire le CSV avec les bons types - le fichier BAN utilise le séparateur ';'
    df = pd.read_csv(
        csv_file,
        sep=';',  # Le fichier BAN utilise ';' comme séparateur
        dtype={
            'id': str,
            'id_fantoir': str,
            'numero': str,
            'rep': str,
            'nom_voie': str,
            'code_postal': str,
            'code_insee': str,
            'nom_commune': str,
            'code_insee_ancienne_commune': str,
            'nom_ancienne_commune': str,
            'x': float,
            'y': float,
            'lon': float,
            'lat': float,
            'libelle_acheminement': str,
            'nom_afnor': str,
            'source_position': str,
            'source_nom_voie': str
        },
        low_memory=False
    )

    print(f"  - {len(df):,} adresses chargées")

    # Sauvegarder en Parquet avec compression
    df.to_parquet(parquet_file, index=False, compression='snappy')

    file_size_mb = os.path.getsize(parquet_file) / (1024 * 1024)
    print(f"  - Fichier Parquet créé: {parquet_file} ({file_size_mb:.1f} MB)")

    return parquet_file


def load_parquet(parquet_file):
    """Charge le fichier Parquet en mémoire."""
    try:
        import pandas as pd
    except ImportError:
        print("Erreur: pandas requis. Installation: pip install pandas pyarrow", file=sys.stderr)
        sys.exit(1)

    if not os.path.exists(parquet_file):
        print(f"Erreur: fichier {parquet_file} non trouvé", file=sys.stderr)
        print("Utilisez --convert pour créer le fichier Parquet depuis un CSV", file=sys.stderr)
        sys.exit(1)

    print(f"Chargement de {parquet_file}...")
    df = pd.read_parquet(parquet_file)
    print(f"  - {len(df):,} adresses chargées")

    # Créer un index sur la colonne 'id' pour des recherches rapides
    df.set_index('id', inplace=True, drop=False)

    return df


def search_single_id(ban_id, index_set, df_dict):
    """Recherche une seule adresse par son identifiant BAN."""
    try:
        if ban_id in index_set:
            row = df_dict[ban_id]
            return {
                'id': ban_id,
                'found': True,
                'numero': row.get('numero', ''),
                'rep': row.get('rep', ''),
                'nom_voie': row.get('nom_voie', ''),
                'code_postal': row.get('code_postal', ''),
                'nom_commune': row.get('nom_commune', ''),
                'code_insee': row.get('code_insee', ''),
                'lon': row.get('lon', ''),
                'lat': row.get('lat', '')
            }
        else:
            return {
                'id': ban_id,
                'found': False,
                'numero': '',
                'rep': '',
                'nom_voie': '',
                'code_postal': '',
                'nom_commune': '',
                'code_insee': '',
                'lon': '',
                'lat': ''
            }
    except Exception as e:
        return {
            'id': ban_id,
            'found': False,
            'error': str(e)
        }


def search_by_ids(df, ban_ids, use_tqdm=True):
    """Recherche des adresses par leurs identifiants BAN avec barre de progression."""
    try:
        from tqdm import tqdm
    except ImportError:
        use_tqdm = False

    # Créer un dict avec la première occurrence de chaque id pour des recherches O(1)
    print("  Création de l'index de recherche...")
    # Supprimer les doublons en gardant la première occurrence
    df_unique = df[~df.index.duplicated(keep='first')]
    df_dict = df_unique.to_dict('index')
    index_set = set(df_dict.keys())

    results = []

    if use_tqdm:
        iterator = tqdm(ban_ids, desc="Recherche", unit="id", ncols=80)
    else:
        iterator = ban_ids

    for ban_id in iterator:
        result = search_single_id(ban_id, index_set, df_dict)
        results.append(result)

    return results


def search_by_ids_parallel(df, ban_ids, workers=None):
    """Recherche parallèle des adresses avec barre de progression tqdm."""
    try:
        from tqdm import tqdm
    except ImportError:
        print("Erreur: tqdm requis. Installation: pip install tqdm", file=sys.stderr)
        sys.exit(1)

    if workers is None:
        workers = min(multiprocessing.cpu_count(), 8)

    # Créer un dict avec la première occurrence de chaque id pour des recherches O(1)
    print(f"  Création de l'index de recherche...")
    df_unique = df[~df.index.duplicated(keep='first')]
    df_dict = df_unique.to_dict('index')
    index_set = set(df_dict.keys())

    # Pour de petits lots, pas besoin de parallélisation
    if len(ban_ids) < 1000:
        results = []
        for ban_id in tqdm(ban_ids, desc="Recherche", unit="id", ncols=80):
            results.append(search_single_id(ban_id, index_set, df_dict))
        return results

    # Recherche séquentielle avec tqdm (plus efficace que multiprocessing pour ce cas)
    # car le DataFrame est déjà en mémoire et les lookups sont O(1)
    results = []
    for ban_id in tqdm(ban_ids, desc="Recherche", unit="id", ncols=80):
        results.append(search_single_id(ban_id, index_set, df_dict))

    return results


def print_results(results):
    """Affiche les résultats de recherche."""
    for r in results:
        if r.get('found'):
            print(f"\n{r['id']} - TROUVÉ")
            print(f"  Adresse: {r['numero']}{r['rep']} {r['nom_voie']}")
            print(f"  Commune: {r['code_postal']} {r['nom_commune']} ({r['code_insee']})")
            print(f"  Coordonnées: {r['lon']}, {r['lat']}")
        else:
            print(f"\n{r['id']} - NON TROUVÉ")


def save_results_to_csv(results, output_file):
    """Sauvegarde les résultats en CSV."""
    import csv

    with open(output_file, 'w', newline='', encoding='utf-8') as f:
        fieldnames = ['id', 'found', 'numero', 'rep', 'nom_voie', 'code_postal', 'nom_commune', 'code_insee', 'lon', 'lat']
        writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction='ignore')
        writer.writeheader()
        writer.writerows(results)

    found_count = sum(1 for r in results if r.get('found'))
    print(f"\nRésultats sauvegardés dans {output_file}")
    print(f"  - Total: {len(results)}")
    print(f"  - Trouvés: {found_count}")
    print(f"  - Non trouvés: {len(results) - found_count}")


def main():
    parser = argparse.ArgumentParser(description='Recherche d\'adresses BAN par identifiant')
    parser.add_argument('--convert', metavar='CSV', help='Convertir un fichier CSV en Parquet')
    parser.add_argument('--parquet', default='ban.parquet', help='Fichier Parquet à utiliser (défaut: ban.parquet)')
    parser.add_argument('--search', nargs='+', metavar='ID', help='Identifiants BAN à rechercher')
    parser.add_argument('--search-file', metavar='FILE', help='Fichier contenant les identifiants (un par ligne)')
    parser.add_argument('--search-csv', metavar='CSV', help='Fichier CSV avec colonne identifiant_ban (ex: missing_dpe.csv)')
    parser.add_argument('--ban-column', default='identifiant_ban', help='Nom de la colonne contenant les identifiants BAN (défaut: identifiant_ban)')
    parser.add_argument('--output', metavar='CSV', help='Fichier CSV de sortie pour les résultats')

    args = parser.parse_args()

    # Mode conversion
    if args.convert:
        convert_csv_to_parquet(args.convert, args.parquet)
        return

    # Mode recherche
    if args.search or args.search_file or args.search_csv:
        # Charger les identifiants à rechercher
        ban_ids = []

        if args.search:
            ban_ids.extend(args.search)

        if args.search_file:
            with open(args.search_file, 'r') as f:
                ban_ids.extend(line.strip() for line in f if line.strip())

        if args.search_csv:
            import csv
            with open(args.search_csv, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                if args.ban_column not in reader.fieldnames:
                    print(f"Erreur: colonne '{args.ban_column}' non trouvée dans {args.search_csv}", file=sys.stderr)
                    print(f"Colonnes disponibles: {', '.join(reader.fieldnames)}", file=sys.stderr)
                    sys.exit(1)
                for row in reader:
                    ban_id = row.get(args.ban_column, '').strip()
                    if ban_id:
                        ban_ids.append(ban_id)

        if not ban_ids:
            print("Erreur: aucun identifiant à rechercher", file=sys.stderr)
            sys.exit(1)

        print(f"Recherche de {len(ban_ids)} identifiant(s)...")

        # Charger le Parquet
        df = load_parquet(args.parquet)

        # Rechercher
        results = search_by_ids(df, ban_ids)

        # Afficher ou sauvegarder
        if args.output:
            save_results_to_csv(results, args.output)
        else:
            print_results(results)

        # Log de fin avec taux de réussite
        found_count = sum(1 for r in results if r.get('found'))
        total = len(results)
        not_found = total - found_count
        success_rate = (found_count / total * 100) if total > 0 else 0

        print(f"\n{'='*50}")
        print(f"RÉSUMÉ DE LA RECHERCHE")
        print(f"{'='*50}")
        print(f"  Total recherché : {total:,}")
        print(f"  Trouvés         : {found_count:,} ({success_rate:.1f}%)")
        print(f"  Non trouvés     : {not_found:,} ({100-success_rate:.1f}%)")
        print(f"{'='*50}")

        return

    # Aucune action
    parser.print_help()


if __name__ == "__main__":
    main()

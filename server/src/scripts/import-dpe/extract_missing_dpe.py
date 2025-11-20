#!/usr/bin/env python3
"""
Script d'extraction des DPE présents dans RAW mais absents de la production.

Extrait en CSV la liste des logements dont l'identifiant_ban n'est pas présent
dans la table ban_addresses de production.

Usage:
    DATABASE_URL_RAW="postgres://..." DATABASE_URL_PROD="postgres://..." python extract_missing_dpe.py [OPTIONS]

Options:
    --output FILE       Fichier CSV de sortie (défaut: missing_dpe.csv)
    --year YEAR         Filtrer par année (ex: 2025)
    --limit N           Limiter le nombre de résultats
    --sample N          Extraire un échantillon aléatoire de N lignes

Variables d'environnement requises:
    DATABASE_URL_RAW  - Base contenant dpe_raw
    DATABASE_URL_PROD - Base contenant ban_addresses
"""

import os
import sys
import csv
import argparse
from datetime import datetime
import psycopg2
from urllib.parse import urlparse

def get_db_connection(database_url):
    """Établit une connexion à la base de données."""
    parsed = urlparse(database_url)
    return psycopg2.connect(
        host=parsed.hostname,
        port=parsed.port or 5432,
        database=parsed.path[1:],
        user=parsed.username,
        password=parsed.password
    )

def extract_missing_dpe(conn_raw, conn_prod, output_file, year=None, limit=None, sample=None):
    """Extrait les DPE dont l'identifiant_ban n'est pas dans ban_addresses."""
    cursor_raw = conn_raw.cursor()
    cursor_prod = conn_prod.cursor()

    print("Récupération des identifiants BAN de la production...")

    # Récupérer tous les ban_id de la production
    cursor_prod.execute("""
        SELECT DISTINCT ban_id
        FROM ban_addresses
        WHERE address_kind = 'Housing'
          AND ban_id IS NOT NULL
    """)
    prod_ban_ids = set(row[0] for row in cursor_prod.fetchall())
    print(f"  - {len(prod_ban_ids):,} identifiants BAN en production")

    # Construire la requête pour les DPE RAW
    where_clauses = ["identifiant_ban IS NOT NULL"]
    params = []

    if year:
        where_clauses.append("EXTRACT(YEAR FROM date_etablissement_dpe) = %s")
        params.append(year)

    where_sql = " AND ".join(where_clauses)

    order_sql = "ORDER BY RANDOM()" if sample else "ORDER BY date_etablissement_dpe DESC"
    limit_sql = f"LIMIT {sample or limit}" if (sample or limit) else ""

    query = f"""
        SELECT
            dpe_id,
            identifiant_ban,
            date_etablissement_dpe,
            date_reception_dpe,
            adresse_ban,
            code_postal_ban,
            nom_commune_ban,
            code_departement_ban,
            etiquette_dpe,
            etiquette_ges,
            type_batiment,
            surface_habitable_logement,
            annee_construction
        FROM dpe_raw
        WHERE {where_sql}
        {order_sql}
        {limit_sql}
    """

    print(f"Récupération des DPE RAW{f' ({year})' if year else ''}...")
    cursor_raw.execute(query, params)

    # Filtrer les DPE dont le ban_id n'est pas en production
    missing_count = 0
    total_count = 0

    with open(output_file, 'w', newline='', encoding='utf-8') as csvfile:
        writer = csv.writer(csvfile)

        # En-têtes
        writer.writerow([
            'identifiant_dpe',
            'identifiant_ban',
            'date_etablissement_dpe',
            'date_reception_dpe',
            'adresse_ban',
            'code_postal_ban',
            'nom_commune_ban',
            'code_departement_ban',
            'etiquette_dpe',
            'etiquette_ges',
            'type_batiment',
            'surface_habitable',
            'annee_construction'
        ])

        for row in cursor_raw:
            total_count += 1
            identifiant_ban = row[1]

            if identifiant_ban not in prod_ban_ids:
                writer.writerow(row)
                missing_count += 1

            if total_count % 100000 == 0:
                print(f"  - {total_count:,} DPE analysés, {missing_count:,} manquants...")

    print()
    print(f"Extraction terminée:")
    print(f"  - DPE analysés: {total_count:,}")
    print(f"  - DPE manquants (BAN non trouvé): {missing_count:,}")
    print(f"  - Taux de matching: {(total_count - missing_count) * 100.0 / total_count:.1f}%")
    print(f"  - Fichier généré: {output_file}")

    cursor_raw.close()
    cursor_prod.close()

    return missing_count

def main():
    parser = argparse.ArgumentParser(description='Extraction des DPE manquants en production')
    parser.add_argument('--output', default='missing_dpe.csv', help='Fichier CSV de sortie')
    parser.add_argument('--year', type=int, help='Filtrer par année (ex: 2025)')
    parser.add_argument('--limit', type=int, help='Limiter le nombre de résultats')
    parser.add_argument('--sample', type=int, help='Extraire un échantillon aléatoire')
    args = parser.parse_args()

    # Vérifier les variables d'environnement
    url_raw = os.environ.get('DATABASE_URL_RAW')
    url_prod = os.environ.get('DATABASE_URL_PROD')

    if not url_raw:
        print("Erreur: DATABASE_URL_RAW non définie", file=sys.stderr)
        sys.exit(1)

    if not url_prod:
        print("Erreur: DATABASE_URL_PROD non définie", file=sys.stderr)
        sys.exit(1)

    try:
        print("Connexion aux bases de données...")
        conn_raw = get_db_connection(url_raw)
        conn_prod = get_db_connection(url_prod)
        print()

        extract_missing_dpe(
            conn_raw,
            conn_prod,
            args.output,
            year=args.year,
            limit=args.limit,
            sample=args.sample
        )

        conn_raw.close()
        conn_prod.close()
    except Exception as e:
        print(f"Erreur: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()

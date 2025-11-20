#!/usr/bin/env python3
"""
Script de comparaison des données DPE entre la table brute (dpe_raw) et
la table de production (buildings).

Ce script détecte les anomalies et incohérences entre les deux sources.

Usage:
    # Rapport texte (défaut)
    DATABASE_URL_RAW="postgres://..." DATABASE_URL_PROD="postgres://..." python analyze_dpe_prod_comparison.py

    # Rapport PDF avec graphiques
    DATABASE_URL_RAW="postgres://..." DATABASE_URL_PROD="postgres://..." python analyze_dpe_prod_comparison.py --pdf rapport.pdf

Variables d'environnement requises:
    DATABASE_URL_RAW  - Base contenant dpe_raw
    DATABASE_URL_PROD - Base contenant buildings

Dépendances pour PDF:
    pip install matplotlib reportlab
"""

import os
import sys
import argparse
from datetime import datetime, timedelta
import psycopg2
from urllib.parse import urlparse

# Variables globales pour stocker les données pour le PDF
report_data = {}

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

def analyze_comparison(conn_raw, conn_prod):
    """Compare les données DPE entre dpe_raw et buildings."""
    cursor_raw = conn_raw.cursor()
    cursor_prod = conn_prod.cursor()

    print("=" * 80)
    print("COMPARAISON DPE: RAW vs PRODUCTION (buildings)")
    print("=" * 80)
    print()

    # 1. Vue d'ensemble
    print("-" * 80)
    print("VUE D'ENSEMBLE")
    print("-" * 80)

    cursor_raw.execute("SELECT COUNT(*) FROM dpe_raw")
    total_raw = cursor_raw.fetchone()[0]

    cursor_prod.execute("SELECT COUNT(*) FROM buildings")
    total_buildings = cursor_prod.fetchone()[0]

    cursor_prod.execute("SELECT COUNT(*) FROM buildings WHERE dpe_id IS NOT NULL")
    buildings_with_dpe = cursor_prod.fetchone()[0]

    cursor_prod.execute("SELECT COUNT(*) FROM buildings WHERE class_dpe IS NOT NULL")
    buildings_with_class = cursor_prod.fetchone()[0]

    print(f"Total DPE bruts (dpe_raw): {total_raw:,}")
    print(f"Total buildings: {total_buildings:,}")
    print(f"Buildings avec dpe_id: {buildings_with_dpe:,} ({buildings_with_dpe * 100.0 / total_buildings:.2f}%)")
    print(f"Buildings avec class_dpe: {buildings_with_class:,} ({buildings_with_class * 100.0 / total_buildings:.2f}%)")
    print()

    # Stocker pour PDF
    report_data['total_raw'] = total_raw
    report_data['total_buildings'] = total_buildings
    report_data['buildings_with_dpe'] = buildings_with_dpe
    report_data['import_rate'] = buildings_with_dpe * 100.0 / total_buildings if total_buildings > 0 else 0

    # 2. Distribution par classe DPE dans buildings
    print("-" * 80)
    print("DISTRIBUTION PAR CLASSE DPE (buildings)")
    print("-" * 80)

    cursor_prod.execute("""
        SELECT
            COALESCE(class_dpe, 'NULL') as classe,
            COUNT(*) as nb
        FROM buildings
        GROUP BY class_dpe
        ORDER BY
            CASE
                WHEN class_dpe IS NULL THEN 'Z'
                ELSE class_dpe
            END
    """)

    print(f"{'Classe':<10} {'Nombre':>15}")
    print("-" * 30)
    class_dist = {}
    for row in cursor_prod.fetchall():
        classe, nb = row
        print(f"{classe:<10} {nb:>15,}")
        class_dist[classe] = nb
    print()

    # Stocker pour PDF
    report_data['class_distribution'] = class_dist

    # 3. Distribution par date DPE dans buildings
    print("-" * 80)
    print("DISTRIBUTION PAR ANNÉE DPE (buildings.dpe_date_at)")
    print("-" * 80)

    cursor_prod.execute("""
        SELECT
            EXTRACT(YEAR FROM dpe_date_at)::int as annee,
            COUNT(*) as nb
        FROM buildings
        WHERE dpe_date_at IS NOT NULL
        GROUP BY annee
        ORDER BY annee DESC
    """)

    results = cursor_prod.fetchall()
    if results:
        print(f"{'Année':<10} {'Nombre':>15}")
        print("-" * 30)
        for row in results:
            annee, nb = row
            print(f"{int(annee):<10} {nb:>15,}")
    else:
        print("Aucune date DPE renseignée dans buildings")
    print()

    # 4. Comparaison des 12 derniers mois
    print("-" * 80)
    print("COMPARAISON DES 12 DERNIERS MOIS")
    print("-" * 80)

    twelve_months_ago = datetime.now().date() - timedelta(days=365)

    # Dans dpe_raw
    cursor_raw.execute("""
        SELECT
            TO_CHAR(date_etablissement_dpe, 'YYYY-MM') as mois,
            COUNT(*) as nb
        FROM dpe_raw
        WHERE date_etablissement_dpe >= %s
        GROUP BY mois
        ORDER BY mois DESC
    """, (twelve_months_ago,))
    raw_months = {row[0]: row[1] for row in cursor_raw.fetchall()}

    # Dans buildings
    cursor_prod.execute("""
        SELECT
            TO_CHAR(dpe_date_at, 'YYYY-MM') as mois,
            COUNT(*) as nb
        FROM buildings
        WHERE dpe_date_at >= %s
          AND dpe_date_at IS NOT NULL
        GROUP BY mois
        ORDER BY mois DESC
    """, (twelve_months_ago,))
    prod_months = {row[0]: row[1] for row in cursor_prod.fetchall()}

    all_months = sorted(set(raw_months.keys()) | set(prod_months.keys()), reverse=True)

    if all_months:
        print(f"{'Mois':<10} {'RAW':>12} {'PROD':>12} {'Ratio':>10}")
        print("-" * 50)
        for mois in all_months:
            raw_count = raw_months.get(mois, 0)
            prod_count = prod_months.get(mois, 0)
            ratio = (prod_count / raw_count * 100) if raw_count > 0 else 0
            print(f"{mois:<10} {raw_count:>12,} {prod_count:>12,} {ratio:>9.1f}%")
    print()

    # 5. Analyse du type de match DPE
    print("-" * 80)
    print("DISTRIBUTION PAR TYPE DE MATCH DPE (dpe_import_match)")
    print("-" * 80)

    cursor_prod.execute("""
        SELECT
            COALESCE(dpe_import_match, 'NULL') as match_type,
            COUNT(*) as nb
        FROM buildings
        GROUP BY dpe_import_match
        ORDER BY nb DESC
    """)

    print(f"{'Type de match':<20} {'Nombre':>15}")
    print("-" * 40)
    for row in cursor_prod.fetchall():
        match_type, nb = row
        print(f"{match_type:<20} {nb:>15,}")
    print()

    # 6. Analyse des DPE RAW non importés
    print("-" * 80)
    print("ANALYSE DES DPE RAW NON IMPORTÉS")
    print("-" * 80)
    print()

    # Qualité des données RAW pour le matching
    cursor_raw.execute("""
        SELECT
            COUNT(*) as total,
            COUNT(id_rnb) as avec_rnb,
            COUNT(identifiant_ban) as avec_ban,
            COUNT(CASE WHEN id_rnb IS NOT NULL OR identifiant_ban IS NOT NULL THEN 1 END) as matchable
        FROM dpe_raw
    """)
    raw_stats = cursor_raw.fetchone()
    total, avec_rnb, avec_ban, matchable = raw_stats

    print("Qualité des données RAW pour le matching:")
    print(f"  Total DPE RAW: {total:,}")
    print(f"  Avec id_rnb (RNB): {avec_rnb:,} ({avec_rnb * 100.0 / total:.1f}%)")
    print(f"  Avec identifiant_ban: {avec_ban:,} ({avec_ban * 100.0 / total:.1f}%)")
    print(f"  Matchables (RNB ou BAN): {matchable:,} ({matchable * 100.0 / total:.1f}%)")
    print(f"  Non matchables: {total - matchable:,} ({(total - matchable) * 100.0 / total:.1f}%)")
    print()

    # Vérifier les RNB IDs présents dans RAW mais absents de PROD
    print("Analyse des RNB IDs:")

    # Compter les buildings avec rnb_id en PROD
    cursor_prod.execute("SELECT COUNT(*) FROM buildings WHERE rnb_id IS NOT NULL")
    buildings_with_rnb = cursor_prod.fetchone()[0]
    print(f"  Buildings avec rnb_id: {buildings_with_rnb:,}")

    # Récupérer un échantillon de RNB IDs de RAW pour vérifier leur présence en PROD
    cursor_raw.execute("""
        SELECT id_rnb, COUNT(*) as nb_dpe
        FROM dpe_raw
        WHERE id_rnb IS NOT NULL
        GROUP BY id_rnb
        ORDER BY nb_dpe DESC
        LIMIT 1000
    """)
    sample_rnb_ids = cursor_raw.fetchall()

    if sample_rnb_ids:
        rnb_ids = [row[0] for row in sample_rnb_ids]

        # Vérifier combien sont présents en PROD
        cursor_prod.execute("""
            SELECT COUNT(DISTINCT rnb_id)
            FROM buildings
            WHERE rnb_id = ANY(%s)
        """, (rnb_ids,))
        found_in_prod = cursor_prod.fetchone()[0]

        print(f"  Échantillon 1000 RNB IDs les plus fréquents dans RAW:")
        print(f"    - Trouvés dans buildings: {found_in_prod:,}")
        print(f"    - Non trouvés: {len(rnb_ids) - found_in_prod:,}")
        print(f"    - Taux de matching: {found_in_prod * 100.0 / len(rnb_ids):.1f}%")
    print()

    # Distribution des DPE RAW par présence des identifiants
    print("Distribution des DPE RAW par type d'identifiant:")
    cursor_raw.execute("""
        SELECT
            CASE
                WHEN id_rnb IS NOT NULL AND identifiant_ban IS NOT NULL THEN 'RNB + BAN'
                WHEN id_rnb IS NOT NULL THEN 'RNB seul'
                WHEN identifiant_ban IS NOT NULL THEN 'BAN seul'
                ELSE 'Aucun'
            END as type_id,
            COUNT(*) as nb
        FROM dpe_raw
        GROUP BY type_id
        ORDER BY nb DESC
    """)

    print(f"{'Type identifiant':<20} {'Nombre':>15} {'%':>10}")
    print("-" * 50)
    id_dist = {}
    for row in cursor_raw.fetchall():
        type_id, nb = row
        print(f"{type_id:<20} {nb:>15,} {nb * 100.0 / total:>9.1f}%")
        id_dist[type_id] = nb
    print()

    # Stocker pour PDF
    report_data['id_distribution'] = id_dist

    # Comparer les DPE importés vs non importés par année
    print("-" * 80)
    print("DPE IMPORTÉS VS NON IMPORTÉS PAR ANNÉE")
    print("-" * 80)

    # DPE dans RAW par année
    cursor_raw.execute("""
        SELECT
            EXTRACT(YEAR FROM date_etablissement_dpe)::int as annee,
            COUNT(*) as total_raw,
            COUNT(id_rnb) as avec_rnb,
            COUNT(identifiant_ban) as avec_ban
        FROM dpe_raw
        WHERE date_etablissement_dpe IS NOT NULL
        GROUP BY annee
        ORDER BY annee DESC
    """)
    raw_by_year = {row[0]: {'total': row[1], 'rnb': row[2], 'ban': row[3]} for row in cursor_raw.fetchall()}

    # DPE importés par année
    cursor_prod.execute("""
        SELECT
            EXTRACT(YEAR FROM dpe_date_at)::int as annee,
            COUNT(*) as nb
        FROM buildings
        WHERE dpe_date_at IS NOT NULL
        GROUP BY annee
        ORDER BY annee DESC
    """)
    prod_by_year = {row[0]: row[1] for row in cursor_prod.fetchall()}

    all_years = sorted(set(raw_by_year.keys()) | set(prod_by_year.keys()), reverse=True)

    print(f"{'Année':<8} {'RAW Total':>12} {'RAW+RNB':>12} {'RAW+BAN':>12} {'PROD':>12} {'Import %':>10}")
    print("-" * 75)
    year_dist = {}
    for year in all_years:
        raw_data = raw_by_year.get(year, {'total': 0, 'rnb': 0, 'ban': 0})
        prod_count = prod_by_year.get(year, 0)
        import_rate = (prod_count / raw_data['total'] * 100) if raw_data['total'] > 0 else 0
        print(f"{year:<8} {raw_data['total']:>12,} {raw_data['rnb']:>12,} {raw_data['ban']:>12,} {prod_count:>12,} {import_rate:>9.1f}%")
        year_dist[year] = {'total': raw_data['total'], 'prod': prod_count, 'import_rate': import_rate}
    print()

    # Stocker pour PDF
    report_data['year_distribution'] = year_dist
    print("Légende:")
    print("  RAW Total  : Nombre total de DPE dans dpe_raw pour cette année")
    print("  RAW+RNB    : DPE avec id_rnb renseigné (matchables via buildings.rnb_id)")
    print("  RAW+BAN    : DPE avec identifiant_ban renseigné (matchables via ban_addresses.ban_id)")
    print("  PROD       : DPE effectivement importés dans buildings")
    print("  Import %   : PROD / RAW Total * 100")
    print()

    # Analyse par trimestre
    print("-" * 80)
    print("DPE IMPORTÉS VS NON IMPORTÉS PAR TRIMESTRE")
    print("-" * 80)

    # DPE dans RAW par trimestre
    cursor_raw.execute("""
        SELECT
            EXTRACT(YEAR FROM date_etablissement_dpe)::int as annee,
            EXTRACT(QUARTER FROM date_etablissement_dpe)::int as trimestre,
            COUNT(*) as total_raw,
            COUNT(id_rnb) as avec_rnb,
            COUNT(identifiant_ban) as avec_ban
        FROM dpe_raw
        WHERE date_etablissement_dpe IS NOT NULL
        GROUP BY annee, trimestre
        ORDER BY annee DESC, trimestre DESC
    """)
    raw_by_quarter = {}
    for row in cursor_raw.fetchall():
        annee, trimestre, total_raw, avec_rnb, avec_ban = row
        key = f"{int(annee)}-Q{int(trimestre)}"
        raw_by_quarter[key] = {'total': total_raw, 'rnb': avec_rnb, 'ban': avec_ban}

    # DPE importés par trimestre
    cursor_prod.execute("""
        SELECT
            EXTRACT(YEAR FROM dpe_date_at)::int as annee,
            EXTRACT(QUARTER FROM dpe_date_at)::int as trimestre,
            COUNT(*) as nb
        FROM buildings
        WHERE dpe_date_at IS NOT NULL
        GROUP BY annee, trimestre
        ORDER BY annee DESC, trimestre DESC
    """)
    prod_by_quarter = {}
    for row in cursor_prod.fetchall():
        annee, trimestre, nb = row
        key = f"{int(annee)}-Q{int(trimestre)}"
        prod_by_quarter[key] = nb

    all_quarters = sorted(set(raw_by_quarter.keys()) | set(prod_by_quarter.keys()), reverse=True)

    print(f"{'Trimestre':<12} {'RAW Total':>12} {'RAW+RNB':>12} {'RAW+BAN':>12} {'PROD':>12} {'Import %':>10}")
    print("-" * 80)
    quarter_dist = {}
    for quarter in all_quarters:
        raw_data = raw_by_quarter.get(quarter, {'total': 0, 'rnb': 0, 'ban': 0})
        prod_count = prod_by_quarter.get(quarter, 0)
        import_rate = (prod_count / raw_data['total'] * 100) if raw_data['total'] > 0 else 0
        print(f"{quarter:<12} {raw_data['total']:>12,} {raw_data['rnb']:>12,} {raw_data['ban']:>12,} {prod_count:>12,} {import_rate:>9.1f}%")
        quarter_dist[quarter] = {
            'total': raw_data['total'],
            'rnb': raw_data['rnb'],
            'ban': raw_data['ban'],
            'prod': prod_count,
            'import_rate': import_rate
        }
    print()

    # Stocker pour PDF
    report_data['quarter_distribution'] = quarter_dist

    # Analyse du faible taux d'import pour 2025
    print("-" * 80)
    print("ANALYSE DU FAIBLE TAUX D'IMPORT 2025 (RAW+BAN vs PROD)")
    print("-" * 80)
    print()

    # Compter les identifiant_ban uniques pour 2025 dans RAW
    cursor_raw.execute("""
        SELECT COUNT(DISTINCT identifiant_ban) as unique_ban_ids
        FROM dpe_raw
        WHERE identifiant_ban IS NOT NULL
          AND EXTRACT(YEAR FROM date_etablissement_dpe) = 2025
    """)
    unique_ban_2025_raw = cursor_raw.fetchone()[0]
    print(f"Identifiants BAN uniques dans dpe_raw (2025): {unique_ban_2025_raw:,}")

    # Vérifier combien de ban_addresses existent en PROD
    cursor_prod.execute("""
        SELECT COUNT(DISTINCT ban_id) as unique_ban_ids
        FROM ban_addresses
        WHERE address_kind = 'Housing'
    """)
    unique_ban_in_prod = cursor_prod.fetchone()[0]
    print(f"Adresses BAN uniques dans ban_addresses (PROD): {unique_ban_in_prod:,}")
    print()

    # Stocker pour PDF
    report_data['unique_ban_prod'] = unique_ban_in_prod
    report_data['unique_ban_raw'] = unique_ban_2025_raw

    # Compter combien de BAN 2025 existent dans ban_addresses (comparaison directe)
    cursor_raw.execute("""
        SELECT ARRAY_AGG(DISTINCT identifiant_ban)
        FROM dpe_raw
        WHERE identifiant_ban IS NOT NULL
          AND EXTRACT(YEAR FROM date_etablissement_dpe) = 2025
    """)
    all_ban_2025 = cursor_raw.fetchone()[0] or []

    if all_ban_2025:
        cursor_prod.execute("""
            SELECT COUNT(DISTINCT ban_id)
            FROM ban_addresses
            WHERE address_kind = 'Housing'
              AND ban_id = ANY(%s)
        """, (all_ban_2025,))
        found_ban_in_prod = cursor_prod.fetchone()[0]

        match_rate = found_ban_in_prod * 100.0 / len(all_ban_2025)
        print(f"Matching des identifiant_ban 2025 avec ban_addresses:")
        print(f"  - Total BAN uniques 2025: {len(all_ban_2025):,}")
        print(f"  - Trouvés dans ban_addresses: {found_ban_in_prod:,}")
        print(f"  - Non trouvés: {len(all_ban_2025) - found_ban_in_prod:,}")
        print(f"  - Taux de matching: {match_rate:.1f}%")
        print()

        # Stocker pour PDF
        report_data['ban_match_rate'] = match_rate

        # Vérifier combien de buildings matchés ont déjà un DPE
        cursor_prod.execute("""
            SELECT
                COUNT(DISTINCT b.id) as total_buildings,
                COUNT(DISTINCT CASE WHEN b.dpe_id IS NOT NULL THEN b.id END) as avec_dpe
            FROM buildings b
            JOIN fast_housing fh ON b.id = fh.building_id
            JOIN ban_addresses ba ON fh.id = ba.ref_id
            WHERE ba.address_kind = 'Housing'
              AND ba.ban_id = ANY(%s)
        """, (all_ban_2025,))
        result = cursor_prod.fetchone()
        if result and result[0] > 0:
            total_b, avec_dpe = result
            sans_dpe = total_b - avec_dpe
            print(f"Buildings correspondant aux BAN 2025:")
            print(f"  - Total trouvés: {total_b:,}")
            print(f"  - Déjà avec DPE: {avec_dpe:,} ({avec_dpe * 100.0 / total_b:.1f}%)")
            print(f"  - Sans DPE (importables): {sans_dpe:,} ({sans_dpe * 100.0 / total_b:.1f}%)")
            print()

            # ANALYSE DÉTAILLÉE : Vérifier si les DPE ont été mis à jour
            print("Analyse détaillée des buildings avec DPE:")
            cursor_prod.execute("""
                SELECT
                    EXTRACT(YEAR FROM b.dpe_date_at)::int as annee_dpe,
                    COUNT(DISTINCT b.id) as nb_buildings
                FROM buildings b
                JOIN fast_housing fh ON b.id = fh.building_id
                JOIN ban_addresses ba ON fh.id = ba.ref_id
                WHERE ba.address_kind = 'Housing'
                  AND ba.ban_id = ANY(%s)
                  AND b.dpe_id IS NOT NULL
                  AND b.dpe_date_at IS NOT NULL
                GROUP BY annee_dpe
                ORDER BY annee_dpe DESC
            """, (all_ban_2025,))

            print(f"  Répartition par année du DPE actuellement en base:")
            for row in cursor_prod.fetchall():
                annee, nb = row
                print(f"    - {int(annee)}: {nb:,} buildings")

            # Compter combien ont effectivement un DPE de 2025
            cursor_prod.execute("""
                SELECT COUNT(DISTINCT b.id)
                FROM buildings b
                JOIN fast_housing fh ON b.id = fh.building_id
                JOIN ban_addresses ba ON fh.id = ba.ref_id
                WHERE ba.address_kind = 'Housing'
                  AND ba.ban_id = ANY(%s)
                  AND b.dpe_id IS NOT NULL
                  AND EXTRACT(YEAR FROM b.dpe_date_at) = 2025
            """, (all_ban_2025,))
            buildings_avec_dpe_2025 = cursor_prod.fetchone()[0]

            print()
            print(f"  ⚠️  Buildings avec un DPE 2025: {buildings_avec_dpe_2025:,}")
            print(f"  ⚠️  Buildings avec un DPE plus ancien: {avec_dpe - buildings_avec_dpe_2025:,}")
            print()
            print("CONCLUSION:")
            if buildings_avec_dpe_2025 < avec_dpe:
                print(f"  Les {avec_dpe - buildings_avec_dpe_2025:,} buildings avec DPE ancien N'ONT PAS été mis à jour")
                print(f"  avec les DPE 2025 disponibles dans dpe_raw.")
                print(f"  Cela suggère que le script d'import ne met PAS à jour les DPE existants.")
        print()

    print("Causes possibles du faible taux d'import 2025:")
    print("  1. Les identifiant_ban du fichier DPE ne correspondent pas aux ban_id en base")
    print("  2. Les buildings avec ces adresses ont déjà un DPE importé (années précédentes)")
    print("     NOTE: Le script import-dpe.py a été modifié pour mettre à jour avec le DPE le plus récent")
    print("     Les buildings avec DPE existant seront mis à jour si le nouveau DPE est plus récent")
    print("  3. Le script import-dpe.py n'a pas été relancé avec les données 2025")
    print("  4. Peu de id_rnb disponibles pour 2025 (16k vs 1.5M pour 2024)")
    print()

    # Comparaison des différentes dates par année
    print("-" * 80)
    print("DISTRIBUTION PAR TYPE DE DATE (par année)")
    print("-" * 80)

    cursor_raw.execute("""
        SELECT
            EXTRACT(YEAR FROM date_etablissement_dpe)::int as annee,
            COUNT(*) as etablissement,
            COUNT(CASE WHEN EXTRACT(YEAR FROM date_reception_dpe) = EXTRACT(YEAR FROM date_etablissement_dpe) THEN 1 END) as reception_meme_annee,
            COUNT(CASE WHEN EXTRACT(YEAR FROM date_visite_diagnostiqueur) = EXTRACT(YEAR FROM date_etablissement_dpe) THEN 1 END) as visite_meme_annee,
            MAX(date_reception_dpe) as max_reception,
            MAX(date_derniere_modification_dpe) as max_modification
        FROM dpe_raw
        WHERE date_etablissement_dpe IS NOT NULL
        GROUP BY annee
        ORDER BY annee DESC
    """)

    print(f"{'Année':<8} {'Établissement':>14} {'Max Réception':>15} {'Max Modification':>18}")
    print("-" * 60)
    for row in cursor_raw.fetchall():
        annee, etablissement, _, _, max_reception, max_modification = row
        max_rec_str = str(max_reception)[:10] if max_reception else 'N/A'
        max_mod_str = str(max_modification)[:10] if max_modification else 'N/A'
        print(f"{int(annee):<8} {etablissement:>14,} {max_rec_str:>15} {max_mod_str:>18}")
    print()

    # Distribution mensuelle récente avec toutes les dates
    print("-" * 80)
    print("DISTRIBUTION MENSUELLE RÉCENTE (12 derniers mois)")
    print("-" * 80)

    cursor_raw.execute("""
        SELECT
            TO_CHAR(date_etablissement_dpe, 'YYYY-MM') as mois,
            COUNT(*) as etablissement,
            MAX(date_reception_dpe) as max_reception,
            MAX(date_derniere_modification_dpe) as max_modification
        FROM dpe_raw
        WHERE date_etablissement_dpe >= CURRENT_DATE - INTERVAL '12 months'
        GROUP BY mois
        ORDER BY mois DESC
    """)

    print(f"{'Mois':<10} {'Établissement':>14} {'Max Réception':>15} {'Max Modification':>18}")
    print("-" * 62)
    for row in cursor_raw.fetchall():
        mois, etablissement, max_reception, max_modification = row
        max_rec_str = str(max_reception)[:10] if max_reception else 'N/A'
        max_mod_str = str(max_modification)[:10] if max_modification else 'N/A'
        print(f"{mois:<10} {etablissement:>14,} {max_rec_str:>15} {max_mod_str:>18}")
    print()

    # 7. Détection d'anomalies
    print("-" * 80)
    print("DÉTECTION D'ANOMALIES")
    print("-" * 80)
    print()

    # Buildings avec dpe_id mais sans class_dpe
    cursor_prod.execute("""
        SELECT COUNT(*)
        FROM buildings
        WHERE dpe_id IS NOT NULL AND class_dpe IS NULL
    """)
    anomaly1 = cursor_prod.fetchone()[0]
    print(f"Buildings avec dpe_id mais sans class_dpe: {anomaly1:,}")

    # Buildings avec class_dpe mais sans dpe_date_at
    cursor_prod.execute("""
        SELECT COUNT(*)
        FROM buildings
        WHERE class_dpe IS NOT NULL AND dpe_date_at IS NULL
    """)
    anomaly2 = cursor_prod.fetchone()[0]
    print(f"Buildings avec class_dpe mais sans dpe_date_at: {anomaly2:,}")

    # DPE avec dates futures
    cursor_prod.execute("""
        SELECT COUNT(*)
        FROM buildings
        WHERE dpe_date_at > CURRENT_DATE
    """)
    anomaly3 = cursor_prod.fetchone()[0]
    print(f"Buildings avec dpe_date_at dans le futur: {anomaly3:,}")

    # DPE très anciens (avant 2021 - début du nouveau DPE)
    cursor_prod.execute("""
        SELECT COUNT(*)
        FROM buildings
        WHERE dpe_date_at < '2021-01-01'
    """)
    anomaly4 = cursor_prod.fetchone()[0]
    print(f"Buildings avec dpe_date_at avant 2021: {anomaly4:,}")
    print()

    # Stocker pour PDF
    report_data['total_anomalies'] = anomaly1 + anomaly2 + anomaly3 + anomaly4

    # 7. Distribution des adresses BAN non trouvées
    print("-" * 80)
    print("DISTRIBUTION DES ADRESSES BAN NON TROUVÉES")
    print("-" * 80)
    print()

    # Identifiants BAN de RAW qui ne sont pas dans PROD
    cursor_raw.execute("""
        SELECT identifiant_ban
        FROM dpe_raw
        WHERE identifiant_ban IS NOT NULL
    """)
    raw_ban_ids = set(row[0] for row in cursor_raw.fetchall())

    cursor_prod.execute("""
        SELECT ban_id
        FROM ban_addresses
    """)
    prod_ban_ids = set(row[0] for row in cursor_prod.fetchall())

    missing_ban_ids = raw_ban_ids - prod_ban_ids
    found_ban_ids = raw_ban_ids & prod_ban_ids

    print(f"Total identifiant_ban dans dpe_raw: {len(raw_ban_ids):,}")
    print(f"Total ban_id dans ban_addresses: {len(prod_ban_ids):,}")
    print(f"BAN trouvés: {len(found_ban_ids):,} ({len(found_ban_ids) * 100.0 / len(raw_ban_ids):.1f}%)")
    print(f"BAN manquants: {len(missing_ban_ids):,} ({len(missing_ban_ids) * 100.0 / len(raw_ban_ids):.1f}%)")
    print()

    # Distribution par trimestre des BAN manquants
    ban_missing_by_quarter = {}
    if missing_ban_ids:
        print("Distribution des BAN manquants par trimestre:")
        cursor_raw.execute("""
            SELECT
                EXTRACT(YEAR FROM date_etablissement_dpe)::int as annee,
                EXTRACT(QUARTER FROM date_etablissement_dpe)::int as trimestre,
                COUNT(DISTINCT identifiant_ban) as nb_missing
            FROM dpe_raw
            WHERE identifiant_ban = ANY(%s)
              AND date_etablissement_dpe IS NOT NULL
            GROUP BY annee, trimestre
            ORDER BY annee DESC, trimestre DESC
        """, (list(missing_ban_ids),))

        print(f"{'Trimestre':<12} {'BAN Manquants':>15}")
        print("-" * 35)
        for row in cursor_raw.fetchall():
            annee, trimestre, nb = row
            quarter_key = f"{int(annee)}-Q{int(trimestre)}"
            ban_missing_by_quarter[quarter_key] = nb
            print(f"{quarter_key:<12} {nb:>15,}")
        print()

        # Distribution par département (via code INSEE - 2 premiers caractères)
        print("Distribution des BAN manquants par département (top 10):")
        cursor_raw.execute("""
            SELECT
                SUBSTRING(identifiant_ban FROM 1 FOR 2) as dept,
                COUNT(DISTINCT identifiant_ban) as nb_missing
            FROM dpe_raw
            WHERE identifiant_ban = ANY(%s)
            GROUP BY dept
            ORDER BY nb_missing DESC
            LIMIT 10
        """, (list(missing_ban_ids),))

        print(f"{'Département':<15} {'BAN Manquants':>15}")
        print("-" * 35)
        for row in cursor_raw.fetchall():
            dept, nb = row
            print(f"{dept:<15} {nb:>15,}")
        print()

        # Exemples d'identifiants manquants (échantillon de 10)
        print("Échantillon d'identifiants BAN manquants (10 premiers):")
        sample_missing = list(missing_ban_ids)[:10]
        for ban_id in sample_missing:
            print(f"  - {ban_id}")
        print()

    # Stocker pour PDF
    report_data['ban_analysis'] = {
        'total_raw': len(raw_ban_ids),
        'total_prod': len(prod_ban_ids),
        'found': len(found_ban_ids),
        'missing': len(missing_ban_ids),
        'found_rate': len(found_ban_ids) * 100.0 / len(raw_ban_ids) if len(raw_ban_ids) > 0 else 0,
        'missing_by_quarter': ban_missing_by_quarter
    }

    # 8. Résumé des anomalies
    print("=" * 80)
    print("RÉSUMÉ")
    print("=" * 80)
    print()

    taux_import = buildings_with_dpe * 100.0 / total_buildings if total_buildings > 0 else 0
    print(f"Taux d'import DPE: {taux_import:.2f}%")
    print(f"Anomalies détectées: {anomaly1 + anomaly2 + anomaly3 + anomaly4:,}")
    print()

    if taux_import < 50:
        print("⚠️  ALERTE: Taux d'import DPE inférieur à 50%")
        print("   Vérifier que l'import DPE a bien été exécuté sur les buildings.")

    cursor_raw.close()
    cursor_prod.close()

    return report_data


def generate_pdf_report(data, output_file):
    """Génère un rapport PDF avec graphiques."""
    try:
        import matplotlib.pyplot as plt
        from matplotlib.backends.backend_pdf import PdfPages
    except ImportError:
        print("Erreur: matplotlib requis pour la génération PDF", file=sys.stderr)
        print("Installation: pip install matplotlib", file=sys.stderr)
        sys.exit(1)

    with PdfPages(output_file) as pdf:
        # Page 1: Vue d'ensemble
        fig, axes = plt.subplots(2, 2, figsize=(12, 10))
        fig.suptitle('Rapport DPE - Vue d\'ensemble', fontsize=16, fontweight='bold')

        # Graphique 1: Distribution par classe DPE (Pie chart)
        if 'class_distribution' in data:
            ax = axes[0, 0]
            classes = [c for c in data['class_distribution'].keys() if c != 'NULL']
            values = [data['class_distribution'][c] for c in classes]
            colors = ['#2E7D32', '#4CAF50', '#8BC34A', '#CDDC39', '#FFC107', '#FF9800', '#F44336']
            ax.pie(values, labels=classes, autopct='%1.1f%%', colors=colors[:len(classes)])
            ax.set_title('Distribution par classe DPE')

        # Graphique 2: DPE par année (Histogramme)
        if 'year_distribution' in data:
            ax = axes[0, 1]
            years = sorted(data['year_distribution'].keys())
            raw_values = [data['year_distribution'][y]['total'] for y in years]
            prod_values = [data['year_distribution'][y]['prod'] for y in years]
            x = range(len(years))
            width = 0.35
            ax.bar([i - width/2 for i in x], raw_values, width, label='RAW', color='#2196F3')
            ax.bar([i + width/2 for i in x], prod_values, width, label='PROD', color='#4CAF50')
            ax.set_xlabel('Année')
            ax.set_ylabel('Nombre de DPE')
            ax.set_title('DPE RAW vs PROD par année')
            ax.set_xticks(x)
            ax.set_xticklabels([str(y) for y in years])
            ax.legend()

        # Graphique 3: Taux d'import par année
        if 'year_distribution' in data:
            ax = axes[1, 0]
            years = sorted(data['year_distribution'].keys())
            rates = [data['year_distribution'][y]['import_rate'] for y in years]
            ax.bar(years, rates, color='#FF9800')
            ax.set_xlabel('Année')
            ax.set_ylabel('Taux d\'import (%)')
            ax.set_title('Taux d\'import par année')
            ax.axhline(y=50, color='r', linestyle='--', label='Seuil 50%')
            ax.legend()

        # Graphique 4: Répartition des identifiants
        if 'id_distribution' in data:
            ax = axes[1, 1]
            labels = list(data['id_distribution'].keys())
            values = list(data['id_distribution'].values())
            ax.pie(values, labels=labels, autopct='%1.1f%%')
            ax.set_title('Répartition par type d\'identifiant')

        plt.tight_layout()
        pdf.savefig(fig)
        plt.close()

        # Page 2: Analyse détaillée
        fig, ax = plt.subplots(figsize=(12, 8))
        ax.axis('off')

        # Texte d'analyse
        text = f"""
ANALYSE DPE - RAPPORT DÉTAILLÉ
{'=' * 50}

VUE D'ENSEMBLE
{'-' * 30}
Total DPE bruts (RAW): {data.get('total_raw', 'N/A'):,}
Total buildings (PROD): {data.get('total_buildings', 'N/A'):,}
Buildings avec DPE: {data.get('buildings_with_dpe', 'N/A'):,}
Taux d'import global: {data.get('import_rate', 0):.2f}%

ANALYSE DU MATCHING
{'-' * 30}
BAN uniques dans RAW: {data.get('unique_ban_raw', 'N/A'):,}
BAN uniques dans PROD: {data.get('unique_ban_prod', 'N/A'):,}
Taux de matching BAN: {data.get('ban_match_rate', 0):.1f}%

ANOMALIES DÉTECTÉES
{'-' * 30}
Total anomalies: {data.get('total_anomalies', 0):,}

CONCLUSIONS
{'-' * 30}
"""
        if data.get('import_rate', 0) < 50:
            text += "⚠️ Taux d'import inférieur à 50%\n"
            text += "   - Vérifier le matching entre identifiant_ban et ban_addresses\n"
            text += "   - Vérifier que l'import DPE a été exécuté récemment\n"

        if data.get('ban_match_rate', 0) < 50:
            text += "⚠️ Faible taux de matching BAN\n"
            text += "   - Les identifiant_ban du fichier DPE ne correspondent pas aux adresses en base\n"

        ax.text(0.05, 0.95, text, transform=ax.transAxes, fontsize=10,
                verticalalignment='top', fontfamily='monospace')

        pdf.savefig(fig)
        plt.close()

        # Page 3: Distribution par trimestre
        if 'quarter_distribution' in data and data['quarter_distribution']:
            fig, axes = plt.subplots(2, 1, figsize=(14, 10))
            fig.suptitle('Distribution DPE par Trimestre', fontsize=16, fontweight='bold')

            # Graphique 1: RAW vs PROD par trimestre avec RNB IDs
            ax = axes[0]
            quarters = sorted(data['quarter_distribution'].keys(), reverse=True)[:20]  # Limiter aux 20 derniers trimestres
            quarters.reverse()  # Pour afficher de gauche à droite
            raw_values = [data['quarter_distribution'][q]['total'] for q in quarters]
            rnb_values = [data['quarter_distribution'][q]['rnb'] for q in quarters]
            prod_values = [data['quarter_distribution'][q]['prod'] for q in quarters]

            x = range(len(quarters))
            width = 0.25
            ax.bar([i - width for i in x], raw_values, width, label='RAW Total', color='#2196F3', alpha=0.8)
            ax.bar(x, rnb_values, width, label='RAW+RNB', color='#FFC107', alpha=0.8)
            ax.bar([i + width for i in x], prod_values, width, label='PROD (Importés)', color='#4CAF50', alpha=0.8)
            ax.set_xlabel('Trimestre', fontsize=12)
            ax.set_ylabel('Nombre de DPE', fontsize=12)
            ax.set_title('DPE RAW vs PROD par trimestre (20 derniers trimestres)', fontsize=14)
            ax.set_xticks(x)
            ax.set_xticklabels(quarters, rotation=45, ha='right')
            ax.legend(fontsize=11)
            ax.grid(axis='y', alpha=0.3)

            # Graphique 2: Taux d'import par trimestre
            ax = axes[1]
            import_rates = [data['quarter_distribution'][q]['import_rate'] for q in quarters]
            ax.bar(x, import_rates, color='#FF9800', alpha=0.8)
            ax.set_xlabel('Trimestre', fontsize=12)
            ax.set_ylabel('Taux d\'import (%)', fontsize=12)
            ax.set_title('Taux d\'import par trimestre', fontsize=14)
            ax.set_xticks(x)
            ax.set_xticklabels(quarters, rotation=45, ha='right')
            ax.axhline(y=15, color='r', linestyle='--', linewidth=1.5, label='Seuil 15%', alpha=0.7)
            ax.legend(fontsize=11)
            ax.grid(axis='y', alpha=0.3)

            plt.tight_layout()
            pdf.savefig(fig)
            plt.close()

        # Page 4: Analyse des adresses BAN non trouvées
        if 'ban_analysis' in data and 'quarter_distribution' in data:
            fig, axes = plt.subplots(2, 1, figsize=(14, 10))
            fig.suptitle('Analyse des Adresses BAN Non Trouvées', fontsize=16, fontweight='bold')

            # Graphique 1: Distribution par trimestre avec RAW, PROD et BAN manquants
            ax = axes[0]
            ban_data = data['ban_analysis']
            if ban_data.get('missing_by_quarter') and data.get('quarter_distribution'):
                # Limiter aux 20 derniers trimestres
                quarters = sorted(data['quarter_distribution'].keys(), reverse=True)[:20]
                quarters.reverse()

                raw_values = [data['quarter_distribution'][q]['total'] for q in quarters]
                prod_values = [data['quarter_distribution'][q]['prod'] for q in quarters]
                missing_values = [ban_data['missing_by_quarter'].get(q, 0) for q in quarters]

                x = range(len(quarters))
                width = 0.25
                ax.bar([i - width for i in x], raw_values, width, label='RAW Total', color='#2196F3', alpha=0.8)
                ax.bar(x, prod_values, width, label='PROD (Importés)', color='#4CAF50', alpha=0.8)
                ax.bar([i + width for i in x], missing_values, width, label='BAN Non Trouvés', color='#F44336', alpha=0.8)
                ax.set_xlabel('Trimestre', fontsize=12)
                ax.set_ylabel('Nombre de DPE', fontsize=12)
                ax.set_title('DPE RAW vs PROD vs BAN manquants par trimestre (20 derniers)', fontsize=14)
                ax.set_xticks(x)
                ax.set_xticklabels(quarters, rotation=45, ha='right')
                ax.legend(fontsize=11)
                ax.grid(axis='y', alpha=0.3)

            # Graphique 2: Pie chart et statistiques
            ax = axes[1]
            # Diviser axes[1] en deux parties
            ax.remove()
            # Utiliser add_subplot pour créer deux sous-graphiques côte à côte
            ax_pie = fig.add_subplot(2, 2, 3)
            ax_text = fig.add_subplot(2, 2, 4)

            # Pie chart
            sizes = [ban_data['found'], ban_data['missing']]
            labels = [f"Trouvées\n{ban_data['found']:,}", f"Non trouvées\n{ban_data['missing']:,}"]
            colors = ['#4CAF50', '#F44336']
            explode = (0, 0.1)
            ax_pie.pie(sizes, labels=labels, autopct='%1.1f%%', colors=colors, explode=explode, startangle=90)
            ax_pie.set_title(f'Taux de matching BAN\n(Total: {ban_data["total_raw"]:,})', fontsize=11)

            # Texte récapitulatif
            ax_text.axis('off')
            summary_text = f"""
STATISTIQUES

Total identifiant_ban dans DPE:
  {ban_data['total_raw']:,}

Adresses trouvées dans ZLV:
  {ban_data['found']:,} ({ban_data['found_rate']:.1f}%)

Adresses NON trouvées:
  {ban_data['missing']:,} ({100 - ban_data['found_rate']:.1f}%)

IMPACT
Les {ban_data['missing']:,} adresses manquantes
empêchent l'import des DPE correspondants.

ACTION RECOMMANDÉE
Mettre à jour ban_addresses avec les
dernières données BAN.
            """
            ax_text.text(0.05, 0.5, summary_text.strip(), transform=ax_text.transAxes,
                   fontsize=10, verticalalignment='center', fontfamily='monospace',
                   bbox=dict(boxstyle='round', facecolor='wheat', alpha=0.3))

            plt.tight_layout()
            pdf.savefig(fig)
            plt.close()

        # Page 5: Distribution mensuelle
        if 'monthly_distribution' in data and data['monthly_distribution']:
            fig, ax = plt.subplots(figsize=(12, 6))
            months = list(data['monthly_distribution'].keys())
            values = list(data['monthly_distribution'].values())
            ax.bar(months, values, color='#2196F3')
            ax.set_xlabel('Mois')
            ax.set_ylabel('Nombre de DPE')
            ax.set_title('Distribution mensuelle (12 derniers mois)')
            plt.xticks(rotation=45)
            plt.tight_layout()
            pdf.savefig(fig)
            plt.close()

    print(f"Rapport PDF généré: {output_file}")


def main():
    # Parser les arguments
    parser = argparse.ArgumentParser(description='Analyse comparative DPE RAW vs PROD')
    parser.add_argument('--pdf', help='Générer un rapport PDF avec graphiques')
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
        print("Connexion à la base RAW (dpe_raw)...")
        conn_raw = get_db_connection(url_raw)
        print("Connexion à la base PROD (buildings)...")
        conn_prod = get_db_connection(url_prod)
        print()

        data = analyze_comparison(conn_raw, conn_prod)

        # Générer le PDF si demandé
        if args.pdf:
            generate_pdf_report(data, args.pdf)

        conn_raw.close()
        conn_prod.close()
    except Exception as e:
        print(f"Erreur: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()

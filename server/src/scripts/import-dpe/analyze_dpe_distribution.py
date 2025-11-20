#!/usr/bin/env python3
"""
Script d'analyse de la distribution temporelle des données DPE brutes.

Ce script analyse la table dpe_raw pour comprendre la répartition des DPE
dans le temps, particulièrement sur les 12 derniers mois.

Usage:
    python analyze_dpe_distribution.py

Variables d'environnement requises:
    DATABASE_URL ou (DB_HOST, DB_NAME, DB_USER, DB_PASSWORD, DB_PORT)
"""

import os
import sys
import logging
from datetime import datetime, timedelta
from pathlib import Path
import psycopg2
from urllib.parse import urlparse

def setup_logger():
    """Configure le système de logging."""
    # Créer le dossier logs s'il n'existe pas
    log_dir = Path(__file__).parent / 'logs'
    log_dir.mkdir(exist_ok=True)

    # Nom du fichier de log avec timestamp
    log_filename = log_dir / f'analyze_dpe_distribution_{datetime.now().strftime("%Y%m%d_%H%M%S")}.log'

    # Configuration du logger
    logger = logging.getLogger('dpe_distribution_analyzer')
    logger.setLevel(logging.INFO)

    # Clear existing handlers
    for handler in logger.handlers[:]:
        logger.removeHandler(handler)

    # File handler
    file_handler = logging.FileHandler(log_filename, encoding='utf-8')
    file_handler.setLevel(logging.INFO)

    # Console handler
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.INFO)

    # Formatter
    formatter = logging.Formatter('%(levelname)s - %(message)s')
    file_handler.setFormatter(formatter)
    console_handler.setFormatter(formatter)

    logger.addHandler(file_handler)
    logger.addHandler(console_handler)

    return logger, log_filename

def get_db_connection():
    """Établit une connexion à la base de données."""
    database_url = os.environ.get('DATABASE_URL')

    if database_url:
        parsed = urlparse(database_url)
        return psycopg2.connect(
            host=parsed.hostname,
            port=parsed.port or 5432,
            database=parsed.path[1:],
            user=parsed.username,
            password=parsed.password
        )
    else:
        return psycopg2.connect(
            host=os.environ.get('DB_HOST', 'localhost'),
            port=os.environ.get('DB_PORT', 5432),
            database=os.environ.get('DB_NAME', 'zlv'),
            user=os.environ.get('DB_USER', 'postgres'),
            password=os.environ.get('DB_PASSWORD', 'postgres')
        )

def analyze_distribution(conn, logger):
    """Analyse la distribution temporelle des DPE."""
    cursor = conn.cursor()

    logger.info("=" * 80)
    logger.info("ANALYSE DE LA DISTRIBUTION TEMPORELLE DES DONNÉES DPE BRUTES")
    logger.info("=" * 80)
    logger.info("")

    # 1. Nombre total de DPE
    cursor.execute("SELECT COUNT(*) FROM dpe_raw")
    total = cursor.fetchone()[0]
    logger.info(f"Nombre total de DPE dans dpe_raw: {total:,}")
    logger.info("")

    # 2. Plage de dates
    cursor.execute("""
        SELECT
            MIN(date_etablissement_dpe) as min_date,
            MAX(date_etablissement_dpe) as max_date
        FROM dpe_raw
        WHERE date_etablissement_dpe IS NOT NULL
    """)
    min_date, max_date = cursor.fetchone()
    logger.info(f"Période couverte: {min_date} à {max_date}")
    logger.info()

    # 3. Distribution par année
    logger.info("-" * 80)
    logger.info("DISTRIBUTION PAR ANNÉE")
    logger.info("-" * 80)
    cursor.execute("""
        SELECT
            EXTRACT(YEAR FROM date_etablissement_dpe)::int as annee,
            COUNT(*) as nb_dpe,
            ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM dpe_raw WHERE date_etablissement_dpe IS NOT NULL), 2) as pourcentage
        FROM dpe_raw
        WHERE date_etablissement_dpe IS NOT NULL
        GROUP BY annee
        ORDER BY annee DESC
    """)

    logger.info(f"{'Année':<10} {'Nombre DPE':>15} {'Pourcentage':>12}")
    logger.info("-" * 40)
    for row in cursor.fetchall():
        annee, nb, pct = row
        logger.info(f"{int(annee):<10} {nb:>15,} {pct:>11.2f}%")
    logger.info()

    # 4. Distribution des 12 derniers mois
    logger.info("-" * 80)
    logger.info("DISTRIBUTION DES 12 DERNIERS MOIS")
    logger.info("-" * 80)

    # Calculer la date il y a 12 mois
    today = datetime.now().date()
    twelve_months_ago = today - timedelta(days=365)

    cursor.execute("""
        SELECT
            TO_CHAR(date_etablissement_dpe, 'YYYY-MM') as mois,
            COUNT(*) as nb_dpe
        FROM dpe_raw
        WHERE date_etablissement_dpe >= %s
          AND date_etablissement_dpe IS NOT NULL
        GROUP BY mois
        ORDER BY mois DESC
    """, (twelve_months_ago,))

    results_12_months = cursor.fetchall()
    total_12_months = sum(r[1] for r in results_12_months)

    logger.info(f"DPE sur les 12 derniers mois: {total_12_months:,} ({total_12_months * 100.0 / total:.2f}%)")
    logger.info()
    logger.info(f"{'Mois':<10} {'Nombre DPE':>15}")
    logger.info("-" * 30)
    for row in results_12_months:
        mois, nb = row
        logger.info(f"{mois:<10} {nb:>15,}")
    logger.info()

    # 5. Comparaison avec les années précédentes
    logger.info("-" * 80)
    logger.info("COMPARAISON ANNUELLE (même période de 12 mois)")
    logger.info("-" * 80)

    cursor.execute("""
        WITH yearly_counts AS (
            SELECT
                EXTRACT(YEAR FROM date_etablissement_dpe)::int as annee,
                COUNT(*) as nb_dpe
            FROM dpe_raw
            WHERE date_etablissement_dpe IS NOT NULL
              AND EXTRACT(MONTH FROM date_etablissement_dpe) BETWEEN
                  EXTRACT(MONTH FROM CURRENT_DATE - INTERVAL '12 months') AND
                  EXTRACT(MONTH FROM CURRENT_DATE)
            GROUP BY annee
            ORDER BY annee DESC
        )
        SELECT * FROM yearly_counts LIMIT 5
    """)

    logger.info(f"{'Année':<10} {'Nombre DPE':>15}")
    logger.info("-" * 30)
    for row in cursor.fetchall():
        annee, nb = row
        logger.info(f"{int(annee):<10} {nb:>15,}")
    logger.info()

    # 6. Analyse des causes possibles
    logger.info("-" * 80)
    logger.info("ANALYSE DES CAUSES POSSIBLES DU MANQUE DE DONNÉES RÉCENTES")
    logger.info("-" * 80)
    logger.info()

    # Vérifier la date de réception vs date d'établissement
    cursor.execute("""
        SELECT
            COUNT(*) FILTER (WHERE date_reception_dpe IS NOT NULL) as avec_date_reception,
            COUNT(*) as total,
            MAX(date_reception_dpe) as derniere_reception
        FROM dpe_raw
    """)
    avec_reception, total_check, derniere_reception = cursor.fetchone()

    logger.info(f"Date de dernière réception dans la base: {derniere_reception}")
    logger.info(f"DPE avec date_reception_dpe renseignée: {avec_reception:,} / {total_check:,}")
    logger.info()

    # Distribution par date de réception sur les 12 derniers mois
    cursor.execute("""
        SELECT
            TO_CHAR(date_reception_dpe, 'YYYY-MM') as mois,
            COUNT(*) as nb_dpe
        FROM dpe_raw
        WHERE date_reception_dpe >= %s
          AND date_reception_dpe IS NOT NULL
        GROUP BY mois
        ORDER BY mois DESC
        LIMIT 12
    """, (twelve_months_ago,))

    results_reception = cursor.fetchall()
    if results_reception:
        logger.info("Distribution par DATE DE RÉCEPTION (12 derniers mois):")
        logger.info(f"{'Mois':<10} {'Nombre DPE':>15}")
        logger.info("-" * 30)
        for row in results_reception:
            mois, nb = row
            logger.info(f"{mois:<10} {nb:>15,}")
        logger.info()

    # 7. Vérifier la source des données
    logger.info("-" * 80)
    logger.info("HYPOTHÈSES EXPLICATIVES")
    logger.info("-" * 80)
    logger.info()
    logger.info("Le manque de données sur les 12 derniers mois peut s'expliquer par:")
    logger.info()
    logger.info("1. DÉLAI DE PUBLICATION DE L'ADEME")
    logger.info("   - Les données DPE sont publiées par l'ADEME avec un délai")
    logger.info("   - Les DPE les plus récents ne sont pas encore disponibles")
    logger.info("   - Vérifier la date de téléchargement du fichier source")
    logger.info()
    logger.info("2. DATE DU FICHIER SOURCE")
    logger.info("   - Le fichier importé date peut-être de plusieurs mois")
    logger.info("   - Vérifier l'URL de téléchargement et la date du fichier")
    logger.info()
    logger.info("3. DÉLAI DE TRAITEMENT")
    logger.info("   - Entre la visite du diagnostiqueur et la publication")
    logger.info("   - Peut prendre plusieurs semaines à plusieurs mois")
    logger.info()

    # 8. Statistiques sur la dernière modification
    cursor.execute("""
        SELECT
            MAX(date_derniere_modification_dpe) as derniere_modif
        FROM dpe_raw
        WHERE date_derniere_modification_dpe IS NOT NULL
    """)
    derniere_modif = cursor.fetchone()[0]
    logger.info(f"Date de dernière modification DPE dans la base: {derniere_modif}")
    logger.info()

    # 9. Résumé
    logger.info("=" * 80)
    logger.info("RÉSUMÉ")
    logger.info("=" * 80)
    logger.info()
    logger.info(f"Total DPE: {total:,}")
    logger.info(f"DPE des 12 derniers mois: {total_12_months:,} ({total_12_months * 100.0 / total:.2f}%)")
    logger.info(f"Dernière date d'établissement: {max_date}")
    logger.info(f"Dernière date de réception: {derniere_reception}")
    logger.info()

    cursor.close()

def main():
    logger, log_filename = setup_logger()

    try:
        logger.info("Démarrage de l'analyse de distribution DPE")
        conn = get_db_connection()
        logger.info("Connexion à la base de données établie.")
        logger.info("")
        analyze_distribution(conn, logger)
        conn.close()
        logger.info("Analyse terminée avec succès")
        logger.info(f"\nLog détaillé: {log_filename}")
    except Exception as e:
        logger.error(f"Erreur: {e}")
        print(f"Erreur: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()

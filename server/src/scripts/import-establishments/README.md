# Import Establishments Scripts

Scripts Python pour la gestion des établissements dans ZLV.

## Prérequis

```bash
cd server/src/scripts/import-establishments
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

## Ordre d'exécution

**Important** : Respecter cet ordre lors d'un changement de millésime :

1. **Mettre à jour les localities** (fusions/scissions de communes)
2. **Importer les établissements** (valide les geo_codes contre localities)
3. **Détecter les orphelins** (établissements obsolètes)

## Scripts

### 1. update_localities.py

Met à jour la table `localities` avec les changements de codes INSEE (fusions/scissions).

```bash
# Dry-run
python ../update-localities/update_localities.py \
  --excel table_passage_annuelle_2025.xlsx \
  --db-url postgresql://user:pass@host:port/db \
  --dry-run

# Exécution
python ../update-localities/update_localities.py \
  --excel table_passage_annuelle_2025.xlsx \
  --db-url postgresql://user:pass@host:port/db
```

### 2. import_gold_establishments.py

Importe les établissements depuis le CSV Gold Layer.

```bash
# Dry-run
python import_gold_establishments.py \
  --csv collectivities_processed.csv \
  --db-url postgresql://user:pass@host:port/db \
  --dry-run

# Import avec limite
python import_gold_establishments.py \
  --csv collectivities_processed.csv \
  --db-url postgresql://user:pass@host:port/db \
  --limit 100

# Import complet
python import_gold_establishments.py \
  --csv collectivities_processed.csv \
  --db-url postgresql://user:pass@host:port/db
```

### 3. detect_orphan_establishments.py

Détecte les établissements en base mais absents du CSV (orphelins).

```bash
# Rapport seulement
python detect_orphan_establishments.py \
  --csv collectivities_processed.csv \
  --db-url postgresql://user:pass@host:port/db

# Export CSV des orphelins
python detect_orphan_establishments.py \
  --csv collectivities_processed.csv \
  --db-url postgresql://user:pass@host:port/db \
  --output orphans.csv

# Supprimer les orphelins sûrs (sans users/campaigns)
python detect_orphan_establishments.py \
  --csv collectivities_processed.csv \
  --db-url postgresql://user:pass@host:port/db \
  --delete

# Migrer données d'un établissement vers un autre
python detect_orphan_establishments.py \
  --csv collectivities_processed.csv \
  --db-url postgresql://user:pass@host:port/db \
  --migrate-from 123456789 \
  --migrate-to 987654321
```

### 4. check_uniqueness.py

Vérifie l'unicité des SIREN/SIRET dans les CSV avant import.

```bash
python check_uniqueness.py
```

## Tests

```bash
# Tous les tests
pytest -v

# Tests spécifiques
pytest test_import_gold_establishments.py -v
pytest test_detect_orphan_establishments.py -v

# Test par nom
pytest -v -k "test_parse_siren"
```

## Documentation

- [ANALYSIS.md](ANALYSIS.md) - Analyse du schéma et plan d'import
- [ORPHAN_ESTABLISHMENTS_REPORT.md](ORPHAN_ESTABLISHMENTS_REPORT.md) - Rapport des orphelins détectés
- [../../docs/database/establishments.md](../../docs/database/establishments.md) - Documentation des valeurs `kind`

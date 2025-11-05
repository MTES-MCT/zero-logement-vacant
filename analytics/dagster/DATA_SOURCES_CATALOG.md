# Data Sources Catalog

This document catalogs all external data sources to be integrated into the Zero Logement Vacant data warehouse.

## Status Legend
- 🟢 **Implemented**: Source is configured and working
- 🟡 **In Progress**: Configuration started, needs completion
- 🔴 **TODO**: Not yet started
- ⚠️ **URL Needed**: Waiting for correct URL

---

## Data Sources by Producer

### DGALN (Direction Générale de l'Aménagement, du Logement et de la Nature)

| Status | Name | Description | URL | File Type | Notes |
|--------|------|-------------|-----|-----------|-------|
| 🟡 | Carte des loyers 2023 | Indicateurs de loyers d'annonce par commune en 2023 | [Link](https://object.files.data.gouv.fr/hydra-parquet/hydra-parquet/0de53e33c5b555111ffaf7a9849540c7.parquet) | Parquet | |
| ⚠️ | Zonage ABC | Zonage ABC pour les aides au logement | [Link](https://object.files.data.gouv.fr/hydra-parquet/hydra-parquet/5a9989ac0f32cd6aa41d5d60638390c0.parquet) | Parquet | Need to verify this URL |

### CEREMA (Centre d'études et d'expertise sur les risques, l'environnement, la mobilité et l'aménagement)

| Status | Name | Description | URL | File Type | Notes |
|--------|------|-------------|-----|-----------|-------|
| 🟢 | LOVAC | Logements vacants (2019-2025) | S3 Internal | CSV | Already implemented via S3 |
| 🟢 | Fichiers Fonciers | Fichiers fonciers (2019-2024) | S3 Internal | CSV | Already implemented via S3 |
| 🔴 | DV3F | Demandes de Valeurs Foncières | TBD | TBD | Large dataset, may need special handling |
| ⚠️ | Prix immobiliers | Evolution des prix immobiliers par commune (2010-2021) | TBD | XLSX | Files: dv3f_prix_volumes_communes_20XX.xlsx |
| ⚠️ | Consommation d'espace | Consommation d'espace (2009-2022) | TBD | CSV | |

### INSEE (Institut National de la Statistique et des Études Économiques)

| Status | Name | Description | URL | File Type | Notes |
|--------|------|-------------|-----|-----------|-------|
| 🟢 | Communes | Liste et données des communes | API | JSON | Already implemented via API |
| 🟢 | EPCI | Établissements publics de coopération intercommunale | API | JSON | Already implemented via API |
| 🟢 | Départements | Liste des départements | API | JSON | Already implemented via API |
| 🟢 | Régions | Liste des régions | API | JSON | Already implemented via API |
| ⚠️ | Recensement historique | Série historique du recensement de la population (1968-2022) | TBD | CSV | |
| ⚠️ | Structures d'âges | Population - structures d'âges (2011-2022) | TBD | CSV | |
| ⚠️ | Grille densité | Grille de densité INSEE - 7 niveaux | [Link](https://www.insee.fr/fr/information/6439600) | XLSX/CSV | |
| ⚠️ | Table appartenance | Table d'appartenance géographique des communes | TBD | CSV | |

### URSSAF (Union de Recouvrement des cotisations de Sécurité Sociale et d'Allocations Familiales)

| Status | Name | Description | URL | File Type | Notes |
|--------|------|-------------|-----|-----------|-------|
| ⚠️ | Établissements et effectifs | Nombre d'établissements employeurs et effectifs salariés par commune x APE (2006-2022) | TBD | CSV | Delimiter: `;` |

### DGFIP (Direction Générale des Finances Publiques)

| Status | Name | Description | URL | File Type | Notes |
|--------|------|-------------|-----|-----------|-------|
| ⚠️ | Fiscalité locale | Fiscalité locale des particuliers | TBD | CSV | |

### PRIVATE (Sources privées)

| Status | Name | Description | URL | File Type | Notes |
|--------|------|-------------|-----|-----------|-------|
| ⚠️ | Indicateurs immobiliers | Prix et volumes par commune et année (2014-2023) | TBD | TBD | Source to be confirmed |

---

## Data Source URLs to Find

### High Priority
1. **INSEE Grille Densité**: https://www.insee.fr/fr/information/6439600
   - Need to find direct download link for CSV/Excel file
   
2. **URSSAF Établissements**: https://open.urssaf.fr/explore/dataset/etablissements-et-effectifs-salaries-au-niveau-commune-x-ape-last/
   - Get export link

3. **INSEE Recensement**: https://www.insee.fr/fr/statistiques/
   - Multiple datasets needed

### Medium Priority
4. **CEREMA DV3F**: https://datafoncier.cerema.fr/donnees/dv3f
   - May require authentication
   
5. **CEREMA Prix immobiliers**: Multiple Excel files needed
   
6. **DGFIP Fiscalité**: https://data.economie.gouv.fr/
   - Search for "fiscalité locale"

### Low Priority
7. **Private indicators**: Need to identify source

---

## Next Steps

### 1. Find Missing URLs
For each ⚠️ item:
1. Visit the source website
2. Find the dataset
3. Get the direct download link
4. Test the URL with: `curl -I <url>`

### 2. Add to Configuration
Once URLs are found:
1. Update `external_sources_config.py`
2. Run validation: `python validate_sources.py <source_name>`
3. Test loading: `python validate_sources.py <source_name> --test-loading`

### 3. Create DBT Sources
For each new source:
1. Create source YAML in `dbt/models/staging/externals/sources/`
2. Create staging model in `dbt/models/staging/externals/`
3. Document columns and add tests

### 4. Materialize Assets
```bash
# Test individual source
dagster asset materialize --select raw_<source_name>

# Test all sources from a producer
dagster asset materialize --select tag:producer=INSEE

# Materialize everything
dagster asset materialize --select import_external_sources_to_duckdb+
```

---

## Notes

### Data Quality Considerations
- **INSEE codes**: Always use VARCHAR to preserve leading zeros
- **SIRET/SIREN**: Use VARCHAR (14 and 9 digits respectively)
- **Postal codes**: Use VARCHAR (5 digits with leading zeros)
- **CSV delimiters**: French data often uses `;` instead of `,`

### Storage Strategy
- **Direct URL loading**: For stable government sources (INSEE, data.gouv.fr)
- **S3 storage**: For data requiring preprocessing or custom versions
- **API loading**: For frequently updated reference data

### DBT Naming Conventions
- Sources: `source('<producer>', '<table_name>')`
- Staging: `stg_<producer>__<table_name>`
- Intermediate: `int_<domain>_<description>`
- Marts: `marts_<domain>_<description>`

---

## Useful Links

- **data.gouv.fr**: https://www.data.gouv.fr
- **INSEE**: https://www.insee.fr/fr/statistiques
- **CEREMA Datafoncier**: https://datafoncier.cerema.fr
- **URSSAF Open Data**: https://open.urssaf.fr
- **DGFIP Data**: https://data.economie.gouv.fr
- **DuckDB S3 Docs**: https://duckdb.org/docs/guides/import/s3_import
- **DuckDB CSV Docs**: https://duckdb.org/docs/data/csv
- **DuckDB Parquet Docs**: https://duckdb.org/docs/data/parquet



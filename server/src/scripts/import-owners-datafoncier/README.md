# Import Owners from Datafoncier

This script imports owners from `df_owners_nat_2024` to the `owners` table. It only imports owners that have a valid `idpersonne` and are not already present in the `owners` table.

## Prerequisites

```bash
# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

## Usage

### Basic usage

```bash
python import_owners.py --db-url "postgresql://user:pass@host:port/dbname"
```

### Dry run (simulation mode)

```bash
python import_owners.py --db-url "$DATABASE_URL" --dry-run
```

### With limit (for testing)

```bash
python import_owners.py --db-url "$DATABASE_URL" --dry-run --limit 1000
```

### Production run with optimization

```bash
python import_owners.py --db-url "$DATABASE_URL" --batch-size 10000 --num-workers 6
```

## Options

| Option | Description | Default |
|--------|-------------|---------|
| `--db-url` | PostgreSQL connection URI (required) | - |
| `--dry-run` | Simulation mode - no database modifications | False |
| `--source-table` | Name of the source table | df_owners_nat_2024 |
| `--limit` | Maximum number of owners to import | None (all) |
| `--batch-size` | Batch size for insert operations | 5000 |
| `--num-workers` | Number of parallel workers | 4 |
| `--debug` | Enable debug logging | False |

## Field Mapping

| Source (df_owners_nat_2024) | Target (owners) |
|----------------------------|-----------------|
| `idpersonne` | `idpersonne` |
| `ddenom` | `full_name` (with `/` → space for physical persons) |
| `jdatnss` | `birth_date` (DD/MM/YYYY → ISO format) |
| `dlign3`, `dlign4`, `dlign5`, `dlign6` | `address_dgfip` (array) |
| `catpro2txt` | `kind_class` (mapped, see below) |
| `dsiren` | `siren` |
| - | `data_source` = 'datafoncier-2024' |
| - | `entity` = 'personnes-physiques' |

## Kind Mapping (catpro2txt → kind_class)

Based on official `OwnerKind` labels from `packages/models/src/OwnerKind.ts`:

| catpro2txt | kind_class |
|------------|------------|
| PERSONNE PHYSIQUE | Particulier |
| SOCIETE CIVILE A VOCATION IMMOBILIERE | SCI, Copropriété, Autres personnes morales |
| PROPRIETE DIVISEE EN LOT | SCI, Copropriété, Autres personnes morales |
| PERSONNE MORALE AUTRE | SCI, Copropriété, Autres personnes morales |
| ACTIVITE COMMERCIALE | SCI, Copropriété, Autres personnes morales |
| ACTIVITE INDUSTRIELLE | SCI, Copropriété, Autres personnes morales |
| ACTIVITE DE TOURISME | SCI, Copropriété, Autres personnes morales |
| ACTIVITE EXTRACTIVE | SCI, Copropriété, Autres personnes morales |
| INVESTISSEUR PROFESSIONNEL | Promoteur, Investisseur privé |
| PROMOTEUR | Promoteur, Investisseur privé |
| AMENAGEUR | Promoteur, Investisseur privé |
| ETAT | Etat et collectivité territoriale |
| COMMUNE | Etat et collectivité territoriale |
| DEPARTEMENT | Etat et collectivité territoriale |
| REGION | Etat et collectivité territoriale |
| STRUCTURE INTERCOMMUNALE | Etat et collectivité territoriale |
| COLLECTIVITE TERRITORIALE AUTRE | Etat et collectivité territoriale |
| SEM OU SPLA | Etat et collectivité territoriale |
| ETABLISSEMENT PUBLIC FONCIER | Etat et collectivité territoriale |
| PERSONNE MORALE PUBLIQUE AUTRE | Etat et collectivité territoriale |
| ETABLISSEMENT DE SANTE | Etat et collectivité territoriale |
| ETABLISSEMENT D ENSEIGNEMENT DU PRIMAIRE ET SECONDAIRE | Etat et collectivité territoriale |
| ETABLISSEMENT PUBLIC D ETUDE OU DE RECHERCHE | Etat et collectivité territoriale |
| UNIVERSITE ET ENSEIGNEMENT SUPERIEUR | Etat et collectivité territoriale |
| CHAMBRE CONSULAIRE | Etat et collectivité territoriale |
| ORGANISME DE LOGEMENT SOCIAL | Bailleur social |
| STRUCTURE AGRICOLE | Autres |
| STRUCTURE FORESTIERE | Autres |
| SAFER | Autres |
| RESEAU ELECTRIQUE OU GAZ | Autres |
| RESEAU FERRE | Autres |
| RESEAU EAU OU ASSAINISSEMENT | Autres |
| RESEAU DE TELECOMMUNICATION | Autres |
| PROPRIETAIRE DE RESEAU AUTRE | Autres |
| CONCESSIONNAIRE AUTOROUTIER | Autres |
| STRUCTURE FLUVIALE OU MARITIME | Autres |
| STRUCTURE AERIENNE | Autres |
| STRUCTURE SOCIALE | Autres |
| STRUCTURE LIEE AUX CULTES | Autres |
| STRUCTURE SPORTIVE | Autres |
| STRUCTURE LIEE À LA CULTURE | Autres |
| STRUCTURE DU FONCIER ENVIRONNEMENTAL | Autres |
| ASSOCIATION FONCIERE DE REMEMBREMENT | Autres |

> **Note:** Any `catpro2txt` value not in this mapping will default to `'Autres'`.

## Validation Rules

Owners are skipped if:
- `ddenom` (name) is null or empty
- All address fields (`dlign3`, `dlign4`, `dlign5`, `dlign6`) are null or empty

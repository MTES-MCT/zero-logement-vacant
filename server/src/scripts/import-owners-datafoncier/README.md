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
| `catpro2txt` | `kind_class` (mapped) |
| `dsiren` | `siren` |
| - | `data_source` = 'datafoncier-2024' |
| - | `entity` = 'personnes-physiques' |

## Kind Mapping

| catpro2txt | kind_class |
|------------|------------|
| PERSONNE PHYSIQUE | Particulier |
| INVESTISSEUR PROFESSIONNEL | Investisseur |
| SOCIETE CIVILE A VOCATION IMMOBILIERE | SCI |
| Other | Autre |

## Validation Rules

Owners are skipped if:
- `ddenom` (name) is null or empty
- All address fields (`dlign3`, `dlign4`, `dlign5`, `dlign6`) are null or empty

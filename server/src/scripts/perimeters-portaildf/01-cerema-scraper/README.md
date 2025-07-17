# Cerema Scraper Documentation

A Python script to retrieve structures and users from the Cerema DF Portal API with automatic resume capability.

## Overview

The **Cerema Scraper** efficiently retrieves structure and user data from the Cerema DF Portal API with automatic pagination handling, resume capability on interruption, and comprehensive logging. It can scrape both data types simultaneously or individually.

## Requirements

- Python 3.7+
- `requests` and `click` packages

```bash
pip install requests click
```

## Configuration

### Environment Variables (Recommended)

```bash
# Required: API Bearer Token
export CEREMA_BEARER_TOKEN="your_api_token_here"

# Optional: Custom API base URL
export CEREMA_BASE_URL="https://portaildf.cerema.fr/api"
```

### Command Line Options

| Option | Short | Default | Description |
|--------|-------|---------|-------------|
| `--token` | `-t` | *Required* | Bearer token for API authentication |
| `--base-url` | `-u` | API default | Base API URL |
| `--structures-output` | | `structures.jsonl` | Structures output file path |
| `--users-output` | | `users.jsonl` | Users output file path |
| `--structures-only` | | `False` | Only scrape structures |
| `--users-only` | | `False` | Only scrape users |
| `--delay` | | `0.5` | Delay between requests (seconds) |
| `--max-retries` | | `3` | Maximum retries per page |
| `--verbose` | `-v` | `False` | Enable verbose logging |
| `--reset-state` | | `False` | Clear state files and restart |

## Usage

### Basic Usage

```bash
# Set up your API token
export CEREMA_BEARER_TOKEN="your_token_here"

# Run the script (scrapes both structures and users)
python cerema-scraper.py
```

Execution takes several minutes depending on the number of structures and users.

### Common Examples

```bash
# Scrape both structures and users
python cerema-scraper.py

# Scrape only structures
python cerema-scraper.py --structures-only

# Scrape only users
python cerema-scraper.py --users-only

# Custom output files
python cerema-scraper.py --structures-output data/structures.jsonl --users-output data/users.jsonl

# Slower rate limiting
python cerema-scraper.py --delay 1.0 --max-retries 5

# Verbose mode for debugging
python cerema-scraper.py --verbose

# Restart from beginning
python cerema-scraper.py --reset-state
```

## Output Format

The script generates **JSON Lines** files where each line contains a record.

### Structures Output (`structures.jsonl`)

```json
{"id_structure": 1, "raison_sociale": "DEPARTEMENT DE LA GIRONDE", "siret": "22330001300016", "naf": "84.11Z", "formjur": "7220", "mandataire": false, "niveau_acces": "df_non_ano", "acces_df_ano": "2027-12-04T00:00:00+01:00", "acces_df_non_ano": "2027-12-04T00:00:00+01:00", "acces_lovac": null}
```

#### Structure Fields

| Field | Description |
|-------|-------------|
| `id_structure` | Unique structure identifier |
| `raison_sociale` | Company/organization name |
| `siret` | French business registration number |
| `niveau_acces` | Access level (df_ano, df_non_ano, etc.) |
| `acces_lovac` | LOVAC access date (null if no access) |

### Users Output (`users.jsonl`)

```json
{"id_utilisateur": 1, "email": "user@example.com", "nom": "Dupont", "prenom": "Jean", "role": "admin", "is_active": true, "structure_id": 1, "date_creation": "2024-01-15T10:30:00+01:00"}
```

#### User Fields

| Field | Description |
|-------|-------------|
| `id_utilisateur` | Unique user identifier |
| `email` | User email address |
| `nom` | Last name |
| `prenom` | First name |
| `role` | User role (admin, user, etc.) |
| `is_active` | User status |

## Features

- **Automatic pagination** handling for both endpoints
- **Resume capability** - continues from interruption point independently
- **Duplicate prevention** - skips already retrieved items
- **Configurable retry logic** with exponential backoff
- **Rate limiting** to respect API constraints
- **Comprehensive logging** saved to `api_scraper.log`
- **Flexible scraping** - both data types or individual selection
- **Independent state management** for structures and users

## Resume Capability

If interrupted, simply run the script again. Each data type resumes independently:

```bash
python cerema-scraper.py
# Output: "Resuming structures from page 42"
# Output: "Resuming users from page 15"
```

## Built-in Analysis

The script provides statistics at completion for both data types:

### Structure Analysis
```
=== STRUCTURE ANALYSIS ===
Total structures: 15,847
With LOVAC access: 3,421
Without LOVAC access: 12,426

=== DISTRIBUTION BY TYPE ===
  Public: 8,234 structures
  Private: 5,891 structures
```

### User Analysis
```
=== USER ANALYSIS ===
Total users: 2,456
Active users: 2,301
Inactive users: 155

=== DISTRIBUTION BY ROLE ===
  user: 1,856 users
  admin: 345 users
  manager: 255 users
```

## File Management

### Generated Files

| File | Description |
|------|-------------|
| `structures.jsonl` | Structure data |
| `users.jsonl` | User data |
| `api_structures_state.json` | Structure processing state |
| `api_users_state.json` | User processing state |
| `api_scraper.log` | Combined execution logs |

### State Files

State files are automatically managed and removed upon completion. Each data type has its own state file for independent resume capability.

## Troubleshooting

### Common Issues

**Authentication Error:**
```bash
# Ensure token is set
export CEREMA_BEARER_TOKEN="your_token_here"
```

**Network Issues:**
```bash
# Increase delays and retries
python cerema-scraper.py --delay 1.0 --max-retries 5
```

**Debug Mode:**
```bash
# Enable verbose logging
python cerema-scraper.py --verbose

# Check logs
tail -f api_scraper.log
```

**Resume Issues:**
```bash
# Clear state and restart
python cerema-scraper.py --reset-state

# Resume specific data type
python cerema-scraper.py --structures-only  # Only resume structures
python cerema-scraper.py --users-only       # Only resume users
```

### Data Analysis

#### Structure Analysis
```bash
# Count structures by access level
cat structures.jsonl | jq -r '.niveau_acces' | sort | uniq -c

# Find structures with LOVAC access
cat structures.jsonl | jq 'select(.acces_lovac != null)'

# Export structures to CSV
cat structures.jsonl | jq -r '[.id_structure, .raison_sociale, .siret] | @csv' > structures.csv
```

#### User Analysis
```bash
# Count users by role
cat users.jsonl | jq -r '.role' | sort | uniq -c

# Find active users
cat users.jsonl | jq 'select(.is_active == true)'

# Export users to CSV
cat users.jsonl | jq -r '[.id_utilisateur, .email, .nom, .prenom, .role] | @csv' > users.csv
```

#### Combined Analysis
```bash
# Count total records
echo "Structures: $(wc -l < structures.jsonl)"
echo "Users: $(wc -l < users.jsonl)"

# Find users by structure
jq -r '.structure_id' users.jsonl | sort | uniq -c | sort -nr
```

## API Endpoints

The script automatically constructs the following endpoints:

- **Structures**: `{base_url}/structures`
- **Users**: `{base_url}/utilisateurs`

Default base URL: `https://portaildf.cerema.fr/api`
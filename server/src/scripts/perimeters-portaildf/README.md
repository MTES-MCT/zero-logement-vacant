# Cerema API Retrieval Scripts

## Overview

These scripts retrieve data from the Portail DF Cerema API and save them to JSON Lines files with automatic resume capability. They're designed to handle large datasets efficiently with built-in retry mechanisms, duplicate prevention, and state management.

### Available Scripts

- **`retrieve-cerema-users.py`**: Retrieves all users from the API
- **`retrieve-cerema-structures.py`**: Retrieves all structures from the API

## Features

- **Automatic Resume**: Continues from the last processed page after interruption
- **Retry Mechanism**: Handles network issues with exponential backoff
- **Duplicate Prevention**: Avoids downloading the same records twice
- **Real-time Progress**: Displays live statistics during execution
- **JSON Lines Output**: One record per line for efficient processing
- **State Persistence**: Automatic save/restore of processing state

## Requirements

- Python 3.7+
- `requests` library
- `python-dateutil` library
- Valid Cerema API token

## Installation & Configuration

```bash
# Install required dependencies
pip install requests python-dateutil

# Set your API token as environment variable
export CEREMA_API_TOKEN='your_api_token_here'
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `CEREMA_API_TOKEN` | Yes | Bearer token for Cerema API authentication |

## Usage

### Users Retrieval

```bash
# Set your API token
export CEREMA_API_TOKEN='your_token_here'

# Run the users script
python retrieve-cerema-users.py
```

### Structures Retrieval

```bash
# Set your API token (if not already set)
export CEREMA_API_TOKEN='your_token_here'

# Run the structures script
python retrieve-cerema-structures.py
```

### Resume Interrupted Process

Both scripts automatically resume from where they left off:

```bash
# If interrupted, simply run the script again
python retrieve-cerema-users.py
# or
python retrieve-cerema-structures.py
```

### Force Fresh Start

```bash
# Remove state files to start from beginning
rm api_state.json api_structures_state.json
```

## Output

### Files Generated

#### Users Script
- **`utilisateurs.jsonl`**: Main output file containing all users (one per line)
- **`api_state.json`**: State file for resume functionality (auto-deleted on completion)

#### Structures Script
- **`structures.jsonl`**: Main output file containing all structures (one per line)
- **`api_structures_state.json`**: State file for resume functionality (auto-deleted on completion)

### JSON Lines Format

#### User Record Example
```json
{"id_user": 123, "email": "user@example.fr", "structure": 456, "gestionnaire": true, "exterieur": false, "cgu_valide": "2024-10-02T16:21:33.571000+02:00", "date_rattachement": "2024-07-01T00:00:00+02:00", "date_expiration": null, "groupe": 173}
```

#### Structure Record Example
```json
{"id": 123, "raison_sociale": "Example Structure", "type": "Collectivity", "acces_lovac": "2025-12-31T23:59:59+01:00", "siret": "12345678901234", "departement": "69", "region": "Auvergne-Rhône-Alpes"}
```

### Console Output

Both scripts provide real-time feedback:

```
🚀 Starting user/structure retrieval...
🆕 New processing
📄 Processing page 1...
✅ Page 1: 50 new records saved (50 total)
📊 Progress: 50/13064 records processed
👥 Unique records: 50

🎉 Retrieval completed successfully!
📁 Output file: utilisateurs.jsonl (or structures.jsonl)
```

## Configuration

### Script Parameters

You can modify these constants in the scripts for custom behavior:

```python
# Common settings for both scripts
DELAY_BETWEEN_REQUESTS = 0.5    # Delay between requests (seconds)
MAX_RETRIES = 3                 # Maximum retry attempts
RETRY_DELAY = 5                 # Delay between retries (seconds)

# Users script specific
BASE_URL = "https://portaildf.cerema.fr/api/utilisateurs"
OUTPUT_FILE = "utilisateurs.jsonl"
STATE_FILE = "api_state.json"

# Structures script specific
BASE_URL = "https://portaildf.cerema.fr/api/structures"
OUTPUT_FILE = "structures.jsonl"
STATE_FILE = "api_structures_state.json"
```

## Data Structure

### User Object Fields

- **`id_user`**: Unique user identifier (integer)
- **`email`**: User email address (string)
- **`structure`**: Associated structure ID (integer, nullable)
- **`gestionnaire`**: Manager flag (boolean)
- **`exterieur`**: External user flag (boolean)
- **`cgu_valide`**: Terms of service validation date (ISO string, nullable)
- **`date_rattachement`**: Attachment date (ISO string, nullable)
- **`date_expiration`**: Expiration date (ISO string, nullable)
- **`groupe`**: Group ID (integer, nullable)

### Structure Object Fields

- **`id`**: Unique structure identifier (integer)
- **`raison_sociale`**: Structure name (string)
- **`type`**: Structure type (string)
- **`acces_lovac`**: LOVAC access date (ISO string, nullable)
- **`siret`**: SIRET number (string, nullable)
- **`departement`**: Department code (string, nullable)
- **`region`**: Region name (string, nullable)

## Integration Examples

```bash
# Process data immediately after download
python retrieve-cerema-users.py && python process_users.py
python retrieve-cerema-structures.py && python analyze_structures.py

# Extract specific data
grep '"gestionnaire": true' utilisateurs.jsonl > managers.jsonl
grep '"acces_lovac": null' structures.jsonl > structures_no_access.jsonl

# Count records
wc -l utilisateurs.jsonl structures.jsonl
```

## Performance

- **Users Script**: 15-25 minutes for ~13,000 users
- **Structures Script**: 10-15 minutes for ~1,000 structures
- **Memory Usage**: Low (streaming processing, ~50MB RAM)
- **Storage**: ~2MB per 1,000 records (JSON Lines format)

## Common Issues

| Issue | Solution |
|-------|----------|
| Missing Token | Set `CEREMA_API_TOKEN` environment variable |
| Network Timeout | Scripts auto-retry with backoff |
| API Rate Limiting | Increase `DELAY_BETWEEN_REQUESTS` |
| Interrupted Process | Re-run script (auto-resumes) |

# NPAI Address Verification - La Poste API

Tool suite for verifying property owner address validity using La Poste address control API and generating detailed reports.

## Available Tools

### 1. `verify_addresses.py` - Address Verification
- **Address retrieval** from ZLV PostgreSQL database
- **Verification via La Poste API** with rate limiting management
- **Similarity calculation** between original address and API result
- **Automatic classification** of results (valid, unknown, ambiguous)
- **Complete CSV export** with quality metrics

### 2. `generate_report.py` - Report Generation
- **Statistical analysis** of verification results
- **Detailed business explanations** for each address type
- **Automatic recommendations** based on data quality
- **Similarity score distribution** with interpretations

## Installation

### Prerequisites
- Python 3.8+
- Access to ZLV PostgreSQL database
- La Poste API key

### Dependencies Installation

**Recommended method (virtual environment):**
```bash
cd tools/npai
python3 -m venv venv
source venv/bin/activate  # On Linux/Mac
# venv\Scripts\activate   # On Windows
pip install -r requirements.txt
```

**Alternative with pipx (if available):**
```bash
cd tools/npai
pipx install psycopg2-binary requests
```

**System installation (not recommended):**
```bash
cd tools/npai
python3 -m pip install --user -r requirements.txt
```

## Usage

### 1. Address Verification (`verify_addresses.py`)

#### Basic Command
```bash
# If using virtual environment
source venv/bin/activate
python verify_addresses.py \
  --api-key YOUR_LAPOSTE_API_KEY \
  --db-uri "postgresql://user:password@localhost:5432/zlv_db"

# Or directly with python3
python3 verify_addresses.py \
  --api-key YOUR_LAPOSTE_API_KEY \
  --db-uri "postgresql://user:password@localhost:5432/zlv_db"
```

#### Complete Command
```bash
python3 verify_addresses.py \
  --limit 500 \
  --api-key YOUR_LAPOSTE_API_KEY \
  --db-uri "postgresql://user:password@localhost:5432/zlv_db" \
  --output results_custom.csv \
  --verbose
```

### 2. Report Generation (`generate_report.py`)

#### Analyze an existing CSV file
```bash
# Basic analysis
python3 generate_report.py results.csv

# Or directly from directory
python3 generate_report.py npai_verification_20231117_143052.csv
```

#### Complete workflow (verification + report)
```bash
# 1. Verify addresses
python3 verify_addresses.py --api-key YOUR_API_KEY --db-uri "postgresql://..." --output verification_results.csv

# 2. Generate detailed report
python3 generate_report.py verification_results.csv
```

## Parameters

### `verify_addresses.py`

| Parameter | Description | Default |
|-----------|-------------|---------|
| `--limit` | Number of addresses to verify | 2000 |
| `--api-key` | La Poste API Key (X-Okapi-Key) | **Required** |
| `--db-uri` | PostgreSQL URI | **Required** |
| `--output` | Output CSV file | `npai_verification_YYYYMMDD_HHMMSS.csv` |
| `--verbose` | Debug mode | False |

### `generate_report.py`

| Parameter | Description |
|-----------|-------------|
| `csv_file` | Path to CSV file to analyze (required) |

## Results

### Exported CSV Columns

| Column | Description |
|---------|-------------|
| `owner_id` | Property owner ID |
| `original_address` | Original DGFIP address |
| `status` | Verification status |
| `api_results_count` | Number of API results |
| `best_match_code` | Best match code |
| `best_match_address` | Best match address |
| `similarity_score` | Similarity score (0-1) |
| `verification_date` | Verification date |

### Verification Statuses

- **`valid`** : Address found exactly in the reference database
  - Perfect match, address confirmed as valid
- **`valid_with_alternatives`** : Valid address but with suggested variants
  - Original address is valid but alternative formats exist
  - Ex: '1 rue de la Paix' vs '1 r de la Paix' vs '1 rue Paix'
- **`ambiguous`** : Address with multiple possible matches
  - System cannot determine the correct address with certainty
  - Requires manual verification to resolve ambiguity
- **`unknown`** : No address found (potential NPAI)
- **`error`** : API or technical error

## Example Results

```csv
owner_id,original_address,status,api_results_count,best_match_code,best_match_address,similarity_score
123,37 CHEMIN DES MEUNIERS 75001 PARIS,valid,1,37001,37 CHE DES MEUNIERS 75001 PARIS,0.945
456,123 RUE INEXISTANTE 99999 NOWHERE,unknown,0,,,
789,0010 RUE DU PETIT CHAMP 70400 ERREVET,valid,30,3067518616,0010 RUE DU PETIT CHAMP 70400 ERREVET,1.0
abc,1 AVENUE DE LA REPUBLIQUE,valid_with_alternatives,5,75011,1 AV DE LA REPUBLIQUE 75011 PARIS,0.85
def,RUE FLOUE,ambiguous,10,12345,RUE PROCHE,0.65
```

## Similarity Metrics

The script automatically calculates a similarity score between the DGFIP address and the address returned by La Poste API:

- **Score 1.0** : Exact match (character by character)
- **Score 0.95-0.99** : Excellent (near-perfect match - maximum confidence)
- **Score 0.85-0.95** : Very good (very good match - high confidence)
- **Score 0.7-0.85** : Good (good match - minor differences acceptable)
- **Score 0.5-0.7** : Average (partial similarity - special attention recommended)
- **Score < 0.5** : Unreliable (doubtful matches - manual verification required)

## Analysis Report (`generate_report.py`)

The report script automatically generates:

### Report Sections
1. **Address categories explanation** - Detailed business definitions
2. **Verification results** - Statistics with percentages
3. **Similarity scores explanation** - Score range interpretation
4. **Score distribution** - Distribution with business recommendations
5. **Business recommendations** - Alerts and suggested actions

### Automatic Recommendations
- **Ambiguous addresses rate > 10%** : Manual verification alert required
- **Low scores > 20%** : Recommendation to review criteria or source data
- **Success rate < 60%** : Suggestion to verify input data quality

### Report Example
```
2025-09-17 18:56:20 - INFO - NPAI VERIFICATION SUMMARY
2025-09-17 18:56:20 - INFO - ==================================================
2025-09-17 18:56:20 - INFO - Total addresses verified: 406

2025-09-17 18:56:20 - INFO - ADDRESS CATEGORIES EXPLAINED:
2025-09-17 18:56:20 - INFO - • Valid addresses: Addresses found exactly in the reference database
2025-09-17 18:56:20 - INFO -   → Perfect match, address confirmed as valid

2025-09-17 18:56:20 - INFO - VERIFICATION RESULTS:
2025-09-17 18:56:20 - INFO - Valid addresses: 229 (56.4%)
2025-09-17 18:56:20 - INFO - Ambiguous addresses: 26 (6.4%)
2025-09-17 18:56:20 - INFO - Valid addresses with alternatives: 151 (37.2%)

2025-09-17 18:56:20 - INFO - BUSINESS RECOMMENDATIONS:
2025-09-17 18:56:20 - INFO - ✓ Acceptable ambiguous addresses rate: 6.4%
2025-09-17 18:56:20 - INFO - ✓ Excellent success rate: 93.6% of addresses validated
```

## Error Handling

- **Rate limiting** : Automatic pause and retry with exponential backoff
- **Network errors** : Timeout and connection error management
- **DB errors** : PostgreSQL connection and query validation
- **Interruption** : Ctrl+C support with clean shutdown

## Performance

- **Speed** : ~10 addresses/second (La Poste API limit)
- **Automatic pause** : 100ms between each API call
- **Batch processing** : Progress displayed every 100 items
- **Memory** : Optimized to process thousands of addresses

## NPAI Detection Usage

Addresses with `status=unknown` are NPAI candidates (Does Not Live at the Indicated Address) and may require:

1. **Manual verification** if low similarity score
2. **Address update** if partial match found
3. **NPAI marking** if no valid match
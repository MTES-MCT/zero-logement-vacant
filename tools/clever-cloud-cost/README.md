# Clever Cloud Cost Calculator

Script to retrieve the list of applications and add-ons from Clever Cloud and calculate projected monthly costs.

## Prerequisites

1. **Install clever-tools CLI:**
   ```bash
   npm install -g clever-tools
   ```

2. **Authenticate:**
   ```bash
   clever login
   ```

3. **Python 3.8+** (no additional dependencies required)

## Usage

```bash
# Basic usage - list all resources with costs
python clever_cloud_cost.py

# Filter by organization
python clever_cloud_cost.py --org <org_id>

# Output as JSON
python clever_cloud_cost.py --json

# Output as CSV
python clever_cloud_cost.py --csv > costs.csv
```

## Output Example

```
================================================================================
CLEVER CLOUD COST CALCULATOR
================================================================================
Fetching resources...
Found 3 applications and 5 add-ons

Type        | Name                    | Provider       | Plan/Flavor | Instances | Monthly Cost (EUR)
------------+-------------------------+----------------+-------------+-----------+-------------------
application | zlv-frontend            | node           | M           | 2         | 128.00
application | zlv-api                 | node           | L           | 2         | 256.00
application | zlv-queue               | node           | S           | 1         | 32.00
addon       | zlv-postgresql          | postgresql-... | l_sml       | 1         | 178.00
addon       | zlv-redis               | redis-addon    | m_mono      | 1         | 26.40
addon       | zlv-elasticsearch       | es-addon       | m           | 1         | 108.00
addon       | zlv-cellar              | cellar-addon   | -           | 1         | 2.00
addon       | zlv-keycloak            | keycloak       | -           | 1         | 0.00
------------+-------------------------+----------------+-------------+-----------+-------------------
                                                                       TOTAL     | 730.40

Summary:
  Applications: 416.00 EUR/month
  Add-ons:      314.40 EUR/month
  Total:        730.40 EUR/month
```

## Pricing Reference

### Application Instances (per scaler/month)

| Flavor | vCPUs | RAM    | Price (EUR) |
|--------|-------|--------|-------------|
| pico   | 0.5   | 256 MB | 4.50        |
| nano   | 1     | 512 MB | 6.00        |
| XS     | 1     | 1 GB   | 16.00       |
| S      | 2     | 2 GB   | 32.00       |
| M      | 4     | 4 GB   | 64.00       |
| L      | 6     | 8 GB   | 128.00      |
| XL     | 8     | 16 GB  | 256.00      |
| 2XL    | 12    | 24 GB  | 384.00      |
| 3XL    | 16    | 32 GB  | 512.00      |

### PostgreSQL Add-on

Plans follow the pattern `{size}_{storage}` where storage can be: `sml` (small), `med` (medium), `big`, `hug` (huge), `gnt` (giant).

| Plan     | vCPUs | RAM    | Storage | Price (EUR) |
|----------|-------|--------|---------|-------------|
| dev      | -     | 256 MB | 256 MB  | 0 (free)    |
| xxs_sml  | 1     | 512 MB | 1 GB    | 5.25        |
| xxs_med  | 1     | 512 MB | 2 GB    | ~7.00       |
| xxs_big  | 1     | 512 MB | 3 GB    | ~9.00       |
| xs_sml   | 1     | 1 GB   | 5 GB    | 13.00       |
| xs_med   | 1     | 1 GB   | 10 GB   | ~20.00      |
| xs_big   | 1     | 1 GB   | 15 GB   | ~28.00      |
| s_sml    | 2     | 2 GB   | 10 GB   | 41.00       |
| s_big    | 2     | 2 GB   | 20 GB   | ~68.00      |
| m_sml    | 4     | 4 GB   | 20 GB   | 88.00       |
| m_big    | 4     | 4 GB   | 80 GB   | ~200.00     |
| l_sml    | 6     | 8 GB   | 40 GB   | 178.00      |
| l_big    | 6     | 8 GB   | 120 GB  | ~350.00     |
| l_gnt    | 6     | 8 GB   | 480 GB  | ~900.00     |
| xl_sml   | 8     | 16 GB  | 80 GB   | 360.00      |
| xxl_sml  | 12    | 64 GB  | 160 GB  | 1730.00     |

*Note: Prices marked with ~ are estimates based on storage scaling.*

### Redis Add-on

| Plan    | RAM   | Price (EUR) |
|---------|-------|-------------|
| dev     | 256MB | 0 (free)    |
| s_mono  | 250MB | 8.40        |
| m_mono  | 1 GB  | 26.40       |
| l_mono  | 2 GB  | 54.00       |

### Elasticsearch Add-on

| Plan | vCPUs | RAM   | Price (EUR) |
|------|-------|-------|-------------|
| dev  | -     | 512MB | 0 (free)    |
| xs   | 1     | 1 GB  | 28.00       |
| s    | 2     | 2 GB  | 54.00       |
| m    | 4     | 4 GB  | 108.00      |
| l    | 6     | 8 GB  | 215.00      |
| xl   | 8     | 16 GB | 430.00      |

### Cellar (S3-compatible storage)

- Storage: 0.02 EUR/GB/month
- Outbound traffic: 0.09 EUR/GB

## Notes

- **Application costs** are calculated from the Clever Cloud API which returns hourly prices
  - Formula: `avg_hourly_price × 24 hours × 30 days × avg_instances`
  - Auto-scaling uses the average of min/max instances and flavors
- **Add-on costs** are based on plan pricing tables
  - PostgreSQL/MySQL plans with ~ are estimates based on storage tier scaling
  - Cellar (S3) assumes 100GB storage by default
- Some add-ons (Keycloak, Config Provider, etc.) are free and will show 0.00
- Review apps (PRs) may have temporary resources that inflate the total

## Source

Official pricing: https://www.clever.cloud/pricing/

## API Endpoints Used

The script uses `clever-tools` CLI commands:
- `clever applications list --format json` - List all applications
- `clever addon list --format json` - List all add-ons
- `clever curl https://api.clever-cloud.com/v2/organisations/{org}/applications/{app}` - Get application details (flavor, scaling)

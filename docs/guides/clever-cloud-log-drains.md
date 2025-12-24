# Clever Cloud Log Drains with Elasticsearch

This guide explains how to set up log drains on Clever Cloud to forward application logs to Elasticsearch for centralized logging and analysis.

## Prerequisites

- Clever Cloud CLI (`clever-tools`) installed
- An Elasticsearch add-on on Clever Cloud
- Application linked to Clever Cloud

## 1. Create the Log Drain

Use the Clever Cloud CLI to create an Elasticsearch drain:

```bash
clever drain create elasticsearch <ES_URL>/_bulk \
  --username <ES_USERNAME> \
  --password <ES_PASSWORD> \
  --index-prefix <INDEX_PREFIX> \
  --app <APP_ID>
```

### Example

```bash
clever drain create elasticsearch https://xxx-elasticsearch.services.clever-cloud.com/_bulk \
  --username myuser \
  --password mypassword \
  --index-prefix zlv-logs \
  --app app_0a171081-de65-4ed9-8b3c-608f9de2d900
```

### Drain Management Commands

```bash
# List all drains
clever drain

# List drains in JSON format
clever drain --format json

# Enable a drain
clever drain enable <DRAIN_ID>

# Disable a drain
clever drain disable <DRAIN_ID>

# Remove a drain
clever drain remove <DRAIN_ID>
```

## 2. Access Logs in Kibana

### Open Kibana

Access Kibana through the Clever Cloud console:
1. Go to **Add-ons** → Select your Elasticsearch add-on
2. Click **Open Kibana**

Or access directly: `https://<ES_HOST>/_plugin/kibana`

### Create Index Pattern

1. Navigate to **Stack Management** → **Index Patterns**
2. Click **Create index pattern**
3. Enter the pattern: `<INDEX_PREFIX>-*` (e.g., `zlv-logs-*`)
4. Select `@timestamp` as the time field
5. Click **Create index pattern**

### View Logs

1. Go to **Analytics** → **Discover**
2. Select your index pattern
3. Adjust the time range in the top-right corner

### Useful Search Queries

```
# Filter by log level
level: "error"
level: "warn"

# Search by user email
email: "user@example.com"

# Search login events
message: "signIn" OR message: "Login"

# Filter by API endpoint
url: "/api/housing/*"

# Combine filters
level: "error" AND url: "/api/*"
```

## 3. Configure Retention Policy (12 months)

To automatically delete logs older than 12 months, create an Index Lifecycle Management (ILM) policy.

### Create the ILM Policy

```bash
curl -X PUT "https://<ES_HOST>/_ilm/policy/zlv-logs-retention" \
  -u "<ES_USERNAME>:<ES_PASSWORD>" \
  -H "Content-Type: application/json" \
  -d '{
    "policy": {
      "phases": {
        "hot": {
          "actions": {}
        },
        "delete": {
          "min_age": "365d",
          "actions": {
            "delete": {}
          }
        }
      }
    }
  }'
```

### Apply Policy to Index Template

```bash
curl -X PUT "https://<ES_HOST>/_index_template/zlv-logs-template" \
  -u "<ES_USERNAME>:<ES_PASSWORD>" \
  -H "Content-Type: application/json" \
  -d '{
    "index_patterns": ["zlv-logs-*"],
    "template": {
      "settings": {
        "index.lifecycle.name": "zlv-logs-retention"
      }
    }
  }'
```

### Verify Policy

```bash
# Check policy exists
curl -X GET "https://<ES_HOST>/_ilm/policy/zlv-logs-retention" \
  -u "<ES_USERNAME>:<ES_PASSWORD>"

# Check template exists
curl -X GET "https://<ES_HOST>/_index_template/zlv-logs-template" \
  -u "<ES_USERNAME>:<ES_PASSWORD>"
```

## 4. Monthly Logs Export to S3 (Cellar)

Export logs monthly to Cellar (S3-compatible storage) for long-term archival in a readable format.

The export runs automatically on the 1st of each month at 3am via Clever Cloud cron (see `clevercloud/cron.json`).

### Clever Cloud Deployment Checklist

Before deploying, configure the following environment variables in the Clever Cloud console:

| Variable | Description | Source |
|----------|-------------|--------|
| `ES_USER` | Elasticsearch username | Elasticsearch add-on |
| `ES_PASS` | Elasticsearch password | Elasticsearch add-on |
| `ES_HOST` | Elasticsearch host URL | Elasticsearch add-on (optional, has default) |
| `CELLAR_KEY_ID` | Cellar S3 access key | Cellar add-on |
| `CELLAR_KEY_SECRET` | Cellar S3 secret key | Cellar add-on |
| `CELLAR_HOST` | Cellar endpoint | Cellar add-on (optional, default: `cellar-c2.services.clever-cloud.com`) |
| `CELLAR_BUCKET` | S3 bucket name | Cellar add-on (optional, default: `zlv-logs-archive`) |

### Prerequisites (local execution)

- AWS CLI installed (`brew install awscli`)
- `jq` installed (`brew install jq`)
- Cellar add-on created on Clever Cloud

### Run Export Script Manually

The export script is located at `server/src/scripts/logs/export-monthly-logs.sh`.

```bash
# Set environment variables
export ES_USER="<ES_USERNAME>"
export ES_PASS="<ES_PASSWORD>"
export CELLAR_KEY_ID="<CELLAR_KEY_ID>"
export CELLAR_KEY_SECRET="<CELLAR_KEY_SECRET>"

# Export previous month (default)
./server/src/scripts/logs/export-monthly-logs.sh

# Export a specific month
./server/src/scripts/logs/export-monthly-logs.sh 2024-12
```

### Output

Files are uploaded to Cellar with the following structure:

```
s3://zlv-logs-archive/
└── monthly/
    └── 2024/
        ├── zlv-logs-2024-10.json.gz
        ├── zlv-logs-2024-11.json.gz
        └── zlv-logs-2024-12.json.gz
```

### List Archived Files

```bash
# Configure AWS CLI for Cellar
export AWS_ACCESS_KEY_ID="<CELLAR_KEY_ID>"
export AWS_SECRET_ACCESS_KEY="<CELLAR_KEY_SECRET>"

# List files
aws s3 ls s3://zlv-logs-archive/monthly/ --recursive \
  --endpoint-url https://cellar-c2.services.clever-cloud.com

# Download a specific archive
aws s3 cp s3://zlv-logs-archive/monthly/2024/zlv-logs-2024-12.json.gz . \
  --endpoint-url https://cellar-c2.services.clever-cloud.com

# Decompress and view
gunzip -c zlv-logs-2024-12.json.gz | head -100
```

## References

- [Clever Cloud Log Drains Documentation](https://www.clever.cloud/developers/doc/cli/logs-drains/)
- [Clever Cloud Log Management](https://www.clever.cloud/developers/doc/administrate/log-management/)
- [Clever Cloud Cellar S3 Storage](https://www.clever-cloud.com/developers/doc/addons/cellar/)
- [Elasticsearch Index Lifecycle Management](https://www.elastic.co/guide/en/elasticsearch/reference/current/index-lifecycle-management.html)

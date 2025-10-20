# GitHub Actions local testing guide

This guide explains how to test GitHub Actions workflows locally using `act` and `gh` CLI tools.

## Prerequisites

### Install required tools

#### GitHub CLI (`gh`)
```bash
# macOS
brew install gh

# Ubuntu/Debian
sudo apt install gh

# Windows
winget install GitHub.cli

# Login to GitHub
gh auth login
```

#### Act (Local GitHub Actions runner)
```bash
# macOS
brew install act

# Linux
curl https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash

# Windows
winget install nektos.act

# Configure act with medium-sized image
echo '-P ubuntu-latest=catthehacker/ubuntu:act-latest' > ~/.actrc
```

## Environment Configuration

### 1. Get Clever Cloud Credentials

```bash
# Login to Clever Cloud (opens browser)
clever login

# Get your organization ID
clever profile

# Check your authentication status
clever profile --format json
```

**Get API tokens during login process:**
1. Run `clever login` - this opens your browser
2. In the browser, during the login flow, you'll see:
   - Your **CLEVER_TOKEN**
   - Your **CLEVER_SECRET**
3. Copy these values for your `.env` file
4. Your organization ID is in the console URL: `console.clever-cloud.com/organisations/orga_xxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`

### 2. Create environment file

Create a `.env` file in the project root:

```bash
# Copy the example file and edit with your real values
cp .env.example .env

# Edit the .env file with your actual credentials
# Replace the example values with your real Clever Cloud tokens
```

Example `.env` file structure (see `.env.example`):
```bash
GITHUB_HEAD_REF=main

# Clever Cloud Configuration
CLEVER_TOKEN=tok_xxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
CLEVER_SECRET=sec_xxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
CLEVER_ORG=orga_xxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

# Mail Configuration (optional for testing)
MAILER_HOST=smtp.example.com
MAILER_PORT=587
MAILER_USER=user@example.com
MAILER_PASSWORD=password

# Test Configuration (optional)
TEST_PASSWORD=testpass123
METABASE_DOMAIN=metabase.example.com
METABASE_API_TOKEN=mb_token_here

# E2E Testing Configuration (required for deployment)
E2E_EMAIL=test@example.com
E2E_PASSWORD=testpass123
```

### 3. Required Values

| Variable | Description | How to get |
|----------|-------------|------------|
| `GITHUB_HEAD_REF` | Branch name for local testing | Set to branch you want to test (e.g., `main`) |
| `CLEVER_TOKEN` | API token ID | Shown in browser during `clever login` |
| `CLEVER_SECRET` | API token secret | Shown in browser during `clever login` |
| `CLEVER_ORG` | Organization ID | From console URL: `orga_xxx` part |
| `E2E_EMAIL` | Email for end-to-end tests | Test email address |
| `E2E_PASSWORD` | Password for end-to-end tests | Test password |

## Testing workflows

### Review apps workflow

#### Test duplicate detection
```bash
# Test with existing PR number (should detect duplicates)
act workflow_dispatch -W ../../.github/workflows/review-app.yml \
  --container-architecture linux/amd64 \
  --input pull_request_number=1390 \
  --input action_type=Créer \
  --job check-duplicates \
  --env-file .env
```

#### Test full creation flow
```bash
# ⚠️  WARNING: This will create REAL Clever Cloud resources!
# Make sure GITHUB_HEAD_REF is set in your .env file

# Test complete workflow (will actually create resources!)
act workflow_dispatch -W ../../.github/workflows/review-app.yml \
  --container-architecture linux/amd64 \
  --input pull_request_number=9999 \
  --input action_type=Créer \
  --env-file .env

# This will create:
# - PostgreSQL addon: pr9999-postgres
# - Redis addon: pr9999-redis
# - Applications: pr9999-api, pr9999-queue, pr9999-front
```

#### Test update flow
```bash
# Test update workflow
act workflow_dispatch -W ../../.github/workflows/review-app.yml \
  --container-architecture linux/amd64 \
  --input pull_request_number=1390 \
  --input action_type="Mettre à jour" \
  --env-file .env
```

#### Test deletion flow
```bash
# Test deletion workflow
act workflow_dispatch -W ../../.github/workflows/review-app.yml \
  --container-architecture linux/amd64 \
  --input pull_request_number=9999 \
  --input action_type=Supprimer \
  --env-file .env
```

### Alternative: environment variables

Instead of `.env` file, you can set variables directly:

```bash
export CLEVER_TOKEN="tok_your_token_here"
export CLEVER_SECRET="sec_your_secret_here"
export CLEVER_ORG="orga_your_org_here"

# Run without --env-file flag
act workflow_dispatch -W ../../.github/workflows/review-app.yml \
  --container-architecture linux/amd64 \
  --input pull_request_number=1390 \
  --input action_type=Créer \
  --job check-duplicates
```

## Workflow testing on gitHub

### Create test branch
```bash
# Create feature branch
git checkout -b fix/your-feature-name

# Commit changes
git add .
git commit -m "fix: your changes"

# Push branch
git push -u origin fix/your-feature-name
```

### Run on GitHub actions
```bash
# Using GitHub CLI
gh workflow run "Manage review apps" \
  --ref fix/your-feature-name \
  --field pull_request_number=9999 \
  --field action_type=Créer

# Or go to GitHub UI:
# Actions → Manage review apps → Run workflow
```

## Common issues & solutions

### Authentication errors
```
❌ ERROR: Not authenticated with Clever Cloud
```
**Solution:** Check your `CLEVER_TOKEN`, `CLEVER_SECRET`, and `CLEVER_ORG` values.

### Docker issues
```
Error: failed to create container
```
**Solution:**
```bash
# Restart Docker
sudo systemctl restart docker

# Or on macOS
brew services restart docker
```

### Missing dependencies
```
Error: jq: command not found
```
**Solution:**
```bash
# Install jq
brew install jq          # macOS
sudo apt install jq     # Ubuntu
```

## Security best practices

### Never commit secrets
```bash
# Always verify .env is ignored
git status
git check-ignore .env  # Should return .env

# Remove .env from git if accidentally committed
git rm --cached .env
git commit -m "Remove .env from tracking"
```

### Use development tokens
- Create separate tokens for local development
- Use minimal permissions required
- Rotate tokens regularly
- Never share tokens in chat/email

### Limit Test Scope
```bash
# Test only specific jobs to avoid resource creation
act workflow_dispatch \
  --job check-duplicates \
  # ... other flags

# Use dry-run when available
act --list  # Show what would run without executing
```

## Troubleshooting

### Get workflow status
```bash
# List recent workflow runs
gh run list --workflow="Manage review apps"

# View specific run
gh run view RUN_ID

# View logs
gh run view RUN_ID --log
```

### Debug local runs
```bash
# Run with verbose output
act --verbose

# Check specific job logs
act --job JOB_NAME --verbose

# List available workflows
act --list
```

### Clever Cloud debugging
```bash
# Check authentication
clever profile

# List existing apps (should match what workflow sees)
clever applications --org $CLEVER_ORG

# List addons
clever addon list --org $CLEVER_ORG
```

## Development workflow

1. **Make changes** to `.github/workflows/`
2. **Test locally** with `act` using test PR numbers
3. **Validate** on feature branch via GitHub Actions
4. **Create PR** when confident
5. **Test in staging** before merging to main

This ensures robust testing without affecting production review apps.
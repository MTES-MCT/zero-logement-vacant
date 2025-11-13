# Python Dependencies Installation on Clever Cloud

## Automatic Configuration

Python dependencies are automatically installed during deployment thanks to the following files:

### 1. `requirements.txt`
Lists the required Python dependencies:
- `requests>=2.31.0`
- `click>=8.1.7`
- `psycopg2-binary>=2.9.9`
- `python-dateutil>=2.8.2`

### 2. `clevercloud/post_build.sh`
Script automatically executed after the Node.js build that installs Python dependencies.

## Clever Cloud Configuration

### Option 1: Multi-buildpack (Recommended)

Clever Cloud automatically detects Node.js. To add Python:

1. **Via Clever Cloud dashboard**:
   - Go to "Information" tab
   - "Instance configuration" section
   - Add environment variable:
     ```
     CC_PYTHON_VERSION=3.11
     ```

2. **Via Clever CLI**:
   ```bash
   clever env set CC_PYTHON_VERSION 3.11
   ```

### Option 2: Manual Installation

If Python is not available, the `post_build.sh` script will show a warning but won't block the deployment.

You can install manually via SSH:
```bash
clever ssh
pip3 install --user -r /app/server/src/scripts/perimeters-portaildf/requirements.txt
```

## Verification

### After Deployment

1. **Check that Python is available**:
   ```bash
   clever ssh
   python3 --version
   which python3
   ```

2. **Check installed dependencies**:
   ```bash
   pip3 list | grep -E "requests|click|psycopg2|dateutil"
   ```

3. **Test the synchronization script**:
   ```bash
   cd /app/server/src/scripts/perimeters-portaildf
   ./cerema-sync.sh
   ```

### In Deployment Logs

Search in Clever Cloud logs:
```
=== Installing Python dependencies for Cerema scripts ===
Installing dependencies from server/src/scripts/perimeters-portaildf/requirements.txt
✓ Python dependencies installed successfully
```

## Troubleshooting

### Error "python: command not found"

**Cause**: Python is not installed on the instance

**Solution**:
1. Add `CC_PYTHON_VERSION=3.11` in environment variables
2. Redeploy the application
3. Or use an additional Python buildpack

### Error "pip: command not found"

**Cause**: pip is not available

**Solution**:
```bash
clever ssh
curl https://bootstrap.pypa.io/get-pip.py -o get-pip.py
python3 get-pip.py --user
```

### Error during psycopg2 installation

**Cause**: Missing system libraries

**Solution**: Use `psycopg2-binary` (already in requirements.txt) instead of `psycopg2`

### The post_build.sh script doesn't execute

**Checks**:
1. The file is executable: `chmod +x clevercloud/post_build.sh`
2. The file is committed in git
3. The path is correct in build logs

**Alternative**: Create a deployment hook
```bash
# In clevercloud/python_setup.sh
clever ssh
pip3 install --user -r /app/server/src/scripts/perimeters-portaildf/requirements.txt
```

## Clever Cloud Documentation

- [Multi-buildpacks](https://www.clever-cloud.com/doc/reference/reference-environment-variables/#multi-buildpack)
- [Python on Clever Cloud](https://www.clever-cloud.com/doc/deploy/application/python/python/)
- [Deployment Hooks](https://www.clever-cloud.com/doc/administrate/hooks/)

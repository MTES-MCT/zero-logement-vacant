# ClamAV Setup for Development (macOS)

This guide explains how to configure ClamAV for local development on macOS.

## Installation and Configuration

### 1. Initialize ClamAV

```bash
cd server
./scripts/init-clamav.sh
```

This script will:
- ✅ Install ClamAV via Homebrew (if needed)
- ✅ Create necessary directories
- ✅ Generate configuration files (`clamd.conf`, `freshclam.conf`)
- ✅ Download virus definitions

### 2. Start the ClamAV daemon

```bash
./scripts/start-clamav.sh
```

The daemon will be accessible via:
- **Unix Socket**: `/opt/homebrew/var/run/clamav/clamd.sock`
- **TCP**: `127.0.0.1:3310`

### 3. Stop the ClamAV daemon

```bash
./scripts/stop-clamav.sh
```

## Environment Variables

Add these variables to your `.env`:

```bash
# ClamAV Configuration
CLAMAV_SOCKET=/opt/homebrew/var/run/clamav/clamd.sock
CLAMAV_HOST=127.0.0.1
CLAMAV_PORT=3310

# Skip antivirus scan in development (optional)
# SKIP_ANTIVIRUS_SCAN=true
```

## Development Usage

### Automatic startup

To start ClamAV automatically with the server, add to `package.json`:

```json
{
  "scripts": {
    "predev": "./scripts/start-clamav.sh || true",
    "dev": "nx serve @zerologementvacant/server"
  }
}
```

### Skip scanning (dev mode only)

If you want to temporarily disable scanning in dev:

```bash
export SKIP_ANTIVIRUS_SCAN=true
yarn dev
```

## Updating virus definitions

Virus definitions should be updated regularly:

```bash
freshclam --config-file=/opt/homebrew/etc/clamav/freshclam.conf
```

Or configure automatic daily updates with `crontab`:

```bash
# Edit crontab
crontab -e

# Add this line (update daily at 3am)
0 3 * * * /opt/homebrew/bin/freshclam --config-file=/opt/homebrew/etc/clamav/freshclam.conf --quiet
```

## Check status

```bash
# Check if daemon is running
ps aux | grep clamd

# Check version
clamd --version

# Test scanning
echo "X5O!P%@AP[4\PZX54(P^)7CC)7}\$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!\$H+H*" > /tmp/eicar.txt
clamdscan /tmp/eicar.txt
# Should detect: Eicar-Signature FOUND
```

## Troubleshooting

### Error: Can't open/parse the config file

```bash
# Reinitialize configuration
./scripts/init-clamav.sh
```

### Daemon won't start

```bash
# Check logs
tail -f /opt/homebrew/var/log/clamav/clamd.log

# Check permissions
ls -la /opt/homebrew/var/run/clamav/
```

### Socket not found

The socket path depends on your Homebrew installation:
- Intel Mac: `/usr/local/var/run/clamav/clamd.sock`
- Apple Silicon: `/opt/homebrew/var/run/clamav/clamd.sock`

Check with:
```bash
brew --prefix
```

## Production

In production, ClamAV should be installed and configured via Docker or the system package manager.

Docker Compose example:

```yaml
services:
  clamav:
    image: clamav/clamav:latest
    ports:
      - "3310:3310"
    volumes:
      - clamav-db:/var/lib/clamav
    environment:
      - CLAMD_STARTUP_TIMEOUT=90

volumes:
  clamav-db:
```

## Useful Links

- [ClamAV Documentation](https://docs.clamav.net/)
- [ClamAV Docker Image](https://hub.docker.com/r/clamav/clamav)
- [Homebrew ClamAV](https://formulae.brew.sh/formula/clamav)

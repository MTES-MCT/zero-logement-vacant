#!/usr/bin/env bash

archive_name="backup.tar.gz"
app_name="zerologementvacant"

# Install the Scalingo CLI tool in the container:
install-scalingo-cli

# Install additional tools to interact with the database:
dbclient-fetcher postgresql

# Login to Scalingo, using the token stored in `DUPLICATE_API_TOKEN`:
scalingo login --api-token ${DUPLICATE_API_TOKEN}

# Retrieve the addon id:
addon_id="$( scalingo --app "${app_name}" addons \
             | grep postgresql \
             | cut -d "|" -f 3 \
             | tr -d " " )"

# Download the latest backup available for the specified addon:
scalingo --app "${app_name}" --addon "${addon_id}" \
    backups-download --output "${archive_name}"

# Extract the archive containing the downloaded backup and get the name of the backup file:
backup_file_name="$( tar --extract --verbose --file="${archive_name}" --directory="/app/" \
                     | cut -d " " -f 2 | cut -d "/" -f 2 )"

# Restore the data:
pg_restore --clean --if-exists --no-owner --no-privileges --no-comments \
--dbname ${DUPLICATE_DATABASE_URL} ${backup_file_name}

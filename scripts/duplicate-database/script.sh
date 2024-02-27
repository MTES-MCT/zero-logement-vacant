#!/usr/bin/env bash

if ${IS_REVIEW_APP}
then
  exit;
fi

archive_name="backup.tar.gz"

# Install the Scalingo CLI tool in the container:
echo "=> Install the Scalingo CLI tool"
install-scalingo-cli

# Install additional tools to interact with the database:
echo "=> Install additional tools"
dbclient-fetcher postgresql

# Login to Scalingo, using the token stored in `DUPLICATE_API_TOKEN`:
echo "=> Login to Scalingo"
scalingo login --api-token ${DUPLICATE_API_TOKEN}

# Retrieve the addon id:
addon_id="$( scalingo --app "${APP}" addons \
             | grep postgresql \
             | cut -d "|" -f 3 \
             | tr -d " " )"

# Download the latest backup available for the specified addon:
echo "=> Download the latest backup available"
scalingo --app "${APP}" --addon "${addon_id}" \
    backups-download --output "${archive_name}"

wait

# Extract the archive containing the downloaded backup and get the name of the backup file:
echo "=> Extract the archive"
backup_file_name="$( tar --extract --verbose --file="${archive_name}" --directory="/app/" \
                     | cut -d " " -f 2 | cut -d "/" -f 2 )"

wait

# Restore the data
echo "=> Restore the data:"
pg_restore --clean --no-wal --disable-triggers --if-exists --no-owner --no-privileges --no-comments \
--dbname ${DUPLICATE_DATABASE_URL} ${backup_file_name}

wait

# Stop the container:
echo "=> Stop the container:"
scalingo one-off-stop

#!/usr/bin/env bash

archive_name="backup.tar.gz"

echo "Install the Scalingo CLI tool in the container:"
install-scalingo-cli

echo "Install additional tools to interact with the database:"
dbclient-fetcher postgresql

echo "Login to Scalingo, using the token stored in `DUPLICATE_API_TOKEN`:"
scalingo login --api-token ${DUPLICATE_API_TOKEN}

echo "Retrieve the addon id:"
addon_id="$( scalingo --app "${APP}" addons \
             | grep postgresql \
             | cut -d "|" -f 3 \
             | tr -d " " )"
echo "Download the latest backup available for the specified addon:"
scalingo --app "${APP}" --addon "${addon_id}" \
    backups-download --output "${archive_name}"

echo "Extract the archive containing the downloaded backup and get the name of the backup file:"
backup_file_name="$( tar --extract --verbose --file="${archive_name}" --directory="/app/" \
                     | cut -d " " -f 2 | cut -d "/" -f 2 )"

echo "Restore the data:"
pg_restore --clean --if-exists --no-owner --no-privileges --no-comments \
--dbname ${DUPLICATE_DATABASE_URL} ${backup_file_name}

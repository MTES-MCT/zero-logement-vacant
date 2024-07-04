#!/usr/bin/env bash

if ${IS_REVIEW_APP}
then
  exit;
fi

# Install the Scalingo CLI tool in the container:
echo "=> Install the Scalingo CLI tool"
install-scalingo-cli

# Login to Scalingo, using the token stored in `DUPLICATE_API_TOKEN`:
echo "=> Login to Scalingo"
scalingo login --api-token ${DUPLICATE_API_TOKEN}

# Run the script on a detached one-off container:
echo "=> Download the latest backup available"
scalingo --app "${APP}" run --detached --size 2XL bash scripts/duplicate-database/script.sh

# Stop the container:
echo "=> Stop the container:"
scalingo one-off-stop

#!/usr/bin/env bash

if [[ -z $EMAIL ]]; then
  echo '$EMAIL is undefined'
  exit 1
fi

if [[ -z $PASSWORD ]]; then
  echo '$PASSWORD is undefined'
fi

if [[ -z $(which jq) ]]; then
  echo "jq is required"
fi

HOSTNAME=${HOSTNAME:-http://localhost:3001}
echo "No HOSTNAME provided. Defaulting to $HOSTNAME"

token=$(curl -H "Content-Type: application/json" -d '{ "email": "'"$EMAIL"'", "password": "'"$PASSWORD"'" }' "$HOSTNAME"/api/authenticate | jq '.accessToken' | xargs)

npm i -g autocannon
autocannon \
  -H content-type=application/json \
  -H x-access-token="$token" \
  -b '{ "filters": { "dataYearsIncluded": [2023] }, "filtersForTotalCount": { "dataYearsIncluded": [2023] }, "perPage": 50 }' \
  -m POST \
  --renderStatusCodes \
  "$HOSTNAME"/api/housing

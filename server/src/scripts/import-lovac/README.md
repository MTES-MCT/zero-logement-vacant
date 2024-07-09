# Import LOVAC

This script imports data from LOVAC into a database.
It consists of the following steps:

- Read data from a CSV or JSONL file
- Validate the data using a [yup](https://www.npmjs.com/package/yup) schema
- Create or replace the owner (if `idpersonne` exists) and overwrite the
  following fields:
  - `raw_address`
  - `full_name`
  - `birth_date`

## Prerequisites

A database must be migrated and configured in the `server/.env` using the
`DATABASE_URL` environment variable.

## Usage

```shell
yarn workspace @zerologementvacant/server ts-node src/scripts/import-lovac/cli.ts -h
```

The script can be ran with a CSV file or a JSONL file.

A progress bar is displayed when running manually.
It is displayed correctly when `LOG_LEVEL` is at least `info`.
If `LOG_LEVEL=debug`, the debug logs will "overflow" the progress bar,
hiding it de facto.

### Example usage

```shell
yarn workspace @zerologementvacant/server ts-node src/scripts/import-lovac/cli.ts owners [--dry-run] ~/owners.csv
```

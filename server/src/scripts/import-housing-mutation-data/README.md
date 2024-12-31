## Usage

### Migrate the production database

```shell
DATABASE_URL=... yarn workspace @zerologementvacant/server migrate
```

### Create the CSV file

```sql
INSTALL httpfs;
LOAD httpfs;

CREATE OR REPLACE SECRET (
  TYPE S3,
  KEY_ID '...',
  SECRET '...',
  ENDPOINT 'cellar-c2.services.clever-cloud.com',
  REGION 'us-east-1'
);

-- Copy data to a new table
CREATE OR REPLACE TABLE "dev"."main"."housings" AS
SELECT
  DISTINCT ON (local_id) local_id,
  plot_area,
  cadastral_classification,
  latitude,
  longitude,
  CASE
    WHEN TRY_CAST(TRY_STRPTIME(last_mutation_date, '%d%m%Y') AS DATE) IS NOT NULL THEN
      TRY_STRPTIME(last_mutation_date, '%d%m%Y')
    ELSE
      DATE_TRUNC('month', TRY_STRPTIME(last_mutation_date, '%d%m%Y'))
        + INTERVAL '1 month' - INTERVAL '1 day'
  END AS last_mutation_date,
  last_transaction_date::date AS last_transaction_date,
  last_transaction_value,
  occupancy_history
FROM read_csv(
  's3://zlv-production/production/dump_20241218/housing_data.csv',
  auto_detect = TRUE,
  ignore_errors = TRUE
)
WHERE local_id IS NOT NULL
ORDER BY local_id;

-- Check that the data has been loaded
SELECT * FROM "dev"."main"."housings"
LIMIT 100;

-- Export housings to housings-gold.csv
COPY "dev"."main"."housings" TO 'housings-gold.csv' (HEADER, DELIMITER ',');
```

### Import the CSV file into the production database

```sql
INSTALL postgres;
LOAD postgres;

CREATE OR REPLACE SECRET (
    TYPE POSTGRES,
    HOST '...',
    PORT ...,
    DATABASE '...',
    USER '...',
    PASSWORD '...'
);

ATTACH IF NOT EXISTS '' AS postgres (TYPE POSTGRES);

CREATE OR REPLACE TABLE "postgres"."public"."housings_gold" AS
SELECT * FROM read_csv('housings-gold.csv');

DETACH postgres;
```

### Add a primary key to the `housings_gold` table

In another terminal, connect to the production database and run the following:
```sql
ALTER TABLE housings_gold
ADD CONSTRAINT housings_gold_pkey
PRIMARY KEY (local_id);
```

### Run the import script

```shell
cd server
DATABASE_URL=... yarn dlx tsx src/scripts/import-housing-mutation-data/index.ts
```

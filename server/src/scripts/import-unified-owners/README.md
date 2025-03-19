# Import unified owners

## Usage

### Migrating

```shell
DATABASE_URL=... yarn workspace @zerologementvacant/server migrate
```

### Importing to postgres

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

CREATE TABLE IF NOT EXISTS "dev"."main"."unified_owners" AS
SELECT
    id,
    ff_owner_idpersonne AS idpersonne
FROM
    read_csv(
            's3://zlv-production/production/dump_20241218/unified_owners.csv',
            auto_detect = TRUE,
            ignore_errors = TRUE
    )
ORDER BY id;

WITH duplicates AS (
    SELECT COUNT(*), unified_owners.idpersonne FROM unified_owners
    GROUP BY unified_owners.idpersonne
    HAVING COUNT(*) > 1
)
SELECT * FROM duplicates
LIMIT 10;

COPY (
    SELECT DISTINCT ON (idpersonne) idpersonne, id FROM "dev"."main"."unified_owners"
) TO 'unified-owners.csv' (HEADER, DELIMITER ',');

-- Import to postgres
INSTALL postgres;
LOAD postgres;

CREATE OR REPLACE SECRET (
    TYPE POSTGRES,
    HOST 'localhost',
    PORT 5432,
    DATABASE 'dev',
    USER 'postgres',
    PASSWORD 'postgres'
);

ATTACH IF NOT EXISTS '' AS postgres (TYPE POSTGRES);

TRUNCATE TABLE "postgres"."public"."owners_dept";

INSERT INTO "postgres"."public"."owners_dept"
SELECT id AS owner_id, idpersonne AS owner_idpersonne FROM read_csv(
    'unified-owners.csv',
    auto_detect = TRUE,
    header = TRUE,
    ignore_errors = TRUE
);


-- Show some metrics
SELECT COUNT(*) FROM "dev"."main"."unified_owners";
SELECT COUNT(*) FROM "postgres"."public"."owners_dept";

-- Are there housings that have several awaiting owners?
SELECT housing_id, COUNT(*) AS count FROM "postgres"."public"."owners_housing"
WHERE rank = -2
GROUP BY housing_id
HAVING COUNT(*) >= 2;

-- Awaiting national housing owners
SELECT COUNT(*) FROM "postgres"."public"."owners_housing"
JOIN "postgres"."public"."owners" ON owners.id = owners_housing.owner_id
WHERE rank = -2 AND idpersonne IS NULL;

-- Departmental housing owners
SELECT COUNT(*) FROM "postgres"."public"."owners_housing"
JOIN "postgres"."public"."owners" ON owners.id = owners_housing.owner_id
WHERE rank >= 1 AND idpersonne IS NOT NULL;
```

### Running the script

This script will be processing the actual housing owners, in production.
```shell
cd server
DATABASE_URL=... yarn ts-node src/scripts/import-unified-owners/index.ts
```

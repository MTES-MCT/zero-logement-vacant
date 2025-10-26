from .....config import Config

SCHEMA = "cerema"

ff_tables_sql = {
    "raw_ff_2024_buildings": f"""
    CREATE OR REPLACE TABLE {SCHEMA}.raw_ff_2024_buildings AS (
        SELECT * FROM read_csv('s3://{Config.CELLAR_DATA_LAKE_BUCKET_NAME}/lake/cerema/ff/2024/buildings.csv',
                            auto_detect = TRUE,
                            ignore_errors = false
                )
    );
    """,
    "raw_ff_2024": f"""
            CREATE OR REPLACE TABLE {SCHEMA}.raw_ff_2024 AS (
        SELECT * FROM read_csv('s3://{Config.CELLAR_DATA_LAKE_BUCKET_NAME}/lake/cerema/ff/2024/raw.csv',
                            auto_detect = TRUE,
        ignore_errors = false, types = {{'ff_ccogrm': 'VARCHAR',}}
        )
    );
    """,
    "raw_ff_2023": f"""
            CREATE OR REPLACE TABLE {SCHEMA}.raw_ff_2023 AS (
        SELECT * FROM read_csv('s3://{Config.CELLAR_DATA_LAKE_BUCKET_NAME}/lake/cerema/ff/2023/raw.csv',
                            auto_detect = TRUE,
        ignore_errors = false, types = {{'ff_ccogrm': 'VARCHAR',}}
        )
    );
    """,
    "raw_ff_2022": f"""
            CREATE OR REPLACE TABLE {SCHEMA}.raw_ff_2022 AS (
        SELECT * FROM read_csv('s3://{Config.CELLAR_DATA_LAKE_BUCKET_NAME}/lake/cerema/ff/2022/raw.csv',
                            auto_detect = TRUE,
        ignore_errors = false, types = {{'ff_ccogrm': 'VARCHAR',}}
        )
    );
    """,
    "raw_ff_2021": f"""
            CREATE OR REPLACE TABLE {SCHEMA}.raw_ff_2021 AS (
        SELECT * FROM read_csv('s3://{Config.CELLAR_DATA_LAKE_BUCKET_NAME}/lake/cerema/ff/2021/raw.csv',
                            auto_detect = TRUE,
        ignore_errors = false, types = {{'ff_ccogrm': 'VARCHAR',}}
        )
    );
    """,
    "raw_ff_2020": f"""
            CREATE OR REPLACE TABLE {SCHEMA}.raw_ff_2020 AS (
        SELECT * FROM read_csv('s3://{Config.CELLAR_DATA_LAKE_BUCKET_NAME}/lake/cerema/ff/2020/raw.csv',
                            auto_detect = TRUE,
        ignore_errors = false, types = {{'ff_ccogrm': 'VARCHAR',}}
        )
    );
    """,
    "raw_ff_2019": f"""
            CREATE OR REPLACE TABLE {SCHEMA}.raw_ff_2019 AS (
        SELECT * FROM read_csv('s3://{Config.CELLAR_DATA_LAKE_BUCKET_NAME}/lake/cerema/ff/2019/raw.csv',
                            auto_detect = TRUE,
        ignore_errors = false, types = {{'ff_ccogrm': 'VARCHAR',}}
        )
    );
    """,
    "raw_ff_owners": f"""
        CREATE TABLE {SCHEMA}.raw_ff_owners AS (
        SELECT * FROM read_csv('s3://{Config.CELLAR_DATA_LAKE_BUCKET_NAME}/lake/cerema/ff/2023/owners.csv',
        auto_detect = TRUE,
        ignore_errors = false,
        types = {{'ccogrm': 'VARCHAR',}}
        )
    );
    """,
}

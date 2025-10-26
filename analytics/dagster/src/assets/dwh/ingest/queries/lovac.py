from .....config import Config

SCHEMA = "cerema"

lovac_tables_sql = {
    "raw_lovac_2025": f"""
        CREATE OR REPLACE TABLE {SCHEMA}.raw_lovac_2025 AS (
        SELECT * FROM read_csv('s3://{Config.CELLAR_DATA_LAKE_BUCKET_NAME}/lake/cerema/lovac/2025/raw.csv',
        auto_detect = TRUE,
        escape = '"',
        quote = '"',
        types = {{
        'ff_jdatnss_6': 'VARCHAR',
        'ff_jdatnss_5': 'VARCHAR',
        'ff_jdatnss_4': 'VARCHAR',
        'ff_jdatnss_3': 'VARCHAR',
        'ff_jdatnss_2': 'VARCHAR',
        'ff_jdatnss_1': 'VARCHAR',
        'ff_ccogrm_1': 'VARCHAR',
        'ff_ccogrm_2': 'VARCHAR',
        'ff_ccogrm_3': 'VARCHAR',
        'ff_ccogrm_4': 'VARCHAR',
        'ff_ccogrm_5': 'VARCHAR',
        'ff_ccogrm_6': 'VARCHAR',
        }}));""",
    "raw_lovac_2024": f"""
        CREATE OR REPLACE TABLE {SCHEMA}.raw_lovac_2024 AS (
        SELECT * FROM read_csv('s3://{Config.CELLAR_DATA_LAKE_BUCKET_NAME}/lake/cerema/lovac/2024/raw.csv', auto_detect = TRUE,
        types = {{
        'ff_jdatnss_6': 'VARCHAR',
        'ff_jdatnss_5': 'VARCHAR',
        'ff_jdatnss_4': 'VARCHAR',
        'ff_jdatnss_3': 'VARCHAR',
        'ff_jdatnss_2': 'VARCHAR',
        'ff_jdatnss_1': 'VARCHAR',
        'ff_ccogrm_1': 'VARCHAR',
        'ff_ccogrm_2': 'VARCHAR',
        'ff_ccogrm_3': 'VARCHAR',
        'ff_ccogrm_4': 'VARCHAR',
        'ff_ccogrm_5': 'VARCHAR',
        'ff_ccogrm_6': 'VARCHAR',
    }}));""",
    "raw_lovac_2023": f"""
        CREATE OR REPLACE TABLE {SCHEMA}.raw_lovac_2023 AS (
        SELECT * FROM read_csv('s3://{Config.CELLAR_DATA_LAKE_BUCKET_NAME}/lake/cerema/lovac/2023/raw.csv', auto_detect = TRUE,
        types = {{
        'ff_jdatnss_6': 'VARCHAR',
        'ff_jdatnss_5': 'VARCHAR',
        'ff_jdatnss_4': 'VARCHAR',
        'ff_jdatnss_3': 'VARCHAR',
        'ff_jdatnss_2': 'VARCHAR',
        'ff_jdatnss_1': 'VARCHAR',
        'ff_ccogrm_1': 'VARCHAR',
        'ff_ccogrm_2': 'VARCHAR',
        'ff_ccogrm_3': 'VARCHAR',
        'ff_ccogrm_4': 'VARCHAR',
        'ff_ccogrm_5': 'VARCHAR',
        'ff_ccogrm_6': 'VARCHAR',
    }}));""",
    "raw_lovac_2022": f"CREATE OR REPLACE TABLE {SCHEMA}.raw_lovac_2022 AS (SELECT * FROM read_csv('s3://{Config.CELLAR_DATA_LAKE_BUCKET_NAME}/lake/cerema/lovac/2022/raw.csv', auto_detect = TRUE, ignore_errors = false));",
    "raw_lovac_2021": f"CREATE OR REPLACE TABLE {SCHEMA}.raw_lovac_2021 AS (SELECT * FROM read_csv('s3://{Config.CELLAR_DATA_LAKE_BUCKET_NAME}/lake/cerema/lovac/2021/raw.csv', auto_detect = TRUE, ignore_errors = false, quote='\"'));",
    "raw_lovac_2020": f"CREATE OR REPLACE TABLE {SCHEMA}.raw_lovac_2020 AS (SELECT * FROM read_csv('s3://{Config.CELLAR_DATA_LAKE_BUCKET_NAME}/lake/cerema/lovac/2020/raw.csv', auto_detect = TRUE, ignore_errors = false));",
    "raw_lovac_2019": f"CREATE OR REPLACE TABLE {SCHEMA}.raw_lovac_2019 AS (SELECT * FROM read_csv('s3://{Config.CELLAR_DATA_LAKE_BUCKET_NAME}/lake/cerema/lovac/2019/raw.csv', auto_detect = TRUE, ignore_errors = false));",
    "raw_lovac_ff_ext_2024": f"""
            CREATE OR REPLACE TABLE {SCHEMA}.raw_ff_2024 AS (
        SELECT * FROM read_csv('s3://{Config.CELLAR_DATA_LAKE_BUCKET_NAME}/lake/cerema/ff/2024/raw.csv',
                            auto_detect = TRUE,
        ignore_errors = false, types = {{'ff_ccogrm': 'VARCHAR',}}
        )
    );
    """,
    "raw_lovac_ff_ext_2023": f"""
            CREATE OR REPLACE TABLE {SCHEMA}.raw_ff_2023 AS (
        SELECT * FROM read_csv('s3://{Config.CELLAR_DATA_LAKE_BUCKET_NAME}/lake/cerema/ff/2023/raw.csv',
                            auto_detect = TRUE,
        ignore_errors = false, types = {{'ff_ccogrm': 'VARCHAR',}}
        )
    );
    """,
    "raw_lovac_ff_ext_2022": f"""
            CREATE OR REPLACE TABLE {SCHEMA}.raw_ff_2022 AS (
        SELECT * FROM read_csv('s3://{Config.CELLAR_DATA_LAKE_BUCKET_NAME}/lake/cerema/ff/2022/raw.csv',
                            auto_detect = TRUE,
        ignore_errors = false, types = {{'ff_ccogrm': 'VARCHAR',}}
        )
    );
    """,
    "raw_lovac_ff_ext_2021": f"""
            CREATE OR REPLACE TABLE {SCHEMA}.raw_ff_2021 AS (
        SELECT * FROM read_csv('s3://{Config.CELLAR_DATA_LAKE_BUCKET_NAME}/lake/cerema/ff/2021/raw.csv',
                            auto_detect = TRUE,
        ignore_errors = false, types = {{'ff_ccogrm': 'VARCHAR',}}
        )
    );
    """,
    "raw_lovac_ff_ext_2020": f"""
            CREATE OR REPLACE TABLE {SCHEMA}.raw_ff_2020 AS (
        SELECT * FROM read_csv('s3://{Config.CELLAR_DATA_LAKE_BUCKET_NAME}/lake/cerema/ff/2020/raw.csv',
                            auto_detect = TRUE,
        ignore_errors = false, types = {{'ff_ccogrm': 'VARCHAR',}}
        )
    );
    """,
    "raw_lovac_ff_ext_2019": f"""
            CREATE OR REPLACE TABLE {SCHEMA}.raw_ff_2019 AS (
        SELECT * FROM read_csv('s3://{Config.CELLAR_DATA_LAKE_BUCKET_NAME}/lake/cerema/ff/2019/raw.csv',
                            auto_detect = TRUE,
        ignore_errors = false, types = {{'ff_ccogrm': 'VARCHAR',}}
        )
    );
    """,
    
}

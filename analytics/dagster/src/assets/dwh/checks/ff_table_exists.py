from dagster import AssetSpec, multi_asset
from ..ingest.queries.lovac import lovac_tables_sql
from ..ingest.queries.ff import ff_tables_sql
from dagster_duckdb import DuckDBResource


# Asset for uploading the DuckDB metabase file to S3
all_tables_sql = {**lovac_tables_sql, **ff_tables_sql}

print([ f"check_{table_name}" for table_name in all_tables_sql.keys() ])


@multi_asset(
    specs=[
        AssetSpec(
            f"check_{table_name}",
            kinds={"duckdb"},
            deps=[f"build_{table_name}"],
            group_name="check",
        )
        for table_name in all_tables_sql.keys()
    ],
    can_subset=True,
)
def check_ff_lovac_on_duckdb(duckdb: DuckDBResource):
    query = "SELECT * FROM ff.lovac LIMIT 1;"
    with duckdb.get_connection() as conn:
        res = conn.execute(query)
        if res.fetchdf().empty:
            raise Exception("No data in ff.lovac table")
        else:
            return "Data found in ff.lovac table"

# assets.py
import pandas as pd
from dagster_duckdb import DuckDBResource
from dagster import AssetKey, asset, AssetExecutionContext



@asset(deps=[AssetKey("setup_duckdb")],
             group_name="external_seeds")
def raw_communes(context: AssetExecutionContext, duckdb: DuckDBResource):
    df = pd.read_json('https://geo.api.gouv.fr/communes')
    with duckdb.get_connection() as conn:
        conn.execute("CREATE SCHEMA IF NOT EXISTS external;")
        conn.execute("CREATE OR REPLACE TABLE external.communes AS SELECT * FROM df")
@asset(deps=[AssetKey("setup_duckdb")],
             group_name="external_seeds")
def raw_epci(context: AssetExecutionContext, duckdb: DuckDBResource):
    df = pd.read_json('https://geo.api.gouv.fr/epcis')
    with duckdb.get_connection() as conn:
        conn.execute("CREATE SCHEMA IF NOT EXISTS external;")
        conn.execute("CREATE OR REPLACE TABLE external.epci AS SELECT * FROM df")


@asset(deps=[AssetKey("setup_duckdb")],
             group_name="external_seeds")
def raw_departements(context: AssetExecutionContext, duckdb: DuckDBResource):
    df = pd.read_json('https://geo.api.gouv.fr/departements')
    with duckdb.get_connection() as conn:
        conn.execute("CREATE SCHEMA IF NOT EXISTS external;")
        conn.execute("CREATE OR REPLACE TABLE external.departements AS SELECT * FROM df")
    


@asset(deps=[AssetKey("setup_duckdb")],
             group_name="external_seeds")
def raw_regions(context: AssetExecutionContext, duckdb: DuckDBResource):
    df = pd.read_json('https://geo.api.gouv.fr/regions')
    with duckdb.get_connection() as conn:
        conn.execute("CREATE SCHEMA IF NOT EXISTS external;")
        conn.execute("CREATE OR REPLACE TABLE external.regions AS SELECT * FROM df")
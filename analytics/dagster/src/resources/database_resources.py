from dagster import resource, Field, String
import psycopg2

from ..config import Config

@resource(config_schema={
    "db_name": Field(String, default_value=Config.POSTGRES_PRODUCTION_DB_NAME),
    "db_user": Field(String, default_value=Config.POSTGRES_PRODUCTION_WRITE_ACCESS_USER),
    "db_password": Field(String, default_value=Config.POSTGRES_PRODUCTION_WRITE_ACCESS_PASSWORD),
    "db_host": Field(String, default_value=Config.POSTGRES_PRODUCTION_DB),
    "db_port": Field(String, default_value=Config.POSTGRES_PRODUCTION_PORT),
})
def psycopg2_connection_resource(init_context):
    config = init_context.resource_config
    conn = psycopg2.connect(
        dbname=config["db_name"],
        user=config["db_user"],
        password=config["db_password"],
        host=config["db_host"],
        port=config["db_port"],
    )
    try:
        yield conn
    finally:
        conn.close()

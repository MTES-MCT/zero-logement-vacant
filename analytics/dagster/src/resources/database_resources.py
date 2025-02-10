from dagster import resource, Field, String
from sqlalchemy import create_engine
import psycopg2

from ..config import Config

@resource(config_schema={
    "db_name": Field(String, default_value=Config.POSTGRES_PRODUCTION_DB_NAME),
    "db_user": Field(String, default_value=Config.POSTGRES_PRODUCTION_USER),
    "db_password": Field(String, default_value=Config.POSTGRES_PRODUCTION_PASSWORD),
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

@resource(config_schema={
    "db_name": Field(String, default_value=Config.POSTGRES_PRODUCTION_DB_NAME),
    "db_user": Field(String, default_value=Config.POSTGRES_PRODUCTION_USER),
    "db_password": Field(String, default_value=Config.POSTGRES_PRODUCTION_PASSWORD),
    "db_host": Field(String, default_value=Config.POSTGRES_PRODUCTION_DB),
    "db_port": Field(String, default_value=Config.POSTGRES_PRODUCTION_PORT),
})
def sqlalchemy_engine_resource(init_context):
    config = init_context.resource_config
    engine = create_engine(
        f'postgresql://{config["db_user"]}:{config["db_password"]}@{config["db_host"]}:{config["db_port"]}/{config["db_name"]}'
    )
    try:
        yield engine
    finally:
        engine.dispose()

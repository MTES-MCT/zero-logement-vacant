import dlt
import pandas as pd
from .sql_database import sql_database
from geoalchemy2 import Geometry

import sqlalchemy as sa
from typing import Any
from sqlalchemy.sql.sqltypes import TypeEngine
import json

import logging


logging.basicConfig(
    level=logging.DEBUG,  # Set to DEBUG to capture all log levels
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler()],  # Output to console
)

# Create your logger
my_logger = logging.getLogger("my_logger")
my_logger.setLevel(logging.DEBUG)


def table_adapter(table: sa.Table) -> None:
    # Add a primary key column if the table doesn't have one
    for column in table.columns.values():
        if isinstance(column.type, sa.Float):
            column.type.asdecimal = False
        elif isinstance(column.type, sa.JSON):
            my_logger.debug(f"Normalizing JSON column: {column.name}")
            column.type = sa.JSON()
        elif isinstance(column.type, sa.ARRAY):
            my_logger.debug(f"Normalizing JSON column: {column.name}")
            column.type = sa.ARRAY(sa.VARCHAR)
        elif isinstance(column.type, Geometry):
            my_logger.debug(f"Normalizing Geometry column: {column.name}")
            column.type = sa.Text()  # Optionally change to Text for WKT


def type_adapter(sql_type: TypeEngine[Any]) -> TypeEngine[Any]:
    if isinstance(sql_type, Geometry):
        return Geometry()  # Handle the geometry type
    if isinstance(sql_type, sa.ARRAY):
        return sa.ARRAY(sa.VARCHAR)  # Gère un tableau de VARCHAR
    return sql_type


def get_tables():
    return [
        "owners",
        "fast_housing",
        "owners_housing",
        "events",
        "housing_events",
        "establishments",
        "users",
        "campaigns_housing",
        "campaigns",
        "owners_housing",
        "group_housing_events",
        "groups",
        "groups_housing",
        "geo_perimeters",
        "groups_housing",
        "campaigns_housing",
    ]


def handle_owners_dates(df):
    for col in ["updated_at", "created_at", "birth_date"]:
        if col in df.columns:
            df[col] = pd.to_datetime(df[col], errors="coerce").dt.tz_localize(
                None
            )  # Convertit ou remplace les valeurs invalides par NaT
            # Vérifie et remplace les années invalides
            df[col] = df[col].apply(
                lambda x: x if (pd.notnull(x) and x.year > 0) else pd.NaT
            )
    return df


def handle_fast_housing_dates(df):
    df["updated_at"] = pd.to_datetime(df["updated_at"], errors="coerce").dt.tz_localize(
        None
    )
    df["created_at"] = pd.to_datetime(df["created_at"], errors="coerce").dt.tz_localize(
        None
    )
    df["mutation_date"] = pd.to_datetime(
        df["mutation_date"], errors="coerce"
    ).dt.tz_localize(None)
    df["energy_consumption_at_bdnb"] = pd.to_datetime(
        df["energy_consumption_at_bdnb"], errors="coerce"
    ).dt.tz_localize(None)
    return df


def preprocess_text_array(data):
    if isinstance(data, list):
        return json.dumps(data)
    return data


def handle_establishments(df):
    df["localities_geo_code"] = df["localities_geo_code"].apply(preprocess_text_array)
    return df


@dlt.source(
    schema_contract={"tables": "evolve", "columns": "evolve", "data_type": "evolve"}
)
def get_production_source():
    my_logger.debug("This is a debug message")
    source = sql_database(
        backend="pandas",
        type_adapter_callback=type_adapter,
        table_adapter_callback=table_adapter,
        reflection_level="full",
        chunk_size=10000,
    ).with_resources(*get_tables())

    source.owners.add_map(handle_owners_dates)
    source.fast_housing.add_map(handle_fast_housing_dates)
    source.establishments.add_map(handle_establishments)

    return source

import dlt
from .sql_database import sql_database
from geoalchemy2 import Geometry

import sqlalchemy as sa
from typing import Any
from sqlalchemy.sql.sqltypes import TypeEngine
import json

import logging


logging.basicConfig(
    level=logging.DEBUG,  # Set to DEBUG to capture all log levels
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler()  # Output to console
    ]
)

# Create your logger
my_logger = logging.getLogger("my_logger")
my_logger.setLevel(logging.DEBUG)


def table_adapter(table: sa.Table) -> None:
    # Add a primary key column if the table doesn't have one
    for column in table.columns.values():
        if isinstance(column.type, sa.Float):
            column.type.asdecimal = False
        if isinstance(column.type, sa.JSON):
            column.type = sa.Text()

def type_adapter(sql_type: TypeEngine[Any]) -> TypeEngine[Any]:
    if isinstance(sql_type, sa.ARRAY):
        return sa.JSON()  # Load arrays as JSON
    if isinstance(sql_type, Geometry):
        return Geometry()  # Handle the geometry type
    return sql_type

def get_tables():
    return [
        "owners",
        "old_events",
        "events",
        "housing_events",
        "establishments",
        "users",
        "campaigns_housing",
        "campaigns",
        "housing",
        "owners_housing",
    ]

@dlt.source
def get_production_source():
    my_logger.debug("This is a debug message")
    source = sql_database(    
        backend="pyarrow",
        type_adapter_callback=type_adapter,
        table_adapter_callback=table_adapter,
        reflection_level="minimal",   
    ).with_resources(*get_tables())
    return source
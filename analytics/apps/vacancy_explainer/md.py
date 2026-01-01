from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Iterable, Literal

import duckdb
import pandas as pd


TABLE_FQN = "dwh.main_marts.marts_analysis_city_aggregated"
DEFAULT_MD_DB = "dwh"


@dataclass(frozen=True)
class ColumnInfo:
    name: str
    duckdb_type: str
    kind: Literal["numeric", "categorical", "other"]


def _infer_kind_from_duckdb_type(duckdb_type: str) -> Literal["numeric", "categorical", "other"]:
    t = duckdb_type.strip().upper()
    if any(k in t for k in ("INT", "DOUBLE", "FLOAT", "DECIMAL", "HUGEINT", "UBIGINT", "SMALLINT", "TINYINT", "REAL")):
        return "numeric"
    if any(k in t for k in ("VARCHAR", "CHAR", "TEXT", "STRING", "BOOLEAN", "DATE", "TIMESTAMP")):
        return "categorical"
    return "other"


def require_motherduck_token() -> str:
    token = os.getenv("MOTHERDUCK_TOKEN", "").strip()
    if not token:
        raise RuntimeError("MOTHERDUCK_TOKEN is not set")
    return token


def connect_motherduck(db: str = DEFAULT_MD_DB) -> duckdb.DuckDBPyConnection:
    """
    Connect to MotherDuck using DuckDB.
    Uses `MOTHERDUCK_TOKEN` from environment.
    """
    require_motherduck_token()
    # DuckDB MotherDuck connector reads MOTHERDUCK_TOKEN automatically.
    # This connection string targets the MotherDuck database named `db`.
    return duckdb.connect(f"md:{db}")


def list_columns(con: duckdb.DuckDBPyConnection, table_fqn: str = TABLE_FQN) -> list[ColumnInfo]:
    # DESCRIBE works with qualified identifiers in DuckDB.
    df = con.execute(f"DESCRIBE {table_fqn}").df()
    # DuckDB returns: column_name, column_type, null, key, default, extra (varies)
    cols: list[ColumnInfo] = []
    for _, row in df.iterrows():
        name = str(row["column_name"])
        dtype = str(row["column_type"])
        cols.append(ColumnInfo(name=name, duckdb_type=dtype, kind=_infer_kind_from_duckdb_type(dtype)))
    return cols


def quote_ident(name: str) -> str:
    # DuckDB uses double quotes for identifiers
    return '"' + name.replace('"', '""') + '"'


def sql_literal(value: str) -> str:
    # Minimal SQL string literal escaping for DuckDB (single quotes doubled)
    return "'" + value.replace("'", "''") + "'"


def build_filtered_query(
    *,
    select_cols: Iterable[str],
    exit_rate_max: float,
    total_housing_min: int,
    limit: int,
    department_codes: Iterable[str] | None = None,
    densite_category: str | None = None,
    pop_min: int | None = None,
    pop_max: int | None = None,
    table_fqn: str = TABLE_FQN,
) -> str:
    cols_sql = ",\n    ".join(quote_ident(c) for c in select_cols)
    where_parts: list[str] = [
        f"{quote_ident('exit_rate_pct')} <= {float(exit_rate_max)}",
        f"{quote_ident('total_housing_count')} >= {int(total_housing_min)}",
    ]
    if densite_category:
        where_parts.append(f"{quote_ident('densite_category')} = {sql_literal(densite_category)}")
    if department_codes:
        deps = [d.strip() for d in department_codes if d and d.strip()]
        if deps:
            deps_sql = ", ".join(sql_literal(d) for d in deps)
            # INSEE commune code: first 2 chars correspond to metropolitan department (01-95).
            where_parts.append(f"substr({quote_ident('geo_code')}, 1, 2) IN ({deps_sql})")
    if pop_min is not None:
        where_parts.append(f"{quote_ident('population_2021')} >= {int(pop_min)}")
    if pop_max is not None:
        where_parts.append(f"{quote_ident('population_2021')} <= {int(pop_max)}")

    where_sql = "\n    AND ".join(where_parts)
    return f"""
SELECT
    {cols_sql}
FROM {table_fqn}
WHERE {where_sql}
ORDER BY {quote_ident('exit_rate_pct')} ASC
LIMIT {int(limit)}
""".strip()


def fetch_df(con: duckdb.DuckDBPyConnection, sql: str) -> pd.DataFrame:
    return con.execute(sql).df()




from __future__ import annotations

"""Legacy utilities kept for backward compatibility.

The app has been refactored to use:
- `data/connection.py` for MotherDuck -> local DuckDB caching
- `data/schemas.py` for schema helpers

This module remains as a thin wrapper so old imports don't break.
"""

from typing import Iterable

import duckdb
import pandas as pd

from data.connection import DEFAULT_MD_DB, connect_motherduck
from data.schemas import quote_ident as _quote_ident


# Kept for compatibility with previous `app.py` usage
TABLE_FQN = "dwh.main_marts.marts_analysis_city_aggregated"


def quote_ident(name: str) -> str:
    return _quote_ident(name)


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




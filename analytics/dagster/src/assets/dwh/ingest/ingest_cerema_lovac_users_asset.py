"""
Dagster asset to ingest CEREMA Portail DF LOVAC users into the warehouse.

Fetches every user belonging to a structure that has LOVAC access, by
authenticating against the Portail DF token endpoint and walking the
paginated `structures` + `utilisateurs` endpoints.

The result is materialized as `external.cerema_lovac_users_raw` on MotherDuck,
ready to be consumed by dbt staging models.
"""

import time
from typing import Any

import pandas as pd
import requests
from dagster import AssetExecutionContext, MaterializeResult, RetryPolicy, asset
from dagster_duckdb import DuckDBResource

from ....config import Config

TABLE_NAME = "external.cerema_lovac_users_raw"
PAGE_SLEEP_SECONDS = 0.3
REQUEST_TIMEOUT_SECONDS = 60


def _clean_url(url: str) -> str:
    """Upgrade HTTP→HTTPS and strip the `#`/`%23` corruption that Portail DF
    introduces on `next` page links after a redirect."""
    if not url:
        return url
    if url.startswith("http://portaildf.cerema.fr"):
        url = url.replace("http://", "https://", 1)
    url = url.replace("/%23?", "/?").replace("/%23", "/")
    url = url.replace("%23?", "?").replace("#?", "?")
    return url.replace("%23", "").replace("#", "")


def _fetch_access_token(context: AssetExecutionContext) -> str:
    """Exchange username + password for a short-lived access token."""
    if not Config.CEREMA_USERNAME or not Config.CEREMA_PASSWORD:
        raise ValueError(
            "CEREMA_USERNAME and CEREMA_PASSWORD must be set in the environment."
        )

    token_url = f"{Config.CEREMA_API_BASE_URL.rstrip('/')}/token/"
    context.log.info(f"Authenticating against {token_url}")
    response = requests.post(
        token_url,
        json={
            "username": Config.CEREMA_USERNAME,
            "password": Config.CEREMA_PASSWORD,
        },
        timeout=REQUEST_TIMEOUT_SECONDS,
    )
    response.raise_for_status()
    access_token = response.json().get("access")
    if not access_token:
        raise ValueError("Portail DF token endpoint did not return an access token.")
    return access_token


def _fetch_all_pages(
    session: requests.Session,
    base_url: str,
    endpoint: str,
    context: AssetExecutionContext,
) -> list[dict[str, Any]]:
    """Walk every page of a paginated Portail DF endpoint."""
    results: list[dict[str, Any]] = []
    url: str | None = f"{base_url}/{endpoint}"
    page = 1
    while url:
        response = session.get(url, timeout=REQUEST_TIMEOUT_SECONDS)
        response.raise_for_status()
        payload = response.json()
        results.extend(payload.get("results", []))
        next_url = payload.get("next")
        url = _clean_url(next_url) if next_url else None
        context.log.debug(f"{endpoint}: fetched page {page}, running total {len(results)}")
        page += 1
        time.sleep(PAGE_SLEEP_SECONDS)
    context.log.info(f"{endpoint}: {len(results)} items fetched across {page - 1} pages")
    return results


def _build_lovac_users(
    structures: list[dict[str, Any]],
    users: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """Filter to structures with LOVAC access (acces_lovac date set), then
    join users on their structure id. Matches the legacy script's shape so the
    downstream mart can keep its filter on `structure_acces_lovac`."""
    lovac_structures: dict[Any, dict[str, Any]] = {}
    for structure in structures:
        if structure.get("acces_lovac") is None:
            continue
        struct_id = structure.get("id_structure") or structure.get("id")
        if struct_id is None:
            continue
        lovac_structures[struct_id] = {
            "raison_sociale": structure.get("raison_sociale", ""),
            "siret": structure.get("siret", ""),
            "niveau_acces": structure.get("niveau_acces", ""),
            "acces_lovac": structure.get("acces_lovac"),
        }

    lovac_users: list[dict[str, Any]] = []
    for user in users:
        structure_ref = user.get("structure")
        if isinstance(structure_ref, dict):
            structure_id = structure_ref.get("id_structure") or structure_ref.get("id")
        else:
            structure_id = structure_ref
        if structure_id is None or structure_id not in lovac_structures:
            continue
        structure = lovac_structures[structure_id]
        lovac_users.append({
            "email": user.get("email", ""),
            "id_user": user.get("id_user", ""),
            "exterieur": user.get("exterieur", False),
            "gestionnaire": user.get("gestionnaire", False),
            "date_rattachement": user.get("date_rattachement"),
            "date_expiration": user.get("date_expiration"),
            "cgu_valide": user.get("cgu_valide"),
            "structure_id": structure_id,
            "structure_raison_sociale": structure["raison_sociale"],
            "structure_siret": structure["siret"],
            "structure_niveau_acces": structure["niveau_acces"],
            "structure_acces_lovac": structure["acces_lovac"],
        })
    return lovac_users


@asset(
    name="raw_cerema_lovac_users_raw",
    deps=["setup_external_schema"],
    group_name="cerema",
    compute_kind="duckdb",
    description=(
        "Users belonging to a Portail DF structure with LOVAC access. "
        "Sourced from CEREMA Portail DF API; refreshed monthly."
    ),
    retry_policy=RetryPolicy(
        max_retries=Config.DAGSTER_RETRY_MAX_ATTEMPS,
        delay=Config.DAGSTER_RETRY_DELAY,
    ),
)
def raw_cerema_lovac_users_raw(
    context: AssetExecutionContext, duckdb: DuckDBResource
) -> MaterializeResult:
    access_token = _fetch_access_token(context)
    base_url = Config.CEREMA_API_BASE_URL.rstrip("/")

    session = requests.Session()
    session.headers.update({
        "Authorization": f"Bearer {access_token}",
        "Accept": "application/json",
    })

    structures = _fetch_all_pages(session, base_url, "structures", context)
    users = _fetch_all_pages(session, base_url, "utilisateurs", context)
    lovac_users = _build_lovac_users(structures, users)

    if not lovac_users:
        context.log.warning("No LOVAC users found — leaving the existing table untouched.")
        return MaterializeResult(metadata={"row_count": 0})

    dataframe = pd.DataFrame(lovac_users)

    with duckdb.get_connection() as connection:
        connection.register("lovac_users_df", dataframe)
        connection.execute(
            f"CREATE OR REPLACE TABLE {TABLE_NAME} AS SELECT * FROM lovac_users_df"
        )
        connection.unregister("lovac_users_df")
        row_count = connection.execute(
            f"SELECT COUNT(*) FROM {TABLE_NAME}"
        ).fetchone()[0]

    context.log.info(f"Loaded {row_count} rows into {TABLE_NAME}")
    return MaterializeResult(
        metadata={
            "table": TABLE_NAME,
            "row_count": row_count,
            "structures_total": len(structures),
            "users_total": len(users),
        }
    )

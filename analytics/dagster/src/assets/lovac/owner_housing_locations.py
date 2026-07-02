import importlib.util
import os
import subprocess
import sys
from pathlib import Path
from typing import Any
from urllib.parse import quote_plus

import psycopg2
from dagster import (
    AssetExecutionContext,
    Bool,
    Failure,
    Field,
    Float,
    Int,
    MetadataValue,
    Output,
    String,
    asset,
)

from ...config import Config


def _repository_root() -> Path:
    return Path(__file__).resolve().parents[5]


def _analytics_dagster_dir() -> Path:
    return _repository_root() / "analytics" / "dagster"


def _owner_housing_location_module():
    module_name = "owner_housing_location_calculator"
    cached_module = sys.modules.get(module_name)
    if cached_module is not None:
        return cached_module

    script_dir = (
        _repository_root()
        / "server"
        / "src"
        / "scripts"
        / "owner-housing-distances"
    )
    for path in (script_dir, _repository_root() / "server" / "src"):
        path_str = str(path)
        if path_str not in sys.path:
            sys.path.insert(0, path_str)

    script_path = script_dir / "calculate_distances.py"
    spec = importlib.util.spec_from_file_location(
        module_name, script_path
    )
    module = importlib.util.module_from_spec(spec)
    if spec.loader is None:
        raise RuntimeError(f"Cannot load {script_path}")

    sys.modules[module_name] = module
    try:
        spec.loader.exec_module(module)
    except Exception:
        sys.modules.pop(module_name, None)
        raise

    return module


def _database_url() -> str:
    required = {
        "POSTGRES_PRODUCTION_DB": Config.POSTGRES_PRODUCTION_DB,
        "POSTGRES_PRODUCTION_PORT": Config.POSTGRES_PRODUCTION_PORT,
        "POSTGRES_PRODUCTION_DB_NAME": Config.POSTGRES_PRODUCTION_DB_NAME,
        "POSTGRES_PRODUCTION_WRITE_ACCESS_USER": Config.POSTGRES_PRODUCTION_WRITE_ACCESS_USER,
        "POSTGRES_PRODUCTION_WRITE_ACCESS_PASSWORD": Config.POSTGRES_PRODUCTION_WRITE_ACCESS_PASSWORD,
    }
    missing = [key for key, value in required.items() if not value]
    if missing:
        raise RuntimeError(f"Missing required env vars: {', '.join(missing)}")

    user = quote_plus(Config.POSTGRES_PRODUCTION_WRITE_ACCESS_USER)
    password = quote_plus(Config.POSTGRES_PRODUCTION_WRITE_ACCESS_PASSWORD)
    host = Config.POSTGRES_PRODUCTION_DB
    port = Config.POSTGRES_PRODUCTION_PORT
    db_name = Config.POSTGRES_PRODUCTION_DB_NAME
    sslmode = os.environ.get("POSTGRES_SSLMODE")
    suffix = f"?sslmode={quote_plus(sslmode)}" if sslmode else ""
    return f"postgresql://{user}:{password}@{host}:{port}/{db_name}{suffix}"


def _scope_from_config(config: dict[str, Any]) -> tuple[str | None, tuple[str, ...]]:
    establishment_id = config.get("establishment_id") or None
    geo_codes = tuple(
        code.strip() for code in config.get("geo_codes", []) if code and code.strip()
    )
    if not establishment_id and not geo_codes and not config.get("allow_full_year"):
        raise Failure(
            "Refusing an unscoped LOVAC location run. Set establishment_id, "
            "geo_codes, or allow_full_year=true."
        )
    return establishment_id, geo_codes


def _scope_where(config: dict[str, Any]) -> tuple[str, dict[str, Any]]:
    clauses = ["%(data_file_year)s = ANY(h.data_file_years)"]
    params: dict[str, Any] = {"data_file_year": config["data_file_year"]}
    establishment_id, geo_codes = _scope_from_config(config)

    if establishment_id:
        clauses.append(
            """
            h.geo_code = ANY(
              COALESCE(
                (
                  SELECT localities_geo_code
                  FROM establishments
                  WHERE id = %(establishment_id)s::uuid
                ),
                ARRAY[]::text[]
              )
            )
            """
        )
        params["establishment_id"] = establishment_id

    if geo_codes:
        clauses.append("h.geo_code = ANY(%(geo_codes)s::text[])")
        params["geo_codes"] = list(geo_codes)

    return "\nAND ".join(clauses), params


def _metadata_from_dict(values: dict[str, Any]) -> dict[str, MetadataValue]:
    metadata: dict[str, MetadataValue] = {}
    for key, value in values.items():
        if isinstance(value, bool):
            metadata[key] = MetadataValue.bool(value)
        elif isinstance(value, int):
            metadata[key] = MetadataValue.int(value)
        elif isinstance(value, float):
            metadata[key] = MetadataValue.float(value)
        elif isinstance(value, (dict, list)):
            metadata[key] = MetadataValue.json(value)
        else:
            metadata[key] = MetadataValue.text(str(value))
    return metadata


LOVAC_SCOPE_CONFIG = {
    "data_file_year": Field(
        String,
        default_value="lovac-2026",
        description="LOVAC cohort tag stored in fast_housing.data_file_years.",
    ),
    "establishment_id": Field(
        String,
        default_value="",
        description="Optional establishment UUID. Restricts the run to its geo codes.",
    ),
    "geo_codes": Field(
        [String],
        default_value=[],
        description="Optional INSEE geo codes. Use this for a targeted test run.",
    ),
    "allow_full_year": Field(
        Bool,
        default_value=False,
        description="Required opt-in for a full cohort run without establishment/geo_codes.",
    ),
}


@asset(
    name="lovac_owner_ban_backfill",
    description=(
        "Optional one-shot owner BAN backfill for owners linked to a LOVAC cohort. "
        "Dry-run skips writes by default."
    ),
    config_schema={
        "data_file_year": LOVAC_SCOPE_CONFIG["data_file_year"],
        "dry_run": Field(Bool, default_value=True),
        "allow_full_year": Field(Bool, default_value=False),
        "rebuild_targets": Field(Bool, default_value=False),
        "limit": Field(Int, default_value=0, description="0 means all candidates."),
        "workers": Field(Int, default_value=2),
        "chunk": Field(Int, default_value=500),
        "fetch_batch": Field(Int, default_value=20_000),
    },
)
def lovac_owner_ban_backfill(context: AssetExecutionContext):
    config = context.op_config
    if config["dry_run"]:
        context.log.info("Dry-run enabled: owner BAN backfill subprocess skipped.")
        return Output(
            value={"dry_run": True, "skipped": True},
            metadata={
                "dry_run": MetadataValue.bool(True),
                "skipped": MetadataValue.bool(True),
            },
        )

    if config["limit"] == 0 and not config["allow_full_year"]:
        raise Failure(
            "Refusing a full owner BAN backfill without allow_full_year=true. "
            "Use limit for a pilot run first."
        )

    command = [
        sys.executable,
        str(_analytics_dagster_dir() / "scripts" / "backfill_ban_owners.py"),
        "--by",
        "housing-lovac",
        "--data-source",
        config["data_file_year"],
        "--workers",
        str(config["workers"]),
        "--chunk",
        str(config["chunk"]),
        "--fetch-batch",
        str(config["fetch_batch"]),
    ]
    if config["limit"] > 0:
        command.extend(["--limit", str(config["limit"])])
    if config["rebuild_targets"]:
        command.append("--rebuild-targets")

    context.log.info("Running %s", " ".join(command))
    result = subprocess.run(
        command,
        cwd=_analytics_dagster_dir(),
        check=False,
        capture_output=True,
        text=True,
    )
    if result.stdout:
        context.log.info(result.stdout)
    if result.stderr:
        context.log.warning(result.stderr)
    if result.returncode != 0:
        raise Failure(
            f"Owner BAN backfill failed with exit code {result.returncode}",
            metadata={
                "stderr": MetadataValue.text(result.stderr[-4000:]),
                "stdout": MetadataValue.text(result.stdout[-4000:]),
            },
        )

    return Output(
        value={"dry_run": False, "returncode": result.returncode},
        metadata={
            "dry_run": MetadataValue.bool(False),
            "returncode": MetadataValue.int(result.returncode),
            "stdout_tail": MetadataValue.text(result.stdout[-4000:]),
        },
    )


@asset(
    name="lovac_owner_housing_locations",
    description=(
        "Calculates owners_housing.locprop_relative_ban and locprop_distance_ban "
        "for a scoped LOVAC cohort."
    ),
    config_schema={
        **LOVAC_SCOPE_CONFIG,
        "dry_run": Field(Bool, default_value=True),
        "force": Field(Bool, default_value=False),
        "limit": Field(Int, default_value=0, description="0 means no limit."),
        "batch_size": Field(Int, default_value=50_000),
        "num_workers": Field(Int, default_value=1),
    },
)
def lovac_owner_housing_locations(
    context: AssetExecutionContext,
    lovac_owner_ban_backfill,
):
    config = context.op_config
    establishment_id, geo_codes = _scope_from_config(config)
    module = _owner_housing_location_module()
    limit = config["limit"] or None

    report = module.calculate_owner_housing_locations(
        db_url=_database_url(),
        data_file_year=config["data_file_year"],
        establishment_id=establishment_id,
        geo_codes=geo_codes,
        limit=limit,
        force=config["force"],
        dry_run=config["dry_run"],
        batch_size=config["batch_size"],
        num_workers=config["num_workers"],
    )
    report_dict = report.to_dict()
    context.log.info("Location computation report: %s", report_dict)
    return Output(
        value=report_dict,
        metadata=_metadata_from_dict(
            {
                "dry_run": report_dict["dry_run"],
                "candidate_count": report_dict["candidate_count"],
                "processed_pairs": report_dict["processed_pairs"],
                "updates_prepared": report_dict["updates_prepared"],
                "updated_pairs": report_dict["updated_pairs"],
                "classification_counts": report_dict["classification_counts"],
            }
        ),
    )


@asset(
    name="lovac_owner_housing_location_quality_check",
    description="Checks relative-location coverage for a scoped LOVAC cohort.",
    config_schema={
        **LOVAC_SCOPE_CONFIG,
        "min_coverage_ratio": Field(Float, default_value=0.95),
        "fail_on_low_coverage": Field(Bool, default_value=True),
    },
)
def lovac_owner_housing_location_quality_check(
    context: AssetExecutionContext,
    lovac_owner_housing_locations,
):
    config = context.op_config
    where_sql, params = _scope_where(config)
    query = f"""
        SELECT
          COUNT(*) AS total_pairs,
          COUNT(*) FILTER (
            WHERE oh.locprop_relative_ban IS NOT NULL
          ) AS classified_pairs,
          COUNT(*) FILTER (
            WHERE oh.locprop_relative_ban IS NULL
          ) AS missing_relative_pairs,
          COUNT(*) FILTER (
            WHERE oh.locprop_relative_ban = 0
          ) AS same_address_pairs,
          COUNT(*) FILTER (
            WHERE oh.locprop_relative_ban = 6
          ) AS foreign_pairs,
          COUNT(*) FILTER (
            WHERE oba.ref_id IS NULL
          ) AS owner_ban_missing_pairs,
          COUNT(*) FILTER (
            WHERE hba.ref_id IS NULL
          ) AS housing_ban_missing_pairs
        FROM owners_housing oh
        JOIN fast_housing h
          ON h.id = oh.housing_id
         AND h.geo_code = oh.housing_geo_code
        LEFT JOIN ban_addresses oba
          ON oba.ref_id = oh.owner_id
         AND oba.address_kind = 'Owner'
        LEFT JOIN ban_addresses hba
          ON hba.ref_id = oh.housing_id
         AND hba.address_kind = 'Housing'
        WHERE oh.rank >= 1
          AND {where_sql}
    """

    with psycopg2.connect(_database_url()) as conn, conn.cursor() as cursor:
        cursor.execute(query, params)
        row = cursor.fetchone()

    total_pairs = int(row[0])
    classified_pairs = int(row[1])
    coverage_ratio = classified_pairs / total_pairs if total_pairs else 1.0
    summary = {
        "total_pairs": total_pairs,
        "classified_pairs": classified_pairs,
        "missing_relative_pairs": int(row[2]),
        "same_address_pairs": int(row[3]),
        "foreign_pairs": int(row[4]),
        "owner_ban_missing_pairs": int(row[5]),
        "housing_ban_missing_pairs": int(row[6]),
        "coverage_ratio": coverage_ratio,
        "min_coverage_ratio": config["min_coverage_ratio"],
        "below_threshold": coverage_ratio < config["min_coverage_ratio"],
    }
    metadata = _metadata_from_dict(summary)
    if summary["below_threshold"] and config["fail_on_low_coverage"]:
        raise Failure(
            "LOVAC owner-housing location coverage is below the configured threshold.",
            metadata=metadata,
        )

    return Output(value=summary, metadata=metadata)

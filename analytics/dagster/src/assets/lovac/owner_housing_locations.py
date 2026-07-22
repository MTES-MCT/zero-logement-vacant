import os
import re
import subprocess
import sys
from pathlib import Path
from typing import Any
from uuid import UUID

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

from ...owner_housing_locations import calculate_owner_housing_locations


def _analytics_dagster_dir() -> Path:
    return Path(__file__).resolve().parents[3]


def _runtime_script(
    relative_path: Path,
    *,
    runtime_root: Path | None = None,
) -> Path:
    root = runtime_root or Path(
        os.environ.get("DAGSTER_HOME", _analytics_dagster_dir())
    )
    runtime_path = root / relative_path
    if runtime_path.is_file():
        return runtime_path
    raise RuntimeError(
        "Required Dagster runtime script is missing. " f"Checked {runtime_path}."
    )


def _scope_from_config(config: dict[str, Any]) -> tuple[str | None, tuple[str, ...]]:
    data_file_year = config.get("data_file_year", "")
    if not re.fullmatch(r"lovac-\d{4}", data_file_year):
        raise Failure("Invalid LOVAC data_file_year. Expected the format lovac-YYYY.")
    establishment_id = config.get("establishment_id") or None
    if establishment_id:
        try:
            establishment_id = str(UUID(establishment_id.strip()))
        except (AttributeError, ValueError):
            raise Failure("Invalid LOVAC scope: establishment_id must be a UUID.")
    geo_codes = tuple(
        code.strip() for code in config.get("geo_codes", []) if code and code.strip()
    )
    invalid_geo_codes = [
        code for code in geo_codes if not re.fullmatch(r"(?:\d{5}|2[AB]\d{3})", code)
    ]
    if invalid_geo_codes:
        raise Failure(
            "Invalid LOVAC scope: malformed INSEE geo_codes: "
            + ", ".join(invalid_geo_codes)
        )
    if not establishment_id and not geo_codes and not config.get("allow_full_year"):
        raise Failure(
            "Refusing an unscoped LOVAC location run. Set establishment_id, "
            "geo_codes, or allow_full_year=true."
        )
    return establishment_id, geo_codes


def _scope_where(config: dict[str, Any]) -> tuple[str, dict[str, Any]]:
    clauses = ["h.data_file_years @> ARRAY[%(data_file_year)s]::text[]"]
    params: dict[str, Any] = {"data_file_year": config["data_file_year"]}
    establishment_id, geo_codes = _scope_from_config(config)

    if establishment_id:
        clauses.append("""
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
            """)
        params["establishment_id"] = establishment_id

    if geo_codes:
        clauses.append("h.geo_code = ANY(%(geo_codes)s::text[])")
        params["geo_codes"] = list(geo_codes)

    return "\nAND ".join(clauses), params


def _normalized_scope(config: dict[str, Any]) -> dict[str, Any]:
    establishment_id, geo_codes = _scope_from_config(config)
    return {
        "data_file_year": config["data_file_year"],
        "establishment_id": establishment_id,
        "geo_codes": list(geo_codes),
    }


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
        **LOVAC_SCOPE_CONFIG,
        "dry_run": Field(Bool, default_value=True),
        "rebuild_targets": Field(
            Bool,
            default_value=True,
            description=(
                "Rebuild the scoped owner target table and reset its cursor. "
                "Disable only when resuming the same post-import operation."
            ),
        ),
        "limit": Field(Int, default_value=0, description="0 means all candidates."),
        "workers": Field(Int, default_value=2),
        "chunk": Field(Int, default_value=500),
        "fetch_batch": Field(Int, default_value=20_000),
    },
)
def lovac_owner_ban_backfill(context: AssetExecutionContext):
    config = context.op_config
    scope = _normalized_scope(config)
    if config["dry_run"]:
        context.log.info("Dry-run enabled: owner BAN backfill subprocess skipped.")
        return Output(
            value={"dry_run": True, "skipped": True, "scope": scope},
            metadata={
                "dry_run": MetadataValue.bool(True),
                "skipped": MetadataValue.bool(True),
                "scope": MetadataValue.json(scope),
            },
        )

    establishment_id, geo_codes = _scope_from_config(config)
    script_path = _runtime_script(
        Path("scripts/backfill_ban_owners.py"),
    )
    command = [
        sys.executable,
        str(script_path),
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
    if establishment_id:
        command.extend(["--establishment-id", establishment_id])
    for geo_code in geo_codes:
        command.extend(["--geo-code", geo_code])
    if config["rebuild_targets"]:
        command.extend(["--rebuild-targets", "--reset"])

    context.log.info("Running %s", " ".join(command))
    result = subprocess.run(
        command,
        cwd=script_path.parent.parent,
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
        value={"dry_run": False, "returncode": result.returncode, "scope": scope},
        metadata={
            "dry_run": MetadataValue.bool(False),
            "returncode": MetadataValue.int(result.returncode),
            "scope": MetadataValue.json(scope),
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
    required_resource_keys={"psycopg2_connection"},
)
def lovac_owner_housing_locations(
    context: AssetExecutionContext,
    lovac_owner_ban_backfill,
):
    config = context.op_config
    establishment_id, geo_codes = _scope_from_config(config)
    expected_scope = _normalized_scope(config)
    backfill_scope = lovac_owner_ban_backfill.get("scope")
    if not isinstance(backfill_scope, dict):
        raise Failure("Backfill report does not contain a valid scope.")
    actual_scope = _normalized_scope(backfill_scope | {"allow_full_year": True})
    if actual_scope != expected_scope:
        raise Failure(
            "Backfill scope does not match the owner-housing location scope.",
            metadata=_metadata_from_dict(
                {"expected_scope": expected_scope, "backfill_scope": actual_scope}
            ),
        )
    limit = config["limit"] or None

    report = calculate_owner_housing_locations(
        db_url=context.resources.psycopg2_connection.dsn,
        data_file_year=config["data_file_year"],
        establishment_id=establishment_id,
        geo_codes=geo_codes,
        allow_full_year=config["allow_full_year"],
        limit=limit,
        force=config["force"],
        dry_run=config["dry_run"],
        batch_size=config["batch_size"],
        num_workers=config["num_workers"],
    )
    report_dict = report.to_dict()
    context.log.info("Location computation report: %s", report_dict)
    if report_dict["errors"] > 0:
        raise Failure(
            f"Owner-housing location run reported {report_dict['errors']} "
            "processing error(s).",
            metadata=_metadata_from_dict(report_dict),
        )
    if (
        not config["dry_run"]
        and report_dict["updated_pairs"] != report_dict["updates_prepared"]
    ):
        raise Failure(
            "Owner-housing location run "
            f"prepared {report_dict['updates_prepared']} updates but wrote "
            f"{report_dict['updated_pairs']}.",
            metadata=_metadata_from_dict(report_dict),
        )
    return Output(
        value=report_dict,
        metadata=_metadata_from_dict(
            {
                "dry_run": report_dict["dry_run"],
                "candidate_count": report_dict["candidate_count"],
                "processed_pairs": report_dict["processed_pairs"],
                "updates_prepared": report_dict["updates_prepared"],
                "updated_pairs": report_dict["updated_pairs"],
                "errors": report_dict["errors"],
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
    required_resource_keys={"psycopg2_connection"},
)
def lovac_owner_housing_location_quality_check(
    context: AssetExecutionContext,
    lovac_owner_housing_locations,
):
    config = context.op_config
    expected_scope = _normalized_scope(config)
    report_scope = lovac_owner_housing_locations.get("scope")
    if not isinstance(report_scope, dict):
        raise Failure("Location report does not contain a valid scope.")
    actual_scope = _normalized_scope(report_scope | {"allow_full_year": True})
    if actual_scope != expected_scope:
        raise Failure(
            "Quality-check scope does not match the owner-housing location report.",
            metadata=_metadata_from_dict(
                {"expected_scope": expected_scope, "report_scope": actual_scope}
            ),
        )
    where_sql, params = _scope_where(config)
    query = f"""
        SELECT
          COUNT(*) AS total_pairs,
          COUNT(*) FILTER (
            WHERE oh.locprop_relative_ban BETWEEN 0 AND 6
          ) AS classified_pairs,
          COUNT(*) FILTER (
            WHERE oh.locprop_relative_ban IS NULL
               OR oh.locprop_relative_ban = 7
          ) AS missing_relative_pairs,
          COUNT(*) FILTER (
            WHERE oh.locprop_relative_ban = 0
          ) AS same_address_pairs,
          COUNT(*) FILTER (
            WHERE oh.locprop_relative_ban = 6
          ) AS foreign_pairs,
          COUNT(*) FILTER (
            WHERE oba.ref_id IS NULL OR oba.ban_id IS NULL
          ) AS owner_ban_missing_pairs,
          COUNT(*) FILTER (
            WHERE hba.ref_id IS NULL OR hba.ban_id IS NULL
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

    with context.resources.psycopg2_connection.cursor() as cursor:
        cursor.execute(query, params)
        row = cursor.fetchone()

    total_pairs = int(row[0])
    classified_pairs = int(row[1])
    coverage_ratio = classified_pairs / total_pairs if total_pairs else 0.0
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
    if total_pairs == 0:
        raise Failure(
            "LOVAC quality-check scope contains no owner-housing pairs.",
            metadata=metadata,
        )
    if summary["below_threshold"] and config["fail_on_low_coverage"]:
        raise Failure(
            "LOVAC owner-housing location coverage is below the configured threshold.",
            metadata=metadata,
        )

    return Output(value=summary, metadata=metadata)

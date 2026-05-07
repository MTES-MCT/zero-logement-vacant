from dagster import asset, MaterializeResult, MetadataValue

from .config import ImportLovacConfig
from .partitions import departments_partitions

from .owners.read import read_source_owners, validate_source_owners, read_existing_owners
from .owners.transform import transform_owners
from .owners.write import write_owners

from .housings.read import (
    read_source_housings,
    read_existing_housings,
    read_existing_housing_events,
    read_admin_user_id,
)
from .housings.transform import transform_housings
from .housings.write import write_housings

from .housing_owners.read import (
    read_source_housing_owners,
    validate_source_housing_owners,
    read_existing_housings_for_join,
    read_existing_owners_for_join,
    read_existing_housing_owners,
)
from .housing_owners.transform import transform_housing_owners
from .housing_owners.write import write_housing_owners

from .existing_housings.read import read_housings_missing_from_year
from .existing_housings.transform import transform_existing_housings
from .existing_housings.write import write_existing_housing_updates

from .buildings.read import read_source_buildings, count_existing_buildings
from .buildings.triggers import disable_building_triggers, enable_building_triggers
from .buildings.write import write_source_buildings, update_building_counts


@asset(group_name="import_lovac")
def source_owners(
    context,
    config: ImportLovacConfig,
) -> MaterializeResult:
    """Import owners from LOVAC JSONL. Single asset, no partitions."""
    context.log.info("Reading source owners...")
    source = read_source_owners(f"{config.source_path}/owners.jsonl")
    source = validate_source_owners(source)

    context.log.info("Reading existing owners from PostgreSQL...")
    existing = read_existing_owners(config.connection_string)
    context.log.info(f"Loaded {existing.height} existing owners")

    context.log.info("Transforming owners (enrich + create/update split)...")
    to_create, to_update = transform_owners(source, existing, config.year)
    context.log.info(f"To create: {to_create.height}, to update: {to_update.height}")

    context.log.info("Writing owners to PostgreSQL...")
    created, updated = write_owners(
        to_create, to_update, config.connection_string, config.dry_run
    )
    context.log.info(f"Done: {created} created, {updated} updated")

    return MaterializeResult(
        metadata={
            "dagster/row_count": to_create.height + to_update.height,
            "rows_created": MetadataValue.int(created),
            "rows_updated": MetadataValue.int(updated),
        }
    )


@asset(
    group_name="import_lovac",
    deps=["source_owners"],
)
def source_buildings(
    context,
    config: ImportLovacConfig,
) -> MaterializeResult:
    """Import buildings from LOVAC JSONL. Inserts new buildings, skips existing."""
    context.log.info("Reading source buildings...")
    source = read_source_buildings(f"{config.source_path}/buildings.jsonl")
    context.log.info(f"Loaded {source.height} source buildings")

    before = count_existing_buildings(config.connection_string)
    context.log.info(f"Existing buildings before: {before}")

    context.log.info("Writing buildings to PostgreSQL...")
    inserted = write_source_buildings(source, config.connection_string, config.dry_run)
    context.log.info(f"Done: {inserted} inserted, {source.height - inserted} skipped")

    return MaterializeResult(
        metadata={
            "dagster/row_count": source.height,
            "rows_inserted": MetadataValue.int(inserted),
            "rows_skipped": MetadataValue.int(source.height - inserted),
            "before_count": MetadataValue.int(before),
        }
    )


@asset(
    group_name="import_lovac",
    deps=["source_buildings"],
)
def building_triggers_disabled(
    context,
    config: ImportLovacConfig,
) -> MaterializeResult:
    """Disable building count triggers on fast_housing for bulk import performance."""
    context.log.info("Disabling building triggers...")
    disable_building_triggers(config.connection_string)
    context.log.info("Building triggers disabled.")

    return MaterializeResult(
        metadata={"triggers_disabled": MetadataValue.bool(True)}
    )


@asset(
    group_name="import_lovac",
    deps=["building_triggers_disabled"],
    partitions_def=departments_partitions,
)
def source_housings(
    context,
    config: ImportLovacConfig,
) -> MaterializeResult:
    """Import housings from LOVAC parquet. Partitioned by department."""
    department = context.partition_key

    context.log.info("Resolving admin user id...")
    admin_user_id = read_admin_user_id(
        config.connection_string, config.system_account_email
    )

    context.log.info(f"[{department}] Reading source housings...")
    source = read_source_housings(f"{config.source_path}/housings", department)

    context.log.info(f"[{department}] Reading existing housings from PostgreSQL...")
    existing = read_existing_housings(config.connection_string, department)
    context.log.info(f"[{department}] Loaded {existing.height} existing housings")

    housing_ids = existing["id"].to_list()
    context.log.info(f"[{department}] Reading {len(housing_ids)} housing events...")
    existing_events = read_existing_housing_events(
        config.connection_string, housing_ids
    )
    context.log.info(f"[{department}] Loaded {existing_events.height} events")

    context.log.info(f"[{department}] Transforming housings...")
    to_create, to_update, events, housing_events = transform_housings(
        source, existing, existing_events,
        year=config.year, admin_user_id=admin_user_id,
    )
    context.log.info(
        f"[{department}] To create: {to_create.height}, to update: {to_update.height}, events: {events.height}"
    )

    context.log.info(f"[{department}] Writing housings to PostgreSQL...")
    created, updated, events_count = write_housings(
        to_create, to_update, events, housing_events,
        config.connection_string, config.dry_run
    )
    context.log.info(f"[{department}] Done: {created} created, {updated} updated, {events_count} events")

    return MaterializeResult(
        metadata={
            "department": department,
            "dagster/row_count": to_create.height + to_update.height,
            "rows_created": MetadataValue.int(created),
            "rows_updated": MetadataValue.int(updated),
            "events_created": MetadataValue.int(events_count),
        }
    )


@asset(
    group_name="import_lovac",
    deps=["source_owners", "source_housings"],
    partitions_def=departments_partitions,
)
def source_housing_owners(
    context,
    config: ImportLovacConfig,
) -> MaterializeResult:
    """Import housing-owner links from LOVAC JSONL. Partitioned by department."""
    department = context.partition_key
    context.log.info(f"[{department}] Reading source housing-owners...")
    source = read_source_housing_owners(
        f"{config.source_path}/housing-owners.jsonl", department
    )
    source = validate_source_housing_owners(source)

    context.log.info(f"[{department}] Reading existing housings for join...")
    existing_housings = read_existing_housings_for_join(
        config.connection_string, department
    )
    context.log.info(f"[{department}] Loaded {existing_housings.height} existing housings")

    context.log.info(f"[{department}] Reading existing owners for join...")
    existing_owners = read_existing_owners_for_join(config.connection_string)
    context.log.info(f"[{department}] Loaded {existing_owners.height} existing owners")

    housing_ids = existing_housings["id"].to_list()
    context.log.info(f"[{department}] Reading {len(housing_ids)} existing housing-owner links...")
    existing_housing_owner_links = read_existing_housing_owners(
        config.connection_string, housing_ids
    )
    context.log.info(f"[{department}] Loaded {existing_housing_owner_links.height} existing links")

    admin_user_id = read_admin_user_id(
        config.connection_string, config.system_account_email
    )

    context.log.info(f"[{department}] Transforming housing-owners...")
    housing_owner_rows, events, housing_owner_events = transform_housing_owners(
        source, existing_housings, existing_owners, existing_housing_owner_links,
        year=config.year, admin_user_id=admin_user_id,
    )
    context.log.info(
        f"[{department}] Links: {housing_owner_rows.height}, events: {events.height}"
    )

    context.log.info(f"[{department}] Writing housing-owners to PostgreSQL...")
    links_written, events_count = write_housing_owners(
        housing_owner_rows, events, housing_owner_events,
        config.connection_string, config.dry_run,
    )
    context.log.info(f"[{department}] Done: {links_written} links written, {events_count} events")

    return MaterializeResult(
        metadata={
            "department": department,
            "dagster/row_count": housing_owner_rows.height,
            "links_written": MetadataValue.int(links_written),
            "events_created": MetadataValue.int(events_count),
        }
    )


@asset(
    group_name="import_lovac",
    deps=["building_triggers_disabled", "source_housings"],
    partitions_def=departments_partitions,
)
def existing_housings(
    context,
    config: ImportLovacConfig,
) -> MaterializeResult:
    """Verify existing housings against current LOVAC year. Partitioned by department."""
    department = context.partition_key

    context.log.info(f"[{department}] Querying housings missing from {config.year}...")
    housings_missing = read_housings_missing_from_year(
        config.connection_string, config.year, department
    )
    context.log.info(f"[{department}] Found {housings_missing.height} housings to reset")

    admin_user_id = read_admin_user_id(
        config.connection_string, config.system_account_email
    )

    context.log.info(f"[{department}] Transforming existing housings...")
    to_update, events, housing_events = transform_existing_housings(
        housings_missing, year=config.year, admin_user_id=admin_user_id
    )
    context.log.info(f"[{department}] To update: {to_update.height}, events: {events.height}")

    context.log.info(f"[{department}] Writing updates to PostgreSQL...")
    updated, events_count = write_existing_housing_updates(
        to_update, events, housing_events, config.connection_string, config.dry_run
    )
    context.log.info(f"[{department}] Done: {updated} updated, {events_count} events")

    return MaterializeResult(
        metadata={
            "department": department,
            "dagster/row_count": housings_missing.height,
            "rows_updated": MetadataValue.int(updated),
            "events_created": MetadataValue.int(events_count),
        }
    )


@asset(
    group_name="import_lovac",
    deps=["source_housings", "existing_housings"],
)
def buildings(
    context,
    config: ImportLovacConfig,
) -> MaterializeResult:
    """Update building counts and re-enable triggers after housing import."""
    context.log.info("Updating building counts...")
    updated = update_building_counts(config.connection_string, config.dry_run)
    context.log.info(f"Updated {updated} buildings.")

    context.log.info("Re-enabling building triggers...")
    enable_building_triggers(config.connection_string)
    context.log.info("Building triggers re-enabled.")

    return MaterializeResult(
        metadata={
            "dagster/row_count": updated,
            "buildings_updated": MetadataValue.int(updated),
        }
    )

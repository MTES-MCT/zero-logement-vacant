import polars as pl


def transform_housing_owners(
    source: pl.LazyFrame,
    existing_housings: pl.DataFrame,
    existing_owners: pl.DataFrame,
    existing_housing_owners: pl.DataFrame,
) -> tuple[pl.DataFrame, pl.DataFrame]:
    """Enrich source housing-owners and compute replacements + events.

    Returns (housing_owner_rows, events).

    TODO: Port business rules from TypeScript source-housing-owner-processor.ts
    - Validate housing exists (HousingMissingError)
    - Validate all source owners exist (OwnerMissingError)
    - Replace entire housing-owner set per housing
    - Active owners from source → new active ranks
    - Previously active owners not in source → PREVIOUS_OWNER_RANK with end_date
    - Generate owner-attached, owner-detached, owner-updated events
    """
    source_dataframe = source.collect()

    # Join source with existing housings to get housing IDs
    with_housing = source_dataframe.join(
        existing_housings,
        on=["geo_code", "local_id"],
        how="inner",  # skip if housing doesn't exist
    )

    # Join with existing owners to get owner IDs (owner_uid → id)
    with_owner = with_housing.join(
        existing_owners,
        left_on="owner_uid",
        right_on="id",
        how="inner",  # skip if owner doesn't exist
    ).rename({"owner_uid": "owner_id"})

    # TODO: compute replacements and events
    housing_owner_rows = with_owner
    events = pl.DataFrame(schema={
        "id": pl.Utf8,
        "housing_id": pl.Utf8,
        "type": pl.Utf8,
        "created_by": pl.Utf8,
    })

    return housing_owner_rows, events

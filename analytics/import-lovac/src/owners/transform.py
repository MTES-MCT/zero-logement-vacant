import polars as pl

# Mirrors mapEntity() from source-owner.ts
# Raw values: null, "0"-"9", "0A" (first char determines mapping)
ENTITY_MAPPING = {
    "0": "personnes-morales-non-remarquables",
    "1": "etat",
    "2": "region",
    "3": "departement",
    "4": "commune",
    "5": "office-hlm",
    "6": "personnes-morales-representant-des-societes",
    "7": "coproprietaire",
    "8": "associe",
    "9": "etablissements-publics-ou-organismes-assimiles",
}


def map_entity(lazy_frame: pl.LazyFrame) -> pl.LazyFrame:
    """Map raw entity codes to OwnerEntity values.

    - null → "personnes-physiques"
    - "0" or "0A" → first char lookup in ENTITY_MAPPING
    """
    return lazy_frame.with_columns(
        pl.when(pl.col("entity").is_null())
        .then(pl.lit("personnes-physiques"))
        .otherwise(
            pl.col("entity").str.slice(0, 1).replace_strict(
                ENTITY_MAPPING, default="personnes-physiques"
            )
        )
        .alias("entity")
    )


def transform_owners(
    source: pl.LazyFrame,
    existing: pl.DataFrame,
    year: str,
) -> tuple[pl.DataFrame, pl.DataFrame]:
    """Enrich source owners with existing data and decide create vs update.

    Returns (to_create, to_update) DataFrames.

    TODO: Port remaining business rules from TypeScript source-owner-transform.ts
    """
    source = map_entity(source)
    source = source.with_columns(pl.lit(year).alias("data_source"))
    source_dataframe = source.collect()

    enriched = source_dataframe.join(
        existing,
        on="idpersonne",
        how="left",
        suffix="_existing",
    )

    # "id" comes from existing owners — null means no match (new owner)
    # Use owner_uid as the canonical id in both cases
    to_create = enriched.filter(pl.col("id").is_null()).with_columns(
        pl.col("owner_uid").alias("id")
    )
    to_update = enriched.filter(pl.col("id").is_not_null()).with_columns(
        pl.col("owner_uid").alias("id")
    )

    return to_create, to_update

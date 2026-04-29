from dagster import (
    Definitions,
    define_asset_job,
    load_assets_from_modules,
    multiprocess_executor,
)

from . import assets as import_lovac_assets

source_housings_job = define_asset_job(
    name="source_housings_job",
    selection="source_housings",
)

defs = Definitions(
    assets=load_assets_from_modules([import_lovac_assets]),
    jobs=[source_housings_job],
    executor=multiprocess_executor.configured({"max_concurrent": 4}),
)

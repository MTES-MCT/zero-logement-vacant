from dagster import job
from dagster.src.assets.populate_owners_ban_addresses import housings_without_address
from dagster.src.resources.ban_config import ban_config_resource

@job(
    resource_defs={
        "ban_config": ban_config_resource,
    }
)
def owners_ban_addresses_job():
    housings_without_address()

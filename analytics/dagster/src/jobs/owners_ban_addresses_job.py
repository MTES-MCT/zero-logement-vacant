from dagster import job
from dagster.src.assets.populate_owners_ban_addresses import owners_without_address
from dagster.src.resources.ban_config import ban_config_resource

@job(
    resource_defs={
        "ban_config": ban_config_resource,
    }
)
def owners_ban_addresses_job():
    owners_without_address()

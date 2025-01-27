from dagster import job
from dagster.src.assets.populate_owners_ban_addresses import owners_without_address
from dagster.src.resources.ban_config import ban_config_resource
from dagster.src.resources import sqlalchemy_engine_resource, postgres_resource

@job(
    resource_defs={
        "ban_config": ban_config_resource,
        "sqlalchemy_engine": sqlalchemy_engine_resource,
        "postgres": postgres_resource,
    }
)
def owners_ban_addresses_job():
    owners_without_address()

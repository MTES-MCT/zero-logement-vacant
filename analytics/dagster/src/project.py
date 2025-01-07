from dagster_dbt import DbtProject
from pathlib import Path


def get_dbt_target():
    return "prod"


dbt_project = DbtProject(
    project_dir=Path(__file__).joinpath("..", "..", "..", "dbt").resolve(),
    target=get_dbt_target(),
)

dbt_project.prepare_if_dev()

from dagster_dbt import DbtProject
from pathlib import Path

dbt_project = DbtProject(
  project_dir=Path(__file__).joinpath("..", "..", "..", "dbt").resolve(),
)

dbt_project.prepare_if_dev()


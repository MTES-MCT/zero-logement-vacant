"""
To add a daily schedule that materializes your dbt assets, uncomment the following lines.
"""

schedules = [
    #     build_schedule_from_dbt_selection(
    #         [zlv_dbt_project_dbt_assets],
    #         job_name="materialize_dbt_models",
    #         cron_schedule="0 0 * * *",
    #         dbt_select="fqn:*",
    #     ),
]

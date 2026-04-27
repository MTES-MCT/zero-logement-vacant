import os

from dagster import Config


class ImportLovacConfig(Config):
    """Run configuration for the LOVAC import pipeline."""

    year: str  # e.g. "lovac-2026"
    source_path: str  # e.g. "/data/lovac/2026" or "s3://bucket/lovac/2026"
    departments: list[str] | None = None
    dry_run: bool = False
    connection_string: str = os.environ.get(
        "IMPORT_LOVAC_PG_URL",
        "postgresql://postgres:postgres@localhost/dev",
    )
    system_account_email: str = "admin@zerologementvacant.beta.gouv.fr"

import os

from dagster import Config


class ImportLovacConfig(Config):
    """Run configuration for the LOVAC import pipeline."""

    year: str = "lovac-2026"  # e.g. "lovac-2026"
    source_path: str = "/Users/inad/dev/zlv-data/lovac-2026"  # e.g. "/data/lovac/2026" or "s3://bucket/lovac/2026"
    departments: list[str] | None = None
    dry_run: bool = True
    connection_string: str = os.environ.get(
        "IMPORT_LOVAC_PG_URL",
        "postgresql://postgres:postgres@localhost/dev_feat_import_lovac_owner_eetl_u12",
    )
    system_account_email: str = "admin@zerologementvacant.beta.gouv.fr"

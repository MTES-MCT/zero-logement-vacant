"""DGFIP data sources configuration."""

from .base import ExternalSourceConfig, Producer, FileType

DGFIP_SOURCES = [
    ExternalSourceConfig(
        name="fiscalite_locale_particuliers",
        url="https://data.economie.gouv.fr/explore/dataset/TODO/download/",  # TODO: Add real URL
        producer=Producer.DGFIP,
        file_type=FileType.CSV,
        description="Fiscalité locale des particuliers",
        read_options={"auto_detect": True},
    ),
]

# Convert to dict format for backward compatibility
DGFIP_CONFIG = {source.name: source.to_dict() for source in DGFIP_SOURCES}

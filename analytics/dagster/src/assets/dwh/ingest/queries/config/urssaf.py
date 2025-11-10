"""URSSAF data sources configuration."""

from .base import ExternalSourceConfig, Producer, FileType


URSSAF_SOURCES = [
    ExternalSourceConfig(
        name="etablissements_effectifs",
        url="https://www.data.gouv.fr/api/1/datasets/r/2757f3fd-cbd3-479c-9824-893639d3c456",
        producer=Producer.URSSAF,
        file_type=FileType.CSV,
        description="Nombre d'établissements employeurs et effectifs salariés du secteur privé, par commune x APE (2006-2022)",
        read_options={"auto_detect": True, "delim": ";"},
    ),
]

# Convert to dict format for backward compatibility
URSSAF_CONFIG = {source.name: source.to_dict() for source in URSSAF_SOURCES}

"""DGALN data sources configuration."""

from .base import ExternalSourceConfig, Producer, FileType

DGALN_SOURCES = [
    ExternalSourceConfig(
        name="carte_loyers_2023",
        url="https://object.files.data.gouv.fr/hydra-parquet/hydra-parquet/0de53e33c5b555111ffaf7a9849540c7.parquet",
        producer=Producer.DGALN,
        file_type=FileType.PARQUET,
        description="Indicateurs de loyers d'annonce par commune en 2023 (MTE)",
    ),
    
    ExternalSourceConfig(
        name="zonage_abc",
        url="https://object.files.data.gouv.fr/hydra-parquet/hydra-parquet/5a9989ac0f32cd6aa41d5d60638390c0.parquet",
        producer=Producer.DGALN,
        file_type=FileType.PARQUET,
        description="Zonage ABC pour les aides au logement",
    ),
]

# Convert to dict format for backward compatibility
DGALN_CONFIG = {source.name: source.to_dict() for source in DGALN_SOURCES}

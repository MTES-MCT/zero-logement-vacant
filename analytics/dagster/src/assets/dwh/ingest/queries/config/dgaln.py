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
        url="https://object.files.data.gouv.fr/hydra-parquet/hydra-parquet/13f7282b-8a25-43ab-9713-8bb4e476df55.parquet",
        producer=Producer.DGALN,
        file_type=FileType.PARQUET,
        description="Zonage ABC pour les aides au logement",
    ),

   ExternalSourceConfig(
        name="loyers_appart_2025",
        url="https://object.files.data.gouv.fr/hydra-parquet/hydra-parquet/55b34088-0964-415f-9df7-d87dd98a09be.parquet",
        producer=Producer.DGALN,
        file_type=FileType.PARQUET,
        description="Indicateurs de loyers d'annonce des appartements par commune en 2025",
    ),
    
  ExternalSourceConfig(
        name="loyers_maisons_2025",
        url="https://object.files.data.gouv.fr/hydra-parquet/hydra-parquet/129f764d-b613-44e4-952c-5ff50a8c9b73.parquet",
        producer=Producer.DGALN,
        file_type=FileType.PARQUET,
        description=""Indicateurs de loyers d'annonce des maisons par commune en 2025",
    ),
]

# Convert to dict format for backward compatibility
DGALN_CONFIG = {source.name: source.to_dict() for source in DGALN_SOURCES}

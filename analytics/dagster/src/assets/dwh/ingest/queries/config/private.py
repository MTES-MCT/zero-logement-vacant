"""DGFIP data sources configuration."""

from .base import ExternalSourceConfig, Producer, FileType

PRIVATE_SOURCES = [
    ExternalSourceConfig(
        name="dvg_communes_2024",
        url="https://www.data.gouv.fr/api/1/datasets/r/1b85be7c-17ce-42dc-b191-3b8f3c469087",
        producer=Producer.PRIVATE,
        file_type=FileType.CSV,
        description="DV3F - Prix et volumes par commune et année (2024)",
        read_options={"auto_detect": True, "nullstr": "NA"},
    ),
    ExternalSourceConfig(
        name="dvg_communes_2023",
        url="https://www.data.gouv.fr/api/1/datasets/r/d7881695-1cb5-44c1-900c-00c7158ab766",
        producer=Producer.PRIVATE,
        file_type=FileType.CSV,
        description="DV3F - Prix et volumes par commune et année (2023)",
        read_options={"auto_detect": True, "nullstr": "NA"},
    ),
    ExternalSourceConfig(
        name="dvg_communes_2022",
        url="https://www.data.gouv.fr/api/1/datasets/r/0350f9a1-04ba-4eb1-9637-d642c9d367d7",
        producer=Producer.PRIVATE,
        file_type=FileType.CSV,
        description="DV3F - Prix et volumes par commune et année (2022)",
        read_options={"auto_detect": True, "nullstr": "NA"},
    ),
    ExternalSourceConfig(
        name="dvg_communes_2021",
        url="https://www.data.gouv.fr/api/1/datasets/r/81d685b9-c789-4c9c-b33a-c0a79b61d434",
        producer=Producer.PRIVATE,
        file_type=FileType.CSV,
        description="DV3F - Prix et volumes par commune et année (2021)",
        read_options={"auto_detect": True, "nullstr": "NA"},
    ),
    ExternalSourceConfig(
        name="dvg_communes_2020",
        url="https://www.data.gouv.fr/api/1/datasets/r/cb076661-1b85-4b0e-9f81-7862b70ed408",
        producer=Producer.PRIVATE,
        file_type=FileType.CSV,
        description="DV3F - Prix et volumes par commune et année (2020)",
        read_options={"auto_detect": True, "nullstr": "NA"},
    ),
    ExternalSourceConfig(
        name="dvg_communes_2019",
        url="https://www.data.gouv.fr/api/1/datasets/r/084be72a-f586-47f7-92e6-02245e835934",
        producer=Producer.PRIVATE,
        file_type=FileType.CSV,
        description="DV3F - Prix et volumes par commune et année (2019)",
        read_options={"auto_detect": True, "nullstr": "NA"},
    ),
]

# Convert to dict format for backward compatibility
PRIVATE_CONFIG = {source.name: source.to_dict() for source in PRIVATE_SOURCES}

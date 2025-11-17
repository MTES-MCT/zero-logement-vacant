"""CEREMA data sources configuration."""

from ......config import Config
from .base import ExternalSourceConfig, Producer, FileType

# Common type overrides for LOVAC sources
LOVAC_TYPE_OVERRIDES = {
    'ff_jdatnss_6': 'VARCHAR', 'ff_jdatnss_5': 'VARCHAR', 'ff_jdatnss_4': 'VARCHAR',
    'ff_jdatnss_3': 'VARCHAR', 'ff_jdatnss_2': 'VARCHAR', 'ff_jdatnss_1': 'VARCHAR',
    'ff_ccogrm_1': 'VARCHAR', 'ff_ccogrm_2': 'VARCHAR', 'ff_ccogrm_3': 'VARCHAR',
    'ff_ccogrm_4': 'VARCHAR', 'ff_ccogrm_5': 'VARCHAR', 'ff_ccogrm_6': 'VARCHAR',
}

CEREMA_SOURCES = [
    # -------------------------------------------------------------------------
    # LOVAC Sources
    # -------------------------------------------------------------------------
    
    ExternalSourceConfig(
        name="lovac_2025",
        url=f"s3://{Config.CELLAR_DATA_LAKE_BUCKET_NAME}/lake/cerema/lovac/2025/raw.csv",
        producer=Producer.CEREMA,
        file_type=FileType.CSV,
        description="Fichier LOVAC 2025 (Logements Vacants)",
        type_overrides=LOVAC_TYPE_OVERRIDES,
        read_options={"auto_detect": True, "escape": '"', "quote": '"'},
    ),
    
    ExternalSourceConfig(
        name="lovac_2024",
        url=f"s3://{Config.CELLAR_DATA_LAKE_BUCKET_NAME}/lake/cerema/lovac/2024/raw.csv",
        producer=Producer.CEREMA,
        file_type=FileType.CSV,
        description="Fichier LOVAC 2024 (Logements Vacants)",
        type_overrides=LOVAC_TYPE_OVERRIDES,
        read_options={"auto_detect": True},
    ),
    
    ExternalSourceConfig(
        name="lovac_2023",
        url=f"s3://{Config.CELLAR_DATA_LAKE_BUCKET_NAME}/lake/cerema/lovac/2023/raw.csv",
        producer=Producer.CEREMA,
        file_type=FileType.CSV,
        description="Fichier LOVAC 2023 (Logements Vacants)",
        type_overrides=LOVAC_TYPE_OVERRIDES,
        read_options={"auto_detect": True},
    ),
    
    ExternalSourceConfig(
        name="lovac_2022",
        url=f"s3://{Config.CELLAR_DATA_LAKE_BUCKET_NAME}/lake/cerema/lovac/2022/raw.csv",
        producer=Producer.CEREMA,
        file_type=FileType.CSV,
        description="Fichier LOVAC 2022 (Logements Vacants)",
        read_options={"auto_detect": True, "ignore_errors": False},
    ),
    
    ExternalSourceConfig(
        name="lovac_2021",
        url=f"s3://{Config.CELLAR_DATA_LAKE_BUCKET_NAME}/lake/cerema/lovac/2021/raw.csv",
        producer=Producer.CEREMA,
        file_type=FileType.CSV,
        description="Fichier LOVAC 2021 (Logements Vacants)",
        read_options={"auto_detect": True, "ignore_errors": False, "quote": '"'},
    ),
    
    ExternalSourceConfig(
        name="lovac_2020",
        url=f"s3://{Config.CELLAR_DATA_LAKE_BUCKET_NAME}/lake/cerema/lovac/2020/raw.csv",
        producer=Producer.CEREMA,
        file_type=FileType.CSV,
        description="Fichier LOVAC 2020 (Logements Vacants)",
        read_options={"auto_detect": True, "ignore_errors": False},
    ),
    
    ExternalSourceConfig(
        name="lovac_2019",
        url=f"s3://{Config.CELLAR_DATA_LAKE_BUCKET_NAME}/lake/cerema/lovac/2019/raw.csv",
        producer=Producer.CEREMA,
        file_type=FileType.CSV,
        description="Fichier LOVAC 2019 (Logements Vacants)",
        read_options={"auto_detect": True, "ignore_errors": False},
    ),
    
    # -------------------------------------------------------------------------
    # Fichiers Fonciers Sources
    # -------------------------------------------------------------------------
    
    ExternalSourceConfig(
        name="ff_2024",
        url=f"s3://{Config.CELLAR_DATA_LAKE_BUCKET_NAME}/lake/cerema/ff/2024/raw.csv",
        producer=Producer.CEREMA,
        file_type=FileType.CSV,
        description="Fichiers Fonciers 2024",
        type_overrides={"ff_ccogrm": "VARCHAR"},
        read_options={"auto_detect": True, "ignore_errors": False},
    ),
    
    ExternalSourceConfig(
        name="ff_2024_buildings",
        url=f"s3://{Config.CELLAR_DATA_LAKE_BUCKET_NAME}/lake/cerema/ff/2024/buildings.csv",
        producer=Producer.CEREMA,
        file_type=FileType.CSV,
        description="Fichiers Fonciers 2024 - Buildings",
        read_options={"auto_detect": True, "ignore_errors": False},
    ),
    
    ExternalSourceConfig(
        name="ff_2023",
        url=f"s3://{Config.CELLAR_DATA_LAKE_BUCKET_NAME}/lake/cerema/ff/2023/raw.csv",
        producer=Producer.CEREMA,
        file_type=FileType.CSV,
        description="Fichiers Fonciers 2023",
        type_overrides={"ff_ccogrm": "VARCHAR"},
        read_options={"auto_detect": True, "ignore_errors": False},
    ),
    
    ExternalSourceConfig(
        name="ff_2022",
        url=f"s3://{Config.CELLAR_DATA_LAKE_BUCKET_NAME}/lake/cerema/ff/2022/raw.csv",
        producer=Producer.CEREMA,
        file_type=FileType.CSV,
        description="Fichiers Fonciers 2022",
        type_overrides={"ff_ccogrm": "VARCHAR"},
        read_options={"auto_detect": True, "ignore_errors": False},
    ),
    
    ExternalSourceConfig(
        name="ff_2021",
        url=f"s3://{Config.CELLAR_DATA_LAKE_BUCKET_NAME}/lake/cerema/ff/2021/raw.csv",
        producer=Producer.CEREMA,
        file_type=FileType.CSV,
        description="Fichiers Fonciers 2021",
        type_overrides={"ff_ccogrm": "VARCHAR"},
        read_options={"auto_detect": True, "ignore_errors": False},
    ),
    
    ExternalSourceConfig(
        name="ff_2020",
        url=f"s3://{Config.CELLAR_DATA_LAKE_BUCKET_NAME}/lake/cerema/ff/2020/raw.csv",
        producer=Producer.CEREMA,
        file_type=FileType.CSV,
        description="Fichiers Fonciers 2020",
        type_overrides={"ff_ccogrm": "VARCHAR"},
        read_options={"auto_detect": True, "ignore_errors": False},
    ),
    
    ExternalSourceConfig(
        name="ff_2019",
        url=f"s3://{Config.CELLAR_DATA_LAKE_BUCKET_NAME}/lake/cerema/ff/2019/raw.csv",
        producer=Producer.CEREMA,
        file_type=FileType.CSV,
        description="Fichiers Fonciers 2019",
        type_overrides={"ff_ccogrm": "VARCHAR"},
        read_options={"auto_detect": True, "ignore_errors": False},
    ),
    
    ExternalSourceConfig(
        name="ff_owners",
        url=f"s3://{Config.CELLAR_DATA_LAKE_BUCKET_NAME}/lake/cerema/ff/2023/owners.csv",
        producer=Producer.CEREMA,
        file_type=FileType.CSV,
        description="Fichiers Fonciers - Owners",
        type_overrides={"ccogrm": "VARCHAR"},
        read_options={"auto_detect": True, "ignore_errors": False},
    ),

    # -------------------------------------------------------------------------
    # Private Sources
    # -------------------------------------------------------------------------
    
    ExternalSourceConfig(
        name="conso2009_2024_resultats_com",
        url="https://www.data.gouv.fr/api/1/datasets/r/8c67a68a-bb1a-4b7e-b221-62ccfb8bc4f9",
        producer=Producer.CEREMA,
        file_type=FileType.CSV,
        description="Consommation d'espaces naturels, agricoles et forestiers du 1er janvier 2009 au 1er janvier 2024",
        read_options={"auto_detect": True, "delim": ";"},
    ),
]

# Convert to dict format for backward compatibility
CEREMA_CONFIG = {source.name: source.to_dict() for source in CEREMA_SOURCES}

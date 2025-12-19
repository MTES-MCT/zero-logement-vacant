"""INSEE data sources configuration."""

from .base import ExternalSourceConfig, Producer, FileType

# URLs
URL_GRILLE_DENSITE = "https://www.insee.fr/fr/statistiques/fichier/8571524/fichier_diffusion_2025.xlsx"
URL_RECENSEMENT_HISTORIQUE = "https://www.insee.fr/fr/statistiques/fichier/2522602/fichier_pop_reference_6822.xlsx"
INSEE_SOURCES = [
    # -------------------------------------------------------------------------
    # Grille de densité 2025
    # -------------------------------------------------------------------------
    
    ExternalSourceConfig(
        name="grille_densite_2025_communes",
        url=URL_GRILLE_DENSITE,
        producer=Producer.INSEE,
        file_type=FileType.XLSX,
        description="Grille densité INSEE communes",
        read_options={"sheet": "Maille communale", "range": "A5:L34880"},
    ),
    
    ExternalSourceConfig(
        name="grille_densite_2025_epci",
        url=URL_GRILLE_DENSITE,
        producer=Producer.INSEE,
        file_type=FileType.XLSX,
        description="Grille densité INSEE EPCI",
        read_options={"sheet": "Maille EPCI", "range": "A5:H1260"},
    ),
    
    ExternalSourceConfig(
        name="grille_densite_2025_bassin_de_vie",
        url=URL_GRILLE_DENSITE,
        producer=Producer.INSEE,
        file_type=FileType.XLSX,
        description="Grille densité INSEE bassin de vie",
        read_options={"sheet": "Maille Bassin de Vie", "range": "A5:H1712"},
    ),
    
    ExternalSourceConfig(
        name="grille_densite_2025_departements",
        url=URL_GRILLE_DENSITE,
        producer=Producer.INSEE,
        file_type=FileType.XLSX,
        description="Grille densité INSEE départements",
        read_options={"sheet": "Maille départementale", "range": "A5:H106"},
    ),
    
    # -------------------------------------------------------------------------
    # Other INSEE sources
    # -------------------------------------------------------------------------
    
    ExternalSourceConfig(
        name="recensement_historique_2022",
        url=URL_RECENSEMENT_HISTORIQUE,
        producer=Producer.INSEE,
        file_type=FileType.XLSX,
        description="Série historique du recensement de la population 2022",
        read_options={"sheet": "2022", "range": "A8:C35000"},
    ),
        ExternalSourceConfig(
        name="recensement_historique_2021",
        url=URL_RECENSEMENT_HISTORIQUE,
        producer=Producer.INSEE,
        file_type=FileType.XLSX,
        description="Série historique du recensement de la population 2021",
        read_options={"sheet": "2021", "range": "A8:C35000"},
    ),
        ExternalSourceConfig(
        name="recensement_historique_2020",
        url=URL_RECENSEMENT_HISTORIQUE,
        producer=Producer.INSEE,
        file_type=FileType.XLSX,
        description="Série historique du recensement de la population 2020",
        read_options={"sheet": "2020", "range": "A8:C35000"},
    ),
    ExternalSourceConfig(
        name="recensement_historique_2019",
        url=URL_RECENSEMENT_HISTORIQUE,
        producer=Producer.INSEE,
        file_type=FileType.XLSX,
        description="Série historique du recensement de la population 2019",
        read_options={"sheet": "2019", "range": "A8:C35000"},
    ), 

    # s3://zlv-production/lake/insee/table-appartenance-geo-communes-2025.xlsx
    # s3://zlv-production/lake/insee/table-appartenance-geo-communes-2024.xlsx

    ExternalSourceConfig(
        name="table_appartenance_geo_communes_2025",
        url="s3://zlv-production/lake/insee/table-appartenance-geo-communes-2025.xlsx",
        producer=Producer.INSEE,
        file_type=FileType.XLSX,
        description="Table appartenance geo communes 2025",
        read_options={"sheet": "COM", "range": "A6:C35000"},
    ),
    ExternalSourceConfig(
        name="table_appartenance_geo_communes_2024",
        url="s3://zlv-production/lake/insee/table-appartenance-geo-communes-2024.xlsx",
        producer=Producer.INSEE,
        file_type=FileType.XLSX,
        description="Table appartenance geo communes 2024",
        read_options={"sheet": "COM", "range": "A6:C35000"},
    ),

    ExternalSourceConfig(
        name="population_structure_dage_2022_2011",
        url="s3://zlv-production/lake/insee/DS_RP_POPULATION_PRINC_2022_data.csv",
        producer=Producer.INSEE,
        file_type=FileType.CSV,
        description="Population structure dage 2022 2011",
        read_options={"auto_detect": True},
    ),
    ExternalSourceConfig(
        name="cog_2025",
        url="https://object.files.data.gouv.fr/hydra-parquet/hydra-parquet/3150f54803910d1323ecb5e9b468d4ba.parquet",
        producer=Producer.INSEE,
        file_type=FileType.PARQUET,
        description="Code officiel géographique 2025 : Chaque année, l'Insee met à disposition sur son site (insee.fr) le code officiel géographique qui rassemble les codes et libellés des communes, cantons, arrondissements, départements, collectivités territoriales ayant les compétences départementales, régions, collectivités et territoires français d’outre-mer, pays et territoires étrangers au 1er janvier.",
    ),
    ExternalSourceConfig(
        name="cog_2024",
        url="https://www.data.gouv.fr/api/1/datasets/r/9e31f4ee-b65b-49d9-aedd-0f5f583551f8",
        producer=Producer.INSEE,
        file_type=FileType.CSV,
        description="Code officiel géographique 2024 : Chaque année, l'Insee met à disposition sur son site (insee.fr) le code officiel géographique qui rassemble les codes et libellés des communes, cantons, arrondissements, départements, collectivités territoriales ayant les compétences départementales, régions, collectivités et territoires français d’outre-mer, pays et territoires étrangers au 1er janvier.",
        read_options={"auto_detect": True},
    ),
]

# Convert to dict format for backward compatibility
INSEE_CONFIG = {source.name: source.to_dict() for source in INSEE_SOURCES}

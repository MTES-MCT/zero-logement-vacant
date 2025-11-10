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
    )
]

# Convert to dict format for backward compatibility
INSEE_CONFIG = {source.name: source.to_dict() for source in INSEE_SOURCES}

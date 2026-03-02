"""
Central definition of stratification variables for cross-feature analysis.

Each variable can serve as a stratification dimension, splitting the dataset
into sub-populations to analyze exit rates of all other features within.

Example usage:
    "Analyser les criteres de sortie de la vacance par densite_label"
    -> stratify all features by densite_label (4 strata: Urbain dense, etc.)
"""

from utils import StratificationConfig

CHARS_TABLE = "main_marts.marts_bi_housing_characteristics"
GEO_TABLE = "main_marts.marts_bi_housing_geography"
OWNERS_TABLE = "main_marts.marts_bi_housing_owners"
ZLV_TABLE = "main_marts.marts_bi_housing_zlv_usage"

# All available stratification variables, grouped by source table.
# Use the keys as CLI arguments (e.g. --stratify densite_label).

STRATIFICATION_FEATURES: dict[str, StratificationConfig] = {
    # =========================================================================
    # GEOGRAPHY
    # =========================================================================
    "densite_label": StratificationConfig(
        feature="densite_label",
        table=GEO_TABLE,
        feature_type="categorical",
        label="Densite (4 niveaux)",
    ),
    "densite_category": StratificationConfig(
        feature="densite_category",
        table=GEO_TABLE,
        feature_type="categorical",
        label="Densite (Urbain/Rural)",
    ),
    "zonage_en_vigueur": StratificationConfig(
        feature="zonage_en_vigueur",
        table=GEO_TABLE,
        feature_type="categorical",
        label="Zonage ABC",
    ),
    "niveau_loyer": StratificationConfig(
        feature="niveau_loyer",
        table=GEO_TABLE,
        feature_type="categorical",
        label="Niveau de loyer",
    ),
    "action_coeur_de_ville": StratificationConfig(
        feature="action_coeur_de_ville",
        table=GEO_TABLE,
        feature_type="boolean",
        true_label="ACV",
        false_label="Hors ACV",
        label="Action Coeur de Ville",
    ),
    "petite_ville_de_demain": StratificationConfig(
        feature="petite_ville_de_demain",
        table=GEO_TABLE,
        feature_type="boolean",
        true_label="PVD",
        false_label="Hors PVD",
        label="Petite Ville de Demain",
    ),
    "is_in_tlv_territory": StratificationConfig(
        feature="is_in_tlv_territory",
        table=GEO_TABLE,
        feature_type="boolean",
        true_label="Zone TLV",
        false_label="Hors TLV",
        label="Territoire TLV",
    ),
    "is_population_declining": StratificationConfig(
        feature="is_population_declining",
        table=GEO_TABLE,
        feature_type="boolean",
        true_label="Population en declin",
        false_label="Population stable/croissante",
        label="Declin demographique",
    ),
    "dvf_marche_dynamisme": StratificationConfig(
        feature="dvf_marche_dynamisme",
        table=GEO_TABLE,
        feature_type="categorical",
        label="Dynamisme du marche immobilier",
    ),

    # =========================================================================
    # CHARACTERISTICS
    # =========================================================================
    "housing_kind": StratificationConfig(
        feature="housing_kind",
        table=CHARS_TABLE,
        feature_type="categorical",
        label="Type de logement",
    ),
    "vacancy_duration_category": StratificationConfig(
        feature="vacancy_duration_category",
        table=CHARS_TABLE,
        feature_type="categorical",
        label="Duree de vacance",
    ),
    "vacancy_severity": StratificationConfig(
        feature="vacancy_severity",
        table=CHARS_TABLE,
        feature_type="categorical",
        label="Severite de la vacance",
    ),
    "energy_consumption_category": StratificationConfig(
        feature="energy_consumption_category",
        table=CHARS_TABLE,
        feature_type="categorical",
        label="Performance energetique",
    ),
    "is_energy_sieve": StratificationConfig(
        feature="is_energy_sieve",
        table=CHARS_TABLE,
        feature_type="boolean",
        true_label="Passoire energetique",
        false_label="Non passoire",
        label="Passoire energetique",
    ),
    "building_year_category": StratificationConfig(
        feature="building_year_category",
        table=CHARS_TABLE,
        feature_type="categorical",
        label="Epoque de construction",
    ),
    "surface_category": StratificationConfig(
        feature="surface_category",
        table=CHARS_TABLE,
        feature_type="categorical",
        label="Taille du logement",
    ),

    # =========================================================================
    # OWNERS
    # =========================================================================
    "owner_age_category": StratificationConfig(
        feature="owner_age_category",
        table=OWNERS_TABLE,
        feature_type="categorical",
        label="Tranche d age du proprietaire",
    ),
    "owner_is_individual": StratificationConfig(
        feature="owner_is_individual",
        table=OWNERS_TABLE,
        feature_type="boolean",
        true_label="Particulier",
        false_label="Personne morale",
        label="Type de proprietaire",
    ),
    "owner_is_local": StratificationConfig(
        feature="owner_is_local",
        table=OWNERS_TABLE,
        feature_type="boolean",
        true_label="Proprietaire local",
        false_label="Proprietaire non local",
        label="Proximite du proprietaire",
    ),
    "owner_is_multi_owner": StratificationConfig(
        feature="owner_is_multi_owner",
        table=OWNERS_TABLE,
        feature_type="boolean",
        true_label="Multi-proprietaire",
        false_label="Mono-proprietaire",
        label="Multi-propriete",
    ),

    # =========================================================================
    # ZLV USAGE (dual-echelon: epci_ and city_ prefixed columns)
    # =========================================================================
    "epci_ouvert": StratificationConfig(
        feature="epci_ouvert",
        table=ZLV_TABLE,
        feature_type="boolean",
        true_label="EPCI ouvert sur ZLV",
        false_label="EPCI non ouvert",
        label="EPCI ouvert sur ZLV",
    ),
    "epci_a_1_campagne_envoyee": StratificationConfig(
        feature="epci_a_1_campagne_envoyee",
        table=ZLV_TABLE,
        feature_type="boolean",
        true_label="EPCI a envoye campagne",
        false_label="EPCI pas de campagne",
        label="EPCI a envoye une campagne",
    ),
}


def list_available() -> None:
    """Print all available stratification variables."""
    print(f"{'Key':<30} {'Type':<12} {'Table':<45} Label")
    print("-" * 110)
    for key, cfg in STRATIFICATION_FEATURES.items():
        table_short = cfg.table.replace("main_marts.marts_bi_housing_", "")
        print(f"{key:<30} {cfg.feature_type:<12} {table_short:<45} {cfg.label}")


if __name__ == "__main__":
    list_available()

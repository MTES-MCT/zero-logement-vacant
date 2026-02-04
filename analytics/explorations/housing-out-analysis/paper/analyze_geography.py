"""
Analyze geography features for vacancy exit analysis.
Source: marts_bi_housing_geography (joined with characteristics for is_housing_out)
"""

from utils import (
    analyze_categorical_feature,
    analyze_boolean_feature,
    analyze_continuous_feature,
    FeatureAnalysisResult,
)

TABLE = "main_marts.marts_bi_housing_geography"
JOIN_TABLE = "main_marts.marts_bi_housing_characteristics"
CATEGORY = "geographie"


# =============================================================================
# FEATURE DEFINITIONS
# Based on marts_bi_housing_geography.sql and int_analysis_city_features.sql
# =============================================================================

CATEGORICAL_FEATURES = [
    # Density
    "densite_label",
    "densite_category",
    "densite_label_7",
    "densite_aav_label",
    
    # Zonage
    "zonage_en_vigueur",
    
    # Rent levels
    "niveau_loyer",
    "loyer_type_prediction",
    "loyer_confiance_prediction",
    
    # Market
    "dvg_marche_dynamisme",
    
    # Housing kind (for cross-analysis)
    "housing_kind",
    
    # Department
    "departement_code",
]

BOOLEAN_FEATURES = [
    # Population
    ("is_population_declining", "Population en declin", "Population stable/croissante"),
    
    # Special territories
    ("is_in_tlv", "Zone TLV", "Hors TLV"),
    ("action_coeur_de_ville", "Action Coeur de Ville", "Hors ACV"),
    ("petite_ville_de_demain", "Petite Ville de Demain", "Hors PVD"),
    ("village_davenir", "Village d Avenir", "Hors VDA"),
    ("has_opah", "Avec OPAH", "Sans OPAH"),
    ("ort_signed", "ORT signe", "Sans ORT"),
]

CONTINUOUS_FEATURES = [
    # Density metrics
    "densite_grid",
    "densite_grid_7",
    "pct_pop_urbain_dense",
    "pct_pop_rural",
    
    # Population
    "population_2022",
    "population_growth_rate_annual",
    
    # Rent
    "loyer_predit_m2",
    
    # Prices (latest year)
    "prix_median_m2_maisons_2024",
    "prix_median_m2_appartements_2024",
    
    # Market transactions
    "dvg_total_transactions_2019_2024",
    "dvg_evolution_prix_m2_2019_2023_pct",
    
    # Fiscality
    "taux_tfb",
    "pression_fiscale_tfb_teom",
    
    # Land consumption
    "taux_artificialisation_pct",
]


def analyze_all(global_exit_rate: float) -> list[FeatureAnalysisResult]:
    """
    Analyze all geography features.
    
    Args:
        global_exit_rate: Global exit rate percentage
        
    Returns:
        List of FeatureAnalysisResult for all features
    """
    results = []
    
    print(f"Analyzing {CATEGORY} features...")
    
    # Categorical features
    for feature in CATEGORICAL_FEATURES:
        print(f"  - {feature} (categorical)")
        try:
            result = analyze_categorical_feature(
                table=TABLE,
                feature=feature,
                category=CATEGORY,
                global_exit_rate=global_exit_rate,
                join_table=JOIN_TABLE,
                join_key="housing_id"
            )
            results.append(result)
        except Exception as e:
            print(f"    ERROR: {e}")
    
    # Boolean features
    for feature_tuple in BOOLEAN_FEATURES:
        feature, true_label, false_label = feature_tuple
        print(f"  - {feature} (boolean)")
        try:
            result = analyze_boolean_feature(
                table=TABLE,
                feature=feature,
                category=CATEGORY,
                global_exit_rate=global_exit_rate,
                true_label=true_label,
                false_label=false_label,
                join_table=JOIN_TABLE,
                join_key="housing_id"
            )
            results.append(result)
        except Exception as e:
            print(f"    ERROR: {e}")
    
    # Continuous features
    for feature in CONTINUOUS_FEATURES:
        print(f"  - {feature} (continuous)")
        try:
            result = analyze_continuous_feature(
                table=TABLE,
                feature=feature,
                category=CATEGORY,
                global_exit_rate=global_exit_rate,
                join_table=JOIN_TABLE,
                join_key="housing_id"
            )
            results.append(result)
        except Exception as e:
            print(f"    ERROR: {e}")
    
    print(f"  Completed: {len(results)} features analyzed")
    return results


if __name__ == "__main__":
    from utils import get_global_stats, generate_markdown_report
    
    stats = get_global_stats()
    print(f"Global stats: {stats}")
    
    results = analyze_all(stats["exit_rate_pct"])
    
    # Generate report
    report = generate_markdown_report(
        results=results,
        title="Geographie - Analyse des features",
        global_stats=stats
    )
    
    with open("outputs/geography_insights.md", "w") as f:
        f.write(report)
    
    print(f"Report saved to outputs/geography_insights.md")

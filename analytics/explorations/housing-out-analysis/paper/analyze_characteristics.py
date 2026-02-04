"""
Analyze housing characteristics features for vacancy exit analysis.
Source: marts_bi_housing_characteristics
"""

from utils import (
    analyze_categorical_feature,
    analyze_boolean_feature,
    analyze_continuous_feature,
    FeatureAnalysisResult,
)

TABLE = "main_marts.marts_bi_housing_characteristics"
CATEGORY = "caracteristiques"


# =============================================================================
# FEATURE DEFINITIONS
# Based on marts_bi_housing_characteristics.sql columns
# =============================================================================

# EXCLUDED FEATURES (tautological or not actionable):
# - data_source: TAUTOLOGICAL - "datafoncier-import" = 85% exit (housing imported BECAUSE detected as exited)

CATEGORICAL_FEATURES = [
    "housing_kind",
    "housing_kind_label",
    "rooms_count_category",
    "living_area_category",
    "surface_category",
    "building_year_category",
    "building_age_category",
    "energy_consumption_bdnb",
    "energy_consumption_category",
    "cadastral_classification",
    "cadastral_classification_label",
    "rental_value_category",
    "vacancy_duration_category",
    "vacancy_severity",
    "vacancy_status_label",
    # EXCLUDED: "data_source" - tautological
]

BOOLEAN_FEATURES = [
    ("is_energy_sieve", "Passoire energetique", "Non passoire"),
    ("is_uncomfortable", "Inconfortable", "Confortable"),
    # ⚠️ is_taxed: COALESCE(taxed, FALSE) mixes:
    # - Real "Non taxé" (493K, 52.88% exit)
    # - Artifact "NULL" (642K, 100% exit - data quality issue)
    # Blended "Non taxé" = 79.5% which is MISLEADING
    # True comparison (excluding NULL): Non taxé 52.88% vs Taxé 19.97%
    ("is_taxed", "Taxe vacance", "Non taxe"),
    ("has_recent_mutation", "Mutation recente", "Pas de mutation recente"),
    ("condominium", "Copropriete", "Hors copropriete"),
]

CONTINUOUS_FEATURES = [
    "rooms_count",
    "living_area",
    "building_year",
    "building_age",
    "cadastral_classification",
    "rental_value",
    "years_in_vacancy",
    "beneficiary_count",
    "data_years_count",
]


def analyze_all(global_exit_rate: float) -> list[FeatureAnalysisResult]:
    """
    Analyze all characteristics features.
    
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
                global_exit_rate=global_exit_rate
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
                false_label=false_label
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
                global_exit_rate=global_exit_rate
            )
            results.append(result)
        except Exception as e:
            print(f"    ERROR: {e}")
    
    print(f"  Completed: {len(results)} features analyzed")
    return results


if __name__ == "__main__":
    from utils import get_global_stats, generate_markdown_report, results_to_dataframe
    
    stats = get_global_stats()
    print(f"Global stats: {stats}")
    
    results = analyze_all(stats["exit_rate_pct"])
    
    # Generate report
    report = generate_markdown_report(
        results=results,
        title="Caracteristiques - Analyse des features",
        global_stats=stats
    )
    
    with open("outputs/characteristics_insights.md", "w") as f:
        f.write(report)
    
    print(f"Report saved to outputs/characteristics_insights.md")

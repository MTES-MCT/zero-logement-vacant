"""
Analyze owner profile features for vacancy exit analysis.
Source: marts_bi_housing_owners (joined with characteristics for is_housing_out)
"""

from utils import (
    analyze_categorical_feature,
    analyze_boolean_feature,
    analyze_continuous_feature,
    FeatureAnalysisResult,
)

TABLE = "main_marts.marts_bi_housing_owners"
JOIN_TABLE = "main_marts.marts_bi_housing_characteristics"
CATEGORY = "proprietaires"


# =============================================================================
# FEATURE DEFINITIONS
# Based on marts_bi_housing_owners.sql columns
# =============================================================================

# EXCLUDED FEATURES (tautological or not actionable):
# - owner_kind_class: TAUTOLOGICAL - "Investisseur" = 100% exit rate (all from datafoncier/detected exits)
# - owner_kind_category: TAUTOLOGICAL - "Autre" = 99.97%, "Inconnu" = 98.74% (linked to data source)
# - owner_department_code: NOT ACTIONABLE - Geographic noise (DOM=26%, Paris=10%), confounded with many factors

CATEGORICAL_FEATURES = [
    # Demographics (keep - legitimate signal)
    "owner_age_category",
    "owner_generation",
    
    # Location (relative, actionable)
    "owner_location_relative_label",
    "owner_distance_category",
    # EXCLUDED: "owner_department_code" - geographic noise
    
    # Property rights
    "property_right",
    "property_right_category",
    
    # Multi-ownership
    "owner_portfolio_category",
    # EXCLUDED: "owner_kind_class" - tautological
    # EXCLUDED: "owner_kind_category" - tautological
]

BOOLEAN_FEATURES = [
    # Owner type
    ("owner_is_individual", "Particulier", "Non particulier"),
    ("owner_is_sci", "SCI", "Non SCI"),
    ("owner_is_company", "Societe", "Non societe"),
    ("owner_is_indivision", "Indivision", "Non indivision"),
    
    # Location
    ("owner_is_local", "Proprietaire local", "Proprietaire non local"),
    ("owner_is_distant", "Proprietaire distant", "Proprietaire proche"),
    
    # Property rights
    ("owner_is_full_owner", "Pleine propriete", "Demembrement"),
    
    # Multi-ownership
    ("owner_is_multi_owner", "Multi-proprietaire", "Mono-proprietaire"),
    
    # Contact
    ("owner_has_email", "A un email", "Sans email"),
    ("owner_has_phone", "A un telephone", "Sans telephone"),
    ("owner_contactable", "Contactable", "Non contactable"),
]

CONTINUOUS_FEATURES = [
    "owner_age",
    "owner_distance_km",
    "owner_housing_count",
]


def analyze_all(global_exit_rate: float) -> list[FeatureAnalysisResult]:
    """
    Analyze all owner features.
    
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
        title="Proprietaires - Analyse des features",
        global_stats=stats
    )
    
    with open("outputs/owners_insights.md", "w") as f:
        f.write(report)
    
    print(f"Report saved to outputs/owners_insights.md")

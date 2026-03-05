"""
Analyze ZLV application usage features for vacancy exit analysis.
Source: marts_bi_housing_zlv_usage (joined with characteristics for is_housing_out)

⚠️ IMPORTANT: SELECTION BIAS WARNING
All ZLV features show a COUNTER-INTUITIVE pattern:
- Housing NOT followed by ZLV has BETTER exit rates
- Housing HEAVILY followed has LOWER exit rates

This is NOT a failure of ZLV - it's SELECTION BIAS:
1. ZLV targets DIFFICULT cases (long vacancy, complex owners)
2. "Easy" housing exits naturally without intervention
3. More groups = housing is considered more "problematic"

NOTE: The table uses a dual-echelon structure (EPCI + Commune).
Features are prefixed with epci_ or city_ accordingly.
"""

from utils import (
    analyze_categorical_feature,
    analyze_boolean_feature,
    analyze_continuous_feature,
    analyze_categorical_feature_stratified,
    analyze_boolean_feature_stratified,
    analyze_continuous_feature_stratified,
    FeatureAnalysisResult,
    StratifiedFeatureAnalysisResult,
    StratificationConfig,
)

TABLE = "main_marts.marts_bi_housing_zlv_usage"
JOIN_TABLE = "main_marts.marts_bi_housing_characteristics"
CATEGORY = "zlv_usage"


# =============================================================================
# FEATURE DEFINITIONS
# Columns from marts_bi_housing_zlv_usage (dual-echelon: epci_ and city_)
# =============================================================================

CATEGORICAL_FEATURES = [
    # EPCI establishment type (contextual - territory characteristics)
    "epci_type_simple",
    "epci_type_detaille",

    # City establishment type
    "city_type_simple",
    "city_type_detaille",
]

BOOLEAN_FEATURES = [
    # EPCI: Is the establishment open on ZLV?
    ("epci_ouvert", "EPCI ouvert sur ZLV", "EPCI non ouvert"),

    # EPCI: Recent connection activity
    ("epci_connecte_90_jours", "EPCI connecte 90j", "EPCI non connecte 90j"),
    ("epci_connecte_60_jours", "EPCI connecte 60j", "EPCI non connecte 60j"),
    ("epci_connecte_30_jours", "EPCI connecte 30j", "EPCI non connecte 30j"),

    # EPCI: Data update activity flags
    ("epci_a_1_logement_maj_situation", "EPCI a MAJ situation", "EPCI sans MAJ situation"),
    ("epci_a_1_logement_maj_occupation", "EPCI a MAJ occupation", "EPCI sans MAJ occupation"),
    ("epci_a_1_logement_maj_suivi", "EPCI a MAJ suivi", "EPCI sans MAJ suivi"),

    # EPCI: Group and campaign activity
    ("epci_a_1_groupe_cree", "EPCI a cree groupe", "EPCI pas de groupe"),
    ("epci_a_1_campagne_creee", "EPCI a cree campagne", "EPCI pas de campagne"),
    ("epci_a_1_campagne_envoyee", "EPCI a envoye campagne", "EPCI pas de campagne envoyee"),
    ("epci_a_1_campagne_envoyee_et_1_maj_situation", "EPCI campagne+MAJ", "EPCI sans campagne+MAJ"),
    ("epci_a_1_perimetre_importe", "EPCI a importe perimetre", "EPCI pas de perimetre"),

    # City: Is the commune open on ZLV?
    ("city_ouvert", "Commune ouverte sur ZLV", "Commune non ouverte"),

    # City: Recent connection activity
    ("city_connecte_90_jours", "Commune connectee 90j", "Commune non connectee 90j"),
    ("city_connecte_60_jours", "Commune connectee 60j", "Commune non connectee 60j"),
    ("city_connecte_30_jours", "Commune connectee 30j", "Commune non connectee 30j"),

    # City: Data update activity flags
    ("city_a_1_logement_maj_situation", "Commune a MAJ situation", "Commune sans MAJ situation"),
    ("city_a_1_logement_maj_occupation", "Commune a MAJ occupation", "Commune sans MAJ occupation"),
    ("city_a_1_logement_maj_suivi", "Commune a MAJ suivi", "Commune sans MAJ suivi"),

    # City: Group and campaign activity
    ("city_a_1_groupe_cree", "Commune a cree groupe", "Commune pas de groupe"),
    ("city_a_1_campagne_creee", "Commune a cree campagne", "Commune pas de campagne"),
    ("city_a_1_campagne_envoyee", "Commune a envoye campagne", "Commune pas de campagne envoyee"),
    ("city_a_1_perimetre_importe", "Commune a importe perimetre", "Commune pas de perimetre"),
]

CONTINUOUS_FEATURES = [
    # EPCI metrics
    "epci_utilisateurs_inscrits",
    "epci_logements_maj_situation",
    "epci_logements_contactes_via_campagnes",
    "epci_groupes_crees",
    "epci_campagnes_envoyees",
    "epci_campagnes_creees",

    # City metrics
    "city_utilisateurs_inscrits",
    "city_logements_maj_situation",
    "city_logements_contactes_via_campagnes",
    "city_groupes_crees",
    "city_campagnes_envoyees",
    "city_campagnes_creees",
]


def analyze_all(global_exit_rate: float) -> list[FeatureAnalysisResult]:
    """
    Analyze all ZLV usage features.
    
    Note: Due to SELECTION BIAS, all ZLV features will show counter-intuitive
    patterns where higher engagement = lower exit rates. This is expected.
    
    Args:
        global_exit_rate: Global exit rate percentage
        
    Returns:
        List of FeatureAnalysisResult for all features
    """
    results = []
    
    print(f"Analyzing {CATEGORY} features...")
    print("  Warning: ZLV features have SELECTION BIAS (higher engagement = lower exit)")
    
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


def analyze_all_stratified(
    global_exit_rate: float,
    stratify: StratificationConfig,
) -> list[StratifiedFeatureAnalysisResult]:
    """Analyze all ZLV usage features stratified by another variable.

    Skips features that match the stratification variable to avoid tautology.
    """
    results: list[StratifiedFeatureAnalysisResult] = []

    print(f"Analyzing {CATEGORY} features (stratified by {stratify.feature})...")
    print("  Warning: ZLV features have SELECTION BIAS (higher engagement = lower exit)")

    for feature in CATEGORICAL_FEATURES:
        if feature == stratify.feature:
            continue
        print(f"  - {feature} (categorical x {stratify.feature})")
        try:
            results.extend(analyze_categorical_feature_stratified(
                table=TABLE,
                feature=feature,
                category=CATEGORY,
                global_exit_rate=global_exit_rate,
                stratify=stratify,
                join_table=JOIN_TABLE,
                join_key="housing_id",
            ))
        except Exception as e:
            print(f"    ERROR: {e}")

    for feature_tuple in BOOLEAN_FEATURES:
        feature, true_label, false_label = feature_tuple
        if feature == stratify.feature:
            continue
        print(f"  - {feature} (boolean x {stratify.feature})")
        try:
            results.extend(analyze_boolean_feature_stratified(
                table=TABLE,
                feature=feature,
                category=CATEGORY,
                global_exit_rate=global_exit_rate,
                stratify=stratify,
                true_label=true_label,
                false_label=false_label,
                join_table=JOIN_TABLE,
                join_key="housing_id",
            ))
        except Exception as e:
            print(f"    ERROR: {e}")

    for feature in CONTINUOUS_FEATURES:
        if feature == stratify.feature:
            continue
        print(f"  - {feature} (continuous x {stratify.feature})")
        try:
            results.extend(analyze_continuous_feature_stratified(
                table=TABLE,
                feature=feature,
                category=CATEGORY,
                global_exit_rate=global_exit_rate,
                stratify=stratify,
                join_table=JOIN_TABLE,
                join_key="housing_id",
            ))
        except Exception as e:
            print(f"    ERROR: {e}")

    print(f"  Completed: {len(results)} stratified results")
    return results


if __name__ == "__main__":
    from utils import get_global_stats, generate_markdown_report
    
    stats = get_global_stats()
    print(f"Global stats: {stats}")
    
    results = analyze_all(stats["exit_rate_pct"])
    
    # Generate report
    report = generate_markdown_report(
        results=results,
        title="ZLV Usage - Analyse des features",
        global_stats=stats
    )
    
    with open("outputs/zlv_usage_insights.md", "w") as f:
        f.write(report)
    
    print(f"Report saved to outputs/zlv_usage_insights.md")

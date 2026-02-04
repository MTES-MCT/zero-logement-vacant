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
"""

from utils import (
    analyze_categorical_feature,
    analyze_boolean_feature,
    FeatureAnalysisResult,
)

TABLE = "main_marts.marts_bi_housing_zlv_usage"
JOIN_TABLE = "main_marts.marts_bi_housing_characteristics"
CATEGORY = "zlv_usage"


# =============================================================================
# FEATURE DEFINITIONS
# =============================================================================

# EXCLUDED FEATURES:
# 
# TAUTOLOGICAL (encode the target):
# - last_event_status_label_*: "Suivi terminé" = 98% exit (tracking ended BECAUSE housing exited)
# - update_intensity: "MAJ complete" is set WHEN housing exits
# - has_*_update: Updates are often made BECAUSE housing exited
#
# TEMPORAL BIAS:
# - contact_recency_category: "Recent (<6 mois)" = low rate because no time to exit yet
# - days_since_first_contact: Longer time = more chance to exit (not causal)
#
# SPARSE CONTINUOUS (>60% zeros - NTILE bucketing produces meaningless "0-0" ranges):
# - contact_count, total_groups, total_campaigns_*, activation_level, etc.
# - These are analyzed in the markdown report with MANUAL categorical buckets

CATEGORICAL_FEATURES = [
    # Group status (SELECTION BIAS - ZLV selects difficult cases)
    "group_intensity",
    
    # Engagement category (SELECTION BIAS)
    "zlv_engagement_category",
    
    # Establishment type (contextual - territory characteristics)
    # This is the ONLY feature without strong selection bias
    "establishment_kind",
    "establishment_kind_label",
    "establishment_type_regroupe",
    
    # Contact intensity (categorical version)
    "contact_intensity",
]

BOOLEAN_FEATURES = [
    # Group membership (SELECTION BIAS)
    ("is_in_group", "Dans un groupe", "Pas dans un groupe"),
    ("was_exported_from_group", "Exporte depuis groupe", "Non exporte"),
    
    # Contact (very low volume - only 4% contacted)
    ("was_contacted_by_zlv", "Contacte par ZLV", "Non contacte"),
    ("has_received_campaign", "A recu une campagne", "Pas de campagne"),
    
    # Territory (contextual)
    ("is_on_user_territory", "Territoire avec utilisateurs", "Territoire sans utilisateurs"),
    
    # Establishment activity flags (weak impact)
    ("connecte_90_derniers_jours", "Connecte 90j", "Non connecte 90j"),
    ("connecte_60_derniers_jours", "Connecte 60j", "Non connecte 60j"),
    ("connecte_30_derniers_jours", "Connecte 30j", "Non connecte 30j"),
    ("a_depose_1_perimetre", "A depose perimetre", "Pas de perimetre"),
    ("a_cree_1_groupe", "A cree groupe", "Pas de groupe"),
    ("a_cree_1_campagne", "A cree campagne", "Pas de campagne creee"),
    ("a_envoye_1_campagne", "A envoye campagne", "Pas de campagne envoyee"),
    ("establishment_has_active_users", "Avec utilisateurs actifs", "Sans utilisateurs"),
]

# NOTE: We intentionally DO NOT include continuous features because:
# 1. Most have >60% zeros (contact_count: 96%, total_groups: 66%, engagement_score: 61%)
# 2. NTILE bucketing on sparse data produces meaningless "Q1: 0-0", "Q2: 0-0" ranges
# 3. Better to use manual categorical buckets (done in markdown report)


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
    print("  ⚠️ Warning: ZLV features have SELECTION BIAS (higher engagement = lower exit)")
    
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
        title="ZLV Usage - Analyse des features",
        global_stats=stats
    )
    
    with open("outputs/zlv_usage_insights.md", "w") as f:
        f.write(report)
    
    print(f"Report saved to outputs/zlv_usage_insights.md")

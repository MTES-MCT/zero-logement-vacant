"""
Utils module for housing vacancy exit analysis.
Provides database connection, feature analysis functions, and report generation.
"""

import os
from dataclasses import dataclass, field
from typing import Optional
import duckdb
import pandas as pd


# =============================================================================
# DATABASE CONNECTION
# =============================================================================

_connection: Optional[duckdb.DuckDBPyConnection] = None


def get_connection() -> duckdb.DuckDBPyConnection:
    """Get or create a MotherDuck connection."""
    global _connection
    if _connection is None:
        token = os.environ.get("MOTHERDUCK_TOKEN")
        if token:
            _connection = duckdb.connect(f"md:dwh?motherduck_token={token}")
        else:
            # Try SSO authentication (works in IDE with MCP)
            _connection = duckdb.connect("md:dwh")
    return _connection


def close_connection():
    """Close the database connection."""
    global _connection
    if _connection:
        _connection.close()
        _connection = None


def query_df(sql: str) -> pd.DataFrame:
    """Execute a SQL query and return a DataFrame."""
    conn = get_connection()
    return conn.execute(sql).fetchdf()


# =============================================================================
# GLOBAL STATISTICS
# =============================================================================

def get_global_stats() -> dict:
    """Get global exit rate statistics from the reference table."""
    sql = """
    SELECT 
        COUNT(*) as total_housing,
        SUM(is_housing_out) as housing_out,
        ROUND(AVG(is_housing_out) * 100, 4) as exit_rate_pct
    FROM main_marts.marts_bi_housing_characteristics
    """
    df = query_df(sql)
    return {
        "total_housing": int(df["total_housing"].iloc[0]),
        "housing_out": int(df["housing_out"].iloc[0]),
        "exit_rate_pct": float(df["exit_rate_pct"].iloc[0])
    }


# =============================================================================
# FEATURE ANALYSIS DATA CLASSES
# =============================================================================

@dataclass
class ModalityResult:
    """Result for a single feature modality."""
    modality: str
    n: int
    n_out: int
    exit_rate_pct: float
    multiplier: float


@dataclass
class FeatureAnalysisResult:
    """Complete analysis result for a feature."""
    category: str
    feature: str
    feature_type: str  # 'categorical', 'boolean', 'continuous'
    modalities: list[ModalityResult] = field(default_factory=list)
    global_exit_rate: float = 0.0
    max_exit_rate: float = 0.0
    min_exit_rate: float = 0.0
    max_modality: str = ""
    min_modality: str = ""
    impact_score: float = 0.0  # max/min ratio
    notes: str = ""


# =============================================================================
# FEATURE ANALYSIS FUNCTIONS
# =============================================================================

def analyze_categorical_feature(
    table: str,
    feature: str,
    category: str,
    global_exit_rate: float,
    min_count: int = 500,
    join_table: Optional[str] = None,
    join_key: str = "housing_id"
) -> FeatureAnalysisResult:
    """
    Analyze a categorical feature's impact on vacancy exit rate.
    
    Args:
        table: Source table name (e.g., 'main_marts.marts_bi_housing_characteristics')
        feature: Column name to analyze
        category: Category name for the result (e.g., 'caracteristiques')
        global_exit_rate: Global exit rate percentage
        min_count: Minimum sample size to include a modality
        join_table: If provided, join with this table for is_housing_out
        join_key: Key to use for join
    """
    if join_table:
        sql = f"""
        SELECT 
            CAST(t.{feature} AS VARCHAR) as modality,
            COUNT(*) as n,
            SUM(c.is_housing_out) as n_out,
            ROUND(AVG(c.is_housing_out) * 100, 2) as exit_rate_pct
        FROM {table} t
        JOIN {join_table} c ON t.{join_key} = c.{join_key}
        WHERE t.{feature} IS NOT NULL
        GROUP BY 1
        HAVING COUNT(*) >= {min_count}
        ORDER BY exit_rate_pct DESC
        """
    else:
        sql = f"""
        SELECT 
            CAST({feature} AS VARCHAR) as modality,
            COUNT(*) as n,
            SUM(is_housing_out) as n_out,
            ROUND(AVG(is_housing_out) * 100, 2) as exit_rate_pct
        FROM {table}
        WHERE {feature} IS NOT NULL
        GROUP BY 1
        HAVING COUNT(*) >= {min_count}
        ORDER BY exit_rate_pct DESC
        """
    
    df = query_df(sql)
    
    if df.empty:
        return FeatureAnalysisResult(
            category=category,
            feature=feature,
            feature_type="categorical",
            global_exit_rate=global_exit_rate,
            notes="No data"
        )
    
    modalities = []
    for _, row in df.iterrows():
        multiplier = round(row["exit_rate_pct"] / global_exit_rate, 2) if global_exit_rate > 0 else 0
        modalities.append(ModalityResult(
            modality=str(row["modality"]),
            n=int(row["n"]),
            n_out=int(row["n_out"]),
            exit_rate_pct=float(row["exit_rate_pct"]),
            multiplier=multiplier
        ))
    
    max_rate = df["exit_rate_pct"].max()
    min_rate = df["exit_rate_pct"].min()
    impact = round(max_rate / min_rate, 2) if min_rate > 0 else 0
    
    return FeatureAnalysisResult(
        category=category,
        feature=feature,
        feature_type="categorical",
        modalities=modalities,
        global_exit_rate=global_exit_rate,
        max_exit_rate=float(max_rate),
        min_exit_rate=float(min_rate),
        max_modality=str(df.iloc[0]["modality"]),
        min_modality=str(df.iloc[-1]["modality"]),
        impact_score=impact
    )


def analyze_boolean_feature(
    table: str,
    feature: str,
    category: str,
    global_exit_rate: float,
    true_label: str = "Oui",
    false_label: str = "Non",
    join_table: Optional[str] = None,
    join_key: str = "housing_id"
) -> FeatureAnalysisResult:
    """Analyze a boolean feature's impact on vacancy exit rate."""
    if join_table:
        sql = f"""
        SELECT 
            CASE WHEN t.{feature} THEN '{true_label}' ELSE '{false_label}' END as modality,
            COUNT(*) as n,
            SUM(c.is_housing_out) as n_out,
            ROUND(AVG(c.is_housing_out) * 100, 2) as exit_rate_pct
        FROM {table} t
        JOIN {join_table} c ON t.{join_key} = c.{join_key}
        WHERE t.{feature} IS NOT NULL
        GROUP BY 1
        ORDER BY exit_rate_pct DESC
        """
    else:
        sql = f"""
        SELECT 
            CASE WHEN {feature} THEN '{true_label}' ELSE '{false_label}' END as modality,
            COUNT(*) as n,
            SUM(is_housing_out) as n_out,
            ROUND(AVG(is_housing_out) * 100, 2) as exit_rate_pct
        FROM {table}
        WHERE {feature} IS NOT NULL
        GROUP BY 1
        ORDER BY exit_rate_pct DESC
        """
    
    df = query_df(sql)
    
    if df.empty:
        return FeatureAnalysisResult(
            category=category,
            feature=feature,
            feature_type="boolean",
            global_exit_rate=global_exit_rate,
            notes="No data"
        )
    
    modalities = []
    for _, row in df.iterrows():
        multiplier = round(row["exit_rate_pct"] / global_exit_rate, 2) if global_exit_rate > 0 else 0
        modalities.append(ModalityResult(
            modality=str(row["modality"]),
            n=int(row["n"]),
            n_out=int(row["n_out"]),
            exit_rate_pct=float(row["exit_rate_pct"]),
            multiplier=multiplier
        ))
    
    max_rate = df["exit_rate_pct"].max()
    min_rate = df["exit_rate_pct"].min()
    impact = round(max_rate / min_rate, 2) if min_rate > 0 else 0
    
    return FeatureAnalysisResult(
        category=category,
        feature=feature,
        feature_type="boolean",
        modalities=modalities,
        global_exit_rate=global_exit_rate,
        max_exit_rate=float(max_rate),
        min_exit_rate=float(min_rate),
        max_modality=str(df.iloc[0]["modality"]) if len(df) > 0 else "",
        min_modality=str(df.iloc[-1]["modality"]) if len(df) > 0 else "",
        impact_score=impact
    )


def analyze_continuous_feature(
    table: str,
    feature: str,
    category: str,
    global_exit_rate: float,
    n_buckets: int = 10,
    min_count: int = 500,
    join_table: Optional[str] = None,
    join_key: str = "housing_id"
) -> FeatureAnalysisResult:
    """
    Analyze a continuous feature by bucketing into quantiles (deciles by default).
    
    Methodology:
    - Uses NTILE(n_buckets) to divide data into equal-sized groups by RANK
    - This creates QUANTILE-based buckets (not equal-width bins)
    - Each bucket has approximately the same number of observations
    - This approach:
      * Handles skewed distributions well
      * Ensures sufficient sample size in each bucket
      * Compares "top 10%" vs "bottom 10%" etc.
    
    Impact Calculation:
    - Impact score = max(exit_rate) / min(exit_rate) across buckets
    - This is a ONE vs ONE comparison (best vs worst bucket)
    - Multiplier = bucket_rate / global_rate (comparison to overall average)
    
    Limitations:
    - Buckets may have identical min/max values if data is sparse/categorical
    - Edge effects at distribution tails
    - Non-linear relationships may be hidden within buckets
    """
    if join_table:
        sql = f"""
        WITH bucketed AS (
            SELECT 
                t.{feature},
                c.is_housing_out,
                NTILE({n_buckets}) OVER (ORDER BY t.{feature}) as bucket
            FROM {table} t
            JOIN {join_table} c ON t.{join_key} = c.{join_key}
            WHERE t.{feature} IS NOT NULL
        )
        SELECT 
            bucket,
            MIN({feature}) as min_val,
            MAX({feature}) as max_val,
            COUNT(*) as n,
            SUM(is_housing_out) as n_out,
            ROUND(AVG(is_housing_out) * 100, 2) as exit_rate_pct
        FROM bucketed
        GROUP BY bucket
        HAVING COUNT(*) >= {min_count}
        ORDER BY bucket
        """
    else:
        sql = f"""
        WITH bucketed AS (
            SELECT 
                {feature},
                is_housing_out,
                NTILE({n_buckets}) OVER (ORDER BY {feature}) as bucket
            FROM {table}
            WHERE {feature} IS NOT NULL
        )
        SELECT 
            bucket,
            MIN({feature}) as min_val,
            MAX({feature}) as max_val,
            COUNT(*) as n,
            SUM(is_housing_out) as n_out,
            ROUND(AVG(is_housing_out) * 100, 2) as exit_rate_pct
        FROM bucketed
        GROUP BY bucket
        HAVING COUNT(*) >= {min_count}
        ORDER BY bucket
        """
    
    df = query_df(sql)
    
    if df.empty:
        return FeatureAnalysisResult(
            category=category,
            feature=feature,
            feature_type="continuous",
            global_exit_rate=global_exit_rate,
            notes="No data"
        )
    
    modalities = []
    for _, row in df.iterrows():
        modality_label = f"Q{int(row['bucket'])}: {row['min_val']:.0f}-{row['max_val']:.0f}"
        multiplier = round(row["exit_rate_pct"] / global_exit_rate, 2) if global_exit_rate > 0 else 0
        modalities.append(ModalityResult(
            modality=modality_label,
            n=int(row["n"]),
            n_out=int(row["n_out"]),
            exit_rate_pct=float(row["exit_rate_pct"]),
            multiplier=multiplier
        ))
    
    max_idx = df["exit_rate_pct"].idxmax()
    min_idx = df["exit_rate_pct"].idxmin()
    max_rate = df["exit_rate_pct"].max()
    min_rate = df["exit_rate_pct"].min()
    impact = round(max_rate / min_rate, 2) if min_rate > 0 else 0
    
    return FeatureAnalysisResult(
        category=category,
        feature=feature,
        feature_type="continuous",
        modalities=modalities,
        global_exit_rate=global_exit_rate,
        max_exit_rate=float(max_rate),
        min_exit_rate=float(min_rate),
        max_modality=f"Q{int(df.loc[max_idx, 'bucket'])}",
        min_modality=f"Q{int(df.loc[min_idx, 'bucket'])}",
        impact_score=impact
    )


# =============================================================================
# OUTPUT GENERATION
# =============================================================================

def results_to_csv_rows(results: list[FeatureAnalysisResult]) -> list[dict]:
    """Convert analysis results to CSV rows."""
    rows = []
    for result in results:
        for mod in result.modalities:
            rows.append({
                "category": result.category,
                "feature": result.feature,
                "feature_type": result.feature_type,
                "modality": mod.modality,
                "n": mod.n,
                "n_out": mod.n_out,
                "exit_rate_pct": mod.exit_rate_pct,
                "global_exit_rate": result.global_exit_rate,
                "multiplier": mod.multiplier,
                "impact_score": result.impact_score,
                "notes": result.notes
            })
    return rows


def results_to_dataframe(results: list[FeatureAnalysisResult]) -> pd.DataFrame:
    """Convert analysis results to a DataFrame."""
    rows = results_to_csv_rows(results)
    return pd.DataFrame(rows)


def generate_markdown_report(
    results: list[FeatureAnalysisResult],
    title: str,
    global_stats: dict,
    top_n: int = 5
) -> str:
    """Generate a markdown report from analysis results."""
    lines = [
        f"# {title}",
        "",
        f"*Analyse generee automatiquement*",
        "",
        "---",
        "",
        "## Statistiques globales",
        "",
        f"- **Total logements**: {global_stats['total_housing']:,}",
        f"- **Sorties de vacance**: {global_stats['housing_out']:,}",
        f"- **Taux de sortie global**: {global_stats['exit_rate_pct']:.2f}%",
        "",
        "---",
        "",
        "## Top facteurs par impact",
        "",
    ]
    
    # Sort by impact score
    sorted_results = sorted(results, key=lambda x: x.impact_score, reverse=True)
    
    lines.append("| Rang | Feature | Impact (max/min) | Taux max | Taux min |")
    lines.append("|------|---------|------------------|----------|----------|")
    
    for i, result in enumerate(sorted_results[:top_n], 1):
        lines.append(
            f"| {i} | {result.feature} | x {result.impact_score:.2f} | "
            f"{result.max_exit_rate:.1f}% ({result.max_modality}) | "
            f"{result.min_exit_rate:.1f}% ({result.min_modality}) |"
        )
    
    lines.extend(["", "---", "", "## Detail par feature", ""])
    
    for result in sorted_results:
        lines.append(f"### {result.feature}")
        lines.append("")
        lines.append(f"*Type: {result.feature_type} | Impact: x {result.impact_score:.2f}*")
        lines.append("")
        
        if result.notes:
            lines.append(f"**Note**: {result.notes}")
            lines.append("")
        
        lines.append("| Modalite | N | Taux sortie | Multiplicateur |")
        lines.append("|----------|---|-------------|----------------|")
        
        for mod in result.modalities[:10]:  # Limit to 10 modalities
            lines.append(
                f"| {mod.modality} | {mod.n:,} | {mod.exit_rate_pct:.1f}% | x {mod.multiplier:.2f} |"
            )
        
        if len(result.modalities) > 10:
            lines.append(f"| ... | ({len(result.modalities) - 10} autres modalites) | ... | ... |")
        
        lines.extend(["", ""])
    
    return "\n".join(lines)


def generate_summary_markdown(
    all_results: dict[str, list[FeatureAnalysisResult]],
    global_stats: dict
) -> str:
    """Generate a summary markdown combining all categories."""
    lines = [
        "# Les logements vacants en France - Facteurs de sortie de vacance",
        "",
        f"*Analyse generee automatiquement*",
        "",
        "---",
        "",
        "## Statistique cle",
        "",
        f"**{global_stats['exit_rate_pct']:.1f}%** des logements vacants sortent de la vacance,",
        f"soit **{global_stats['housing_out']:,}** logements sur **{global_stats['total_housing']:,}** analyses.",
        "",
        "---",
        "",
    ]
    
    # Collect all results and sort by impact
    all_features = []
    for category, results in all_results.items():
        all_features.extend(results)
    
    sorted_features = sorted(all_features, key=lambda x: x.impact_score, reverse=True)
    
    # Top 10 overall
    lines.append("## Top 10 facteurs les plus impactants")
    lines.append("")
    lines.append("| Rang | Categorie | Feature | Impact | Taux haut vs bas |")
    lines.append("|------|-----------|---------|--------|------------------|")
    
    for i, result in enumerate(sorted_features[:10], 1):
        lines.append(
            f"| {i} | {result.category} | {result.feature} | x {result.impact_score:.2f} | "
            f"{result.max_exit_rate:.1f}% vs {result.min_exit_rate:.1f}% |"
        )
    
    lines.extend(["", "---", ""])
    
    # Per-category summaries
    for category, results in all_results.items():
        sorted_cat = sorted(results, key=lambda x: x.impact_score, reverse=True)
        
        lines.append(f"## {category.title()}")
        lines.append("")
        
        for result in sorted_cat[:5]:
            if result.impact_score > 1.0:
                lines.append(
                    f"- **{result.feature}** -> **x {result.impact_score:.2f}** "
                    f"({result.max_modality} vs {result.min_modality})"
                )
                lines.append(f"  - Taux de sortie: {result.max_exit_rate:.1f}% vs {result.min_exit_rate:.1f}%")
                lines.append("")
        
        lines.append("---")
        lines.append("")
    
    # Footer
    lines.extend([
        "## Notes methodologiques",
        "",
        "### Sources et definitions",
        "- **Source**: Tables marts_bi_housing_* (MotherDuck)",
        "- **Definition sortie de vacance**: Logement present dans LOVAC 2024, absent de LOVAC 2025",
        f"- **Taux global de reference**: {global_stats['exit_rate_pct']:.2f}%",
        "",
        "### Metriques",
        "- **Multiplicateur**: Ratio taux de sortie modalite / taux global",
        "- **Impact**: Ratio taux max / taux min entre modalites (mesure de discrimination)",
        "",
        "### Methodologie features continues",
        "- Division en **deciles** (NTILE 10) pour creer des groupes de taille egale",
        "- Chaque bucket contient ~10% des observations",
        "- Compare les quantiles extremes (Q10 vs Q1)",
        "",
        "### Variables exclues (tautologiques)",
        "- `last_event_status_label_*`: Encodent le resultat (ex: 'Suivi termine' = sortie enregistree)",
        "- `update_intensity`, `has_*_update`: MAJ faites POUR enregistrer la sortie",
        "- Ces variables ont des impacts >100x car elles **encodent** la cible",
        "",
    ])
    
    return "\n".join(lines)

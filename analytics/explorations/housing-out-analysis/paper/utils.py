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


@dataclass
class StratificationConfig:
    """Configuration for a stratification variable."""
    feature: str
    table: str
    feature_type: str  # 'categorical' or 'boolean'
    true_label: str = "Oui"
    false_label: str = "Non"
    label: str = ""  # Human-readable name

    def __post_init__(self):
        if not self.label:
            self.label = self.feature


@dataclass
class StratifiedFeatureAnalysisResult:
    """Analysis result for a feature within a single stratum."""
    stratify_feature: str
    stratify_value: str
    stratum_n: int
    stratum_n_out: int
    stratum_exit_rate: float
    category: str
    feature: str
    feature_type: str
    modalities: list[ModalityResult] = field(default_factory=list)
    global_exit_rate: float = 0.0
    max_exit_rate: float = 0.0
    min_exit_rate: float = 0.0
    max_modality: str = ""
    min_modality: str = ""
    impact_score: float = 0.0
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
# STRATIFIED FEATURE ANALYSIS FUNCTIONS
# =============================================================================

def _build_stratified_from(
    table: str,
    join_table: Optional[str],
    join_key: str,
    stratify_table: str,
) -> tuple[str, str, str, str]:
    """Build FROM/JOIN clause for stratified queries.

    All marts tables share housing_id as unique key, so joins are 1:1.
    Deduplicates tables when stratify_table matches feature or join table.

    Returns (from_clause, feature_alias, out_alias, strat_alias)
    """
    parts = [f"FROM {table} t"]
    feature_alias = "t"

    if join_table:
        parts.append(f"JOIN {join_table} c ON t.{join_key} = c.{join_key}")
        out_alias = "c"
    else:
        out_alias = "t"

    if stratify_table == table:
        strat_alias = "t"
    elif join_table and stratify_table == join_table:
        strat_alias = out_alias
    else:
        base = out_alias if join_table else "t"
        parts.append(f"JOIN {stratify_table} s ON {base}.{join_key} = s.{join_key}")
        strat_alias = "s"

    from_clause = "\n    ".join(parts)
    return from_clause, feature_alias, out_alias, strat_alias


def _strat_value_expr(alias: str, config: StratificationConfig) -> str:
    """SQL expression that converts the stratification column to a string label."""
    if config.feature_type == "boolean":
        return (
            f"CASE WHEN {alias}.{config.feature} "
            f"THEN '{config.true_label}' "
            f"ELSE '{config.false_label}' END"
        )
    return f"CAST({alias}.{config.feature} AS VARCHAR)"


def _query_stratum_stats(
    from_clause: str,
    out_alias: str,
    strat_alias: str,
    strat_expr: str,
    stratify_feature: str,
) -> pd.DataFrame:
    """Query exit rate statistics per stratum."""
    sql = f"""
    SELECT
        {strat_expr} as stratum,
        COUNT(*) as stratum_n,
        SUM({out_alias}.is_housing_out) as stratum_n_out,
        ROUND(AVG({out_alias}.is_housing_out) * 100, 4) as stratum_exit_rate
    {from_clause}
    WHERE {strat_alias}.{stratify_feature} IS NOT NULL
    GROUP BY 1
    """
    return query_df(sql)


def _build_stratified_results(
    cross_df: pd.DataFrame,
    strat_df: pd.DataFrame,
    category: str,
    feature: str,
    feature_type: str,
    global_exit_rate: float,
    stratify_feature: str,
) -> list[StratifiedFeatureAnalysisResult]:
    """Build StratifiedFeatureAnalysisResult list from cross-tab + stratum stats DataFrames."""
    if cross_df.empty:
        return []

    strat_map = {str(row["stratum"]): row for _, row in strat_df.iterrows()}
    results = []

    for stratum_value, group in cross_df.groupby("stratum", sort=True):
        stratum_value = str(stratum_value)
        strat_info = strat_map.get(stratum_value, {})
        stratum_exit_rate = float(strat_info.get("stratum_exit_rate", 0))

        modalities = []
        for _, row in group.iterrows():
            multiplier = (
                round(row["exit_rate_pct"] / global_exit_rate, 2)
                if global_exit_rate > 0 else 0
            )
            modalities.append(ModalityResult(
                modality=str(row["modality"]),
                n=int(row["n"]),
                n_out=int(row["n_out"]),
                exit_rate_pct=float(row["exit_rate_pct"]),
                multiplier=multiplier,
            ))

        rates = group["exit_rate_pct"]
        max_rate = float(rates.max())
        min_rate = float(rates.min())
        impact = round(max_rate / min_rate, 2) if min_rate > 0 else 0

        sorted_group = group.sort_values("exit_rate_pct", ascending=False)

        results.append(StratifiedFeatureAnalysisResult(
            stratify_feature=stratify_feature,
            stratify_value=stratum_value,
            stratum_n=int(strat_info.get("stratum_n", 0)),
            stratum_n_out=int(strat_info.get("stratum_n_out", 0)),
            stratum_exit_rate=stratum_exit_rate,
            category=category,
            feature=feature,
            feature_type=feature_type,
            modalities=modalities,
            global_exit_rate=global_exit_rate,
            max_exit_rate=max_rate,
            min_exit_rate=min_rate,
            max_modality=str(sorted_group.iloc[0]["modality"]) if len(sorted_group) > 0 else "",
            min_modality=str(sorted_group.iloc[-1]["modality"]) if len(sorted_group) > 0 else "",
            impact_score=impact,
        ))

    return results


def analyze_categorical_feature_stratified(
    table: str,
    feature: str,
    category: str,
    global_exit_rate: float,
    stratify: StratificationConfig,
    min_count: int = 100,
    join_table: Optional[str] = None,
    join_key: str = "housing_id",
) -> list[StratifiedFeatureAnalysisResult]:
    """Analyze a categorical feature stratified by another variable.

    Returns one StratifiedFeatureAnalysisResult per stratum value.
    """
    from_clause, feat_a, out_a, strat_a = _build_stratified_from(
        table, join_table, join_key, stratify.table
    )
    strat_expr = _strat_value_expr(strat_a, stratify)

    strat_df = _query_stratum_stats(
        from_clause, out_a, strat_a, strat_expr, stratify.feature
    )

    cross_sql = f"""
    SELECT
        CAST({feat_a}.{feature} AS VARCHAR) as modality,
        {strat_expr} as stratum,
        COUNT(*) as n,
        SUM({out_a}.is_housing_out) as n_out,
        ROUND(AVG({out_a}.is_housing_out) * 100, 2) as exit_rate_pct
    {from_clause}
    WHERE {feat_a}.{feature} IS NOT NULL
      AND {strat_a}.{stratify.feature} IS NOT NULL
    GROUP BY 1, 2
    HAVING COUNT(*) >= {min_count}
    ORDER BY stratum, exit_rate_pct DESC
    """
    cross_df = query_df(cross_sql)

    return _build_stratified_results(
        cross_df, strat_df, category, feature, "categorical",
        global_exit_rate, stratify.feature,
    )


def analyze_boolean_feature_stratified(
    table: str,
    feature: str,
    category: str,
    global_exit_rate: float,
    stratify: StratificationConfig,
    true_label: str = "Oui",
    false_label: str = "Non",
    min_count: int = 100,
    join_table: Optional[str] = None,
    join_key: str = "housing_id",
) -> list[StratifiedFeatureAnalysisResult]:
    """Analyze a boolean feature stratified by another variable."""
    from_clause, feat_a, out_a, strat_a = _build_stratified_from(
        table, join_table, join_key, stratify.table
    )
    strat_expr = _strat_value_expr(strat_a, stratify)
    feat_expr = (
        f"CASE WHEN {feat_a}.{feature} "
        f"THEN '{true_label}' ELSE '{false_label}' END"
    )

    strat_df = _query_stratum_stats(
        from_clause, out_a, strat_a, strat_expr, stratify.feature
    )

    cross_sql = f"""
    SELECT
        {feat_expr} as modality,
        {strat_expr} as stratum,
        COUNT(*) as n,
        SUM({out_a}.is_housing_out) as n_out,
        ROUND(AVG({out_a}.is_housing_out) * 100, 2) as exit_rate_pct
    {from_clause}
    WHERE {feat_a}.{feature} IS NOT NULL
      AND {strat_a}.{stratify.feature} IS NOT NULL
    GROUP BY 1, 2
    ORDER BY stratum, exit_rate_pct DESC
    """
    cross_df = query_df(cross_sql)

    return _build_stratified_results(
        cross_df, strat_df, category, feature, "boolean",
        global_exit_rate, stratify.feature,
    )


def analyze_continuous_feature_stratified(
    table: str,
    feature: str,
    category: str,
    global_exit_rate: float,
    stratify: StratificationConfig,
    n_buckets: int = 10,
    min_count: int = 100,
    join_table: Optional[str] = None,
    join_key: str = "housing_id",
) -> list[StratifiedFeatureAnalysisResult]:
    """Analyze a continuous feature (NTILE buckets) stratified by another variable.

    NTILE is partitioned by stratum so each stratum gets its own quantile buckets.
    """
    from_clause, feat_a, out_a, strat_a = _build_stratified_from(
        table, join_table, join_key, stratify.table
    )
    strat_expr = _strat_value_expr(strat_a, stratify)

    strat_df = _query_stratum_stats(
        from_clause, out_a, strat_a, strat_expr, stratify.feature
    )

    cross_sql = f"""
    WITH bucketed AS (
        SELECT
            {feat_a}.{feature},
            {out_a}.is_housing_out,
            {strat_expr} as stratum,
            NTILE({n_buckets}) OVER (
                PARTITION BY {strat_expr}
                ORDER BY {feat_a}.{feature}
            ) as bucket
        {from_clause}
        WHERE {feat_a}.{feature} IS NOT NULL
          AND {strat_a}.{stratify.feature} IS NOT NULL
    )
    SELECT
        'Q' || bucket || ': ' || CAST(MIN({feature}) AS INTEGER)
            || '-' || CAST(MAX({feature}) AS INTEGER) as modality,
        stratum,
        bucket,
        COUNT(*) as n,
        SUM(is_housing_out) as n_out,
        ROUND(AVG(is_housing_out) * 100, 2) as exit_rate_pct
    FROM bucketed
    GROUP BY bucket, stratum
    HAVING COUNT(*) >= {min_count}
    ORDER BY stratum, bucket
    """
    cross_df = query_df(cross_sql)

    return _build_stratified_results(
        cross_df, strat_df, category, feature, "continuous",
        global_exit_rate, stratify.feature,
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


def stratified_results_to_csv_rows(
    results: list[StratifiedFeatureAnalysisResult],
) -> list[dict]:
    """Convert stratified analysis results to CSV rows with stratum columns."""
    rows = []
    for result in results:
        for mod in result.modalities:
            stratum_multiplier = (
                round(mod.exit_rate_pct / result.stratum_exit_rate, 2)
                if result.stratum_exit_rate > 0 else 0
            )
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
                "notes": result.notes,
                "stratify_feature": result.stratify_feature,
                "stratify_value": result.stratify_value,
                "stratum_exit_rate": result.stratum_exit_rate,
                "stratum_multiplier": stratum_multiplier,
            })
    return rows


def stratified_results_to_dataframe(
    results: list[StratifiedFeatureAnalysisResult],
) -> pd.DataFrame:
    """Convert stratified results to a DataFrame."""
    rows = stratified_results_to_csv_rows(results)
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


def generate_stratified_markdown_report(
    results: list[StratifiedFeatureAnalysisResult],
    title: str,
    global_stats: dict,
    stratify_feature: str,
    top_n: int = 5,
) -> str:
    """Generate a markdown report with per-stratum analysis sections."""
    from collections import defaultdict

    by_stratum: dict[str, list[StratifiedFeatureAnalysisResult]] = defaultdict(list)
    for r in results:
        by_stratum[r.stratify_value].append(r)

    lines = [
        f"# {title}",
        "",
        f"*Analyse stratifiee par **{stratify_feature}***",
        "",
        "---",
        "",
        "## Statistiques globales",
        "",
        f"- **Total logements**: {global_stats['total_housing']:,}",
        f"- **Taux de sortie global**: {global_stats['exit_rate_pct']:.2f}%",
        f"- **Variable de stratification**: {stratify_feature}",
        f"- **Nombre de strates**: {len(by_stratum)}",
        "",
    ]

    # Stratum overview table
    lines.extend([
        "## Taux de sortie par strate",
        "",
        "| Strate | N | N sortis | Taux sortie |",
        "|--------|---|----------|-------------|",
    ])
    for stratum_value in sorted(by_stratum.keys()):
        stratum_results = by_stratum[stratum_value]
        if stratum_results:
            s = stratum_results[0]
            lines.append(
                f"| {stratum_value} | {s.stratum_n:,} | "
                f"{s.stratum_n_out:,} | {s.stratum_exit_rate:.2f}% |"
            )
    lines.extend(["", "---", ""])

    # Per-stratum detail
    for stratum_value in sorted(by_stratum.keys()):
        stratum_results = by_stratum[stratum_value]
        if not stratum_results:
            continue
        sample = stratum_results[0]

        lines.extend([
            f"## Strate: {stratify_feature} = {stratum_value}",
            "",
            f"- **N**: {sample.stratum_n:,}",
            f"- **Taux de sortie strate**: {sample.stratum_exit_rate:.2f}%",
            f"- **Taux de sortie global**: {global_stats['exit_rate_pct']:.2f}%",
            "",
        ])

        sorted_results = sorted(
            stratum_results, key=lambda x: x.impact_score, reverse=True
        )

        lines.append("### Top facteurs")
        lines.append("")
        lines.append("| Rang | Feature | Type | Impact | Taux max | Taux min |")
        lines.append("|------|---------|------|--------|----------|----------|")

        for i, result in enumerate(sorted_results[:top_n], 1):
            lines.append(
                f"| {i} | {result.feature} | {result.feature_type} "
                f"| x {result.impact_score:.2f} "
                f"| {result.max_exit_rate:.1f}% ({result.max_modality}) "
                f"| {result.min_exit_rate:.1f}% ({result.min_modality}) |"
            )

        lines.extend(["", "### Detail par feature", ""])

        for result in sorted_results:
            lines.append(f"#### {result.feature}")
            lines.append("")
            lines.append(
                f"*Type: {result.feature_type} | Impact: x {result.impact_score:.2f}*"
            )
            lines.append("")

            lines.append("| Modalite | N | Taux sortie | vs global | vs strate |")
            lines.append("|----------|---|-------------|-----------|-----------|")

            for mod in result.modalities[:10]:
                strat_mult = (
                    round(mod.exit_rate_pct / result.stratum_exit_rate, 2)
                    if result.stratum_exit_rate > 0 else 0
                )
                lines.append(
                    f"| {mod.modality} | {mod.n:,} | {mod.exit_rate_pct:.1f}% "
                    f"| x {mod.multiplier:.2f} | x {strat_mult:.2f} |"
                )

            if len(result.modalities) > 10:
                lines.append(
                    f"| ... | ({len(result.modalities) - 10} autres) | ... | ... | ... |"
                )

            lines.extend(["", ""])

        lines.extend(["---", ""])

    # Methodology footer
    lines.extend([
        "## Notes methodologiques",
        "",
        f"- **Stratification**: Analyse par sous-population definie par {stratify_feature}",
        "- **vs global**: Multiplicateur par rapport au taux de sortie global",
        "- **vs strate**: Multiplicateur par rapport au taux de sortie de la strate",
        f"- **Seuil minimum**: Modalites avec < 100 observations exclues",
        "",
    ])

    return "\n".join(lines)

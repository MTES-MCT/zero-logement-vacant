#!/usr/bin/env python3
"""
Main script to run complete housing vacancy exit analysis.

This script:
1. Connects to MotherDuck
2. Runs analysis on all feature categories
3. Generates CSV with all features
4. Generates markdown reports per category
5. Generates summary report

Usage:
    python run_analysis.py
    
Requires:
    - MOTHERDUCK_TOKEN environment variable (or IDE MCP authentication)
"""

import os
from pathlib import Path
from datetime import datetime

import pandas as pd

from utils import (
    get_global_stats,
    close_connection,
    results_to_dataframe,
    generate_markdown_report,
    generate_summary_markdown,
    FeatureAnalysisResult,
)

# Import category analyzers
import analyze_characteristics
import analyze_geography
import analyze_owners
import analyze_zlv_usage


# Output directory
OUTPUT_DIR = Path(__file__).parent / "outputs"
OUTPUT_DIR.mkdir(exist_ok=True)


def run_all_analyses() -> dict[str, list[FeatureAnalysisResult]]:
    """Run analysis on all feature categories."""
    
    print("=" * 60)
    print("HOUSING VACANCY EXIT ANALYSIS")
    print(f"Started at: {datetime.now().isoformat()}")
    print("=" * 60)
    print()
    
    # Get global statistics
    print("Fetching global statistics...")
    global_stats = get_global_stats()
    print(f"  Total housing: {global_stats['total_housing']:,}")
    print(f"  Housing out: {global_stats['housing_out']:,}")
    print(f"  Exit rate: {global_stats['exit_rate_pct']:.2f}%")
    print()
    
    all_results = {}
    
    # Analyze each category
    print("-" * 60)
    print("ANALYZING CHARACTERISTICS")
    print("-" * 60)
    all_results["caracteristiques"] = analyze_characteristics.analyze_all(
        global_stats["exit_rate_pct"]
    )
    print()
    
    print("-" * 60)
    print("ANALYZING GEOGRAPHY")
    print("-" * 60)
    all_results["geographie"] = analyze_geography.analyze_all(
        global_stats["exit_rate_pct"]
    )
    print()
    
    print("-" * 60)
    print("ANALYZING OWNERS")
    print("-" * 60)
    all_results["proprietaires"] = analyze_owners.analyze_all(
        global_stats["exit_rate_pct"]
    )
    print()
    
    print("-" * 60)
    print("ANALYZING ZLV USAGE")
    print("-" * 60)
    all_results["zlv_usage"] = analyze_zlv_usage.analyze_all(
        global_stats["exit_rate_pct"]
    )
    print()
    
    return all_results, global_stats


def generate_outputs(
    all_results: dict[str, list[FeatureAnalysisResult]],
    global_stats: dict
):
    """Generate all output files."""
    
    print("=" * 60)
    print("GENERATING OUTPUTS")
    print("=" * 60)
    print()
    
    # 1. Generate CSV with all features
    print("Generating features_impact.csv...")
    all_dfs = []
    for category, results in all_results.items():
        df = results_to_dataframe(results)
        all_dfs.append(df)
    
    combined_df = pd.concat(all_dfs, ignore_index=True)
    csv_path = OUTPUT_DIR / "features_impact.csv"
    combined_df.to_csv(csv_path, index=False)
    print(f"  Saved: {csv_path}")
    print(f"  Total rows: {len(combined_df)}")
    print()
    
    # 2. Generate markdown report per category
    # NOTE: File names are in French for consistency
    category_titles = {
        "caracteristiques": "Caracteristiques - Analyse des features",
        "geographie": "Geographie - Analyse des features",
        "proprietaires": "Proprietaires - Analyse des features",
        "zlv_usage": "ZLV Usage - Analyse Simple des features",
    }
    
    for category, results in all_results.items():
        print(f"Generating {category}_insights.md...")
        report = generate_markdown_report(
            results=results,
            title=category_titles.get(category, category),
            global_stats=global_stats
        )
        md_path = OUTPUT_DIR / f"{category}_insights.md"
        with open(md_path, "w") as f:
            f.write(report)
        print(f"  Saved: {md_path}")
    print()
    
    # 3. Generate summary report
    print("Generating complete_insights.md...")
    summary = generate_summary_markdown(all_results, global_stats)
    summary_path = OUTPUT_DIR / "complete_insights.md"
    with open(summary_path, "w") as f:
        f.write(summary)
    print(f"  Saved: {summary_path}")
    print()
    
    # 4. Print summary statistics
    print("=" * 60)
    print("ANALYSIS COMPLETE")
    print("=" * 60)
    print()
    print("Files generated:")
    for f in OUTPUT_DIR.glob("*.csv"):
        print(f"  - {f.name}")
    for f in OUTPUT_DIR.glob("*.md"):
        print(f"  - {f.name}")
    print()
    
    # Print top 10 features overall
    all_features = []
    for results in all_results.values():
        all_features.extend(results)
    
    sorted_features = sorted(all_features, key=lambda x: x.impact_score, reverse=True)
    
    print("TOP 10 FEATURES BY IMPACT:")
    print("-" * 60)
    for i, feat in enumerate(sorted_features[:10], 1):
        print(
            f"{i:2}. [{feat.category}] {feat.feature}: "
            f"x{feat.impact_score:.2f} ({feat.max_exit_rate:.1f}% vs {feat.min_exit_rate:.1f}%)"
        )
    print()


def main():
    """Main entry point."""
    try:
        all_results, global_stats = run_all_analyses()
        generate_outputs(all_results, global_stats)
    except Exception as e:
        print(f"ERROR: {e}")
        raise
    finally:
        close_connection()
        print("Connection closed.")


if __name__ == "__main__":
    main()

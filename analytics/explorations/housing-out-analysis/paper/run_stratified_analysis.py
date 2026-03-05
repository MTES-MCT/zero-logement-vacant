#!/usr/bin/env python3
"""
Run stratified housing vacancy exit analysis.

Analyzes all features within sub-populations defined by a stratification variable.
For example: exit rates of all features, split by densite_label.

Usage:
    # Single stratification variable
    python run_stratified_analysis.py --stratify densite_label

    # Multiple stratification variables
    python run_stratified_analysis.py --stratify densite_label action_coeur_de_ville

    # Run all predefined stratification variables
    python run_stratified_analysis.py --all

    # List available stratification variables
    python run_stratified_analysis.py --list

Requires:
    - MOTHERDUCK_TOKEN environment variable (or IDE MCP authentication)
"""

import argparse
import sys
from pathlib import Path
from datetime import datetime

import pandas as pd

from utils import (
    get_global_stats,
    close_connection,
    stratified_results_to_dataframe,
    generate_stratified_markdown_report,
    StratifiedFeatureAnalysisResult,
)
from stratification_config import STRATIFICATION_FEATURES, list_available

import analyze_characteristics
import analyze_geography
import analyze_owners
import analyze_zlv_usage


OUTPUT_DIR = Path(__file__).parent / "outputs"
OUTPUT_DIR.mkdir(exist_ok=True)

CATEGORY_MODULES = {
    "caracteristiques": analyze_characteristics,
    "geographie": analyze_geography,
    "proprietaires": analyze_owners,
    "zlv_usage": analyze_zlv_usage,
}

CATEGORY_TITLES = {
    "caracteristiques": "Caracteristiques",
    "geographie": "Geographie",
    "proprietaires": "Proprietaires",
    "zlv_usage": "ZLV Usage",
}


def run_stratified_analysis(
    stratify_key: str,
    global_stats: dict,
) -> dict[str, list[StratifiedFeatureAnalysisResult]]:
    """Run stratified analysis across all feature categories for one stratification variable."""
    config = STRATIFICATION_FEATURES[stratify_key]
    exit_rate = global_stats["exit_rate_pct"]

    print(f"\n{'=' * 60}")
    print(f"STRATIFICATION: {config.label} ({config.feature})")
    print(f"Table: {config.table}")
    print(f"Type: {config.feature_type}")
    print(f"{'=' * 60}\n")

    all_results: dict[str, list[StratifiedFeatureAnalysisResult]] = {}

    for cat_key, module in CATEGORY_MODULES.items():
        print(f"\n{'-' * 60}")
        print(f"CATEGORY: {CATEGORY_TITLES[cat_key]}")
        print(f"{'-' * 60}")
        try:
            results = module.analyze_all_stratified(exit_rate, config)
            all_results[cat_key] = results
        except Exception as e:
            print(f"  ERROR analyzing {cat_key}: {e}")
            all_results[cat_key] = []

    return all_results


def generate_outputs(
    stratify_key: str,
    all_results: dict[str, list[StratifiedFeatureAnalysisResult]],
    global_stats: dict,
) -> pd.DataFrame:
    """Generate CSV and markdown outputs for one stratification variable."""
    config = STRATIFICATION_FEATURES[stratify_key]

    # Flatten all results
    flat_results: list[StratifiedFeatureAnalysisResult] = []
    for results in all_results.values():
        flat_results.extend(results)

    if not flat_results:
        print(f"  No results for {stratify_key}, skipping outputs.")
        return pd.DataFrame()

    # CSV
    df = stratified_results_to_dataframe(flat_results)

    # Markdown per category
    for cat_key, results in all_results.items():
        if not results:
            continue
        title = f"{CATEGORY_TITLES[cat_key]} - Stratifie par {config.label}"
        report = generate_stratified_markdown_report(
            results=results,
            title=title,
            global_stats=global_stats,
            stratify_feature=config.feature,
        )
        md_path = OUTPUT_DIR / f"stratified_{stratify_key}_{cat_key}.md"
        with open(md_path, "w") as f:
            f.write(report)
        print(f"  Saved: {md_path.name}")

    # Summary markdown (all categories combined)
    title = f"Analyse complete - Stratifie par {config.label}"
    summary = generate_stratified_markdown_report(
        results=flat_results,
        title=title,
        global_stats=global_stats,
        stratify_feature=config.feature,
    )
    summary_path = OUTPUT_DIR / f"stratified_{stratify_key}_complete.md"
    with open(summary_path, "w") as f:
        f.write(summary)
    print(f"  Saved: {summary_path.name}")

    return df


def main():
    parser = argparse.ArgumentParser(
        description="Run stratified housing vacancy exit analysis"
    )
    parser.add_argument(
        "--stratify",
        nargs="+",
        metavar="KEY",
        help="Stratification variable key(s) from stratification_config.py",
    )
    parser.add_argument(
        "--all",
        action="store_true",
        help="Run all predefined stratification variables",
    )
    parser.add_argument(
        "--list",
        action="store_true",
        help="List available stratification variables and exit",
    )
    args = parser.parse_args()

    if args.list:
        list_available()
        return

    if not args.stratify and not args.all:
        parser.print_help()
        print("\nAvailable stratification variables:")
        list_available()
        return

    keys = list(STRATIFICATION_FEATURES.keys()) if args.all else args.stratify

    # Validate keys
    invalid = [k for k in keys if k not in STRATIFICATION_FEATURES]
    if invalid:
        print(f"ERROR: Unknown stratification key(s): {', '.join(invalid)}")
        print("Available keys:")
        list_available()
        sys.exit(1)

    print("=" * 60)
    print("STRATIFIED HOUSING VACANCY EXIT ANALYSIS")
    print(f"Started at: {datetime.now().isoformat()}")
    print(f"Stratification variables: {', '.join(keys)}")
    print("=" * 60)

    try:
        global_stats = get_global_stats()
        print(f"\nGlobal stats:")
        print(f"  Total housing: {global_stats['total_housing']:,}")
        print(f"  Housing out: {global_stats['housing_out']:,}")
        print(f"  Exit rate: {global_stats['exit_rate_pct']:.2f}%")

        all_dfs = []

        for key in keys:
            results = run_stratified_analysis(key, global_stats)

            print(f"\nGenerating outputs for {key}...")
            df = generate_outputs(key, results, global_stats)
            if not df.empty:
                all_dfs.append(df)

        # Combined CSV with all stratifications
        if all_dfs:
            combined = pd.concat(all_dfs, ignore_index=True)
            csv_path = OUTPUT_DIR / "features_impact_stratified.csv"
            combined.to_csv(csv_path, index=False)
            print(f"\nCombined CSV: {csv_path}")
            print(f"  Total rows: {len(combined)}")
            print(f"  Stratification variables: {combined['stratify_feature'].nunique()}")
            print(f"  Features analyzed: {combined['feature'].nunique()}")

        print(f"\n{'=' * 60}")
        print("ANALYSIS COMPLETE")
        print(f"Finished at: {datetime.now().isoformat()}")
        print(f"{'=' * 60}")

    except Exception as e:
        print(f"\nERROR: {e}")
        raise
    finally:
        close_connection()
        print("Connection closed.")


if __name__ == "__main__":
    main()

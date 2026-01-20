#!/usr/bin/env python3
"""
RNB (Référentiel National des Bâtiments) CSV Analysis Script

Performs quantitative and qualitative analysis of RNB data with visualizations.
"""

import json
import re
from collections import Counter
from pathlib import Path

import matplotlib.pyplot as plt
import pandas as pd
import numpy as np

# Configuration
CSV_PATH = Path(__file__).parent / "RNB_44.csv"
OUTPUT_DIR = Path(__file__).parent / "analysis_output"
OUTPUT_DIR.mkdir(exist_ok=True)

# Set matplotlib style
plt.style.use('seaborn-v0_8-whitegrid')
plt.rcParams['figure.figsize'] = (12, 8)
plt.rcParams['font.size'] = 10


def load_data(sample_size: int | None = None) -> pd.DataFrame:
    """Load RNB CSV data."""
    print(f"Loading data from {CSV_PATH}...")

    df = pd.read_csv(
        CSV_PATH,
        sep=';',
        nrows=sample_size,
        dtype={
            'rnb_id': str,
            'point': str,
            'shape': str,
            'status': str,
            'ext_ids': str,
            'addresses': str,
            'plots': str
        }
    )

    print(f"Loaded {len(df):,} rows")
    return df


def extract_coordinates(point_str: str) -> tuple[float, float] | None:
    """Extract longitude, latitude from SRID=4326;POINT(...) string."""
    if pd.isna(point_str):
        return None

    match = re.search(r'POINT\(([-\d.]+)\s+([-\d.]+)\)', point_str)
    if match:
        lon, lat = float(match.group(1)), float(match.group(2))
        return (lon, lat)
    return None


def parse_json_field(value: str) -> list | None:
    """Parse JSON array field."""
    if pd.isna(value) or value == '[]':
        return []
    try:
        return json.loads(value)
    except (json.JSONDecodeError, TypeError):
        return None


def analyze_quantitative(df: pd.DataFrame) -> dict:
    """Perform quantitative analysis."""
    print("\n" + "="*60)
    print("QUANTITATIVE ANALYSIS")
    print("="*60)

    stats = {
        'total_rows': len(df),
        'unique_rnb_ids': df['rnb_id'].nunique(),
        'status_counts': df['status'].value_counts().to_dict(),
    }

    # Missing values
    missing = df.isnull().sum()
    stats['missing_values'] = missing.to_dict()

    print(f"\nTotal buildings: {stats['total_rows']:,}")
    print(f"Unique RNB IDs: {stats['unique_rnb_ids']:,}")
    print(f"Duplicates: {stats['total_rows'] - stats['unique_rnb_ids']:,}")

    print("\nMissing values per column:")
    for col, count in stats['missing_values'].items():
        pct = (count / len(df)) * 100
        print(f"  {col}: {count:,} ({pct:.2f}%)")

    print("\nStatus distribution:")
    for status, count in stats['status_counts'].items():
        pct = (count / len(df)) * 100
        print(f"  {status}: {count:,} ({pct:.2f}%)")

    return stats


def analyze_qualitative(df: pd.DataFrame) -> dict:
    """Perform qualitative analysis on JSON fields."""
    print("\n" + "="*60)
    print("QUALITATIVE ANALYSIS")
    print("="*60)

    # Analyze ext_ids (external sources)
    print("\nAnalyzing external IDs sources...")
    source_counts = Counter()
    ext_ids_count = []

    for ext_ids_str in df['ext_ids'].dropna():
        ext_ids = parse_json_field(ext_ids_str)
        if ext_ids:
            ext_ids_count.append(len(ext_ids))
            for item in ext_ids:
                if isinstance(item, dict) and 'source' in item:
                    source_counts[item['source']] += 1

    print(f"\nExternal ID sources:")
    for source, count in source_counts.most_common():
        print(f"  {source}: {count:,}")

    # Analyze addresses
    print("\nAnalyzing addresses...")
    has_address = df['addresses'].apply(lambda x: x != '[]' and pd.notna(x)).sum()
    no_address = len(df) - has_address
    print(f"  With address: {has_address:,} ({has_address/len(df)*100:.2f}%)")
    print(f"  Without address: {no_address:,} ({no_address/len(df)*100:.2f}%)")

    # Extract city names from addresses
    city_counts = Counter()
    for addr_str in df['addresses'].dropna():
        if addr_str == '[]':
            continue
        addresses = parse_json_field(addr_str)
        if addresses:
            for addr in addresses:
                if isinstance(addr, dict) and 'city_name' in addr:
                    city_name = addr['city_name']
                    if city_name:
                        city_counts[city_name] += 1

    print(f"\nTop 15 cities by building count:")
    for city, count in city_counts.most_common(15):
        print(f"  {city}: {count:,}")

    # Analyze plots (cadastral references)
    print("\nAnalyzing cadastral plots...")
    plots_count = []
    for plots_str in df['plots'].dropna():
        plots = parse_json_field(plots_str)
        if plots:
            plots_count.append(len(plots))

    if plots_count:
        print(f"  Average plots per building: {np.mean(plots_count):.2f}")
        print(f"  Max plots per building: {max(plots_count)}")
        print(f"  Buildings on single plot: {sum(1 for x in plots_count if x == 1):,}")
        print(f"  Buildings on multiple plots: {sum(1 for x in plots_count if x > 1):,}")

    return {
        'source_counts': dict(source_counts),
        'city_counts': dict(city_counts.most_common(50)),
        'has_address': has_address,
        'no_address': no_address,
        'ext_ids_count': ext_ids_count,
        'plots_count': plots_count
    }


def create_visualizations(df: pd.DataFrame, quant_stats: dict, qual_stats: dict):
    """Create all visualizations."""
    print("\n" + "="*60)
    print("CREATING VISUALIZATIONS")
    print("="*60)

    # 1. Status distribution pie chart
    print("\n1. Status distribution pie chart...")
    fig, ax = plt.subplots(figsize=(10, 8))
    status_data = quant_stats['status_counts']
    colors = plt.cm.Set3(np.linspace(0, 1, len(status_data)))

    wedges, texts, autotexts = ax.pie(
        status_data.values(),
        labels=status_data.keys(),
        autopct='%1.1f%%',
        colors=colors,
        explode=[0.02] * len(status_data)
    )
    ax.set_title('Distribution des statuts de bâtiments RNB\n(Loire-Atlantique)', fontsize=14, fontweight='bold')
    plt.tight_layout()
    plt.savefig(OUTPUT_DIR / '01_status_pie_chart.png', dpi=150, bbox_inches='tight')
    plt.close()

    # 2. External sources bar chart
    print("2. External sources bar chart...")
    fig, ax = plt.subplots(figsize=(10, 6))
    sources = qual_stats['source_counts']
    ax.barh(list(sources.keys()), list(sources.values()), color='steelblue')
    ax.set_xlabel('Nombre de bâtiments')
    ax.set_title('Sources de données externes par bâtiment', fontsize=14, fontweight='bold')
    for i, (source, count) in enumerate(sources.items()):
        ax.text(count + max(sources.values()) * 0.01, i, f'{count:,}', va='center')
    plt.tight_layout()
    plt.savefig(OUTPUT_DIR / '02_sources_bar_chart.png', dpi=150, bbox_inches='tight')
    plt.close()

    # 3. Address coverage pie chart
    print("3. Address coverage pie chart...")
    fig, ax = plt.subplots(figsize=(8, 8))
    address_data = {
        'Avec adresse': qual_stats['has_address'],
        'Sans adresse': qual_stats['no_address']
    }
    colors = ['#2ecc71', '#e74c3c']
    ax.pie(
        address_data.values(),
        labels=address_data.keys(),
        autopct='%1.1f%%',
        colors=colors,
        explode=[0.02, 0.02],
        startangle=90
    )
    ax.set_title('Couverture des adresses\n(bâtiments avec/sans adresse)', fontsize=14, fontweight='bold')
    plt.tight_layout()
    plt.savefig(OUTPUT_DIR / '03_address_coverage.png', dpi=150, bbox_inches='tight')
    plt.close()

    # 4. Top cities bar chart
    print("4. Top cities bar chart...")
    fig, ax = plt.subplots(figsize=(12, 8))
    city_data = dict(list(qual_stats['city_counts'].items())[:20])
    y_pos = np.arange(len(city_data))
    ax.barh(y_pos, list(city_data.values()), color='coral')
    ax.set_yticks(y_pos)
    ax.set_yticklabels(city_data.keys())
    ax.invert_yaxis()
    ax.set_xlabel('Nombre de bâtiments')
    ax.set_title('Top 20 des communes par nombre de bâtiments', fontsize=14, fontweight='bold')
    for i, count in enumerate(city_data.values()):
        ax.text(count + max(city_data.values()) * 0.01, i, f'{count:,}', va='center')
    plt.tight_layout()
    plt.savefig(OUTPUT_DIR / '04_top_cities.png', dpi=150, bbox_inches='tight')
    plt.close()

    # 5. Plots per building histogram
    print("5. Plots per building histogram...")
    if qual_stats['plots_count']:
        fig, ax = plt.subplots(figsize=(10, 6))
        plots_data = qual_stats['plots_count']
        ax.hist(plots_data, bins=range(1, min(max(plots_data) + 2, 12)),
                edgecolor='black', color='mediumpurple', align='left')
        ax.set_xlabel('Nombre de parcelles cadastrales')
        ax.set_ylabel('Nombre de bâtiments')
        ax.set_title('Distribution du nombre de parcelles par bâtiment', fontsize=14, fontweight='bold')
        ax.set_xticks(range(1, min(max(plots_data) + 1, 11)))
        plt.tight_layout()
        plt.savefig(OUTPUT_DIR / '05_plots_histogram.png', dpi=150, bbox_inches='tight')
        plt.close()

    # 6. External IDs count histogram
    print("6. External IDs count histogram...")
    if qual_stats['ext_ids_count']:
        fig, ax = plt.subplots(figsize=(10, 6))
        ext_data = qual_stats['ext_ids_count']
        ax.hist(ext_data, bins=range(1, min(max(ext_data) + 2, 8)),
                edgecolor='black', color='teal', align='left')
        ax.set_xlabel('Nombre de références externes')
        ax.set_ylabel('Nombre de bâtiments')
        ax.set_title('Distribution du nombre de références externes par bâtiment', fontsize=14, fontweight='bold')
        ax.set_xticks(range(1, min(max(ext_data) + 1, 7)))
        plt.tight_layout()
        plt.savefig(OUTPUT_DIR / '06_ext_ids_histogram.png', dpi=150, bbox_inches='tight')
        plt.close()

    # 7. Data completeness summary
    print("7. Data completeness summary...")
    fig, ax = plt.subplots(figsize=(10, 6))
    columns = ['rnb_id', 'point', 'shape', 'status', 'ext_ids', 'addresses', 'plots']
    completeness = []
    for col in columns:
        if col == 'addresses':
            # For addresses, consider '[]' as missing
            complete = (df[col] != '[]') & df[col].notna()
            completeness.append(complete.sum() / len(df) * 100)
        else:
            completeness.append((len(df) - quant_stats['missing_values'].get(col, 0)) / len(df) * 100)

    colors = ['#27ae60' if c > 90 else '#f39c12' if c > 50 else '#e74c3c' for c in completeness]
    bars = ax.bar(columns, completeness, color=colors, edgecolor='black')
    ax.set_ylabel('Complétude (%)')
    ax.set_title('Complétude des données par colonne', fontsize=14, fontweight='bold')
    ax.set_ylim(0, 105)
    ax.axhline(y=100, color='gray', linestyle='--', alpha=0.5)

    for bar, val in zip(bars, completeness):
        ax.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 1,
                f'{val:.1f}%', ha='center', va='bottom', fontsize=9)

    plt.xticks(rotation=45, ha='right')
    plt.tight_layout()
    plt.savefig(OUTPUT_DIR / '07_data_completeness.png', dpi=150, bbox_inches='tight')
    plt.close()

    print(f"\nAll visualizations saved to: {OUTPUT_DIR}")


def create_geographic_visualization(df: pd.DataFrame, sample_size: int = 50000):
    """Create geographic scatter plot of buildings."""
    print("\n8. Geographic distribution map...")

    # Sample data for visualization (full dataset would be too heavy)
    df_sample = df.sample(n=min(sample_size, len(df)), random_state=42)

    # Extract coordinates
    coords = df_sample['point'].apply(extract_coordinates)
    valid_coords = coords.dropna()

    if len(valid_coords) == 0:
        print("  No valid coordinates found, skipping map.")
        return

    lons = [c[0] for c in valid_coords]
    lats = [c[1] for c in valid_coords]

    # Create scatter plot
    fig, ax = plt.subplots(figsize=(12, 10))

    # Get status for coloring
    statuses = df_sample.loc[valid_coords.index, 'status']
    unique_statuses = statuses.unique()
    color_map = {s: plt.cm.tab10(i) for i, s in enumerate(unique_statuses)}
    colors = [color_map[s] for s in statuses]

    scatter = ax.scatter(lons, lats, c=colors, alpha=0.3, s=1)

    # Add legend
    legend_elements = [plt.Line2D([0], [0], marker='o', color='w',
                                   markerfacecolor=color_map[s], markersize=8, label=s)
                       for s in unique_statuses]
    ax.legend(handles=legend_elements, loc='upper right', title='Statut')

    ax.set_xlabel('Longitude')
    ax.set_ylabel('Latitude')
    ax.set_title(f'Distribution géographique des bâtiments RNB\n(échantillon de {len(valid_coords):,} bâtiments)',
                 fontsize=14, fontweight='bold')
    ax.set_aspect('equal')

    plt.tight_layout()
    plt.savefig(OUTPUT_DIR / '08_geographic_distribution.png', dpi=150, bbox_inches='tight')
    plt.close()
    print(f"  Map created with {len(valid_coords):,} points")


def generate_report(quant_stats: dict, qual_stats: dict):
    """Generate markdown report."""
    report = f"""# Analyse RNB - Loire-Atlantique (44)

## Résumé

- **Total de bâtiments**: {quant_stats['total_rows']:,}
- **IDs RNB uniques**: {quant_stats['unique_rnb_ids']:,}
- **Doublons potentiels**: {quant_stats['total_rows'] - quant_stats['unique_rnb_ids']:,}

## Distribution des statuts

| Statut | Nombre | Pourcentage |
|--------|--------|-------------|
"""
    for status, count in quant_stats['status_counts'].items():
        pct = count / quant_stats['total_rows'] * 100
        report += f"| {status} | {count:,} | {pct:.2f}% |\n"

    report += f"""
## Couverture des données

### Adresses
- Bâtiments avec adresse: {qual_stats['has_address']:,} ({qual_stats['has_address']/quant_stats['total_rows']*100:.2f}%)
- Bâtiments sans adresse: {qual_stats['no_address']:,} ({qual_stats['no_address']/quant_stats['total_rows']*100:.2f}%)

### Sources externes
"""
    for source, count in qual_stats['source_counts'].items():
        report += f"- **{source}**: {count:,} références\n"

    report += f"""
## Top 10 communes

| Commune | Nombre de bâtiments |
|---------|---------------------|
"""
    for city, count in list(qual_stats['city_counts'].items())[:10]:
        report += f"| {city} | {count:,} |\n"

    report += """
## Visualisations générées

1. `01_status_pie_chart.png` - Distribution des statuts
2. `02_sources_bar_chart.png` - Sources de données externes
3. `03_address_coverage.png` - Couverture des adresses
4. `04_top_cities.png` - Top 20 communes
5. `05_plots_histogram.png` - Distribution des parcelles
6. `06_ext_ids_histogram.png` - Distribution des références externes
7. `07_data_completeness.png` - Complétude des données
8. `08_geographic_distribution.png` - Carte de distribution

---
*Rapport généré automatiquement*
"""

    report_path = OUTPUT_DIR / 'ANALYSIS_REPORT.md'
    report_path.write_text(report)
    print(f"\nReport saved to: {report_path}")


def main():
    """Main analysis function."""
    print("="*60)
    print("RNB DATA ANALYSIS - Loire-Atlantique (44)")
    print("="*60)

    # Load data
    df = load_data()

    # Quantitative analysis
    quant_stats = analyze_quantitative(df)

    # Qualitative analysis
    qual_stats = analyze_qualitative(df)

    # Create visualizations
    create_visualizations(df, quant_stats, qual_stats)

    # Geographic visualization
    create_geographic_visualization(df)

    # Generate report
    generate_report(quant_stats, qual_stats)

    print("\n" + "="*60)
    print("ANALYSIS COMPLETE")
    print("="*60)
    print(f"\nResults saved in: {OUTPUT_DIR}")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
Exploratory Data Analysis (EDA) for the `localities_geo_code` column of the
`establishments` table **before** performing destructive updates.

The script connects to PostgreSQL (default local connection) and produces:

1. **Summary statistics** for the number of elements per row (array length):
   total rows, NULL rows, empty‐array rows, mean, median, min, max, quartiles.
2. A **histogram** of array lengths with a fitted normal curve overlay.
3. A **box‑and‑whisker** plot (a.k.a. moustache plot) for quick dispersion view.

Outputs:
  • A CSV file `localities_eda_stats.csv` with the numeric summary.
  • Two PNG images: `histogram_elements.png` and `boxplot_elements.png`.

Example invocation (default connection):

    python eda_localities.py

With a custom connection:

    python eda_localities.py -c postgresql://user:pass@host:5432/dbname

Dependencies
------------
```
pip install psycopg[binary] pandas matplotlib scipy
```
"""

from __future__ import annotations

import argparse
import statistics as stats
from pathlib import Path
from typing import Any

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import psycopg
from scipy.stats import norm

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
DEFAULT_CONN = "dbname=isoprod user=postgres password=postgres host=localhost"
OUT_DIR = Path("eda_output")
OUT_DIR.mkdir(exist_ok=True)

# ---------------------------------------------------------------------------
# Data acquisition
# ---------------------------------------------------------------------------

def fetch_array_lengths(conn_str: str) -> pd.Series:
    """Return a pandas Series with one entry per row: array length or NaN/0."""

    query = """
        SELECT
            id::text AS id,
            localities_geo_code,
            cardinality(localities_geo_code) AS n_elements
        FROM establishments
    """

    with psycopg.connect(conn_str) as conn:
        with conn.cursor() as cur:
            cur.execute(query)
            rows = cur.fetchall()

    df = pd.DataFrame(rows, columns=["id", "localities_geo_code", "n_elements"])
    return df["n_elements"].astype("Int64")  # keeps NA as <NA>, not float NaN

# ---------------------------------------------------------------------------
# EDA helpers
# ---------------------------------------------------------------------------

def compute_summary(series: pd.Series) -> dict[str, Any]:
    """Compute basic statistics on the Series of array lengths."""

    clean = series.fillna(0)  # Treat NULL as 0 for statistics where needed
    data = clean.to_numpy()

    total = len(series)
    nulls = series.isna().sum()
    empties = (series == 0).sum() - nulls  # True empty arrays ({}), not NULL

    descriptive = {
        "total_rows": total,
        "null_rows": nulls,
        "empty_arrays": empties,
        "mean": clean.mean(),
        "median": clean.median(),
        "min": clean.min(),
        "max": clean.max(),
        "q1": clean.quantile(0.25),
        "q3": clean.quantile(0.75),
        "std": clean.std(),
    }
    return descriptive


def save_summary_csv(stats_dict: dict[str, Any], path: Path) -> None:
    pd.DataFrame([stats_dict]).to_csv(path, index=False)


# ---------------------------------------------------------------------------
# Plotting
# ---------------------------------------------------------------------------

def plot_histogram(series: pd.Series, path: Path) -> None:
    """Save a histogram with a normal PDF overlay."""

    data = series.fillna(0).to_numpy()
    fig, ax = plt.subplots()
    # Histogram density=True to plot as probability density
    ax.hist(data, bins="auto", density=True, alpha=0.7, label="Data")

    # Fit a normal distribution and overlay
    mu, sigma = norm.fit(data)
    x = np.linspace(data.min(), data.max(), 100)
    ax.plot(x, norm.pdf(x, mu, sigma), lw=2, label=f"Normal PDF\nμ={mu:.2f}, σ={sigma:.2f}")

    ax.set_title("Distribution of number of elements per row")
    ax.set_xlabel("Array length")
    ax.set_ylabel("Density")
    ax.legend()

    fig.tight_layout()
    fig.savefig(path)
    plt.close(fig)


def plot_boxplot(series: pd.Series, path: Path) -> None:
    """Save a box‑and‑whisker plot for the array lengths."""

    data = series.fillna(0).to_numpy()
    fig, ax = plt.subplots()
    ax.boxplot(data, vert=False, showfliers=True, meanline=True)
    ax.set_title("Boxplot of array lengths")
    ax.set_xlabel("Array length")

    fig.tight_layout()
    fig.savefig(path)
    plt.close(fig)

# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def make_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        description=(
            "Generate an exploratory snapshot of 'localities_geo_code' before "
            "bulk update/overwrite operations. Produces stats + plots."
        )
    )
    p.add_argument(
        "-c",
        "--conn",
        default=DEFAULT_CONN,
        help="PostgreSQL DSN/URI (default: local instance)",
    )
    p.add_argument(
        "-o",
        "--out-dir",
        type=Path,
        default=OUT_DIR,
        help="Output directory for stats CSV and plots",
    )
    return p


def main(argv: list[str] | None = None) -> None:  # pragma: no cover
    parser = make_parser()
    args = parser.parse_args(argv)

    series = fetch_array_lengths(args.conn)

    # ---- Stats
    summary = compute_summary(series)
    stats_csv = args.out_dir / "localities_eda_stats.csv"
    save_summary_csv(summary, stats_csv)
    print(f"Statistics saved to {stats_csv}")

    # ---- Plots
    hist_path = args.out_dir / "histogram_elements.png"
    plot_histogram(series, hist_path)
    print(f"Histogram saved to {hist_path}")

    box_path = args.out_dir / "boxplot_elements.png"
    plot_boxplot(series, box_path)
    print(f"Boxplot saved to {box_path}")


if __name__ == "__main__":
    main()

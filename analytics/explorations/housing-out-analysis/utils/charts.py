"""
Visualization Utilities for Housing Out Analysis
Provides helper functions for creating consistent, beautiful charts.
"""

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from typing import Optional, List, Tuple, Dict, Any
import warnings

warnings.filterwarnings('ignore')

# Import colors from connection module
from .connection import Colors

# Configure matplotlib defaults
plt.style.use('seaborn-v0_8-whitegrid')
plt.rcParams.update({
    'figure.figsize': (12, 8),
    'font.size': 11,
    'axes.titlesize': 14,
    'axes.labelsize': 12,
    'axes.titleweight': 'bold',
    'figure.titlesize': 16,
    'figure.titleweight': 'bold',
    'legend.fontsize': 10,
    'xtick.labelsize': 10,
    'ytick.labelsize': 10,
})

# Configure seaborn
sns.set_palette(Colors.CATEGORICAL)


def format_number(x: float, suffix: str = "") -> str:
    """Format large numbers with K, M suffixes."""
    if abs(x) >= 1_000_000:
        return f"{x/1_000_000:.1f}M{suffix}"
    elif abs(x) >= 1_000:
        return f"{x/1_000:.1f}K{suffix}"
    else:
        return f"{x:.0f}{suffix}"


def format_pct(x: float) -> str:
    """Format percentage with one decimal."""
    return f"{x:.1f}%"


def cohort_pie_chart(
    housing_out: int,
    still_vacant: int,
    title: str = "Répartition des Logements",
    figsize: Tuple[int, int] = (10, 8)
) -> plt.Figure:
    """
    Create a pie chart showing cohort distribution.
    
    Args:
        housing_out: Count of housing that exited vacancy
        still_vacant: Count of housing still vacant
        title: Chart title
        figsize: Figure size
        
    Returns:
        matplotlib Figure
    """
    fig, ax = plt.subplots(figsize=figsize)
    
    labels = ['Sortis de la vacance', 'Toujours vacants']
    sizes = [housing_out, still_vacant]
    colors = [Colors.HOUSING_OUT, Colors.STILL_VACANT]
    explode = (0.03, 0)
    
    wedges, texts, autotexts = ax.pie(
        sizes, 
        labels=labels, 
        colors=colors, 
        explode=explode,
        autopct='%1.1f%%', 
        startangle=90,
        textprops={'fontsize': 12, 'fontweight': 'bold'}
    )
    
    # Add counts as annotations
    for i, (wedge, size) in enumerate(zip(wedges, sizes)):
        angle = (wedge.theta2 - wedge.theta1) / 2 + wedge.theta1
        x = np.cos(np.deg2rad(angle)) * 0.6
        y = np.sin(np.deg2rad(angle)) * 0.6
        ax.annotate(
            format_number(size),
            xy=(x, y),
            ha='center',
            va='center',
            fontsize=11,
            color='white',
            fontweight='bold'
        )
    
    ax.set_title(title, fontweight='bold', pad=20, fontsize=14)
    
    plt.tight_layout()
    return fig


def exit_rate_bar_chart(
    df: pd.DataFrame,
    category_col: str,
    exit_rate_col: str = 'exit_rate',
    count_col: Optional[str] = None,
    title: str = "Taux de Sortie par Catégorie",
    xlabel: str = "Catégorie",
    reference_rate: Optional[float] = None,
    figsize: Tuple[int, int] = (12, 6),
    horizontal: bool = False,
    color_by_rate: bool = True
) -> plt.Figure:
    """
    Create a bar chart showing exit rates by category.
    
    Args:
        df: DataFrame with data
        category_col: Column name for categories
        exit_rate_col: Column name for exit rates
        count_col: Optional column for counts (shown as annotations)
        title: Chart title
        xlabel: X-axis label
        reference_rate: Optional reference rate to show as horizontal line
        figsize: Figure size
        horizontal: If True, create horizontal bars
        color_by_rate: If True, color bars by exit rate (green=high, red=low)
        
    Returns:
        matplotlib Figure
    """
    fig, ax = plt.subplots(figsize=figsize)
    
    df_sorted = df.sort_values(exit_rate_col, ascending=not horizontal)
    
    if color_by_rate:
        # Color gradient based on exit rate
        norm = plt.Normalize(df_sorted[exit_rate_col].min(), df_sorted[exit_rate_col].max())
        colors = plt.cm.RdYlGn(norm(df_sorted[exit_rate_col]))
    else:
        colors = Colors.REFERENCE
    
    if horizontal:
        bars = ax.barh(df_sorted[category_col], df_sorted[exit_rate_col], color=colors)
        ax.set_xlabel("Taux de sortie (%)", fontweight='bold')
        ax.set_ylabel(xlabel, fontweight='bold')
        
        # Add value labels
        for bar, rate in zip(bars, df_sorted[exit_rate_col]):
            ax.text(bar.get_width() + 0.5, bar.get_y() + bar.get_height()/2,
                   f'{rate:.1f}%', va='center', fontsize=10)
        
        if reference_rate:
            ax.axvline(x=reference_rate, color=Colors.REFERENCE, linestyle='--', 
                      linewidth=2, label=f'Moyenne: {reference_rate:.1f}%')
    else:
        bars = ax.bar(df_sorted[category_col], df_sorted[exit_rate_col], color=colors)
        ax.set_ylabel("Taux de sortie (%)", fontweight='bold')
        ax.set_xlabel(xlabel, fontweight='bold')
        
        # Add value labels
        for bar, rate in zip(bars, df_sorted[exit_rate_col]):
            ax.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.5,
                   f'{rate:.1f}%', ha='center', va='bottom', fontsize=10)
        
        if reference_rate:
            ax.axhline(y=reference_rate, color=Colors.REFERENCE, linestyle='--', 
                      linewidth=2, label=f'Moyenne: {reference_rate:.1f}%')
        
        plt.xticks(rotation=45, ha='right')
    
    ax.set_title(title, fontweight='bold', pad=15)
    
    if reference_rate:
        ax.legend(loc='best')
    
    plt.tight_layout()
    return fig


def comparison_bar_chart(
    df: pd.DataFrame,
    category_col: str,
    value1_col: str,
    value2_col: str,
    label1: str = "Sortis",
    label2: str = "Toujours vacants",
    title: str = "Comparaison par Catégorie",
    xlabel: str = "Catégorie",
    ylabel: str = "Nombre de logements",
    figsize: Tuple[int, int] = (12, 6),
    show_totals: bool = True
) -> plt.Figure:
    """
    Create a grouped bar chart comparing two values by category.
    """
    fig, ax = plt.subplots(figsize=figsize)
    
    x = np.arange(len(df))
    width = 0.35
    
    bars1 = ax.bar(x - width/2, df[value1_col], width, 
                   label=label1, color=Colors.HOUSING_OUT, alpha=0.8)
    bars2 = ax.bar(x + width/2, df[value2_col], width,
                   label=label2, color=Colors.STILL_VACANT, alpha=0.8)
    
    ax.set_ylabel(ylabel, fontweight='bold')
    ax.set_xlabel(xlabel, fontweight='bold')
    ax.set_title(title, fontweight='bold', pad=15)
    ax.set_xticks(x)
    ax.set_xticklabels(df[category_col], rotation=45, ha='right')
    ax.legend()
    
    # Format y-axis with K/M
    ax.yaxis.set_major_formatter(plt.FuncFormatter(lambda x, p: format_number(x)))
    
    plt.tight_layout()
    return fig


def distribution_plot(
    df: pd.DataFrame,
    value_col: str,
    group_col: str = 'is_housing_out',
    title: str = "Distribution",
    xlabel: str = "Valeur",
    figsize: Tuple[int, int] = (12, 6),
    kind: str = 'hist'  # 'hist', 'kde', 'violin', 'box'
) -> plt.Figure:
    """
    Create a distribution plot comparing two groups.
    """
    fig, ax = plt.subplots(figsize=figsize)
    
    colors = {0: Colors.STILL_VACANT, 1: Colors.HOUSING_OUT}
    labels = {0: 'Toujours vacants', 1: 'Sortis de vacance'}
    
    if kind == 'hist':
        for group in [0, 1]:
            data = df[df[group_col] == group][value_col].dropna()
            ax.hist(data, bins=30, alpha=0.6, color=colors[group], 
                   label=labels[group], density=True)
        ax.set_ylabel("Densité", fontweight='bold')
        
    elif kind == 'kde':
        for group in [0, 1]:
            data = df[df[group_col] == group][value_col].dropna()
            sns.kdeplot(data=data, ax=ax, color=colors[group], 
                       label=labels[group], fill=True, alpha=0.3)
        ax.set_ylabel("Densité", fontweight='bold')
        
    elif kind == 'violin':
        df_plot = df[[value_col, group_col]].dropna()
        df_plot['group_label'] = df_plot[group_col].map(labels)
        sns.violinplot(data=df_plot, x='group_label', y=value_col, ax=ax,
                      palette=[Colors.STILL_VACANT, Colors.HOUSING_OUT])
        ax.set_xlabel("")
        
    elif kind == 'box':
        df_plot = df[[value_col, group_col]].dropna()
        df_plot['group_label'] = df_plot[group_col].map(labels)
        sns.boxplot(data=df_plot, x='group_label', y=value_col, ax=ax,
                   palette=[Colors.STILL_VACANT, Colors.HOUSING_OUT])
        ax.set_xlabel("")
    
    ax.set_xlabel(xlabel, fontweight='bold')
    ax.set_title(title, fontweight='bold', pad=15)
    ax.legend()
    
    plt.tight_layout()
    return fig


def heatmap_correlation(
    df: pd.DataFrame,
    columns: Optional[List[str]] = None,
    title: str = "Matrice de Corrélation",
    figsize: Tuple[int, int] = (14, 12),
    annot: bool = True
) -> plt.Figure:
    """
    Create a correlation heatmap.
    """
    fig, ax = plt.subplots(figsize=figsize)
    
    if columns:
        df_corr = df[columns].corr()
    else:
        df_corr = df.select_dtypes(include=[np.number]).corr()
    
    mask = np.triu(np.ones_like(df_corr, dtype=bool))
    
    sns.heatmap(
        df_corr, 
        mask=mask, 
        cmap='RdYlGn', 
        center=0,
        annot=annot, 
        fmt='.2f', 
        square=True,
        linewidths=0.5,
        ax=ax,
        cbar_kws={'shrink': 0.8}
    )
    
    ax.set_title(title, fontweight='bold', pad=20)
    plt.tight_layout()
    return fig


def scatter_with_regression(
    df: pd.DataFrame,
    x_col: str,
    y_col: str,
    hue_col: Optional[str] = None,
    title: str = "Relation entre variables",
    xlabel: Optional[str] = None,
    ylabel: Optional[str] = None,
    figsize: Tuple[int, int] = (12, 8),
    add_regression: bool = True
) -> plt.Figure:
    """
    Create a scatter plot with optional regression line.
    """
    fig, ax = plt.subplots(figsize=figsize)
    
    if hue_col:
        sns.scatterplot(data=df, x=x_col, y=y_col, hue=hue_col, 
                       ax=ax, alpha=0.6, palette=Colors.CATEGORICAL)
    else:
        sns.scatterplot(data=df, x=x_col, y=y_col, ax=ax, 
                       alpha=0.6, color=Colors.REFERENCE)
    
    if add_regression:
        sns.regplot(data=df, x=x_col, y=y_col, ax=ax, 
                   scatter=False, color=Colors.DANGER, line_kws={'linewidth': 2})
    
    ax.set_xlabel(xlabel or x_col, fontweight='bold')
    ax.set_ylabel(ylabel or y_col, fontweight='bold')
    ax.set_title(title, fontweight='bold', pad=15)
    
    plt.tight_layout()
    return fig


def top_bottom_chart(
    df: pd.DataFrame,
    name_col: str,
    value_col: str,
    n: int = 10,
    title: str = "Top et Bottom",
    figsize: Tuple[int, int] = (14, 8)
) -> plt.Figure:
    """
    Create a chart showing top N and bottom N values.
    """
    fig, axes = plt.subplots(1, 2, figsize=figsize)
    
    # Top N
    top_df = df.nlargest(n, value_col)
    colors_top = plt.cm.Greens(np.linspace(0.4, 0.8, n))[::-1]
    axes[0].barh(top_df[name_col], top_df[value_col], color=colors_top)
    axes[0].set_xlabel(value_col, fontweight='bold')
    axes[0].set_title(f'Top {n}', fontweight='bold')
    axes[0].invert_yaxis()
    
    for i, (_, row) in enumerate(top_df.iterrows()):
        axes[0].text(row[value_col] + 0.5, i, f'{row[value_col]:.1f}%', 
                    va='center', fontsize=9)
    
    # Bottom N
    bottom_df = df.nsmallest(n, value_col)
    colors_bottom = plt.cm.Reds(np.linspace(0.4, 0.8, n))
    axes[1].barh(bottom_df[name_col], bottom_df[value_col], color=colors_bottom)
    axes[1].set_xlabel(value_col, fontweight='bold')
    axes[1].set_title(f'Bottom {n}', fontweight='bold')
    axes[1].invert_yaxis()
    
    for i, (_, row) in enumerate(bottom_df.iterrows()):
        axes[1].text(row[value_col] + 0.5, i, f'{row[value_col]:.1f}%', 
                    va='center', fontsize=9)
    
    fig.suptitle(title, fontweight='bold', fontsize=14, y=1.02)
    plt.tight_layout()
    return fig


def summary_metrics_card(
    metrics: Dict[str, Any],
    title: str = "Métriques Clés",
    figsize: Tuple[int, int] = (14, 4)
) -> plt.Figure:
    """
    Create a visual card showing key metrics.
    """
    n_metrics = len(metrics)
    fig, axes = plt.subplots(1, n_metrics, figsize=figsize)
    
    if n_metrics == 1:
        axes = [axes]
    
    colors = [Colors.REFERENCE, Colors.HOUSING_OUT, Colors.STILL_VACANT, 
              Colors.PRIMARY, Colors.SECONDARY]
    
    for i, (ax, (name, value)) in enumerate(zip(axes, metrics.items())):
        ax.set_xlim(0, 1)
        ax.set_ylim(0, 1)
        ax.axis('off')
        
        # Background
        ax.add_patch(plt.Rectangle((0.05, 0.1), 0.9, 0.8, 
                                   facecolor=colors[i % len(colors)], 
                                   alpha=0.1, edgecolor=colors[i % len(colors)],
                                   linewidth=2))
        
        # Value
        if isinstance(value, float):
            value_text = f"{value:,.1f}" if value < 100 else f"{value:,.0f}"
        else:
            value_text = f"{value:,}" if isinstance(value, int) else str(value)
        
        ax.text(0.5, 0.6, value_text, ha='center', va='center', 
               fontsize=24, fontweight='bold', color=colors[i % len(colors)])
        
        # Label
        ax.text(0.5, 0.25, name, ha='center', va='center', 
               fontsize=11, color='gray')
    
    fig.suptitle(title, fontweight='bold', fontsize=14, y=0.98)
    plt.tight_layout()
    return fig


def feature_importance_plot(
    importances: pd.DataFrame,
    feature_col: str = 'feature',
    importance_col: str = 'importance',
    title: str = "Importance des Features",
    top_n: int = 20,
    figsize: Tuple[int, int] = (12, 10)
) -> plt.Figure:
    """
    Create a feature importance plot.
    """
    fig, ax = plt.subplots(figsize=figsize)
    
    df_sorted = importances.nlargest(top_n, importance_col)
    
    colors = plt.cm.viridis(np.linspace(0.3, 0.9, top_n))[::-1]
    
    bars = ax.barh(df_sorted[feature_col], df_sorted[importance_col], color=colors)
    
    ax.set_xlabel("Importance", fontweight='bold')
    ax.set_title(title, fontweight='bold', pad=15)
    ax.invert_yaxis()
    
    # Add value labels
    for bar in bars:
        width = bar.get_width()
        ax.text(width + 0.001, bar.get_y() + bar.get_height()/2,
               f'{width:.3f}', va='center', fontsize=9)
    
    plt.tight_layout()
    return fig
















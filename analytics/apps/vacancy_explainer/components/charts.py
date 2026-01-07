from __future__ import annotations

import numpy as np
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go


def fmt_float(x: float | None) -> str:
    if x is None or (isinstance(x, float) and np.isnan(x)):
        return "—"
    return f"{x:,.3f}".replace(",", " ")


def corr_pair(df: pd.DataFrame, x: str, y: str, method: str) -> float | None:
    sub = df[[x, y]].dropna()
    if len(sub) < 5:
        return None
    return float(sub.corr(method=method).iloc[0, 1])


def is_numeric_series(s: pd.Series) -> bool:
    return pd.api.types.is_numeric_dtype(s)


def make_categorical_view(df: pd.DataFrame, feature: str, max_categories: int = 25) -> pd.DataFrame:
    s = df[feature].astype("string")
    vc = s.value_counts(dropna=True)
    top = set(vc.head(max_categories).index.tolist())
    out = df.copy()
    out[feature] = s.where(s.isin(top), other="Autres")
    out[feature] = out[feature].fillna("NA")
    return out


def add_linear_fit_line(
    fig: go.Figure,
    df: pd.DataFrame,
    *,
    x_col: str,
    y_col: str,
    log_x: bool,
    color: str = "red",
) -> None:
    sub = df[[x_col, y_col]].dropna()
    if len(sub) < 10:
        return

    x = sub[x_col].to_numpy(dtype=float)
    y = sub[y_col].to_numpy(dtype=float)

    if log_x:
        if np.any(x <= 0):
            return
        x_fit = np.log10(x)
        a, b = np.polyfit(x_fit, y, deg=1)
        x_line_fit = np.linspace(x_fit.min(), x_fit.max(), 200)
        x_line = np.power(10.0, x_line_fit)
        y_line = a * x_line_fit + b
    else:
        a, b = np.polyfit(x, y, deg=1)
        x_line = np.linspace(x.min(), x.max(), 200)
        y_line = a * x_line + b

    fig.add_trace(
        go.Scatter(
            x=x_line,
            y=y_line,
            mode="lines",
            name="Régression linéaire",
            line={"color": color, "width": 2},
        )
    )


def plot_corr_heatmap(df: pd.DataFrame, *, title: str = "Corrélations") -> go.Figure:
    corr = df.corr(numeric_only=True)
    fig = px.imshow(
        corr,
        aspect="auto",
        color_continuous_scale="RdBu",
        zmin=-1,
        zmax=1,
        title=title,
    )
    fig.update_layout(height=700)
    return fig


def plot_signed_importance_bar(
    imp_df: pd.DataFrame,
    *,
    feature_col: str = "feature",
    value_col: str = "importance",
    title: str = "Impact des variables",
) -> go.Figure:
    """Horizontal bar chart where negative values are colored in red."""
    d = imp_df.copy()
    d["__color__"] = np.where(d[value_col] < 0, "Impact négatif", "Impact positif")
    color_map = {"Impact négatif": "#d62728", "Impact positif": "#1f77b4"}
    fig = px.bar(
        d,
        x=value_col,
        y=feature_col,
        orientation="h",
        color="__color__",
        color_discrete_map=color_map,
        title=title,
    )
    fig.update_layout(height=600, yaxis={"categoryorder": "total ascending"}, legend_title_text="")
    return fig



from __future__ import annotations

# Copied from former `1_cities_explorer.py` (renamed for nicer French sidebar label)

import pandas as pd
import plotly.express as px
import streamlit as st

from components.charts import (
    add_linear_fit_line,
    corr_pair,
    fmt_float,
    is_numeric_series,
    make_categorical_view,
)
from components.filters import render_city_filters
from data.connection import LOCAL_CITIES_TABLE, get_local_con
from data.schemas import list_columns, unique_preserve_order


TARGET = "exit_rate_pct"
ID_COLS = ["geo_code", "commune_name"]


@st.cache_data(ttl=60 * 60)
def _get_city_columns() -> list[str]:
    con = get_local_con()
    cols = list_columns(con, LOCAL_CITIES_TABLE)
    return [c.name for c in cols]


@st.cache_data(ttl=60 * 60)
def _get_city_feature_lists() -> tuple[list[str], list[str]]:
    con = get_local_con()
    cols = list_columns(con, LOCAL_CITIES_TABLE)
    numeric = [c.name for c in cols if c.kind == "numeric" and c.name not in set(ID_COLS + [TARGET])]
    categorical = [c.name for c in cols if c.kind == "categorical" and c.name not in set(ID_COLS + [TARGET])]
    numeric = [c for c in numeric if not c.endswith("_grid") and not c.endswith("_label")]
    categorical = [c for c in categorical if not c.endswith("_grid") and not c.endswith("_label")]
    return numeric, categorical


@st.cache_data(ttl=60 * 60)
def _distinct_values(col: str) -> list[str]:
    con = get_local_con()
    df = con.execute(f"SELECT DISTINCT {col} AS v FROM {LOCAL_CITIES_TABLE} WHERE {col} IS NOT NULL").df()
    out = [str(v) for v in df["v"].tolist() if v is not None]
    return sorted(set(out))


def _build_city_where(filters) -> tuple[str, list]:
    where = ["1=1"]
    params: list = []
    if filters.exit_rate_max is not None:
        where.append("exit_rate_pct <= ?")
        params.append(float(filters.exit_rate_max))
    if filters.total_housing_min is not None:
        where.append("total_housing_count >= ?")
        params.append(int(filters.total_housing_min))
    if filters.densite_category:
        where.append("densite_category = ?")
        params.append(filters.densite_category)
    if filters.pop_min is not None:
        where.append("population_2021 >= ?")
        params.append(int(filters.pop_min))
    if filters.pop_max is not None:
        where.append("population_2021 <= ?")
        params.append(int(filters.pop_max))
    if filters.departments:
        placeholders = ",".join(["?"] * len(filters.departments))
        where.append(f"substr(geo_code, 1, 2) IN ({placeholders})")
        params.extend(list(filters.departments))
    return " AND ".join(where), params


@st.cache_data(ttl=10 * 60)
def load_cities_df(*, cols: list[str], filters) -> pd.DataFrame:
    con = get_local_con()
    where_sql, params = _build_city_where(filters)
    select_sql = ", ".join(cols)
    q = f"SELECT {select_sql} FROM {LOCAL_CITIES_TABLE} WHERE {where_sql}"
    return con.execute(q, params).df()


st.title("Communes — Explorer une feature")
st.caption("Explore les relations entre indicateurs communaux et `exit_rate_pct` (cache DuckDB local).")

with st.sidebar:
    densites = _distinct_values("densite_category") if "densite_category" in _get_city_columns() else []
    filters = render_city_filters(densite_options=densites)
    max_points = st.slider("Échantillon max (points sur graphiques)", min_value=1_000, max_value=34_000, value=20_000, step=1_000)

numeric_features, categorical_features = _get_city_feature_lists()
if not (numeric_features or categorical_features):
    st.error("Aucune feature disponible (table vide ou schema introuvable).")
    st.stop()

feature_type = st.radio("Type de feature", options=["Numérique", "Catégorielle"], horizontal=True)
if feature_type == "Numérique":
    st.caption("Une feature numérique permet corrélations + scatter.")
    default_feature = "niveau_loyer" if "niveau_loyer" in numeric_features else numeric_features[0]
    feature = st.selectbox("Feature numérique", options=numeric_features, index=numeric_features.index(default_feature))
else:
    st.caption("Une feature catégorielle permet comparaisons par catégories.")
    feature = st.selectbox("Feature catégorielle", options=categorical_features, index=0)

select_cols = unique_preserve_order([*ID_COLS, TARGET, "total_housing_count", "densite_category", "population_2021", feature])
select_cols = [c for c in select_cols if c in _get_city_columns()]

df = load_cities_df(cols=select_cols, filters=filters).dropna(subset=[TARGET])
if df.empty:
    st.warning("Aucune donnée avec ces filtres.")
    st.stop()

st.caption(f"{len(df):,} lignes (après filtres).".replace(",", " "))

if len(df) > max_points:
    df_plot = df.sample(n=max_points, random_state=42)
    st.caption(f"Graphiques: échantillon de {len(df_plot):,} lignes.".replace(",", " "))
else:
    df_plot = df

st.subheader("Distribution de exit_rate_pct (dans le filtre)")
hist = px.histogram(df_plot, x=TARGET, nbins=30)
hist.update_layout(height=260)
st.plotly_chart(hist, width="stretch")

if feature in df.columns and is_numeric_series(df[feature]):
    col1, col2 = st.columns([2, 1])
    with col2:
        log_x = st.checkbox("Échelle log (x)", value=False)
        if log_x and (df_plot[feature].dropna() <= 0).any():
            st.info("Certaines valeurs <= 0: log désactivé.")
            log_x = False
        show_fit = st.checkbox("Afficher une droite de régression", value=True)

        pearson = corr_pair(df, feature, TARGET, "pearson")
        spearman = corr_pair(df, feature, TARGET, "spearman")
        st.metric("Corr. Pearson", fmt_float(pearson))
        st.metric("Corr. Spearman", fmt_float(spearman))

    with col1:
        fig = px.scatter(
            df_plot,
            x=feature,
            y=TARGET,
            hover_data=[c for c in ID_COLS + ["total_housing_count", "densite_category"] if c in df_plot.columns],
            opacity=0.7,
        )
        fig.update_layout(height=520)
        if log_x:
            fig.update_xaxes(type="log")
        if show_fit:
            add_linear_fit_line(fig, df_plot, x_col=feature, y_col=TARGET, log_x=log_x)
        st.plotly_chart(fig, width="stretch")

    st.subheader("exit_rate_pct moyen par tranche de feature (déciles)")
    sub = df[[feature, TARGET]].dropna()
    if len(sub) >= 30:
        try:
            bins = pd.qcut(sub[feature], q=10, duplicates="drop")
            agg = (
                sub.assign(_bin=bins)
                .groupby("_bin", observed=True)
                .agg(mean_exit=(TARGET, "mean"), count=(TARGET, "size"))
                .reset_index()
            )
            agg["_bin"] = agg["_bin"].astype("string")
            fig2 = px.bar(agg, x="_bin", y="mean_exit", hover_data=["count"])
            fig2.update_layout(height=320, xaxis_title="Déciles de feature", yaxis_title="exit_rate_pct moyen")
            st.plotly_chart(fig2, width="stretch")
        except Exception:
            st.caption("Impossible de calculer les déciles (trop peu de variance).")
else:
    view = make_categorical_view(df_plot, feature, max_categories=25)
    fig = px.box(view, x=feature, y=TARGET, points="outliers")
    fig.update_layout(height=520)
    st.plotly_chart(fig, width="stretch")

    st.subheader("exit_rate_pct moyen par catégorie (Top 25)")
    means = (
        make_categorical_view(df, feature, max_categories=25)
        .groupby(feature, dropna=False)[TARGET]
        .agg(["mean", "count"])
        .reset_index()
        .sort_values(["count", "mean"], ascending=[False, True])
        .head(25)
    )
    fig3 = px.bar(means, x=feature, y="mean", hover_data=["count"])
    fig3.update_layout(height=320, yaxis_title="exit_rate_pct moyen")
    st.plotly_chart(fig3, width="stretch")

st.subheader("Communes: plus faibles / plus fortes sorties (dans le filtre)")
show_cols = unique_preserve_order([c for c in [*ID_COLS, TARGET, feature, "total_housing_count", "densite_category", "population_2021"] if c in df.columns])
low = df.sort_values(TARGET, ascending=True).head(10)[show_cols]
high = df.sort_values(TARGET, ascending=False).head(10)[show_cols]

c1, c2 = st.columns(2)
with c1:
    st.caption("Les plus faibles")
    st.dataframe(low, use_container_width=True, hide_index=True)
with c2:
    st.caption("Les plus fortes")
    st.dataframe(high, use_container_width=True, hide_index=True)



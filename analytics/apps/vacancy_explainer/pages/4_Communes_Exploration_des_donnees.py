from __future__ import annotations

# Copied from former `4_cities_data.py` (renamed for nicer French sidebar label)

import numpy as np
import pandas as pd
import plotly.express as px
import plotly.figure_factory as ff
import streamlit as st
from sklearn.preprocessing import StandardScaler

from components.charts import plot_corr_heatmap
from components.filters import render_city_filters
from data.connection import LOCAL_CITIES_TABLE, get_local_con
from data.schemas import list_columns


TARGET = "exit_rate_pct"
ID_COLS = ["geo_code", "commune_name"]


@st.cache_data(ttl=60 * 60)
def _distinct_values(col: str) -> list[str]:
    con = get_local_con()
    df = con.execute(f"SELECT DISTINCT {col} AS v FROM {LOCAL_CITIES_TABLE} WHERE {col} IS NOT NULL").df()
    out = [str(v) for v in df["v"].tolist() if v is not None]
    return sorted(set(out))


def _build_where(filters) -> tuple[str, list]:
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
def load_numeric_df(*, numeric_cols: list[str], filters) -> pd.DataFrame:
    con = get_local_con()
    where_sql, params = _build_where(filters)
    cols = [TARGET, *numeric_cols]
    select_sql = ", ".join(cols)
    q = f"SELECT {select_sql} FROM {LOCAL_CITIES_TABLE} WHERE {where_sql}"
    df = con.execute(q, params).df()
    return df.dropna(subset=[TARGET])


@st.cache_data(ttl=10 * 60)
def load_dendro_df(*, cols: list[str], filters, limit: int) -> pd.DataFrame:
    con = get_local_con()
    where_sql, params = _build_where(filters)
    select_sql = ", ".join(cols)
    q = f"SELECT {select_sql} FROM {LOCAL_CITIES_TABLE} WHERE {where_sql} ORDER BY random() LIMIT {int(limit)}"
    return con.execute(q, params).df()


@st.cache_data(ttl=10 * 60)
def load_missingness(*, cols: list[str], filters) -> pd.DataFrame:
    con = get_local_con()
    where_sql, params = _build_where(filters)
    exprs = ",\n".join([f"SUM(CASE WHEN {c} IS NULL THEN 1 ELSE 0 END) AS {c}" for c in cols])
    q = f"SELECT COUNT(*)::BIGINT AS n,\n{exprs}\nFROM {LOCAL_CITIES_TABLE}\nWHERE {where_sql}"
    row = con.execute(q, params).df().iloc[0].to_dict()
    n = int(row.pop("n"))
    out = []
    for c, nulls in row.items():
        nulls_i = int(nulls)
        out.append({"column": c, "nulls": nulls_i, "null_pct": (nulls_i / n) if n else np.nan})
    return pd.DataFrame(out).sort_values("null_pct", ascending=False)


@st.cache_data(ttl=10 * 60)
def load_by_department(*, filters) -> pd.DataFrame:
    con = get_local_con()
    where_sql, params = _build_where(filters)
    q = f"""
    SELECT
      substr(geo_code, 1, 2) AS dept,
      COUNT(*)::BIGINT AS n_cities,
      AVG(exit_rate_pct) AS avg_exit_rate_pct,
      SUM(total_housing_count)::BIGINT AS total_vacant_housing
    FROM {LOCAL_CITIES_TABLE}
    WHERE {where_sql}
    GROUP BY 1
    ORDER BY n_cities DESC
    """
    return con.execute(q, params).df()


st.title("Communes — Exploration des données")
st.caption("Corrélations, valeurs manquantes, outliers, vue par département + dendrogramme.")

cols = list_columns(get_local_con(), LOCAL_CITIES_TABLE)
all_names = [c.name for c in cols]
numeric = [c.name for c in cols if c.kind == "numeric" and c.name not in set(ID_COLS + [TARGET])]
numeric = [c for c in numeric if not c.endswith("_grid") and not c.endswith("_label")]

with st.sidebar:
    densites = _distinct_values("densite_category") if "densite_category" in all_names else []
    filters = render_city_filters(densite_options=densites)
    sample_n = st.slider("Échantillon (corrélations)", min_value=2_000, max_value=34_000, value=10_000, step=1_000)

tabs = st.tabs(["Corrélations", "Valeurs manquantes", "Par département", "Outliers"])

with tabs[0]:
    st.subheader("Heatmap de corrélations (numériques)")
    selected = st.multiselect("Variables numériques", options=numeric, default=numeric[:30])
    if not selected:
        st.stop()
    df = load_numeric_df(numeric_cols=selected, filters=filters)
    if df.empty:
        st.warning("Aucune donnée avec ces filtres.")
        st.stop()
    if len(df) > sample_n:
        df = df.sample(n=sample_n, random_state=42)
    fig = plot_corr_heatmap(df[[TARGET, *selected]], title="Corrélations (échantillon)")
    st.plotly_chart(fig, width="stretch")

with tabs[1]:
    st.subheader("Valeurs manquantes")
    sel = st.multiselect("Colonnes à auditer", options=[TARGET, *numeric], default=[TARGET, *numeric[:25]])
    if not sel:
        st.stop()
    miss = load_missingness(cols=sel, filters=filters)
    st.dataframe(miss, use_container_width=True, hide_index=True)
    figm = px.bar(miss.head(40), x="column", y="null_pct")
    figm.update_layout(height=320, yaxis_tickformat=".0%", xaxis_tickangle=-45)
    st.plotly_chart(figm, width="stretch")

with tabs[2]:
    st.subheader("Vue par département (moyennes)")
    by_dept = load_by_department(filters=filters)
    if by_dept.empty:
        st.warning("Aucune donnée avec ces filtres.")
        st.stop()
    figd = px.bar(by_dept.sort_values("avg_exit_rate_pct", ascending=False), x="dept", y="avg_exit_rate_pct", hover_data=["n_cities", "total_vacant_housing"])
    figd.update_layout(height=360, yaxis_title="exit_rate_pct moyen")
    st.plotly_chart(figd, width="stretch")
    st.dataframe(by_dept, use_container_width=True, hide_index=True)

with tabs[3]:
    st.subheader("Outliers (exit_rate_pct)")
    df = load_numeric_df(numeric_cols=["total_housing_count"], filters=filters)
    if df.empty:
        st.warning("Aucune donnée avec ces filtres.")
        st.stop()
    y = df[TARGET].astype(float)
    med = float(np.nanmedian(y))
    mad = float(np.nanmedian(np.abs(y - med))) or 1.0
    z = (y - med) / (1.4826 * mad)
    out = df.assign(robust_z=z).sort_values("robust_z", ascending=False)
    st.caption("Top 20 valeurs extrêmes (robust z-score)")
    st.dataframe(out.head(20), use_container_width=True, hide_index=True)

st.divider()
st.subheader("Dendrogramme (clustering hiérarchique)")
st.caption("Coûteux (~O(n²)) ⇒ échantillon + variables numériques standardisées.")

try:
    from scipy.cluster.hierarchy import linkage  # type: ignore

    scipy_ok = True
except Exception:
    scipy_ok = False

if not scipy_ok:
    st.error("`scipy` est requis pour le dendrogramme. Installe-le (ex: `uv sync`) puis relance l'app.")
else:
    dendro_cols_default = [c for c in ["total_housing_count", "population_2021", "niveau_loyer", "dvg_marche_dynamisme"] if c in numeric]
    if not dendro_cols_default:
        dendro_cols_default = numeric[:8]

    dendro_cols = st.multiselect("Variables (numériques)", options=numeric, default=dendro_cols_default)
    dendro_n = st.slider("Taille échantillon", min_value=50, max_value=600, value=200, step=25)
    method = st.selectbox("Linkage", options=["ward", "average", "complete"], index=0)

    if len(dendro_cols) < 2:
        st.info("Sélectionne au moins 2 variables.")
    else:
        df_d = load_dendro_df(cols=[*ID_COLS, *dendro_cols], filters=filters, limit=int(dendro_n))
        df_d = df_d.dropna(subset=dendro_cols)
        if len(df_d) < 20:
            st.warning("Pas assez de lignes (après suppression des NA) pour un dendrogramme.")
        else:
            labels = (df_d["commune_name"].astype(str) + " (" + df_d["geo_code"].astype(str) + ")").tolist()
            X = df_d[dendro_cols].to_numpy(dtype=float)
            X = np.nan_to_num(X, nan=np.nanmedian(X, axis=0))
            X = StandardScaler().fit_transform(X)

            def _linkagefun(y):
                return linkage(y, method=method)

            fig = ff.create_dendrogram(X, labels=labels, linkagefun=_linkagefun)
            fig.update_layout(height=800, xaxis={"tickangle": 45}, showlegend=False)
            st.plotly_chart(fig, width="stretch")




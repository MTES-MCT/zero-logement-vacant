from __future__ import annotations

# Copied from former `3_cities_pca.py` (renamed for nicer French sidebar label)

import numpy as np
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import streamlit as st
from sklearn.decomposition import PCA
from sklearn.pipeline import Pipeline

from components.charts import fmt_float
from components.filters import render_city_filters
from components.ml_utils import build_preprocessor, split_feature_types
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
def load_df(*, feature_cols: list[str], filters) -> pd.DataFrame:
    con = get_local_con()
    where_sql, params = _build_where(filters)
    cols = [*ID_COLS, TARGET, *feature_cols]
    select_sql = ", ".join(cols)
    q = f"SELECT {select_sql} FROM {LOCAL_CITIES_TABLE} WHERE {where_sql}"
    df = con.execute(q, params).df()
    return df.dropna(subset=[TARGET])


st.title("Communes — ACP (PCA)")
st.caption("Projeter les communes dans un espace 2D/3D pour voir des structures et gradients de `exit_rate_pct`.")

cols = list_columns(get_local_con(), LOCAL_CITIES_TABLE)
all_names = [c.name for c in cols]
numeric = [c.name for c in cols if c.kind == "numeric" and c.name not in set(ID_COLS + [TARGET])]
numeric = [c for c in numeric if not c.endswith("_grid") and not c.endswith("_label")]

with st.sidebar:
    densites = _distinct_values("densite_category") if "densite_category" in all_names else []
    filters = render_city_filters(densite_options=densites)
    st.subheader("ACP")
    n_components = st.slider("Nombre de composantes", min_value=2, max_value=10, value=3, step=1)
    max_points = st.slider("Échantillon max (projection)", min_value=2_000, max_value=34_000, value=15_000, step=1_000)

st.subheader("Variables ACP")
selected = st.multiselect("Variables numériques (X)", options=numeric, default=numeric[:20])
if len(selected) < 2:
    st.info("Sélectionne au moins 2 variables numériques.")
    st.stop()

df = load_df(feature_cols=selected, filters=filters)
if len(df) < 200:
    st.warning("Pas assez de communes après filtres.")
    st.stop()

df_plot = df.sample(n=max_points, random_state=42) if len(df) > max_points else df

X = df_plot[selected]
num_cols, cat_cols = split_feature_types(X)
pre = build_preprocessor(num_cols=num_cols, cat_cols=cat_cols, scale_numeric=True)

pca = PCA(n_components=n_components, random_state=42)
pipe = Pipeline(steps=[("preprocess", pre), ("pca", pca)])

with st.spinner("Calcul ACP..."):
    Z = pipe.fit_transform(X)

evr = pipe.named_steps["pca"].explained_variance_ratio_
st.subheader("Variance expliquée")
evr_df = pd.DataFrame({"component": [f"PC{i+1}" for i in range(len(evr))], "explained_variance_ratio": evr})
fig_evr = px.bar(evr_df, x="component", y="explained_variance_ratio")
fig_evr.update_layout(height=320, yaxis_tickformat=".0%")
st.plotly_chart(fig_evr, width="stretch")
st.caption(f"Variance cumulée (PC1..PC{len(evr)}): {fmt_float(float(evr.sum() * 100))}%")

proj = pd.DataFrame(Z, columns=[f"PC{i+1}" for i in range(Z.shape[1])])
proj[TARGET] = df_plot[TARGET].to_numpy()
proj["commune_name"] = df_plot.get("commune_name", pd.Series([""] * len(df_plot))).astype(str).to_numpy()
proj["geo_code"] = df_plot.get("geo_code", pd.Series([""] * len(df_plot))).astype(str).to_numpy()

st.subheader("Projection")
if n_components >= 3:
    fig = px.scatter_3d(
        proj,
        x="PC1",
        y="PC2",
        z="PC3",
        color=TARGET,
        hover_data=["commune_name", "geo_code"],
        opacity=0.7,
    )
    fig.update_layout(height=650)
else:
    fig = px.scatter(
        proj,
        x="PC1",
        y="PC2",
        color=TARGET,
        hover_data=["commune_name", "geo_code"],
        opacity=0.7,
    )
    fig.update_layout(height=650)
st.plotly_chart(fig, width="stretch")

st.subheader("Loadings (contribution des variables)")
components = pipe.named_steps["pca"].components_
feat_names = pipe.named_steps["preprocess"].get_feature_names_out()
feat_names = [n.replace("num__", "").replace("cat__", "") for n in feat_names]

pc1 = components[0]
pc2 = components[1] if components.shape[0] > 1 else np.zeros_like(pc1)
load = pd.DataFrame({"feature": feat_names, "PC1": pc1, "PC2": pc2})
load["abs_PC1"] = np.abs(load["PC1"])
top = load.sort_values("abs_PC1", ascending=False).head(30)

fig_load = go.Figure()
fig_load.add_trace(go.Bar(x=top["feature"], y=top["PC1"], name="PC1"))
fig_load.update_layout(height=380, xaxis_tickangle=-45, title="Top contributions (PC1)")
st.plotly_chart(fig_load, width="stretch")



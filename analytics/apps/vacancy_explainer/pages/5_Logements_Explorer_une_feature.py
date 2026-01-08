from __future__ import annotations

# Copied from former `5_housing_explorer.py` (renamed for nicer French sidebar label)

import pandas as pd
import plotly.express as px
import streamlit as st

from components.charts import is_numeric_series, make_categorical_view
from components.filters import render_housing_filters
from data.connection import LOCAL_HOUSING_TABLE, get_local_con
from data.schemas import list_columns, unique_preserve_order


TARGET = "is_housing_out"
ID_COLS = ["housing_id", "geo_code", "commune_name"]


@st.cache_data(ttl=60 * 60)
def _get_cols() -> list:
    return list_columns(get_local_con(), LOCAL_HOUSING_TABLE)


@st.cache_data(ttl=60 * 60)
def _distinct_values(col: str) -> list[str]:
    con = get_local_con()
    df = con.execute(f"SELECT DISTINCT {col} AS v FROM {LOCAL_HOUSING_TABLE} WHERE {col} IS NOT NULL").df()
    out = [str(v) for v in df["v"].tolist() if v is not None]
    return sorted(set(out))


def _build_where(filters) -> tuple[str, list]:
    where = ["1=1"]
    params: list = []
    if filters.densite_category:
        where.append("densite_category = ?")
        params.append(filters.densite_category)
    if filters.pop_min is not None:
        where.append("population_2021 >= ?")
        params.append(int(filters.pop_min))
    if filters.pop_max is not None:
        where.append("population_2021 <= ?")
        params.append(int(filters.pop_max))
    if filters.vacancy_duration_category:
        where.append("vacancy_duration_category = ?")
        params.append(filters.vacancy_duration_category)
    if filters.housing_kind:
        where.append("housing_kind = ?")
        params.append(filters.housing_kind)
    if filters.departments:
        placeholders = ",".join(["?"] * len(filters.departments))
        where.append(f"substr(geo_code, 1, 2) IN ({placeholders})")
        params.extend(list(filters.departments))
    return " AND ".join(where), params


@st.cache_data(ttl=10 * 60)
def load_sample_df(*, cols: list[str], filters, limit: int) -> pd.DataFrame:
    con = get_local_con()
    where_sql, params = _build_where(filters)
    select_sql = ", ".join(cols)
    q = f"SELECT {select_sql} FROM {LOCAL_HOUSING_TABLE} WHERE {where_sql} LIMIT {int(limit)}"
    return con.execute(q, params).df()


@st.cache_data(ttl=10 * 60)
def load_group_rate(*, group_col: str, filters, top_n: int = 30) -> pd.DataFrame:
    con = get_local_con()
    where_sql, params = _build_where(filters)
    q = f"""
    SELECT
      {group_col}::VARCHAR AS category,
      COUNT(*)::BIGINT AS n,
      AVG({TARGET}) AS out_rate
    FROM {LOCAL_HOUSING_TABLE}
    WHERE {where_sql}
    GROUP BY 1
    HAVING COUNT(*) >= 20
    ORDER BY n DESC
    LIMIT {int(top_n)}
    """
    return con.execute(q, params).df()


@st.cache_data(ttl=10 * 60)
def load_summary(filters) -> dict:
    con = get_local_con()
    where_sql, params = _build_where(filters)
    q = f"""
    SELECT
      COUNT(*)::BIGINT AS n,
      AVG({TARGET}) AS out_rate,
      SUM({TARGET})::BIGINT AS n_out
    FROM {LOCAL_HOUSING_TABLE}
    WHERE {where_sql}
    """
    row = con.execute(q, params).df().iloc[0].to_dict()
    return {"n": int(row["n"]), "out_rate": float(row["out_rate"]) if row["out_rate"] is not None else float("nan"), "n_out": int(row["n_out"])}


st.title("Logements — Explorer une feature")
st.caption("Niveau logement: cible `is_housing_out` (0/1). Données en cache DuckDB local.")

cols = _get_cols()
all_names = [c.name for c in cols]
numeric = [c.name for c in cols if c.kind == "numeric" and c.name not in set(ID_COLS + [TARGET])]
categorical = [c.name for c in cols if c.kind == "categorical" and c.name not in set(ID_COLS + [TARGET])]
numeric = [c for c in numeric if not c.endswith("_grid") and not c.endswith("_label")]
categorical = [c for c in categorical if not c.endswith("_grid") and not c.endswith("_label")]

with st.sidebar:
    densites = _distinct_values("densite_category") if "densite_category" in all_names else []
    vacancy_durs = _distinct_values("vacancy_duration_category") if "vacancy_duration_category" in all_names else []
    kinds = _distinct_values("housing_kind") if "housing_kind" in all_names else []
    filters = render_housing_filters(densite_options=densites, vacancy_duration_options=vacancy_durs, housing_kind_options=kinds)
    sample_limit = st.slider("Lignes (sample pour graphiques)", min_value=1_000, max_value=200_000, value=30_000, step=1_000)

summary = load_summary(filters)
if summary["n"] == 0:
    st.warning("Aucune donnée avec ces filtres.")
    st.stop()

c1, c2, c3 = st.columns(3)
c1.metric("Logements (après filtres)", f"{summary['n']:,}".replace(",", " "))
c2.metric("Sortis de vacance", f"{summary['n_out']:,}".replace(",", " "))
c3.metric("Taux de sortie", f"{summary['out_rate']*100:,.2f}%".replace(",", " ").replace(".", ","))

feature_type = st.radio("Type de feature", options=["Numérique", "Catégorielle"], horizontal=True)
feature = st.selectbox("Feature", options=(numeric if feature_type == "Numérique" else categorical), index=0)

base_cols = [*ID_COLS, TARGET, "vacancy_duration_category", "housing_kind", "densite_category", "population_2021", feature]
select_cols = [c for c in unique_preserve_order(base_cols) if c in all_names]

df = load_sample_df(cols=select_cols, filters=filters, limit=sample_limit).dropna(subset=[TARGET])
if df.empty:
    st.warning("Pas de données (après filtres + sample).")
    st.stop()

st.subheader("Distribution de la cible (sur le sample)")
df[TARGET] = df[TARGET].astype(int)
fig_target = px.histogram(df, x=TARGET, nbins=2)
fig_target.update_layout(height=260, xaxis_title="is_housing_out")
st.plotly_chart(fig_target, width="stretch")

if feature in df.columns and is_numeric_series(df[feature]):
    st.subheader("Taux de sortie par déciles de la feature (sample)")
    sub = df[[feature, TARGET]].dropna()
    if len(sub) >= 200:
        try:
            bins = pd.qcut(sub[feature], q=10, duplicates="drop")
            agg = (
                sub.assign(_bin=bins)
                .groupby("_bin", observed=True)
                .agg(out_rate=(TARGET, "mean"), n=(TARGET, "size"))
                .reset_index()
            )
            agg["_bin"] = agg["_bin"].astype("string")
            fig = px.bar(agg, x="_bin", y="out_rate", hover_data=["n"])
            fig.update_layout(height=340, yaxis_tickformat=".0%", xaxis_title="Déciles", yaxis_title="Taux de sortie")
            st.plotly_chart(fig, width="stretch")
        except Exception:
            st.caption("Impossible de calculer des déciles (variance trop faible).")

    st.subheader("Distribution de la feature par statut (sample)")
    fig2 = px.histogram(df, x=feature, color=TARGET, nbins=40, barmode="overlay", opacity=0.6)
    fig2.update_layout(height=360)
    st.plotly_chart(fig2, width="stretch")
else:
    st.subheader("Taux de sortie par catégorie (Top 30 en volume)")
    view = make_categorical_view(df, feature, max_categories=25)
    rates = (
        view.groupby(feature, dropna=False)[TARGET]
        .agg(out_rate="mean", n="size")
        .reset_index()
        .sort_values("n", ascending=False)
        .head(30)
    )
    fig = px.bar(rates, x=feature, y="out_rate", hover_data=["n"])
    fig.update_layout(height=380, yaxis_tickformat=".0%", yaxis_title="Taux de sortie")
    st.plotly_chart(fig, width="stretch")

    st.caption("Top catégories (calcul SQL sur la table filtrée)")
    try:
        sql_rates = load_group_rate(group_col=feature, filters=filters, top_n=30)
        fig_sql = px.bar(sql_rates, x="category", y="out_rate", hover_data=["n"])
        fig_sql.update_layout(height=380, yaxis_tickformat=".0%", yaxis_title="Taux de sortie")
        st.plotly_chart(fig_sql, width="stretch")
        st.dataframe(sql_rates, use_container_width=True, hide_index=True)
    except Exception:
        st.caption("Agrégation SQL indisponible pour cette feature.")



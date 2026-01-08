from __future__ import annotations

import pandas as pd
import streamlit as st

from components.best_models import (
    build_default_city_feature_set,
    build_default_housing_feature_set,
    train_best_city_regressor,
    train_best_housing_classifier,
)
from components.charts import fmt_float
from components.filters import render_city_filters, render_housing_filters
from data.connection import LOCAL_CITIES_TABLE, LOCAL_HOUSING_TABLE, get_local_con
from data.schemas import list_columns


st.title("Modèles optimaux (auto)")
st.caption("Entraîne automatiquement le meilleur modèle (parmi quelques candidats) avec un tuning borné.")

con = get_local_con()
city_cols = [c.name for c in list_columns(con, LOCAL_CITIES_TABLE)]
housing_cols = [c.name for c in list_columns(con, LOCAL_HOUSING_TABLE)]

with st.sidebar:
    st.subheader("Commune — données")
    # Minimal filters (reuse the existing filter UI)
    densites = sorted(set(con.execute(f"SELECT DISTINCT densite_category FROM {LOCAL_CITIES_TABLE} WHERE densite_category IS NOT NULL").fetchnumpy()["densite_category"].tolist())) if "densite_category" in city_cols else []
    city_filters = render_city_filters(densite_options=densites, key_prefix="opt_city_")
    city_limit = st.slider(
        "Communes: lignes max (train)",
        min_value=5_000,
        max_value=34_000,
        value=34_000,
        step=1_000,
        key="opt_city_limit",
    )

    st.subheader("Logement — données")
    densites_h = sorted(set(con.execute(f"SELECT DISTINCT densite_category FROM {LOCAL_HOUSING_TABLE} WHERE densite_category IS NOT NULL").fetchnumpy()["densite_category"].tolist())) if "densite_category" in housing_cols else []
    vd = sorted(set(con.execute(f"SELECT DISTINCT vacancy_duration_category FROM {LOCAL_HOUSING_TABLE} WHERE vacancy_duration_category IS NOT NULL").fetchnumpy()['vacancy_duration_category'].tolist())) if "vacancy_duration_category" in housing_cols else []
    hk = sorted(set(con.execute(f"SELECT DISTINCT housing_kind FROM {LOCAL_HOUSING_TABLE} WHERE housing_kind IS NOT NULL").fetchnumpy()['housing_kind'].tolist())) if "housing_kind" in housing_cols else []
    housing_filters = render_housing_filters(
        densite_options=densites_h,
        vacancy_duration_options=vd,
        housing_kind_options=hk,
        key_prefix="opt_housing_",
    )
    housing_limit = st.slider(
        "Logements: lignes max (train)",
        min_value=20_000,
        max_value=300_000,
        value=120_000,
        step=10_000,
        key="opt_housing_limit",
    )

    run = st.button("Entraîner / recalculer", type="primary", key="opt_run")


def _build_where_city(filters) -> tuple[str, list]:
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


def _build_where_housing(filters) -> tuple[str, list]:
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


if run:
    st.cache_resource.clear()

st.subheader("Commune — meilleur régresseur")
city_feats = build_default_city_feature_set(city_cols)
if not city_feats:
    st.warning("Impossible de construire un set de features commune (colonnes manquantes).")
else:
    where, params = _build_where_city(city_filters)
    df_city = con.execute(
        f"SELECT exit_rate_pct, {', '.join(city_feats)} FROM {LOCAL_CITIES_TABLE} WHERE {where} LIMIT {int(city_limit)}",
        params,
    ).df()
    if len(df_city) < 500:
        st.warning("Pas assez de communes après filtres.")
    else:
        with st.spinner("Entraînement du meilleur régresseur..."):
            model_city = train_best_city_regressor(df_city, features=city_feats)
        st.write({"modele": model_city.kind, "features": model_city.features})
        c1, c2, c3 = st.columns(3)
        c1.metric("CV R²", fmt_float(model_city.metrics.get("cv_r2")))
        c2.metric("R² test", fmt_float(model_city.metrics.get("r2")))
        c3.metric("MAE test", fmt_float(model_city.metrics.get("mae")))

st.subheader("Logement — meilleur classifieur")
housing_feats = build_default_housing_feature_set(housing_cols)
if not housing_feats:
    st.warning("Impossible de construire un set de features logement (colonnes manquantes).")
else:
    where, params = _build_where_housing(housing_filters)
    df_h = con.execute(
        f"SELECT is_housing_out, {', '.join(housing_feats)} FROM {LOCAL_HOUSING_TABLE} WHERE {where} LIMIT {int(housing_limit)}",
        params,
    ).df()
    if len(df_h) < 10_000:
        st.warning("Pas assez de logements après filtres.")
    else:
        with st.spinner("Entraînement du meilleur classifieur..."):
            model_h = train_best_housing_classifier(df_h, features=housing_feats)
        st.write({"modele": model_h.kind, "features": model_h.features})
        c1, c2 = st.columns(2)
        c1.metric("CV ROC-AUC", fmt_float(model_h.metrics.get("cv_roc_auc")))
        c2.metric("ROC-AUC test", fmt_float(model_h.metrics.get("roc_auc")))



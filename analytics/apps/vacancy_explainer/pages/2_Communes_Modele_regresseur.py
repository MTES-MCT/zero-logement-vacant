from __future__ import annotations

# Copied from former `2_cities_ml.py` (renamed for nicer French sidebar label)

import numpy as np
import pandas as pd
import plotly.express as px
import streamlit as st
from sklearn.ensemble import RandomForestRegressor
from sklearn.inspection import permutation_importance
from sklearn.model_selection import RandomizedSearchCV, train_test_split
from sklearn.pipeline import Pipeline

from components.charts import fmt_float, plot_signed_importance_bar
from components.filters import render_city_filters
from components.ml_utils import build_preprocessor, eval_regression, feature_name_simplify, split_feature_types
from data.connection import LOCAL_CITIES_TABLE, get_local_con
from data.schemas import list_columns


TARGET = "exit_rate_pct"
ID_COLS = ["geo_code", "commune_name"]


@st.cache_data(ttl=60 * 60)
def _get_cols() -> list:
    con = get_local_con()
    return list_columns(con, LOCAL_CITIES_TABLE)


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


st.title("Communes — Modèle (RandomForestRegressor)")
st.caption("Objectif: prédire `exit_rate_pct` (régression) à partir des features communales (cache DuckDB local).")

cols = _get_cols()
all_names = [c.name for c in cols]
numeric = [c.name for c in cols if c.kind == "numeric" and c.name not in set(ID_COLS + [TARGET])]
categorical = [c.name for c in cols if c.kind == "categorical" and c.name not in set(ID_COLS + [TARGET])]
numeric = [c for c in numeric if not c.endswith("_grid") and not c.endswith("_label")]
categorical = [c for c in categorical if not c.endswith("_grid") and not c.endswith("_label")]

with st.sidebar:
    densites = _distinct_values("densite_category") if "densite_category" in all_names else []
    filters = render_city_filters(densite_options=densites)
    st.subheader("Modèle")
    mode = st.selectbox("Mode", options=["Rapide", "Plus précis"], index=0, help="Plus précis = recherche d'hyperparamètres (plus lent).")
    use_perm = st.checkbox("Impact signé (Permutation importance)", value=True, help="Permet d'obtenir des impacts négatifs (en rouge). Plus lent.")
    top_n = st.slider("Top N importances", min_value=5, max_value=50, value=20, step=5)

st.subheader("Sélection des features")
st.caption("Tu peux mélanger numériques + catégorielles (one-hot).")

default_num = [c for c in ["total_housing_count", "population_2021", "niveau_loyer", "dvg_marche_dynamisme"] if c in numeric]
if not default_num:
    default_num = numeric[:10]
default_cat = ["densite_category"] if "densite_category" in categorical else []

sel_num = st.multiselect("Features numériques (X)", options=numeric, default=default_num)
sel_cat = st.multiselect("Features catégorielles (X)", options=categorical, default=default_cat)
features = [*sel_num, *sel_cat]

if not features:
    st.info("Sélectionne au moins une feature.")
    st.stop()

df = load_df(feature_cols=features, filters=filters)
if len(df) < 200:
    st.warning("Pas assez de données après filtres (min 200 lignes recommandé).")
    st.stop()

X = df[features]
y = df[TARGET].astype(float)

num_cols, cat_cols = split_feature_types(X)
pre = build_preprocessor(num_cols=num_cols, cat_cols=cat_cols, scale_numeric=False)

base_model = RandomForestRegressor(random_state=42, n_jobs=2)
pipe = Pipeline(steps=[("preprocess", pre), ("model", base_model)])

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

best_pipe = pipe
if mode == "Plus précis":
    param_dist = {
        "model__n_estimators": [200, 400, 700],
        "model__max_depth": [None, 10, 20, 30],
        "model__min_samples_split": [2, 5, 10],
        "model__min_samples_leaf": [1, 2, 4],
        "model__max_features": ["sqrt", 0.5, 0.8],
    }
    search = RandomizedSearchCV(
        pipe,
        param_distributions=param_dist,
        n_iter=15,
        cv=3,
        scoring="r2",
        random_state=42,
        n_jobs=1,
    )
    with st.spinner("Recherche d'hyperparamètres..."):
        search.fit(X_train, y_train)
    best_pipe = search.best_estimator_
    st.caption(f"Best params: {search.best_params_}")
else:
    best_pipe = Pipeline(
        steps=[
            ("preprocess", pre),
            (
                "model",
                RandomForestRegressor(
                    n_estimators=500,
                    max_depth=None,
                    min_samples_leaf=2,
                    random_state=42,
                    n_jobs=2,
                ),
            ),
        ]
    )
    with st.spinner("Entraînement..."):
        best_pipe.fit(X_train, y_train)

preds = best_pipe.predict(X_test)
metrics = eval_regression(y_test, preds)

c1, c2, c3 = st.columns(3)
c1.metric("R² (test)", fmt_float(metrics["r2"]))
c2.metric("MAE (points de %)", fmt_float(metrics["mae"]))
c3.metric("Lignes (après filtres)", f"{len(df):,}".replace(",", " "))

st.subheader("Qualité de prédiction")
qq = pd.DataFrame({"y_true": y_test, "y_pred": preds})
fig_pred = px.scatter(qq, x="y_true", y="y_pred", opacity=0.6)
fig_pred.update_layout(height=420, xaxis_title="exit_rate_pct (vrai)", yaxis_title="exit_rate_pct (prédit)")
st.plotly_chart(fig_pred, width="stretch")

st.subheader("Impact / importance des variables")
with st.spinner("Calcul des importances..."):
    if use_perm:
        pi = permutation_importance(best_pipe, X_test, y_test, n_repeats=5, random_state=42, n_jobs=1)
        imp_df = pd.DataFrame({"feature": features, "importance": pi.importances_mean})
    else:
        names = best_pipe.named_steps["preprocess"].get_feature_names_out()
        names = [feature_name_simplify(n) for n in names]
        importances = best_pipe.named_steps["model"].feature_importances_
        imp_df = pd.DataFrame({"feature": names, "importance": importances})

imp_df = imp_df.sort_values("importance", ascending=False).head(top_n)
fig_imp = plot_signed_importance_bar(
    imp_df,
    feature_col="feature",
    value_col="importance",
    title="Impact des variables (rouge = impact négatif)",
)
st.plotly_chart(fig_imp, width="stretch")
st.dataframe(imp_df, use_container_width=True, hide_index=True)



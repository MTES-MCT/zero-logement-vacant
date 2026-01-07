from __future__ import annotations

# Copied from former `6_housing_ml.py` (renamed for nicer French sidebar label)

import numpy as np
import pandas as pd
import plotly.express as px
import plotly.figure_factory as ff
import streamlit as st
from sklearn.inspection import permutation_importance
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import RandomizedSearchCV, train_test_split
from sklearn.pipeline import Pipeline

from components.charts import fmt_float, plot_signed_importance_bar
from components.filters import render_housing_filters
from components.ml_utils import build_preprocessor, confusion, eval_classification, feature_name_simplify, split_feature_types
from data.connection import LOCAL_HOUSING_TABLE, get_local_con
from data.schemas import list_columns


TARGET = "is_housing_out"
ID_COLS = ["housing_id", "geo_code", "commune_name"]


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
def load_train_df(*, feature_cols: list[str], filters, limit: int) -> pd.DataFrame:
    con = get_local_con()
    where_sql, params = _build_where(filters)
    cols = [TARGET, *feature_cols]
    select_sql = ", ".join(cols)
    q = f"SELECT {select_sql} FROM {LOCAL_HOUSING_TABLE} WHERE {where_sql} LIMIT {int(limit)}"
    df = con.execute(q, params).df()
    return df.dropna(subset=[TARGET])


st.title("Logements — Modèle (RandomForestClassifier)")
st.caption("Objectif: prédire `is_housing_out` (0/1). Pipeline: imputations + one-hot + RandomForest + tuning optionnel.")

cols = list_columns(get_local_con(), LOCAL_HOUSING_TABLE)
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
    st.subheader("Entraînement")
    mode = st.selectbox("Mode", options=["Rapide", "Plus précis"], index=0)
    train_limit = st.slider("Lignes max (train+test)", min_value=10_000, max_value=300_000, value=80_000, step=10_000)
    top_n = st.slider("Top N importances", min_value=10, max_value=60, value=25, step=5)
    use_perm = st.checkbox("Impact signé (Permutation importance)", value=True, help="Rouge = impact négatif. Plus lent.")

st.subheader("Sélection des features")
default_num = [c for c in ["years_in_vacancy", "living_area", "building_year", "population_2021", "niveau_loyer"] if c in numeric]
if not default_num:
    default_num = numeric[:10]
default_cat = [c for c in ["housing_kind", "vacancy_duration_category", "densite_category"] if c in categorical]

sel_num = st.multiselect("Features numériques (X)", options=numeric, default=default_num)
sel_cat = st.multiselect("Features catégorielles (X)", options=categorical, default=default_cat)
features = [*sel_num, *sel_cat]
if not features:
    st.info("Sélectionne au moins une feature.")
    st.stop()

df = load_train_df(feature_cols=features, filters=filters, limit=train_limit)
if len(df) < 5_000:
    st.warning("Pas assez de données après filtres (min 5 000 recommandé).")
    st.stop()

X = df[features]
y = df[TARGET].astype(int)

num_cols, cat_cols = split_feature_types(X)
pre = build_preprocessor(num_cols=num_cols, cat_cols=cat_cols, scale_numeric=False)

base = RandomForestClassifier(random_state=42, n_jobs=2, class_weight="balanced")
pipe = Pipeline(steps=[("preprocess", pre), ("model", base)])

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

best_pipe = pipe
if mode == "Plus précis":
    param_dist = {
        "model__n_estimators": [300, 600, 900],
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
        scoring="roc_auc",
        random_state=42,
        n_jobs=1,
    )
    with st.spinner("Recherche d'hyperparamètres (ROC-AUC)..."):
        search.fit(X_train, y_train)
    best_pipe = search.best_estimator_
    st.caption(f"Best params: {search.best_params_}")
else:
    best_pipe = Pipeline(
        steps=[
            ("preprocess", pre),
            (
                "model",
                RandomForestClassifier(
                    n_estimators=700,
                    max_depth=None,
                    min_samples_leaf=2,
                    random_state=42,
                    n_jobs=2,
                    class_weight="balanced",
                ),
            ),
        ]
    )
    with st.spinner("Entraînement..."):
        best_pipe.fit(X_train, y_train)

proba = best_pipe.predict_proba(X_test)[:, 1]
pred = (proba >= 0.5).astype(int)
metrics = eval_classification(y_test, pred, proba)

c1, c2, c3, c4, c5 = st.columns(5)
c1.metric("Accuracy", fmt_float(metrics["accuracy"]))
c2.metric("Precision", fmt_float(metrics["precision"]))
c3.metric("Recall", fmt_float(metrics["recall"]))
c4.metric("F1", fmt_float(metrics["f1"]))
c5.metric("ROC-AUC", fmt_float(metrics["roc_auc"]))

st.subheader("Distribution des probabilités (approx ROC)")
roc_df = pd.DataFrame({"y_true": y_test.to_numpy(), "proba": proba})
fig_roc = px.histogram(roc_df, x="proba", color="y_true", nbins=40, barmode="overlay", opacity=0.6)
fig_roc.update_layout(height=320, xaxis_title="P(is_housing_out=1)", yaxis_title="count")
st.plotly_chart(fig_roc, width="stretch")

st.subheader("Matrice de confusion")
cm = confusion(y_test, pred)
fig_cm = ff.create_annotated_heatmap(z=cm, x=["pred 0", "pred 1"], y=["true 0", "true 1"], colorscale="Blues")
fig_cm.update_layout(height=340)
st.plotly_chart(fig_cm, width="stretch")

st.subheader("Impact / importance des variables")
with st.spinner("Calcul des impacts..."):
    if use_perm:
        pi = permutation_importance(best_pipe, X_test, y_test, n_repeats=4, random_state=42, n_jobs=1, scoring="roc_auc")
        imp_df = pd.DataFrame({"feature": features, "importance": pi.importances_mean})
    else:
        names = best_pipe.named_steps["preprocess"].get_feature_names_out()
        names = [feature_name_simplify(n) for n in names]
        importances = best_pipe.named_steps["model"].feature_importances_
        imp_df = pd.DataFrame({"feature": names, "importance": importances})

imp_df = imp_df.sort_values("importance", ascending=False).head(top_n)
fig_imp = plot_signed_importance_bar(imp_df, title="Impact des variables (rouge = impact négatif)")
st.plotly_chart(fig_imp, width="stretch")
st.dataframe(imp_df, use_container_width=True, hide_index=True)



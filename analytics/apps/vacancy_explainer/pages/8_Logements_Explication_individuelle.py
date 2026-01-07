from __future__ import annotations

import pandas as pd
import plotly.express as px
import streamlit as st

from components.best_models import (
    build_default_housing_feature_set,
    compute_baseline_from_df,
    convert_na_to_nan,
    local_what_if_deltas,
    train_best_housing_classifier,
)
from components.charts import plot_signed_importance_bar
from data.connection import LOCAL_CITIES_TABLE, LOCAL_HOUSING_TABLE, get_local_con
from data.schemas import list_columns


st.title("Logements — Explication individuelle")
st.caption(
    "Renseigne un logement (surface, durée de vacance, commune, etc.) et obtient:\n"
    "- une probabilité de sortie de vacance (via le meilleur classifieur)\n"
    "- une explication locale par **what-if unitaire** (impact signé; rouge = réduit la probabilité)"
)

con = get_local_con()
housing_cols = [c.name for c in list_columns(con, LOCAL_HOUSING_TABLE)]
city_cols = [c.name for c in list_columns(con, LOCAL_CITIES_TABLE)]

features = build_default_housing_feature_set(housing_cols)
if not features:
    st.error("Impossible de définir les features du modèle logement (colonnes manquantes).")
    st.stop()

train_limit = st.sidebar.slider("Taille max du dataset d'entraînement", min_value=30_000, max_value=300_000, value=120_000, step=10_000)

with st.spinner("Préparation du modèle (cache) ..."):
    df_train = con.execute(
        f"SELECT is_housing_out, {', '.join(features)} FROM {LOCAL_HOUSING_TABLE} WHERE is_housing_out IS NOT NULL LIMIT {int(train_limit)}"
    ).df()
    if len(df_train) < 10_000:
        st.error("Pas assez de lignes pour entraîner un modèle.")
        st.stop()
    model = train_best_housing_classifier(df_train, features=features)
    baseline = compute_baseline_from_df(df_train, features)

st.subheader("Entrée logement")

prefill = {}
geo_code = st.text_input("Code INSEE commune (geo_code)", value="")
if geo_code and "geo_code" in city_cols:
    # Try to prefill city-related features from cities table (if present in model features)
    city_feats = [c for c in ["densite_category", "population_2021", "niveau_loyer", "dvg_marche_dynamisme"] if c in features and c in city_cols]
    if city_feats:
        row = con.execute(f"SELECT {', '.join(city_feats)} FROM {LOCAL_CITIES_TABLE} WHERE geo_code = ? LIMIT 1", [geo_code]).df()
        if not row.empty:
            for c in city_feats:
                prefill[c] = row.iloc[0][c]

# Build a single-row dataframe matching `features`
row_data = {}
for f in features:
    # If we have prefill from city table, use it; else use baseline as default
    row_data[f] = prefill.get(f, baseline.get(f))

with st.form("housing_form"):
    cols = st.columns(2)
    for idx, f in enumerate(features):
        with cols[idx % 2]:
            v = row_data.get(f)
            if isinstance(v, (int, float)) or (pd.notna(v) and str(v).replace(".", "", 1).isdigit()):
                try:
                    row_data[f] = st.number_input(f, value=float(v) if pd.notna(v) else 0.0)
                except Exception:
                    row_data[f] = st.text_input(f, value="" if v is None else str(v))
            else:
                row_data[f] = st.text_input(f, value="" if v is None else str(v))

    submitted = st.form_submit_button("Prédire et expliquer")

if submitted:
    row_df = convert_na_to_nan(pd.DataFrame([row_data]))
    proba = float(model.pipe.predict_proba(row_df[features])[:, 1][0])
    pred = int(proba >= 0.5)

    st.subheader("Prédiction")
    st.metric("P(sortie de vacance)", f"{proba*100:,.2f}%".replace(",", " ").replace(".", ","))
    st.write({"classe_predite": pred, "seuil": 0.5, "modele": model.kind})

    st.subheader("Explication locale (what-if unitaire)")
    st.caption("Pour chaque feature: on la remplace par une valeur de référence (baseline) et on mesure le delta de probabilité.")
    deltas = local_what_if_deltas(pipe=model.pipe, row=row_df, baseline=baseline, features=features)
    fig = plot_signed_importance_bar(
        deltas.rename(columns={"delta_proba": "importance"}),
        feature_col="feature",
        value_col="importance",
        title="Impact local (delta probabilité; rouge = réduit la probabilité)",
    )
    st.plotly_chart(fig, width="stretch")
    st.dataframe(deltas, use_container_width=True, hide_index=True)

    st.subheader("Sensibilité unitaire (courbe)")
    numeric_feats = [f for f in features if pd.api.types.is_numeric_dtype(df_train[f])]
    if numeric_feats:
        f = st.selectbox("Feature numérique à faire varier", options=numeric_feats, index=0)
        qs = df_train[f].quantile([0.05, 0.25, 0.5, 0.75, 0.95]).to_numpy()
        grid = pd.Series(sorted(set([float(x) for x in qs if pd.notna(x)] + [float(row_df.iloc[0][f])]))).to_list()
        rows = []
        for x in grid:
            tmp = row_df.copy()
            tmp.loc[tmp.index[0], f] = x
            tmp_clean = convert_na_to_nan(tmp[features])
            p = float(model.pipe.predict_proba(tmp_clean)[:, 1][0])
            rows.append({f: x, "proba": p})
        sdf = pd.DataFrame(rows)
        fig2 = px.line(sdf, x=f, y="proba")
        fig2.update_layout(height=320, yaxis_tickformat=".0%")
        st.plotly_chart(fig2, width="stretch")
    else:
        st.info("Pas de variables numériques dans le set de features du modèle.")



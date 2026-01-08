from __future__ import annotations

import os
import time

import streamlit as st

from data.connection import get_cache_status, get_local_con_and_status


st.set_page_config(page_title="ZLV — Vacancy Explainer", layout="wide")

st.title("Vacancy Explainer — Zéro Logement Vacant")
st.caption(
    "App Streamlit multi-pages pour explorer la sortie de vacance.\n"
    "- **Communes**: exploration, PCA, modèle de régression\n"
    "- **Logements**: exploration, modèle de classification\n"
    "\nLes données sont **chargées depuis MotherDuck une seule fois**, puis analysées via **DuckDB en local**."
)

with st.sidebar:
    st.subheader("Connexion / cache")
    token_present = bool(os.getenv("MOTHERDUCK_TOKEN", "").strip())
    if token_present:
        st.success("MotherDuck: token détecté (`MOTHERDUCK_TOKEN`).")
    else:
        st.error("MotherDuck: token manquant. Défini `MOTHERDUCK_TOKEN` puis relance l’app.")
        st.stop()

    refresh = st.button("Recharger le cache (force refresh)", type="secondary")
    if refresh:
        # Rebuild cache once (same process) by invalidating resource
        get_local_con_and_status.clear()
        st.rerun()

with st.spinner("Initialisation du cache local DuckDB (1er chargement = plus long)…"):
    _, status = get_local_con_and_status(force_refresh=False)

st.subheader("État du cache")
st.write(
    {
        "local_db_path": status.local_db_path,
        "cities_rows": status.cities_rows,
        "housing_rows": status.housing_rows,
        "built_at": time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(status.built_at_unix)),
    }
)

st.info("Utilise la navigation Streamlit (sidebar) pour ouvrir les pages: Communes / Logements.")
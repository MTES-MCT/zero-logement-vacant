from __future__ import annotations

import os
from typing import Iterable

import numpy as np
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import streamlit as st
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestRegressor
from sklearn.impute import SimpleImputer
from sklearn.inspection import permutation_importance
from sklearn.linear_model import LinearRegression, Ridge
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder
from sklearn.preprocessing import StandardScaler

import md


TARGET = "exit_rate_pct"
ID_COLS = ["geo_code", "commune_name"]
DEFAULT_FILTER_COLS = ["total_housing_count", "densite_category", "population_2021"]


st.set_page_config(page_title="ZLV — Sortie de vacance (exploration)", layout="wide")


@st.cache_resource
def get_con():
    return md.connect_motherduck()


@st.cache_data(ttl=60 * 60)
def get_columns():
    con = get_con()
    cols = md.list_columns(con)
    return cols


@st.cache_data(ttl=15 * 60)
def distinct_values(col: str, limit: int = 50) -> list[str]:
    con = get_con()
    q = f"""
SELECT DISTINCT {md.quote_ident(col)} AS v
FROM {md.TABLE_FQN}
WHERE {md.quote_ident(col)} IS NOT NULL
LIMIT {int(limit)}
""".strip()
    df = md.fetch_df(con, q)
    out = [str(v) for v in df["v"].tolist() if v is not None]
    return sorted(set(out))


@st.cache_data(ttl=10 * 60)
def load_data(
    *,
    select_cols: Iterable[str],
    exit_rate_max: float,
    total_housing_min: int,
    limit: int,
    departments: tuple[str, ...] | None,
    densite_category: str | None,
    pop_min: int | None,
    pop_max: int | None,
) -> pd.DataFrame:
    con = get_con()
    sql = md.build_filtered_query(
        select_cols=select_cols,
        exit_rate_max=exit_rate_max,
        total_housing_min=total_housing_min,
        limit=limit,
        department_codes=departments,
        densite_category=densite_category,
        pop_min=pop_min,
        pop_max=pop_max,
    )
    return md.fetch_df(con, sql)


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


def feature_name_simplify(name: str) -> str:
    # ColumnTransformer prefixes like: num__foo, cat__bar_baz
    return name.replace("num__", "").replace("cat__", "")


def unique_preserve_order(items: Iterable[str]) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for x in items:
        if x not in seen:
            seen.add(x)
            out.append(x)
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
        # Fit y = a*log10(x) + b and display line in original x scale
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


st.title("Comprendre la sortie de vacance (communes)")
st.caption(
    "Explore les relations entre indicateurs communaux et `exit_rate_pct`, puis entraîne un petit modèle explicatif. "
    "Attention: corrélation et importance de variables ne prouvent pas une causalité."
)


with st.sidebar:
    st.subheader("Connexion")
    token_present = bool(os.getenv("MOTHERDUCK_TOKEN", "").strip())
    if token_present:
        st.success("MotherDuck: token détecté (`MOTHERDUCK_TOKEN`).")
    else:
        st.error("MotherDuck: token manquant. Défini `MOTHERDUCK_TOKEN` puis relance l’app.")

    st.subheader("Filtres")
    exit_rate_max = st.slider("exit_rate_pct max", min_value=0.0, max_value=100.0, value=20.0, step=1.0)
    total_housing_min = st.slider("total_housing_count min", min_value=0, max_value=5000, value=50, step=10)

    densite_category = None
    try:
        densites = distinct_values("densite_category", limit=50)
        densite_category = st.selectbox(
            "densite_category",
            options=["(toutes)"] + densites,
            index=0,
        )
        if densite_category == "(toutes)":
            densite_category = None
    except Exception:
        st.caption("densite_category: indisponible (ou erreur de connexion).")

    pop_min = st.number_input("population_2021 min (optionnel)", min_value=0, value=0, step=1000)
    pop_max = st.number_input("population_2021 max (optionnel)", min_value=0, value=0, step=1000)
    if pop_min == 0:
        pop_min = None
    if pop_max == 0:
        pop_max = None

    limit = st.slider("Nombre de communes (LIMIT)", min_value=50, max_value=5000, value=200, step=50)
    if limit >= 2000:
        st.warning("LIMIT élevé: l’app peut devenir lente.")

    st.subheader("Départements (métropole)")
    dept_options = [f"{i:02d}" for i in range(1, 96)]
    dept_selected = st.multiselect(
        "Filtrer sur les départements (01–95)",
        options=dept_options,
        default=[],
        help="Basé sur les 2 premiers caractères de `geo_code` (INSEE commune).",
    )
    departments = tuple(dept_selected) if dept_selected else None


cols = get_columns() if token_present else []
if token_present:
    try:
        cols = get_columns()
    except Exception as e:
        st.error(f"Connexion MotherDuck impossible: {e}")
        st.stop()
else:
    cols = []

all_col_names = [c.name for c in cols]

feature_options = [
    c.name
    for c in cols
    if c.name not in set(ID_COLS + [TARGET]) and not c.name.endswith("_label") and not c.name.endswith("_grid")
]
default_feature = "niveau_loyer" if "niveau_loyer" in feature_options else (feature_options[0] if feature_options else None)

numeric_features = [
    c.name
    for c in cols
    if c.kind == "numeric" and c.name not in set(ID_COLS + [TARGET]) and not c.name.endswith("_grid") and not c.name.endswith("_label")
]
categorical_features = [
    c.name
    for c in cols
    if c.kind == "categorical" and c.name not in set(ID_COLS + [TARGET]) and not c.name.endswith("_grid") and not c.name.endswith("_label")
]

tabs = st.tabs(["Explorer une feature", "Petit modèle + importance"])


with tabs[0]:
    st.subheader("Explorer une feature")
    if not token_present:
        st.stop()
    if not (numeric_features or categorical_features):
        st.error("Aucune feature disponible (schema introuvable ou table vide).")
        st.stop()

    feature_type = st.radio("Type de feature", options=["Numérique", "Catégorielle"], horizontal=True)
    if feature_type == "Numérique":
        st.caption("Une **feature numérique** est une valeur continue/discrète (ex: population, prix). On peut calculer corrélations et tracer une droite.")
        feature = st.selectbox(
            "Feature numérique",
            options=numeric_features,
            index=numeric_features.index(default_feature) if default_feature in numeric_features else 0,
        )
    else:
        st.caption("Une **feature catégorielle** est une modalité (ex: classes de densité). On compare les distributions par catégorie (boxplot, moyennes).")
        feature = st.selectbox(
            "Feature catégorielle",
            options=categorical_features,
            index=0,
        )

    select_cols = [*ID_COLS, TARGET, "total_housing_count", "densite_category", "population_2021", feature]
    select_cols = [c for c in select_cols if c in all_col_names]

    df = load_data(
        select_cols=select_cols,
        exit_rate_max=exit_rate_max,
        total_housing_min=total_housing_min,
        limit=limit,
        departments=departments,
        densite_category=densite_category,
        pop_min=pop_min,
        pop_max=pop_max,
    )

    if df.empty:
        st.warning("Aucune donnée avec ces filtres.")
        st.stop()

    st.caption(f"{len(df):,} lignes chargées.".replace(",", " "))

    st.subheader("Distribution de exit_rate_pct (dans le filtre)")
    hist = px.histogram(df, x=TARGET, nbins=30)
    hist.update_layout(height=260)
    st.plotly_chart(hist, width="stretch")

    if is_numeric_series(df[feature]):
        col1, col2 = st.columns([2, 1])
        with col2:
            log_x = st.checkbox("Échelle log (x)", value=False)
            if log_x and (df[feature].dropna() <= 0).any():
                st.info("Certaines valeurs <= 0: log désactivé.")
                log_x = False
            show_fit = st.checkbox("Afficher une droite de régression", value=True)

            pearson = corr_pair(df, feature, TARGET, "pearson")
            spearman = corr_pair(df, feature, TARGET, "spearman")
            st.metric("Corr. Pearson", fmt_float(pearson))
            st.metric("Corr. Spearman", fmt_float(spearman))

        with col1:
            fig = px.scatter(
                df,
                x=feature,
                y=TARGET,
                hover_data=[c for c in ID_COLS + ["total_housing_count", "densite_category"] if c in df.columns],
                opacity=0.7,
            )
            fig.update_layout(height=520)
            if log_x:
                fig.update_xaxes(type="log")
            if show_fit:
                add_linear_fit_line(fig, df, x_col=feature, y_col=TARGET, log_x=log_x)
            st.plotly_chart(fig, width="stretch")

        st.subheader("exit_rate_pct moyen par tranche de feature")
        # Deciles (or fewer if too many ties)
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
        view = make_categorical_view(df, feature, max_categories=25)
        fig = px.box(
            view,
            x=feature,
            y=TARGET,
            points="outliers",
        )
        fig.update_layout(height=520)
        st.plotly_chart(fig, width="stretch")

        counts = view[feature].value_counts(dropna=False).rename("count").reset_index().rename(columns={"index": feature})
        st.dataframe(counts, use_container_width=True, hide_index=True)

        st.subheader("exit_rate_pct moyen par catégorie (Top 25)")
        means = (
            view.groupby(feature, dropna=False)[TARGET]
            .agg(["mean", "count"])
            .reset_index()
            .sort_values(["count", "mean"], ascending=[False, True])
            .head(25)
        )
        fig3 = px.bar(means, x=feature, y="mean", hover_data=["count"])
        fig3.update_layout(height=320, yaxis_title="exit_rate_pct moyen")
        st.plotly_chart(fig3, width="stretch")

    st.subheader("Communes: plus faibles / plus fortes sorties (dans le filtre)")
    show_cols = unique_preserve_order(
        [c for c in [*ID_COLS, TARGET, feature, "total_housing_count", "densite_category", "population_2021"] if c in df.columns]
    )
    low = df.sort_values(TARGET, ascending=True).head(10)[show_cols]
    high = df.sort_values(TARGET, ascending=False).head(10)[show_cols]

    c1, c2 = st.columns(2)
    with c1:
        st.caption("Les plus faibles")
        st.dataframe(low, use_container_width=True, hide_index=True)
    with c2:
        st.caption("Les plus fortes")
        st.dataframe(high, use_container_width=True, hide_index=True)


with tabs[1]:
    st.subheader("Petit modèle + importance (régression)")
    if not token_present:
        st.stop()

    # Default: numeric columns only (excluding IDs + target)
    numeric_candidates = [
        c.name
        for c in cols
        if c.kind == "numeric" and c.name not in set(ID_COLS + [TARGET])
    ]
    default_features = [c for c in ["total_housing_count", "population_2021", "niveau_loyer", "dvg_marche_dynamisme"] if c in numeric_candidates]
    if not default_features:
        default_features = numeric_candidates[:10]

    model_limit = st.slider("Nombre de communes (LIMIT modèle)", min_value=200, max_value=10000, value=2000, step=200)

    st.caption("Sélectionne des **numériques** (valeurs) et/ou des **catégorielles** (modalités). Les catégorielles sont encodées en one-hot.")
    sel_num = st.multiselect("Features numériques (X)", options=numeric_features, default=[c for c in default_features if c in numeric_features])
    sel_cat = st.multiselect("Features catégorielles (X)", options=categorical_features, default=["densite_category"] if "densite_category" in categorical_features else [])
    selected_features = [*sel_num, *sel_cat]
    model_kind = st.selectbox(
        "Modèle",
        options=["RandomForestRegressor", "LinearRegression", "Ridge"],
        index=0,
    )
    use_perm = st.checkbox("Permutation importance (plus fiable mais plus lent)", value=False)
    top_n = st.slider("Top N", min_value=5, max_value=50, value=20, step=5)

    if not selected_features:
        st.info("Sélectionne au moins une feature.")
        st.stop()

    select_cols = [*ID_COLS, TARGET, *selected_features]
    select_cols = [c for c in select_cols if c in all_col_names]

    model_df = load_data(
        select_cols=select_cols,
        exit_rate_max=exit_rate_max,
        total_housing_min=total_housing_min,
        limit=model_limit,
        departments=departments,
        densite_category=densite_category,
        pop_min=pop_min,
        pop_max=pop_max,
    )
    model_df = model_df.dropna(subset=[TARGET])

    if len(model_df) < 50:
        st.warning("Pas assez de données pour entraîner un modèle (après filtres).")
        st.stop()

    X = model_df[selected_features]
    y = model_df[TARGET]

    num_cols = X.select_dtypes(include=[np.number]).columns.tolist()
    cat_cols = [c for c in X.columns if c not in num_cols]

    if model_kind in ("LinearRegression", "Ridge"):
        numeric_transformer = Pipeline(
            steps=[
                ("imputer", SimpleImputer(strategy="median")),
                ("scaler", StandardScaler()),
            ]
        )
    else:
        numeric_transformer = Pipeline(steps=[("imputer", SimpleImputer(strategy="median"))])
    categorical_transformer = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="most_frequent")),
            ("onehot", OneHotEncoder(handle_unknown="ignore")),
        ]
    )

    preprocessor = ColumnTransformer(
        transformers=[
            ("num", numeric_transformer, num_cols),
            ("cat", categorical_transformer, cat_cols),
        ],
        remainder="drop",
    )

    if model_kind == "RandomForestRegressor":
        model = RandomForestRegressor(
            n_estimators=300,
            random_state=42,
            n_jobs=1,
        )
    elif model_kind == "Ridge":
        model = Ridge(alpha=1.0, random_state=42)
    else:
        model = LinearRegression()

    pipe = Pipeline(steps=[("preprocess", preprocessor), ("model", model)])

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    with st.spinner("Entraînement du modèle..."):
        pipe.fit(X_train, y_train)

    preds = pipe.predict(X_test)
    r2 = r2_score(y_test, preds)
    mae = mean_absolute_error(y_test, preds)

    m1, m2, m3 = st.columns(3)
    m1.metric("R² (test)", fmt_float(float(r2)))
    m2.metric("MAE (points de %)", fmt_float(float(mae)))
    m3.metric("Lignes (après filtres)", f"{len(model_df):,}".replace(",", " "))

    with st.spinner("Calcul des importances..."):
        if use_perm:
            pi = permutation_importance(pipe, X_test, y_test, n_repeats=8, random_state=42, n_jobs=1)
            importances = pi.importances_mean
            names = X.columns.tolist()
            # Permutation importance on pipeline uses raw feature columns.
            # For categorical columns, this importance is "global" on the raw column.
            imp_df = pd.DataFrame({"feature": names, "importance": importances})
        else:
            feature_names = pipe.named_steps["preprocess"].get_feature_names_out()
            feature_names = [feature_name_simplify(n) for n in feature_names]
            if model_kind == "RandomForestRegressor":
                importances = pipe.named_steps["model"].feature_importances_
            else:
                # Linear models: coefficients (magnitude)
                coefs = pipe.named_steps["model"].coef_
                importances = np.abs(np.asarray(coefs))
            imp_df = pd.DataFrame({"feature": feature_names, "importance": importances})

    imp_df = imp_df.sort_values("importance", ascending=False).head(top_n)
    fig = px.bar(imp_df, x="importance", y="feature", orientation="h")
    fig.update_layout(height=520, yaxis={"categoryorder": "total ascending"})
    st.plotly_chart(fig, width="stretch")
    st.dataframe(imp_df, use_container_width=True, hide_index=True)



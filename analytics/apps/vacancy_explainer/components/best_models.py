from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import pandas as pd
import streamlit as st
from sklearn.ensemble import ExtraTreesClassifier, ExtraTreesRegressor, RandomForestClassifier, RandomForestRegressor
from sklearn.metrics import roc_auc_score
from sklearn.model_selection import RandomizedSearchCV, train_test_split
from sklearn.pipeline import Pipeline

from components.ml_utils import build_preprocessor, eval_regression, split_feature_types


def convert_na_to_nan(df: pd.DataFrame) -> pd.DataFrame:
    """Convert pandas NA values to numpy NaN for sklearn compatibility.
    
    Sklearn's SimpleImputer cannot handle pd.NA (boolean value of NA is ambiguous).
    This function converts all nullable pandas dtypes to numpy-compatible dtypes.
    
    DuckDB returns pyarrow-backed types which use pd.NA for missing values.
    This function aggressively converts all columns to numpy-native types.
    """
    result = pd.DataFrame(index=df.index)
    
    for col in df.columns:
        series = df[col]
        na_mask = series.isna()
        has_na = na_mask.any()
        
        # Determine target type based on data
        if pd.api.types.is_bool_dtype(series):
            # Boolean with NA -> object with True/False/np.nan
            if has_na:
                # Convert non-NA to bool, then to object array with np.nan
                arr = np.where(na_mask, np.nan, series.fillna(False).astype(bool))
                result[col] = pd.array(arr, dtype=object)
            else:
                result[col] = series.astype(bool).values
        elif pd.api.types.is_integer_dtype(series) or pd.api.types.is_float_dtype(series) or pd.api.types.is_numeric_dtype(series):
            # Numeric with NA -> float64 (np.nan requires float)
            try:
                result[col] = pd.to_numeric(series, errors='coerce').astype('float64').values
            except Exception:
                # Fallback for problematic types
                arr = np.full(len(series), np.nan, dtype='float64')
                non_na = ~na_mask
                arr[non_na] = series[non_na].astype(float).values
                result[col] = arr
        else:
            # Categorical, string, object -> object with np.nan for missing
            # Convert to string first (handles pyarrow strings), then to object
            try:
                arr = series.astype(str).values.astype(object)
                # Restore NaN values (astype(str) converts NA to 'nan' or '<NA>')
                arr[na_mask.values] = np.nan
                result[col] = arr
            except Exception:
                # Ultimate fallback: iterate
                values = np.empty(len(series), dtype=object)
                for i, (v, is_na) in enumerate(zip(series, na_mask)):
                    values[i] = np.nan if is_na else v
                result[col] = values
    
    return result


@dataclass(frozen=True)
class TrainedModel:
    pipe: Pipeline
    features: list[str]
    metrics: dict[str, float]
    kind: str  # "regression" | "classification"


def _pick_existing(all_cols: list[str], candidates: list[str]) -> list[str]:
    return [c for c in candidates if c in set(all_cols)]


def build_default_city_feature_set(all_cols: list[str]) -> list[str]:
    candidates = [
        "total_housing_count",
        "population_2021",
        "densite_category",
        "niveau_loyer",
        "dvg_marche_dynamisme",
        "vacancy_rate_vs_menages_pct",
        "vacant_housing_per_1000_pop",
        "taux_tfb",
        "taux_th",
        "pression_fiscale_tfb_teom",
        "taux_artificialisation_pct",
        "evolution_prix_maisons_2019_2023_pct",
        "evolution_prix_appartements_2019_2023_pct",
    ]
    feats = _pick_existing(all_cols, candidates)
    # always keep at least something
    return feats


def build_default_housing_feature_set(all_cols: list[str]) -> list[str]:
    candidates = [
        "years_in_vacancy",
        "living_area",
        "building_year",
        "vacancy_duration_category",
        "housing_kind",
        "is_energy_sieve",
        "taxed",
        "uncomfortable",
        "beneficiary_count",
        "rental_value",
        "densite_category",
        "population_2021",
        "niveau_loyer",
        "dvg_marche_dynamisme",
    ]
    feats = _pick_existing(all_cols, candidates)
    return feats


@st.cache_resource(show_spinner=False)
def train_best_city_regressor(df: pd.DataFrame, *, features: list[str]) -> TrainedModel:
    df = df.dropna(subset=["exit_rate_pct"])
    X = convert_na_to_nan(df[features])
    y = df["exit_rate_pct"].astype(float)
    num_cols, cat_cols = split_feature_types(X)
    pre = build_preprocessor(num_cols=num_cols, cat_cols=cat_cols, scale_numeric=False)

    models = [
        ("RandomForestRegressor", RandomForestRegressor(random_state=42, n_jobs=2)),
        ("ExtraTreesRegressor", ExtraTreesRegressor(random_state=42, n_jobs=2)),
    ]
    # one small search per model (bounded)
    param_dist = {
        "model__n_estimators": [400, 800],
        "model__max_depth": [None, 20, 40],
        "model__min_samples_leaf": [1, 2, 4],
        "model__max_features": ["sqrt", 0.6, 0.9],
    }

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    best = None
    best_score = -1e9
    best_name = ""
    for name, model in models:
        pipe = Pipeline([("preprocess", pre), ("model", model)])
        search = RandomizedSearchCV(pipe, param_distributions=param_dist, n_iter=10, cv=3, scoring="r2", random_state=42, n_jobs=1)
        search.fit(X_train, y_train)
        score = float(search.best_score_)
        if score > best_score:
            best_score = score
            best = search.best_estimator_
            best_name = name

    assert best is not None
    preds = best.predict(X_test)
    metrics = eval_regression(y_test, preds)
    metrics["cv_r2"] = float(best_score)
    return TrainedModel(pipe=best, features=features, metrics=metrics, kind=f"regression:{best_name}")


@st.cache_resource(show_spinner=False)
def train_best_housing_classifier(df: pd.DataFrame, *, features: list[str]) -> TrainedModel:
    df = df.dropna(subset=["is_housing_out"])
    X = convert_na_to_nan(df[features])
    y = df["is_housing_out"].astype(int)
    num_cols, cat_cols = split_feature_types(X)
    pre = build_preprocessor(num_cols=num_cols, cat_cols=cat_cols, scale_numeric=False)

    models = [
        ("RandomForestClassifier", RandomForestClassifier(random_state=42, n_jobs=2, class_weight="balanced")),
        ("ExtraTreesClassifier", ExtraTreesClassifier(random_state=42, n_jobs=2, class_weight="balanced")),
    ]
    param_dist = {
        "model__n_estimators": [400, 800],
        "model__max_depth": [None, 20, 40],
        "model__min_samples_leaf": [1, 2, 4],
        "model__max_features": ["sqrt", 0.6, 0.9],
    }

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

    best = None
    best_score = -1e9
    best_name = ""
    for name, model in models:
        pipe = Pipeline([("preprocess", pre), ("model", model)])
        search = RandomizedSearchCV(pipe, param_distributions=param_dist, n_iter=10, cv=3, scoring="roc_auc", random_state=42, n_jobs=1)
        search.fit(X_train, y_train)
        score = float(search.best_score_)
        if score > best_score:
            best_score = score
            best = search.best_estimator_
            best_name = name

    assert best is not None
    proba = best.predict_proba(X_test)[:, 1]
    metrics = {"roc_auc": float(roc_auc_score(y_test, proba)), "cv_roc_auc": float(best_score)}
    return TrainedModel(pipe=best, features=features, metrics=metrics, kind=f"classification:{best_name}")


def local_what_if_deltas(
    *,
    pipe: Pipeline,
    row: pd.DataFrame,
    baseline: pd.Series,
    features: list[str],
) -> pd.DataFrame:
    """Local explanation: delta in predicted proba when setting each feature to baseline."""
    row_clean = convert_na_to_nan(row[features])
    base_proba = float(pipe.predict_proba(row_clean)[:, 1][0])
    rows = []
    for f in features:
        tmp = row_clean.copy()
        tmp.loc[tmp.index[0], f] = baseline[f]
        p = float(pipe.predict_proba(tmp)[:, 1][0])
        rows.append({"feature": f, "delta_proba": base_proba - p})
    return pd.DataFrame(rows).sort_values("delta_proba", ascending=False)


def compute_baseline_from_df(df: pd.DataFrame, features: list[str]) -> pd.Series:
    """Median for numeric, mode for categorical."""
    df_clean = convert_na_to_nan(df[features])
    base = {}
    for f in features:
        s = df_clean[f]
        if pd.api.types.is_numeric_dtype(s):
            base[f] = float(np.nanmedian(s.to_numpy(dtype=float)))
        else:
            m = s.dropna().astype(str)
            base[f] = (m.mode().iloc[0] if not m.empty else None)
    return pd.Series(base)



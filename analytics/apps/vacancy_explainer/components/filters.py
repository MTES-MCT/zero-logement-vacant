from __future__ import annotations

from dataclasses import dataclass

import streamlit as st


@dataclass(frozen=True)
class CityFilters:
    exit_rate_max: float | None
    total_housing_min: int | None
    densite_category: str | None
    pop_min: int | None
    pop_max: int | None
    departments: tuple[str, ...] | None


@dataclass(frozen=True)
class HousingFilters:
    departments: tuple[str, ...] | None
    densite_category: str | None
    pop_min: int | None
    pop_max: int | None
    vacancy_duration_category: str | None
    housing_kind: str | None


def render_departments_filter(*, label: str = "Départements (métropole)", key: str | None = None) -> tuple[str, ...] | None:
    dept_options = [f"{i:02d}" for i in range(1, 96)]
    dept_selected = st.multiselect(
        label,
        options=dept_options,
        default=[],
        help="Basé sur les 2 premiers caractères de `geo_code` (INSEE commune).",
        key=key,
    )
    return tuple(dept_selected) if dept_selected else None


def render_city_filters(*, densite_options: list[str], key_prefix: str = "") -> CityFilters:
    st.subheader("Filtres (communes)")
    exit_rate_max = st.slider(
        "exit_rate_pct max",
        min_value=0.0,
        max_value=100.0,
        value=20.0,
        step=1.0,
        key=f"{key_prefix}exit_rate_max",
    )
    total_housing_min = st.slider(
        "total_housing_count min",
        min_value=0,
        max_value=5000,
        value=50,
        step=10,
        key=f"{key_prefix}total_housing_min",
    )

    densite_category = st.selectbox(
        "densite_category",
        options=["(toutes)"] + densite_options,
        index=0,
        key=f"{key_prefix}densite_category",
    )
    if densite_category == "(toutes)":
        densite_category = None

    pop_min = st.number_input(
        "population_2021 min (optionnel)",
        min_value=0,
        value=0,
        step=1000,
        key=f"{key_prefix}pop_min",
    )
    pop_max = st.number_input(
        "population_2021 max (optionnel)",
        min_value=0,
        value=0,
        step=1000,
        key=f"{key_prefix}pop_max",
    )
    if pop_min == 0:
        pop_min = None
    if pop_max == 0:
        pop_max = None

    departments = render_departments_filter(key=f"{key_prefix}departments")

    return CityFilters(
        exit_rate_max=exit_rate_max,
        total_housing_min=total_housing_min,
        densite_category=densite_category,
        pop_min=pop_min,
        pop_max=pop_max,
        departments=departments,
    )


def render_housing_filters(
    *,
    densite_options: list[str],
    vacancy_duration_options: list[str],
    housing_kind_options: list[str],
    key_prefix: str = "",
) -> HousingFilters:
    st.subheader("Filtres (logements)")

    densite_category = st.selectbox(
        "densite_category",
        options=["(toutes)"] + densite_options,
        index=0,
        key=f"{key_prefix}densite_category",
    )
    if densite_category == "(toutes)":
        densite_category = None

    pop_min = st.number_input(
        "population_2021 min (optionnel)",
        min_value=0,
        value=0,
        step=1000,
        key=f"{key_prefix}pop_min",
    )
    pop_max = st.number_input(
        "population_2021 max (optionnel)",
        min_value=0,
        value=0,
        step=1000,
        key=f"{key_prefix}pop_max",
    )
    if pop_min == 0:
        pop_min = None
    if pop_max == 0:
        pop_max = None

    vacancy_duration_category = st.selectbox(
        "vacancy_duration_category",
        options=["(toutes)"] + vacancy_duration_options,
        index=0,
        key=f"{key_prefix}vacancy_duration_category",
    )
    if vacancy_duration_category == "(toutes)":
        vacancy_duration_category = None

    housing_kind = st.selectbox(
        "housing_kind",
        options=["(tous)"] + housing_kind_options,
        index=0,
        key=f"{key_prefix}housing_kind",
    )
    if housing_kind == "(tous)":
        housing_kind = None

    departments = render_departments_filter(label="Départements (métropole) — logements", key=f"{key_prefix}departments")

    return HousingFilters(
        departments=departments,
        densite_category=densite_category,
        pop_min=pop_min,
        pop_max=pop_max,
        vacancy_duration_category=vacancy_duration_category,
        housing_kind=housing_kind,
    )



#!/usr/bin/env python3
"""Compatibility CLI for the importable Dagster location calculator."""

from __future__ import annotations

import sys
from pathlib import Path

_DAGSTER_ROOT = Path(__file__).resolve().parents[4] / "analytics" / "dagster"
if str(_DAGSTER_ROOT) not in sys.path:
    sys.path.insert(0, str(_DAGSTER_ROOT))

from src.owner_housing_locations.calculator import (  # noqa: E402
    DistanceCalculator,
    LocationComputationReport,
    LocationScope,
    calculate_owner_housing_locations,
    main,
)

__all__ = [
    "DistanceCalculator",
    "LocationComputationReport",
    "LocationScope",
    "calculate_owner_housing_locations",
    "main",
]


if __name__ == "__main__":
    main()

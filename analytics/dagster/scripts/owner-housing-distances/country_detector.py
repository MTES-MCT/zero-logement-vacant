"""Compatibility import for the Dagster country detector."""

from __future__ import annotations

import sys
from pathlib import Path

DAGSTER_ROOT = Path(__file__).resolve().parents[2]
if str(DAGSTER_ROOT) not in sys.path:
    sys.path.insert(0, str(DAGSTER_ROOT))

from src.owner_housing_locations.country_detector import (  # noqa: E402
    CountryDetectionResult,
    CountryDetector,
)

__all__ = ["CountryDetectionResult", "CountryDetector"]

#!/usr/bin/env python3
"""Compatibility entrypoint for the canonical Dagster location calculator."""

from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

_SCRIPT = (
    Path(__file__).resolve().parents[4]
    / "analytics"
    / "dagster"
    / "scripts"
    / "owner-housing-distances"
    / "calculate_distances.py"
)
_SPEC = importlib.util.spec_from_file_location("zlv_owner_housing_calculator", _SCRIPT)
_MODULE = importlib.util.module_from_spec(_SPEC)
if _SPEC.loader is None:
    raise RuntimeError(f"Cannot load {_SCRIPT}")
sys.modules[_SPEC.name] = _MODULE
_SPEC.loader.exec_module(_MODULE)

globals().update(
    {name: value for name, value in vars(_MODULE).items() if not name.startswith("__")}
)

if __name__ == "__main__":
    _MODULE.main()
else:
    sys.modules[__name__] = _MODULE

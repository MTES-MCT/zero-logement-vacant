import importlib.util
import sys
from pathlib import Path
from unittest.mock import MagicMock

PROJECT_ROOT = Path(__file__).parent.parent


def _load_backfill_module():
    module_name = "backfill_ban_owners_targeting_test"
    spec = importlib.util.spec_from_file_location(
        module_name, PROJECT_ROOT / "scripts" / "backfill_ban_owners.py"
    )
    module = importlib.util.module_from_spec(spec)
    sys.modules[module_name] = module
    spec.loader.exec_module(module)
    return module


def test_housing_lovac_targets_only_active_owner_links():
    backfill = _load_backfill_module()

    query, _ = backfill.housing_lovac_build_query("lovac-2026")

    assert "AND oh.rank >= 1" in query


def test_housing_lovac_builds_missing_targets_without_forcing_rebuild():
    backfill = _load_backfill_module()
    lookup_cursor = MagicMock()
    lookup_cursor.fetchone.return_value = (None,)
    build_cursor = MagicMock()
    count_cursor = MagicMock()
    count_cursor.fetchone.return_value = (12,)

    def cursor_context(cursor):
        context = MagicMock()
        context.__enter__.return_value = cursor
        context.__exit__.return_value = False
        return context

    connection = MagicMock()
    connection.cursor.side_effect = [
        cursor_context(lookup_cursor),
        cursor_context(build_cursor),
        cursor_context(count_cursor),
    ]

    backfill.ensure_targets(
        connection,
        "lovac-2026",
        rebuild=False,
    )

    expected_query, expected_params = backfill.housing_lovac_build_query("lovac-2026")
    lookup_cursor.execute.assert_called_once_with(
        "SELECT to_regclass(%s)", ("ban_backfill_targets_lovac_2026",)
    )
    build_cursor.execute.assert_any_call(expected_query, expected_params)
    connection.commit.assert_called_once_with()

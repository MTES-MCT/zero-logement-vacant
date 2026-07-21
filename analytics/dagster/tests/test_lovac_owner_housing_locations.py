import importlib.util
import sys
from pathlib import Path
from types import ModuleType
from types import SimpleNamespace
from unittest.mock import MagicMock, Mock

import pytest

PROJECT_ROOT = Path(__file__).parent.parent
ESTABLISHMENT_ID = "00000000-0000-0000-0000-000000000001"


def _load_asset_module():
    for package_name, package_path in (
        ("src", PROJECT_ROOT / "src"),
        ("src.assets", PROJECT_ROOT / "src" / "assets"),
        ("src.assets.lovac", PROJECT_ROOT / "src" / "assets" / "lovac"),
    ):
        package = ModuleType(package_name)
        package.__path__ = [str(package_path)]
        sys.modules[package_name] = package

    config_spec = importlib.util.spec_from_file_location(
        "src.config", PROJECT_ROOT / "src" / "config.py"
    )
    config_module = importlib.util.module_from_spec(config_spec)
    sys.modules["src.config"] = config_module
    config_spec.loader.exec_module(config_module)

    module_name = "src.assets.lovac.owner_housing_locations"
    spec = importlib.util.spec_from_file_location(
        module_name,
        PROJECT_ROOT / "src" / "assets" / "lovac" / "owner_housing_locations.py",
    )
    module = importlib.util.module_from_spec(spec)
    sys.modules[module_name] = module
    spec.loader.exec_module(module)
    return module


asset_module = _load_asset_module()


def _load_backfill_module():
    module_name = "backfill_ban_owners_test"
    spec = importlib.util.spec_from_file_location(
        module_name, PROJECT_ROOT / "scripts" / "backfill_ban_owners.py"
    )
    module = importlib.util.module_from_spec(spec)
    sys.modules[module_name] = module
    spec.loader.exec_module(module)
    return module


def _compute(asset):
    return asset.op.compute_fn.decorated_fn


def _location_context(*, dry_run: bool = False):
    return SimpleNamespace(
        op_config={
            "data_file_year": "lovac-2026",
            "establishment_id": ESTABLISHMENT_ID,
            "geo_codes": [],
            "allow_full_year": False,
            "dry_run": dry_run,
            "force": False,
            "limit": 0,
            "batch_size": 100,
            "num_workers": 1,
        },
        log=SimpleNamespace(info=Mock()),
    )


def _backfill_context(**overrides):
    config = {
        "data_file_year": "lovac-2026",
        "establishment_id": ESTABLISHMENT_ID,
        "geo_codes": [],
        "allow_full_year": False,
        "dry_run": False,
        "rebuild_targets": True,
        "limit": 500,
        "workers": 2,
        "chunk": 100,
        "fetch_batch": 500,
    }
    config.update(overrides)
    return SimpleNamespace(
        op_config=config,
        log=SimpleNamespace(info=Mock(), warning=Mock()),
    )


def _quality_context(**overrides):
    config = {
        "data_file_year": "lovac-2026",
        "establishment_id": ESTABLISHMENT_ID,
        "geo_codes": [],
        "allow_full_year": False,
        "min_coverage_ratio": 0.95,
        "fail_on_low_coverage": True,
    }
    config.update(overrides)
    return SimpleNamespace(op_config=config)


def _report(**overrides):
    values = {
        "scope": {
            "data_file_year": "lovac-2026",
            "establishment_id": ESTABLISHMENT_ID,
            "geo_codes": [],
        },
        "dry_run": False,
        "force": False,
        "limit": None,
        "candidate_count": 1,
        "processed_pairs": 1,
        "updates_prepared": 1,
        "updated_pairs": 1,
        "errors": 0,
        "classification_counts": {"1": 1},
        "stats": {},
    }
    values.update(overrides)
    return SimpleNamespace(to_dict=lambda: values)


def test_owner_housing_location_module_loads_dataclasses():
    sys.modules.pop("owner_housing_location_calculator", None)

    module = asset_module._owner_housing_location_module()

    assert sys.modules["owner_housing_location_calculator"] is module
    assert module.LocationScope(data_file_year="lovac-2026").geo_codes == ()


def test_runtime_script_fails_when_packaged_path_is_missing(tmp_path):
    relative_path = Path("scripts/missing.py")

    with pytest.raises(
        RuntimeError, match="Required Dagster runtime script is missing"
    ):
        asset_module._runtime_script(relative_path, runtime_root=tmp_path)


def test_location_asset_fails_real_run_when_report_contains_errors(monkeypatch):
    calculator = SimpleNamespace(
        calculate_owner_housing_locations=Mock(return_value=_report(errors=1))
    )
    monkeypatch.setattr(
        asset_module, "_owner_housing_location_module", lambda: calculator
    )
    monkeypatch.setattr(asset_module, "_database_url", lambda: "postgresql://unused")
    compute = _compute(asset_module.lovac_owner_housing_locations)
    context = _location_context()

    with pytest.raises(asset_module.Failure, match="reported 1 processing error"):
        compute(context, None)


def test_location_asset_fails_dry_run_when_report_contains_errors(monkeypatch):
    calculator = SimpleNamespace(
        calculate_owner_housing_locations=Mock(return_value=_report(errors=1))
    )
    monkeypatch.setattr(
        asset_module, "_owner_housing_location_module", lambda: calculator
    )
    monkeypatch.setattr(asset_module, "_database_url", lambda: "postgresql://unused")
    compute = _compute(asset_module.lovac_owner_housing_locations)
    context = _location_context(dry_run=True)

    with pytest.raises(asset_module.Failure, match="reported 1 processing error"):
        compute(context, None)


def test_location_asset_fails_real_run_when_updates_are_incomplete(monkeypatch):
    calculator = SimpleNamespace(
        calculate_owner_housing_locations=Mock(
            return_value=_report(updates_prepared=2, updated_pairs=1)
        )
    )
    monkeypatch.setattr(
        asset_module, "_owner_housing_location_module", lambda: calculator
    )
    monkeypatch.setattr(asset_module, "_database_url", lambda: "postgresql://unused")
    compute = _compute(asset_module.lovac_owner_housing_locations)
    context = _location_context()

    with pytest.raises(asset_module.Failure, match="prepared 2 updates but wrote 1"):
        compute(context, None)


@pytest.mark.parametrize("data_file_year", ["", "2026", "lovac-current", "lovac-26"])
def test_scope_rejects_invalid_lovac_year(data_file_year):
    config = _location_context().op_config | {"data_file_year": data_file_year}

    with pytest.raises(asset_module.Failure, match="Invalid LOVAC data_file_year"):
        asset_module._scope_from_config(config)


@pytest.mark.parametrize(
    "config_override",
    [
        {"establishment_id": "not-a-uuid"},
        {"establishment_id": "", "geo_codes": ["1234"]},
        {"establishment_id": "", "geo_codes": ["2C001"]},
    ],
)
def test_scope_rejects_malformed_identifiers(config_override):
    config = _location_context().op_config | config_override

    with pytest.raises(asset_module.Failure, match="Invalid LOVAC scope"):
        asset_module._scope_from_config(config)


def test_scope_query_uses_gin_array_containment():
    where_sql, params = asset_module._scope_where(_location_context().op_config)

    assert "h.data_file_years @> ARRAY[%(data_file_year)s]::text[]" in where_sql
    assert params["data_file_year"] == "lovac-2026"


def test_quality_check_rejects_scope_different_from_location_report(monkeypatch):
    connect = Mock()
    monkeypatch.setattr(asset_module.psycopg2, "connect", connect)
    report = _report(
        scope={
            "data_file_year": "lovac-2025",
            "establishment_id": ESTABLISHMENT_ID,
            "geo_codes": [],
        }
    ).to_dict()
    compute = _compute(asset_module.lovac_owner_housing_location_quality_check)
    context = _quality_context()

    with pytest.raises(asset_module.Failure, match="scope does not match"):
        compute(context, report)

    connect.assert_not_called()


def test_quality_check_fails_when_scope_contains_no_pairs(monkeypatch):
    cursor = MagicMock()
    cursor.__enter__.return_value = cursor
    cursor.fetchone.return_value = (0, 0, 0, 0, 0, 0, 0)
    connection = MagicMock()
    connection.__enter__.return_value = connection
    connection.cursor.return_value = cursor
    monkeypatch.setattr(asset_module.psycopg2, "connect", Mock(return_value=connection))
    monkeypatch.setattr(asset_module, "_database_url", lambda: "postgresql://unused")
    compute = _compute(asset_module.lovac_owner_housing_location_quality_check)
    context = _quality_context()
    report = _report().to_dict()

    with pytest.raises(
        asset_module.Failure, match="scope contains no owner-housing pairs"
    ):
        compute(context, report)


def test_quality_check_excludes_unknown_locations_and_ban_sentinels(monkeypatch):
    cursor = MagicMock()
    cursor.__enter__.return_value = cursor
    cursor.fetchone.return_value = (10, 9, 1, 2, 1, 3, 4)
    connection = MagicMock()
    connection.__enter__.return_value = connection
    connection.cursor.return_value = cursor
    monkeypatch.setattr(asset_module.psycopg2, "connect", Mock(return_value=connection))
    monkeypatch.setattr(asset_module, "_database_url", lambda: "postgresql://unused")
    compute = _compute(asset_module.lovac_owner_housing_location_quality_check)
    context = _quality_context(fail_on_low_coverage=False)
    report = _report().to_dict()

    output = compute(context, report)

    query = cursor.execute.call_args.args[0]
    assert "oh.locprop_relative_ban BETWEEN 0 AND 6" in query
    assert "oh.locprop_relative_ban = 7" in query
    assert "oba.ban_id IS NULL" in query
    assert "hba.ban_id IS NULL" in query
    assert output.value["coverage_ratio"] == pytest.approx(0.9)
    assert output.value["owner_ban_missing_pairs"] == 3
    assert output.value["housing_ban_missing_pairs"] == 4


def test_backfill_fetch_limit_never_exceeds_remaining_global_limit():
    backfill = _load_backfill_module()

    assert backfill.next_fetch_limit(20_000, limit=5_000, processed=0) == 5_000
    assert backfill.next_fetch_limit(20_000, limit=5_000, processed=4_750) == 250


def test_backfill_slice_error_aborts_batch_before_cursor_can_advance(monkeypatch):
    backfill = _load_backfill_module()
    frame = backfill.pd.DataFrame([{"ref_id": "owner-1"}, {"ref_id": "owner-2"}])
    monkeypatch.setattr(
        backfill,
        "call_ban_api",
        Mock(side_effect=[frame.iloc[:1], RuntimeError("BAN unavailable")]),
    )

    with pytest.raises(RuntimeError, match="BAN unavailable"):
        backfill.geocode_parallel(frame, chunk=1, workers=1, api_url="unused")


def test_backfill_targets_and_cursor_are_isolated_by_scope(tmp_path, monkeypatch):
    backfill = _load_backfill_module()
    monkeypatch.chdir(tmp_path)

    first_table = backfill._targets_table("lovac-2026", ESTABLISHMENT_ID, ("38200",))
    same_table = backfill._targets_table("lovac-2026", ESTABLISHMENT_ID, ("38200",))
    other_table = backfill._targets_table("lovac-2026", ESTABLISHMENT_ID, ("75056",))

    assert first_table == same_table
    assert first_table != other_table
    assert backfill.cursor_file(
        "housing-lovac", "lovac-2026", ESTABLISHMENT_ID, ("38200",)
    ) != backfill.cursor_file(
        "housing-lovac", "lovac-2026", ESTABLISHMENT_ID, ("75056",)
    )


def test_backfill_cursor_rejects_path_traversal(tmp_path, monkeypatch):
    backfill = _load_backfill_module()
    monkeypatch.chdir(tmp_path)

    with pytest.raises(ValueError, match="Unsafe cursor path"):
        backfill.cursor_file("housing-lovac", "../../outside")


def test_scoped_housing_backfill_build_query_filters_target_housings():
    backfill = _load_backfill_module()

    query, params = backfill.housing_lovac_build_query(
        "lovac-2026",
        ESTABLISHMENT_ID,
        ("38200", "38544"),
    )

    assert "fh.data_file_years @> ARRAY[%(data_source)s]::text[]" in query
    assert "establishments" in query
    assert "fh.geo_code = ANY(%(geo_codes)s::text[])" in query
    assert params == {
        "data_source": "lovac-2026",
        "establishment_id": ESTABLISHMENT_ID,
        "geo_codes": ["38200", "38544"],
    }


def test_backfill_asset_passes_scope_and_rebuilds_targets(monkeypatch):
    completed = SimpleNamespace(returncode=0, stdout="ok", stderr="")
    run = Mock(return_value=completed)
    monkeypatch.setattr(asset_module.subprocess, "run", run)
    monkeypatch.setattr(
        asset_module,
        "_runtime_script",
        lambda relative_path: PROJECT_ROOT / "scripts" / "backfill_ban_owners.py",
    )

    _compute(asset_module.lovac_owner_ban_backfill)(_backfill_context())

    command = run.call_args.args[0]
    assert command[command.index("--establishment-id") + 1] == ESTABLISHMENT_ID
    assert "--rebuild-targets" in command
    assert "--reset" in command


def test_scoped_backfill_allows_all_candidates_without_full_year_opt_in(monkeypatch):
    completed = SimpleNamespace(returncode=0, stdout="ok", stderr="")
    run = Mock(return_value=completed)
    monkeypatch.setattr(asset_module.subprocess, "run", run)
    monkeypatch.setattr(
        asset_module,
        "_runtime_script",
        lambda relative_path: PROJECT_ROOT / "scripts" / "backfill_ban_owners.py",
    )
    context = _backfill_context(limit=0, allow_full_year=False)

    _compute(asset_module.lovac_owner_ban_backfill)(context)

    assert "--limit" not in run.call_args.args[0]

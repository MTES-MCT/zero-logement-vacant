import sys

from src.assets.lovac.owner_housing_locations import _owner_housing_location_module


def test_owner_housing_location_module_loads_dataclasses():
    sys.modules.pop("owner_housing_location_calculator", None)

    module = _owner_housing_location_module()

    assert sys.modules["owner_housing_location_calculator"] is module
    assert module.LocationScope(data_file_year="lovac-2026").geo_codes == ()

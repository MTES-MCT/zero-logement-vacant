import polars as pl
import pytest

from src.owners.transform import transform_owners, map_entity


YEAR = "lovac-2026"


def _source_frame(**overrides) -> pl.LazyFrame:
    row = {
        "owner_uid": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        "idpersonne": "ABC12345678",
        "full_name": "Jean Dupont",
        "username": None,
        "address_dgfip": "1 rue de la Paix",
        "ownership_type": "Particulier",
        "birth_date": "1980-01-01",
        "siren": None,
        "entity": None,
        **overrides,
    }
    return pl.LazyFrame([row])


def _empty_existing() -> pl.DataFrame:
    return pl.DataFrame(schema={
        "id": pl.Utf8,
        "idpersonne": pl.Utf8,
        "data_source": pl.Utf8,
        "email": pl.Utf8,
        "phone": pl.Utf8,
        "administrator": pl.Utf8,
        "additional_address": pl.Utf8,
    })


def _existing_owner(**overrides) -> pl.DataFrame:
    row = {
        "id": "existing-uuid",
        "idpersonne": "ABC12345678",
        "full_name": "Old Name",
        "data_source": "lovac-2025",
        "email": "keep@example.com",
        "phone": "0600000000",
        "administrator": "admin-123",
        "additional_address": "Apt 4B",
        **overrides,
    }
    return pl.DataFrame([row])


class TestCreateOwners:
    def test_uses_owner_uid_as_id(self):
        to_create, to_update = transform_owners(
            _source_frame(), _empty_existing(), YEAR
        )
        assert to_create.height == 1
        assert to_update.height == 0
        assert to_create["id"][0] == "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"

    def test_sets_data_source_to_year(self):
        to_create, _ = transform_owners(
            _source_frame(), _empty_existing(), YEAR
        )
        assert to_create["data_source"][0] == YEAR

    def test_maps_null_entity_to_personnes_physiques(self):
        to_create, _ = transform_owners(
            _source_frame(entity=None), _empty_existing(), YEAR
        )
        assert to_create["entity"][0] == "personnes-physiques"

    def test_maps_entity_code_0(self):
        to_create, _ = transform_owners(
            _source_frame(entity="0"), _empty_existing(), YEAR
        )
        assert to_create["entity"][0] == "personnes-morales-non-remarquables"

    def test_maps_entity_code_4(self):
        to_create, _ = transform_owners(
            _source_frame(entity="4"), _empty_existing(), YEAR
        )
        assert to_create["entity"][0] == "commune"

    def test_maps_entity_code_0A(self):
        to_create, _ = transform_owners(
            _source_frame(entity="0A"), _empty_existing(), YEAR
        )
        assert to_create["entity"][0] == "personnes-morales-non-remarquables"


class TestUpdateOwners:
    def test_uses_owner_uid_as_id_not_existing(self):
        _, to_update = transform_owners(
            _source_frame(owner_uid="new-uuid-from-source"),
            _existing_owner(),
            YEAR,
        )
        assert to_update.height == 1
        assert to_update["id"][0] == "new-uuid-from-source"

    def test_carries_existing_email(self):
        _, to_update = transform_owners(
            _source_frame(), _existing_owner(email="keep@test.fr"), YEAR
        )
        assert to_update["email"][0] == "keep@test.fr"

    def test_carries_existing_phone(self):
        _, to_update = transform_owners(
            _source_frame(), _existing_owner(phone="0612345678"), YEAR
        )
        assert to_update["phone"][0] == "0612345678"

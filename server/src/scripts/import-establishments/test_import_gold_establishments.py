#!/usr/bin/env python3
"""
Unit tests for import_gold_establishments.py

Run with:
    pytest test_import_gold_establishments.py -v
    pytest test_import_gold_establishments.py -v -k "test_parse_siren"
"""

import pytest
from unittest.mock import MagicMock, patch
from import_gold_establishments import EstablishmentImporter


class TestParseSiren:
    """Tests for SIREN parsing logic."""

    @pytest.fixture
    def importer(self):
        """Create an importer instance without DB connection."""
        with patch.object(EstablishmentImporter, '__init__', lambda x, **kwargs: None):
            imp = EstablishmentImporter()
            imp.stats = {"skipped_no_siren": 0, "skipped_invalid_siren": 0}
            imp.skipped_rows = []
            return imp

    def test_parse_valid_siren(self, importer):
        """Valid 9-digit SIREN should be parsed."""
        row = {"Siren": "123456789"}
        assert importer.parse_siren(row) == 123456789

    def test_parse_siren_with_decimal(self, importer):
        """SIREN with decimal format (from Excel) should be parsed."""
        row = {"Siren": "123456789.0"}
        assert importer.parse_siren(row) == 123456789

    def test_parse_siren_empty(self, importer):
        """Empty SIREN should return None."""
        row = {"Siren": ""}
        assert importer.parse_siren(row) is None

    def test_parse_siren_missing(self, importer):
        """Missing SIREN key should return None."""
        row = {}
        assert importer.parse_siren(row) is None

    def test_parse_siren_whitespace(self, importer):
        """SIREN with only whitespace should return None."""
        row = {"Siren": "   "}
        assert importer.parse_siren(row) is None

    def test_parse_siren_too_short(self, importer):
        """SIREN with less than 9 digits should return None."""
        row = {"Siren": "12345678"}
        assert importer.parse_siren(row) is None

    def test_parse_siren_too_long(self, importer):
        """SIREN with more than 9 digits should return None."""
        row = {"Siren": "1234567890"}
        assert importer.parse_siren(row) is None

    def test_parse_siren_non_numeric(self, importer):
        """Non-numeric SIREN should return None."""
        row = {"Siren": "12345678A"}
        assert importer.parse_siren(row) is None

    def test_parse_siren_with_spaces(self, importer):
        """SIREN with surrounding spaces should be trimmed and parsed."""
        row = {"Siren": " 123456789 "}
        assert importer.parse_siren(row) == 123456789


class TestParseSiret:
    """Tests for SIRET parsing logic."""

    @pytest.fixture
    def importer(self):
        """Create an importer instance without DB connection."""
        with patch.object(EstablishmentImporter, '__init__', lambda x, **kwargs: None):
            imp = EstablishmentImporter()
            return imp

    def test_parse_valid_siret(self, importer):
        """Valid 14-digit SIRET should be parsed."""
        row = {"Siret": "12345678901234"}
        assert importer.parse_siret(row) == "12345678901234"

    def test_parse_siret_with_decimal(self, importer):
        """SIRET with decimal format should be parsed."""
        row = {"Siret": "12345678901234.0"}
        assert importer.parse_siret(row) == "12345678901234"

    def test_parse_siret_empty(self, importer):
        """Empty SIRET should return None."""
        row = {"Siret": ""}
        assert importer.parse_siret(row) is None

    def test_parse_siret_too_short(self, importer):
        """SIRET with less than 14 digits should return None."""
        row = {"Siret": "1234567890123"}
        assert importer.parse_siret(row) is None

    def test_parse_siret_too_long(self, importer):
        """SIRET with more than 14 digits should return None."""
        row = {"Siret": "123456789012345"}
        assert importer.parse_siret(row) is None


class TestParseGeoPerimeter:
    """Tests for Geo_Perimeter parsing logic."""

    @pytest.fixture
    def importer(self):
        """Create an importer instance without DB connection."""
        with patch.object(EstablishmentImporter, '__init__', lambda x, **kwargs: None):
            imp = EstablishmentImporter()
            return imp

    def test_parse_valid_geo_perimeter(self, importer):
        """Valid Python list string should be parsed."""
        result = importer.parse_geo_perimeter("['75001', '75002', '75003']")
        assert result == ["75001", "75002", "75003"]

    def test_parse_geo_perimeter_with_integers(self, importer):
        """List with integer values should be converted to strings."""
        result = importer.parse_geo_perimeter("[75001, 75002, 75003]")
        assert result == ["75001", "75002", "75003"]

    def test_parse_geo_perimeter_empty_string(self, importer):
        """Empty string should return None."""
        result = importer.parse_geo_perimeter("")
        assert result is None

    def test_parse_geo_perimeter_empty_list(self, importer):
        """Empty list should return empty list."""
        result = importer.parse_geo_perimeter("[]")
        assert result == []

    def test_parse_geo_perimeter_invalid_syntax(self, importer):
        """Invalid syntax should return None."""
        result = importer.parse_geo_perimeter("not a list")
        assert result is None

    def test_parse_geo_perimeter_none(self, importer):
        """None input should return None."""
        result = importer.parse_geo_perimeter(None)
        assert result is None

    def test_parse_geo_perimeter_single_value(self, importer):
        """Single value list should be parsed."""
        result = importer.parse_geo_perimeter("['97101']")
        assert result == ["97101"]


class TestNormalizeName:
    """Tests for name normalization logic."""

    @pytest.fixture
    def importer(self):
        """Create an importer instance without DB connection."""
        with patch.object(EstablishmentImporter, '__init__', lambda x, **kwargs: None):
            imp = EstablishmentImporter()
            return imp

    def test_normalize_uppercase_commune(self, importer):
        """Uppercase commune name should be normalized."""
        result = importer.normalize_name("COMMUNE DE PARIS")
        assert result == "Commune de Paris"

    def test_normalize_uppercase_prefecture(self, importer):
        """Uppercase prefecture name should be normalized."""
        result = importer.normalize_name("PREFECTURE DE LA SEINE")
        # Should have lowercase articles and capitalized main words
        assert "prefecture" in result.lower()
        assert " de " in result or " la " in result

    def test_normalize_already_normalized(self, importer):
        """Already normalized name should not change."""
        result = importer.normalize_name("Commune de Paris")
        assert result == "Commune de Paris"

    def test_normalize_with_acronym(self, importer):
        """Names with acronyms in parentheses should preserve them."""
        result = importer.normalize_name("DIRECTION DEPARTEMENTALE (DDETS)")
        assert "(DDETS)" in result

    def test_normalize_hyphenated_name(self, importer):
        """Hyphenated names should be properly capitalized."""
        result = importer.normalize_name("COMMUNE DE SAINT-DENIS")
        assert "Saint-Denis" in result or "Saint-denis" in result

    def test_normalize_with_apostrophe(self, importer):
        """Names with apostrophes should be handled."""
        result = importer.normalize_name("COMMUNE D'ORLEANS")
        # Should contain some form of Orleans
        assert "rleans" in result.lower()

    def test_normalize_articles(self, importer):
        """French articles should remain lowercase in middle of name."""
        result = importer.normalize_name("COMMUNE DE LA ROCHELLE")
        assert " de " in result or " la " in result


class TestComputeShortName:
    """Tests for short name computation."""

    @pytest.fixture
    def importer(self):
        """Create an importer instance without DB connection."""
        with patch.object(EstablishmentImporter, '__init__', lambda x, **kwargs: None):
            imp = EstablishmentImporter()
            return imp

    def test_short_name_commune(self, importer):
        """Commune short name should remove prefix."""
        result = importer.compute_short_name("Commune de Paris", "COM")
        assert result == "Paris"

    def test_short_name_commune_d_apostrophe(self, importer):
        """Commune d' prefix should be removed."""
        result = importer.compute_short_name("Commune d'Orléans", "COM")
        assert result == "Orléans"

    def test_short_name_non_commune(self, importer):
        """Non-commune short name should be None."""
        result = importer.compute_short_name("Préfecture de Paris", "PREF")
        assert result is None

    def test_short_name_com_tom(self, importer):
        """COM-TOM kind should also have prefix removed."""
        result = importer.compute_short_name("Commune de Papeete", "COM-TOM")
        assert result == "Papeete"


class TestValidateLocalities:
    """Tests for locality validation."""

    @pytest.fixture
    def importer(self):
        """Create an importer instance with mocked valid localities."""
        with patch.object(EstablishmentImporter, '__init__', lambda x, **kwargs: None):
            imp = EstablishmentImporter()
            imp.valid_localities = {"75001", "75002", "75003", "97101", "97102"}
            return imp

    def test_validate_all_valid(self, importer):
        """All valid codes should pass."""
        is_valid, invalid = importer.validate_localities(["75001", "75002"])
        assert is_valid is True
        assert invalid == []

    def test_validate_some_invalid(self, importer):
        """Some invalid codes should fail."""
        is_valid, invalid = importer.validate_localities(["75001", "99999"])
        assert is_valid is False
        assert "99999" in invalid

    def test_validate_all_invalid(self, importer):
        """All invalid codes should fail."""
        is_valid, invalid = importer.validate_localities(["99998", "99999"])
        assert is_valid is False
        assert len(invalid) == 2

    def test_validate_empty_list(self, importer):
        """Empty list should pass."""
        is_valid, invalid = importer.validate_localities([])
        assert is_valid is True
        assert invalid == []

    def test_validate_none(self, importer):
        """None should pass."""
        is_valid, invalid = importer.validate_localities(None)
        assert is_valid is True
        assert invalid == []


class TestTransformRow:
    """Tests for row transformation logic."""

    @pytest.fixture
    def importer(self):
        """Create an importer instance with mocked valid localities."""
        with patch.object(EstablishmentImporter, '__init__', lambda x, **kwargs: None):
            imp = EstablishmentImporter()
            imp.stats = {
                "total": 0,
                "inserted": 0,
                "updated": 0,
                "skipped_no_siren": 0,
                "skipped_invalid_siren": 0,
                "skipped_invalid_localities": 0,
                "errors": 0,
            }
            imp.skipped_rows = []
            imp.valid_localities = {"75001", "75002", "75003"}
            return imp

    def test_transform_valid_row(self, importer):
        """Valid row should be transformed correctly."""
        row = {
            "Siren": "123456789",
            "Siret": "12345678901234",
            "Name-zlv": "COMMUNE DE PARIS",
            "Kind-admin": "COM",
            "Geo_Perimeter": "['75001', '75002']",
            "Millesime": "2025",
        }
        result = importer.transform_row(row)

        assert result is not None
        assert result["siren"] == 123456789
        assert result["siret"] == "12345678901234"
        assert result["kind_admin_meta"] == "COM"
        assert result["localities_geo_code"] == ["75001", "75002"]
        assert result["source"] == "gold_establishments_2025"
        assert result["available"] is True

    def test_transform_row_missing_siren(self, importer):
        """Row without SIREN should be skipped."""
        row = {
            "Siren": "",
            "Name-zlv": "Test",
            "Kind-admin": "COM",
        }
        result = importer.transform_row(row)

        assert result is None
        assert importer.stats["skipped_no_siren"] == 1

    def test_transform_row_invalid_localities(self, importer):
        """Row with invalid localities should be skipped."""
        row = {
            "Siren": "123456789",
            "Name-zlv": "Test",
            "Kind-admin": "COM",
            "Geo_Perimeter": "['99999']",
        }
        result = importer.transform_row(row)

        assert result is None
        assert importer.stats["skipped_invalid_localities"] == 1

    def test_transform_row_no_geo_perimeter(self, importer):
        """Row without Geo_Perimeter should still be valid."""
        row = {
            "Siren": "123456789",
            "Name-zlv": "Test",
            "Kind-admin": "COM",
            "Geo_Perimeter": "",
        }
        result = importer.transform_row(row)

        assert result is not None
        assert result["localities_geo_code"] is None

    def test_transform_row_default_millesime(self, importer):
        """Row without Millesime should use default 2025."""
        row = {
            "Siren": "123456789",
            "Name-zlv": "Test",
            "Kind-admin": "COM",
        }
        result = importer.transform_row(row)

        assert result is not None
        assert result["source"] == "gold_establishments_2025"

    def test_transform_row_name_truncation(self, importer):
        """Long names should be truncated to 255 chars."""
        row = {
            "Siren": "123456789",
            "Name-zlv": "A" * 300,
            "Kind-admin": "COM",
        }
        result = importer.transform_row(row)

        assert result is not None
        assert len(result["name"]) == 255

    def test_transform_row_fallback_name(self, importer):
        """Missing Name-zlv should fallback to Name-source."""
        row = {
            "Siren": "123456789",
            "Name-zlv": "",
            "Name-source": "Fallback Name",
            "Kind-admin": "COM",
        }
        result = importer.transform_row(row)

        assert result is not None
        assert result["name"] == "Fallback Name"

    def test_transform_row_missing_kind(self, importer):
        """Missing kind should be None."""
        row = {
            "Siren": "123456789",
            "Name-zlv": "Test",
            "Kind-admin": "",
        }
        result = importer.transform_row(row)

        assert result is not None
        assert result["kind_admin_meta"] is None


class TestGetExistingSirens:
    """Tests for existing SIREN lookup."""

    @pytest.fixture
    def importer(self):
        """Create an importer instance with mocked cursor."""
        with patch.object(EstablishmentImporter, '__init__', lambda x, **kwargs: None):
            imp = EstablishmentImporter()
            imp.cursor = MagicMock()
            return imp

    def test_get_existing_sirens_some_exist(self, importer):
        """Should return set of existing SIRENs."""
        importer.cursor.fetchall.return_value = [
            {"siren": 123456789},
            {"siren": 987654321},
        ]

        result = importer.get_existing_sirens([123456789, 987654321, 111111111])

        assert result == {123456789, 987654321}

    def test_get_existing_sirens_none_exist(self, importer):
        """Should return empty set if none exist."""
        importer.cursor.fetchall.return_value = []

        result = importer.get_existing_sirens([123456789])

        assert result == set()

    def test_get_existing_sirens_empty_input(self, importer):
        """Should return empty set for empty input."""
        result = importer.get_existing_sirens([])

        assert result == set()
        importer.cursor.execute.assert_not_called()


class TestBatchUpsert:
    """Tests for batch upsert logic."""

    @pytest.fixture
    def importer(self):
        """Create an importer instance with mocked DB."""
        with patch.object(EstablishmentImporter, '__init__', lambda x, **kwargs: None):
            imp = EstablishmentImporter()
            imp.cursor = MagicMock()
            imp.stats = {"inserted": 0, "updated": 0}
            imp.dry_run = False
            return imp

    def test_batch_upsert_inserts_new(self, importer):
        """New records should be inserted."""
        importer.cursor.fetchall.return_value = []  # No existing SIRENs

        records = [
            {
                "siren": 123456789,
                "siret": "12345678901234",
                "name": "Test",
                "short_name": "Test",
                "kind_admin_meta": "COM",
                "millesime": "2025",
                "layer_geo_label": None,
                "dep_code": "75",
                "dep_name": "Paris",
                "reg_code": "11",
                "reg_name": "Île-de-France",
                "localities_geo_code": ["75001"],
                "available": True,
                "source": "gold_establishments_2025",
            }
        ]

        with patch("import_gold_establishments.execute_values") as mock_execute:
            importer.batch_upsert(records)

        assert importer.stats["inserted"] == 1
        assert importer.stats["updated"] == 0

    def test_batch_upsert_updates_existing(self, importer):
        """Existing records should be updated."""
        importer.cursor.fetchall.return_value = [{"siren": 123456789}]

        records = [
            {
                "siren": 123456789,
                "siret": "12345678901234",
                "name": "Test Updated",
                "short_name": "Test",
                "kind_admin_meta": "COM",
                "millesime": "2025",
                "layer_geo_label": None,
                "dep_code": "75",
                "dep_name": "Paris",
                "reg_code": "11",
                "reg_name": "Île-de-France",
                "localities_geo_code": ["75001"],
                "available": True,
                "source": "gold_establishments_2025",
            }
        ]

        with patch("import_gold_establishments.execute_values") as mock_execute:
            importer.batch_upsert(records)

        assert importer.stats["inserted"] == 0
        assert importer.stats["updated"] == 1

    def test_batch_upsert_dry_run(self, importer):
        """Dry run should not execute DB operations."""
        importer.dry_run = True
        importer.cursor.fetchall.return_value = []

        records = [
            {
                "siren": 123456789,
                "siret": "12345678901234",
                "name": "Test",
                "short_name": "Test",
                "kind_admin_meta": "COM",
                "millesime": "2025",
                "layer_geo_label": None,
                "dep_code": "75",
                "dep_name": "Paris",
                "reg_code": "11",
                "reg_name": "Île-de-France",
                "localities_geo_code": ["75001"],
                "available": True,
                "source": "gold_establishments_2025",
            }
        ]

        with patch("import_gold_establishments.execute_values") as mock_execute:
            importer.batch_upsert(records)
            mock_execute.assert_not_called()

    def test_batch_upsert_empty_records(self, importer):
        """Empty records list should do nothing."""
        importer.batch_upsert([])

        assert importer.stats["inserted"] == 0
        assert importer.stats["updated"] == 0


class TestProcessSinglePair:
    """Integration-style tests for processing pairs of data."""

    @pytest.fixture
    def importer(self):
        """Create a fully initialized importer with mocks."""
        with patch.object(EstablishmentImporter, '__init__', lambda x, **kwargs: None):
            imp = EstablishmentImporter()
            imp.stats = {
                "total": 0,
                "inserted": 0,
                "updated": 0,
                "skipped_no_siren": 0,
                "skipped_invalid_siren": 0,
                "skipped_invalid_localities": 0,
                "errors": 0,
            }
            imp.skipped_rows = []
            imp.valid_localities = {"75001", "75002", "75003", "97101"}
            return imp

    def test_corsican_commune(self, importer):
        """Corsican commune (2A/2B codes) should be handled."""
        row = {
            "Siren": "212000013",
            "Name-zlv": "COMMUNE D'AJACCIO",
            "Kind-admin": "COM",
            "Geo_Perimeter": "[]",
        }
        result = importer.transform_row(row)

        assert result is not None
        assert result["siren"] == 212000013

    def test_overseas_territory(self, importer):
        """Overseas territory codes should be handled."""
        row = {
            "Siren": "219710015",
            "Name-zlv": "COMMUNE DE BASSE-TERRE",
            "Kind-admin": "COM-TOM",
            "Geo_Perimeter": "['97101']",
        }
        result = importer.transform_row(row)

        assert result is not None
        assert result["kind_admin_meta"] == "COM-TOM"
        assert result["localities_geo_code"] == ["97101"]

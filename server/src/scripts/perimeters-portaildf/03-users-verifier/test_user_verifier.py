#!/usr/bin/env python3
"""
Unit tests for user-verifier.py

Run tests with:
    pytest test_user_verifier.py -v
    pytest test_user_verifier.py -k test_multi_structure

Dependencies:
    pip install pytest python-dateutil click psycopg2-binary
"""

import pytest
from datetime import datetime, timedelta
from typing import Dict
import sys
from unittest.mock import MagicMock

# Mock dependencies before importing the module
sys.modules['psycopg2'] = MagicMock()
sys.modules['click'] = MagicMock()

# Import from the main module (rename to avoid hyphen issues)
import importlib.util
from pathlib import Path

# Load the module with hyphen in name
spec = importlib.util.spec_from_file_location(
    "user_verifier",
    Path(__file__).parent / "user-verifier.py"
)
user_verifier = importlib.util.module_from_spec(spec)
sys.modules["user_verifier"] = user_verifier
spec.loader.exec_module(user_verifier)

# Import classes and functions
ApiUser = user_verifier.ApiUser
DatabaseUser = user_verifier.DatabaseUser
Structure = user_verifier.Structure
DeactivationAction = user_verifier.DeactivationAction
analyze_user_status = user_verifier.analyze_user_status
check_structure_access = user_verifier.check_structure_access
check_structure_access_by_siren = user_verifier.check_structure_access_by_siren
check_structure_lovac_access = user_verifier.check_structure_lovac_access
find_structure_by_siren = user_verifier.find_structure_by_siren


class TestFindStructureBySiren:
    """Tests for find_structure_by_siren function."""

    def test_find_existing_structure(self):
        """Should find structure by SIREN."""
        structures = {
            1: Structure(id_structure=1, siret="12345678901234", acces_lovac="2026-01-01"),
            2: Structure(id_structure=2, siret="98765432101234", acces_lovac="2026-01-01"),
        }

        result = find_structure_by_siren("123456789", structures)

        assert result is not None
        assert result.id_structure == 1

    def test_find_non_existing_structure(self):
        """Should return None for non-existing SIREN."""
        structures = {
            1: Structure(id_structure=1, siret="12345678901234", acces_lovac="2026-01-01"),
        }

        result = find_structure_by_siren("999999999", structures)

        assert result is None

    def test_find_with_none_siren(self):
        """Should return None for None SIREN."""
        structures = {
            1: Structure(id_structure=1, siret="12345678901234", acces_lovac="2026-01-01"),
        }

        result = find_structure_by_siren(None, structures)

        assert result is None


class TestCheckStructureLovacAccess:
    """Tests for check_structure_lovac_access function."""

    def test_valid_future_access(self):
        """Should return True for future LOVAC access date."""
        future_date = (datetime.now() + timedelta(days=365)).isoformat()
        structure = Structure(id_structure=1, siret="12345678901234", acces_lovac=future_date)

        result = check_structure_lovac_access(structure)

        assert result is True

    def test_expired_access(self):
        """Should return False for past LOVAC access date."""
        past_date = (datetime.now() - timedelta(days=1)).isoformat()
        structure = Structure(id_structure=1, siret="12345678901234", acces_lovac=past_date)

        result = check_structure_lovac_access(structure)

        assert result is False

    def test_no_lovac_access(self):
        """Should return False when no LOVAC access defined."""
        structure = Structure(id_structure=1, siret="12345678901234", acces_lovac=None)

        result = check_structure_lovac_access(structure)

        assert result is False


class TestCheckStructureAccessBySiren:
    """Tests for check_structure_access_by_siren function."""

    def test_valid_access_by_siren(self):
        """Should return True for valid SIREN with future access."""
        future_date = (datetime.now() + timedelta(days=365)).isoformat()
        structures = {
            1: Structure(id_structure=1, siret="12345678901234", acces_lovac=future_date),
        }

        result = check_structure_access_by_siren("123456789", structures)

        assert result is True

    def test_expired_access_by_siren(self):
        """Should return False for valid SIREN with expired access."""
        past_date = (datetime.now() - timedelta(days=1)).isoformat()
        structures = {
            1: Structure(id_structure=1, siret="12345678901234", acces_lovac=past_date),
        }

        result = check_structure_access_by_siren("123456789", structures)

        assert result is False

    def test_unknown_siren(self):
        """Should return None for unknown SIREN."""
        structures = {
            1: Structure(id_structure=1, siret="12345678901234", acces_lovac="2026-01-01"),
        }

        result = check_structure_access_by_siren("999999999", structures)

        assert result is None


class TestAnalyzeUserStatusMultiStructure:
    """
    Tests for the multi-structure scenario.

    This is the main bug fix: when a user is attached to multiple structures
    in Portail DF but only one establishment in ZLV, we should check the ZLV
    establishment's access rights, not the API structure.
    """

    def create_db_user(
        self,
        email: str = "test@example.fr",
        establishment_siren: str = "200071116",
        suspended_at: str = None,
    ) -> DatabaseUser:
        """Helper to create a DatabaseUser."""
        return DatabaseUser(
            id=1,
            email=email,
            first_name="Test",
            last_name="User",
            establishment_id=1,
            establishment_siren=establishment_siren,
            deleted_at=None,
            suspended_at=suspended_at,
            suspended_cause=None,
        )

    def create_api_user(
        self,
        email: str = "test@example.fr",
        structure: int = 1621,  # Different structure than ZLV establishment
        valid_tos: str = "2024-01-01",
        expiration_date: str = None,
    ) -> ApiUser:
        """Helper to create an ApiUser."""
        return ApiUser(
            id_user=1,
            email=email,
            attachment_date="2024-01-01",
            structure=structure,
            expiration_date=expiration_date,
            external=False,
            manager=True,
            group=1,
            valid_tos=valid_tos,
            representative_structure=None,
        )

    def test_multi_structure_user_zlv_has_valid_access(self):
        """
        User attached to 2 structures in Portail DF:
        - Structure 723 (CA ECLA) - SIREN 200071116 - valid LOVAC access
        - Structure 1621 (Commune) - SIREN 213903008 - no LOVAC access

        User in ZLV is attached to CA ECLA (SIREN 200071116).
        The API returns structure 1621 (Commune) which has no access.

        Expected: User should NOT be suspended because ZLV establishment has valid access.
        """
        # ZLV user attached to CA ECLA (SIREN 200071116)
        db_user = self.create_db_user(
            email="mnicolas@lonslesaunier.fr",
            establishment_siren="200071116",  # CA ECLA
        )

        # API user with structure 1621 (Commune - no LOVAC access)
        # This simulates the bug: API returns the wrong structure
        api_user = self.create_api_user(
            email="mnicolas@lonslesaunier.fr",
            structure=1621,  # Commune de Lons-le-Saunier
        )

        # Structures data
        future_date = (datetime.now() + timedelta(days=365)).isoformat()
        structures = {
            723: Structure(
                id_structure=723,
                siret="20007111600012",  # SIREN: 200071116 (CA ECLA)
                acces_lovac=future_date,  # Valid access
            ),
            1621: Structure(
                id_structure=1621,
                siret="21390300800364",  # SIREN: 213903008 (Commune)
                acces_lovac=None,  # No LOVAC access
            ),
        }

        # Analyze user status
        action = analyze_user_status(db_user, api_user, structures)

        # User should NOT be suspended (ZLV establishment has valid access)
        assert action is None, (
            "User should NOT be suspended because ZLV establishment (CA ECLA) "
            "has valid LOVAC access, regardless of API structure (Commune)"
        )

    def test_multi_structure_user_zlv_has_expired_access(self):
        """
        User in ZLV attached to an establishment with expired LOVAC access.
        Even if API returns a different structure, we check ZLV establishment.

        Expected: User should be suspended.
        """
        # ZLV user attached to Commune (no LOVAC access)
        db_user = self.create_db_user(
            email="test@commune.fr",
            establishment_siren="213903008",  # Commune de Lons-le-Saunier
        )

        # API user (structure doesn't matter, we check ZLV establishment)
        api_user = self.create_api_user(
            email="test@commune.fr",
            structure=723,  # CA ECLA (has valid access, but not the ZLV establishment)
        )

        # Structures data
        future_date = (datetime.now() + timedelta(days=365)).isoformat()
        structures = {
            723: Structure(
                id_structure=723,
                siret="20007111600012",  # SIREN: 200071116 (CA ECLA)
                acces_lovac=future_date,  # Valid access
            ),
            1621: Structure(
                id_structure=1621,
                siret="21390300800364",  # SIREN: 213903008 (Commune)
                acces_lovac=None,  # No LOVAC access
            ),
        }

        # Analyze user status
        action = analyze_user_status(db_user, api_user, structures)

        # User SHOULD be suspended (ZLV establishment has no LOVAC access)
        assert action is not None
        assert action.action_type == "suspend"
        assert "droits structure expires" in action.reasons

    def test_user_reactivation_when_zlv_establishment_regains_access(self):
        """
        Previously suspended user should be reactivated when ZLV establishment
        regains LOVAC access.
        """
        # Suspended user
        db_user = self.create_db_user(
            email="test@example.fr",
            establishment_siren="200071116",
            suspended_at="2024-01-01T00:00:00",
        )

        # API user with valid ToS
        api_user = self.create_api_user(
            email="test@example.fr",
            valid_tos="2024-01-01",
        )

        # ZLV establishment now has valid access
        future_date = (datetime.now() + timedelta(days=365)).isoformat()
        structures = {
            1: Structure(
                id_structure=1,
                siret="20007111600012",  # SIREN: 200071116
                acces_lovac=future_date,
            ),
        }

        # Analyze user status
        action = analyze_user_status(db_user, api_user, structures)

        # User should be reactivated
        assert action is not None
        assert action.action_type == "reactivate"


class TestAnalyzeUserStatusBasicRules:
    """Tests for basic suspension rules (ToS, expiration date)."""

    def create_db_user(self, **kwargs) -> DatabaseUser:
        """Helper to create a DatabaseUser."""
        defaults = {
            "id": 1,
            "email": "test@example.fr",
            "first_name": "Test",
            "last_name": "User",
            "establishment_id": 1,
            "establishment_siren": "200071116",
            "deleted_at": None,
            "suspended_at": None,
            "suspended_cause": None,
        }
        defaults.update(kwargs)
        return DatabaseUser(**defaults)

    def create_api_user(self, **kwargs) -> ApiUser:
        """Helper to create an ApiUser."""
        defaults = {
            "id_user": 1,
            "email": "test@example.fr",
            "attachment_date": "2024-01-01",
            "structure": 1,
            "expiration_date": None,
            "external": False,
            "manager": True,
            "group": 1,
            "valid_tos": "2024-01-01",
            "representative_structure": None,
        }
        defaults.update(kwargs)
        return ApiUser(**defaults)

    def create_structures(self) -> Dict[int, Structure]:
        """Helper to create structures with valid access."""
        future_date = (datetime.now() + timedelta(days=365)).isoformat()
        return {
            1: Structure(
                id_structure=1,
                siret="20007111600012",
                acces_lovac=future_date,
            ),
        }

    def test_suspend_user_with_empty_tos(self):
        """User with empty ToS should be suspended."""
        db_user = self.create_db_user()
        api_user = self.create_api_user(valid_tos=None)
        structures = self.create_structures()

        action = analyze_user_status(db_user, api_user, structures)

        assert action is not None
        assert action.action_type == "suspend"
        assert "cgu vides" in action.reasons

    def test_suspend_user_with_expired_rights(self):
        """User with expired expiration_date should be suspended."""
        db_user = self.create_db_user()
        past_date = (datetime.now() - timedelta(days=1)).isoformat()
        api_user = self.create_api_user(expiration_date=past_date)
        structures = self.create_structures()

        action = analyze_user_status(db_user, api_user, structures)

        assert action is not None
        assert action.action_type == "suspend"
        assert "droits utilisateur expires" in action.reasons

    def test_no_action_for_valid_user(self):
        """Valid user should not trigger any action."""
        db_user = self.create_db_user()
        api_user = self.create_api_user()
        structures = self.create_structures()

        action = analyze_user_status(db_user, api_user, structures)

        assert action is None

    def test_skip_deleted_user(self):
        """Deleted user should not trigger any action."""
        db_user = self.create_db_user(deleted_at="2024-01-01T00:00:00")
        api_user = self.create_api_user(valid_tos=None)  # Would normally suspend
        structures = self.create_structures()

        action = analyze_user_status(db_user, api_user, structures)

        assert action is None

    def test_skip_user_not_in_api(self):
        """User not in API should not trigger any action."""
        db_user = self.create_db_user()
        api_user = None
        structures = self.create_structures()

        action = analyze_user_status(db_user, api_user, structures)

        assert action is None


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

#!/usr/bin/env python3
"""
Unit and functional tests for import-dpe.py

Tests cover:
- DPE priority determination
- Import decision logic (should_import_dpe)
- Index verification
- Connection validation

Run tests with:
    pytest test_import_dpe.py -v
    pytest test_import_dpe.py -v -k test_priority  # Run specific test
"""

import pytest
from unittest.mock import Mock, MagicMock, patch
import sys
import os

# Add parent directory to path to import the module
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Mock psycopg2 before importing
sys.modules['psycopg2'] = MagicMock()
sys.modules['psycopg2.extras'] = MagicMock()
sys.modules['psycopg2.pool'] = MagicMock()
sys.modules['aiofiles'] = MagicMock()

# Now import after mocking
from importlib import reload
import importlib.util
spec = importlib.util.spec_from_file_location("import_dpe", "import-dpe.py")
import_dpe = importlib.util.module_from_spec(spec)
spec.loader.exec_module(import_dpe)

DPEProcessor = import_dpe.DPEProcessor


class TestDPEPriority:
    """Test DPE priority determination."""

    @pytest.fixture
    def processor(self):
        """Create a DPEProcessor instance with mocked config."""
        db_config = {
            'host': 'localhost',
            'port': 5432,
            'database': 'test',
            'user': 'test',
            'password': 'test'
        }
        with patch.object(DPEProcessor, '_init_connection_pool'):
            processor = DPEProcessor(db_config, dry_run=True)
        return processor

    def test_priority_building_collective(self, processor):
        """Building collective DPE should have priority 0 (highest)."""
        priority = processor._determine_dpe_priority('DPE immeuble collectif')
        assert priority == 0

    def test_priority_individual_house(self, processor):
        """Individual house DPE should have priority 0 (highest)."""
        priority = processor._determine_dpe_priority('DPE maison individuelle')
        assert priority == 0

    def test_priority_apartment(self, processor):
        """Apartment DPE should have priority 1 (medium)."""
        priority = processor._determine_dpe_priority('DPE appartement individuel')
        assert priority == 1

    def test_priority_other(self, processor):
        """Other DPE types should have priority 2 (lowest)."""
        priority = processor._determine_dpe_priority('Autre méthode')
        assert priority == 2

    def test_priority_empty(self, processor):
        """Empty method should have priority 2 (lowest)."""
        priority = processor._determine_dpe_priority('')
        assert priority == 2

    def test_priority_none(self, processor):
        """None method should have priority 2 (lowest)."""
        priority = processor._determine_dpe_priority(None)
        assert priority == 2

    def test_priority_case_insensitive(self, processor):
        """Priority determination should be case insensitive."""
        priority_upper = processor._determine_dpe_priority('DPE IMMEUBLE COLLECTIF')
        priority_lower = processor._determine_dpe_priority('dpe immeuble collectif')
        priority_mixed = processor._determine_dpe_priority('DpE iMmEuBlE cOlLeCtIf')

        assert priority_upper == 0
        assert priority_lower == 0
        assert priority_mixed == 0


class TestShouldImportDPE:
    """Test import decision logic."""

    @pytest.fixture
    def processor(self):
        """Create a DPEProcessor instance with mocked config."""
        db_config = {
            'host': 'localhost',
            'port': 5432,
            'database': 'test',
            'user': 'test',
            'password': 'test'
        }
        with patch.object(DPEProcessor, '_init_connection_pool'):
            processor = DPEProcessor(db_config, dry_run=True)
        return processor

    def test_new_building_dpe_no_existing(self, processor):
        """New building DPE with no existing DPE should be imported."""
        dpe_data = {'methode_application_dpe': 'DPE immeuble collectif'}
        should_import, case = processor._should_import_dpe(dpe_data, existing_dpe=None)

        assert should_import is True
        assert case == "new_building_dpe"

    def test_new_house_dpe_no_existing(self, processor):
        """New house DPE with no existing DPE should be imported."""
        dpe_data = {'methode_application_dpe': 'DPE maison individuelle'}
        should_import, case = processor._should_import_dpe(dpe_data, existing_dpe=None)

        assert should_import is True
        assert case == "new_building_dpe"

    def test_apartment_dpe_no_existing(self, processor):
        """Apartment DPE with no existing DPE should be imported."""
        dpe_data = {'methode_application_dpe': 'DPE appartement individuel'}
        should_import, case = processor._should_import_dpe(dpe_data, existing_dpe=None)

        assert should_import is True
        assert case == "apartment_dpe"

    def test_other_dpe_no_existing(self, processor):
        """Other DPE types with no existing DPE should be skipped."""
        dpe_data = {'methode_application_dpe': 'Autre méthode'}
        should_import, case = processor._should_import_dpe(dpe_data, existing_dpe=None)

        assert should_import is False
        assert case == "skip_other_dpe"

    def test_building_dpe_replaces_existing(self, processor):
        """Building DPE should replace any existing DPE."""
        dpe_data = {'methode_application_dpe': 'DPE immeuble collectif'}
        existing_dpe = {'dpe_id': 'old_dpe', 'class_dpe': 'C'}
        should_import, case = processor._should_import_dpe(dpe_data, existing_dpe=existing_dpe)

        assert should_import is True
        assert case == "building_dpe_exists"

    def test_apartment_dpe_with_existing_skipped(self, processor):
        """Apartment DPE should not replace existing DPE."""
        dpe_data = {'methode_application_dpe': 'DPE appartement individuel'}
        existing_dpe = {'dpe_id': 'existing_dpe', 'class_dpe': 'B'}
        should_import, case = processor._should_import_dpe(dpe_data, existing_dpe=existing_dpe)

        assert should_import is False
        assert case == "skip_non_building_dpe"

    def test_other_dpe_with_existing_skipped(self, processor):
        """Other DPE should not replace existing DPE."""
        dpe_data = {'methode_application_dpe': 'Autre méthode'}
        existing_dpe = {'dpe_id': 'existing_dpe', 'class_dpe': 'A'}
        should_import, case = processor._should_import_dpe(dpe_data, existing_dpe=existing_dpe)

        assert should_import is False
        assert case == "skip_non_building_dpe"


class TestConnectionValidation:
    """Test connection validation logic."""

    @pytest.fixture
    def processor(self):
        """Create a DPEProcessor instance with mocked config."""
        db_config = {
            'host': 'localhost',
            'port': 5432,
            'database': 'test',
            'user': 'test',
            'password': 'test'
        }
        with patch.object(DPEProcessor, '_init_connection_pool'):
            processor = DPEProcessor(db_config, dry_run=True)
        return processor

    def test_validate_closed_connection(self, processor):
        """Closed connection should not validate."""
        mock_conn = Mock()
        mock_conn.closed = 1  # Connection is closed

        result = processor._validate_connection(mock_conn)
        assert result is False

    def test_validate_open_connection(self, processor):
        """Open connection with successful query should validate."""
        mock_conn = Mock()
        mock_conn.closed = 0
        mock_cursor = MagicMock()
        mock_cursor.fetchone.return_value = (1,)
        mock_conn.cursor.return_value.__enter__ = Mock(return_value=mock_cursor)
        mock_conn.cursor.return_value.__exit__ = Mock(return_value=False)

        result = processor._validate_connection(mock_conn)
        assert result is True

    def test_validate_connection_query_fails(self, processor):
        """Connection with failed query should not validate."""
        mock_conn = Mock()
        mock_conn.closed = 0
        mock_cursor = MagicMock()
        mock_cursor.execute.side_effect = Exception("Query failed")
        mock_conn.cursor.return_value.__enter__ = Mock(return_value=mock_cursor)
        mock_conn.cursor.return_value.__exit__ = Mock(return_value=False)

        result = processor._validate_connection(mock_conn)
        assert result is False


class TestIndexVerification:
    """Test index verification functionality."""

    @pytest.fixture
    def processor(self):
        """Create a DPEProcessor instance with mocked config."""
        db_config = {
            'host': 'localhost',
            'port': 5432,
            'database': 'test',
            'user': 'test',
            'password': 'test'
        }
        with patch.object(DPEProcessor, '_init_connection_pool'):
            processor = DPEProcessor(db_config, dry_run=True)
        return processor

    def test_check_indexes_all_present(self, processor):
        """Should not warn when all indexes are present."""
        mock_conn = Mock()
        mock_cursor = Mock()
        mock_cursor.fetchall.return_value = [
            ('idx_buildings_rnb_id',),
            ('idx_buildings_dpe_id',),
            ('idx_buildings_building_id_dpe',),
            ('idx_ban_addresses_ban_id_housing',)
        ]
        mock_conn.cursor.return_value = mock_cursor

        with patch.object(processor, '_get_db_connection_with_retry', return_value=mock_conn):
            with patch.object(processor, '_return_db_connection_safe'):
                # Should not raise any warnings
                processor.check_required_indexes()

    def test_check_indexes_missing(self, processor, caplog):
        """Should warn when indexes are missing."""
        mock_conn = Mock()
        mock_cursor = Mock()
        mock_cursor.fetchall.return_value = [
            ('idx_buildings_rnb_id',)  # Only one index present
        ]
        mock_conn.cursor.return_value = mock_cursor

        with patch.object(processor, '_get_db_connection_with_retry', return_value=mock_conn):
            with patch.object(processor, '_return_db_connection_safe'):
                processor.check_required_indexes()

                # Check that warning was logged
                assert any('Missing recommended indexes' in record.message
                          for record in caplog.records if record.levelname == 'WARNING')


class TestBusinessLogic:
    """Test business logic and edge cases."""

    @pytest.fixture
    def processor(self):
        """Create a DPEProcessor instance with mocked config."""
        db_config = {
            'host': 'localhost',
            'port': 5432,
            'database': 'test',
            'user': 'test',
            'password': 'test'
        }
        with patch.object(DPEProcessor, '_init_connection_pool'):
            processor = DPEProcessor(db_config, dry_run=True)
        return processor

    def test_building_dpe_always_wins(self, processor):
        """Building-level DPE should always replace any existing DPE."""
        building_dpe = {'methode_application_dpe': 'DPE immeuble collectif'}

        # Test against no existing DPE
        should_import, _ = processor._should_import_dpe(building_dpe, None)
        assert should_import is True

        # Test against existing apartment DPE
        existing_apt = {'dpe_id': 'apt_dpe', 'methode_application_dpe': 'DPE appartement individuel'}
        should_import, _ = processor._should_import_dpe(building_dpe, existing_apt)
        assert should_import is True

        # Test against existing building DPE
        existing_building = {'dpe_id': 'building_dpe', 'methode_application_dpe': 'DPE immeuble collectif'}
        should_import, _ = processor._should_import_dpe(building_dpe, existing_building)
        assert should_import is True

    def test_apartment_dpe_priority_logic(self, processor):
        """Apartment DPE should only be imported when no DPE exists."""
        apartment_dpe = {'methode_application_dpe': 'DPE appartement individuel'}

        # Should import when no DPE exists
        should_import, case = processor._should_import_dpe(apartment_dpe, None)
        assert should_import is True
        assert case == "apartment_dpe"

        # Should NOT import when any DPE already exists
        existing = {'dpe_id': 'any_dpe'}
        should_import, case = processor._should_import_dpe(apartment_dpe, existing)
        assert should_import is False
        assert case == "skip_non_building_dpe"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

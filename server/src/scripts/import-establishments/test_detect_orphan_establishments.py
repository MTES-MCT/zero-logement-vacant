#!/usr/bin/env python3
"""
Unit tests for detect_orphan_establishments.py

Run with:
    pytest test_detect_orphan_establishments.py -v
    pytest test_detect_orphan_establishments.py -v -k "test_load_csv"
"""

import csv
import os
import tempfile
import pytest
from unittest.mock import MagicMock, patch

from detect_orphan_establishments import (
    load_csv_sirens,
    detect_orphans,
    is_safe_to_delete,
    get_deletable_orphans,
)


class TestLoadCsvSirens:
    """Tests for CSV SIREN loading."""

    def test_load_valid_sirens(self):
        """Valid SIRENs should be loaded."""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as f:
            writer = csv.DictWriter(f, fieldnames=['Siren', 'Name'])
            writer.writeheader()
            writer.writerow({'Siren': '123456789', 'Name': 'Test 1'})
            writer.writerow({'Siren': '987654321', 'Name': 'Test 2'})
            f.flush()

            result = load_csv_sirens(f.name)

        os.unlink(f.name)
        assert result == {123456789, 987654321}

    def test_load_sirens_with_decimal(self):
        """SIRENs with decimal format should be parsed."""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as f:
            writer = csv.DictWriter(f, fieldnames=['Siren', 'Name'])
            writer.writeheader()
            writer.writerow({'Siren': '123456789.0', 'Name': 'Test'})
            f.flush()

            result = load_csv_sirens(f.name)

        os.unlink(f.name)
        assert result == {123456789}

    def test_load_empty_sirens_skipped(self):
        """Empty SIRENs should be skipped."""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as f:
            writer = csv.DictWriter(f, fieldnames=['Siren', 'Name'])
            writer.writeheader()
            writer.writerow({'Siren': '', 'Name': 'Test 1'})
            writer.writerow({'Siren': '123456789', 'Name': 'Test 2'})
            f.flush()

            result = load_csv_sirens(f.name)

        os.unlink(f.name)
        assert result == {123456789}

    def test_load_invalid_sirens_skipped(self):
        """Invalid SIRENs (wrong length) should be skipped."""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as f:
            writer = csv.DictWriter(f, fieldnames=['Siren', 'Name'])
            writer.writeheader()
            writer.writerow({'Siren': '12345', 'Name': 'Too short'})
            writer.writerow({'Siren': '1234567890', 'Name': 'Too long'})
            writer.writerow({'Siren': '123456789', 'Name': 'Valid'})
            f.flush()

            result = load_csv_sirens(f.name)

        os.unlink(f.name)
        assert result == {123456789}

    def test_load_non_numeric_sirens_skipped(self):
        """Non-numeric SIRENs should be skipped."""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as f:
            writer = csv.DictWriter(f, fieldnames=['Siren', 'Name'])
            writer.writeheader()
            writer.writerow({'Siren': '12345678A', 'Name': 'Invalid'})
            writer.writerow({'Siren': '123456789', 'Name': 'Valid'})
            f.flush()

            result = load_csv_sirens(f.name)

        os.unlink(f.name)
        assert result == {123456789}

    def test_load_unique_sirens(self):
        """Duplicate SIRENs should result in unique set."""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as f:
            writer = csv.DictWriter(f, fieldnames=['Siren', 'Name'])
            writer.writeheader()
            writer.writerow({'Siren': '123456789', 'Name': 'Test 1'})
            writer.writerow({'Siren': '123456789', 'Name': 'Test 2'})
            f.flush()

            result = load_csv_sirens(f.name)

        os.unlink(f.name)
        assert result == {123456789}
        assert len(result) == 1


class TestDetectOrphans:
    """Tests for orphan detection logic."""

    def test_detect_orphans_some_missing(self):
        """Establishments not in CSV should be detected as orphans."""
        csv_sirens = {123456789, 987654321}
        db_establishments = [
            {"id": "id-1", "siren": 123456789, "name": "In CSV"},
            {"id": "id-2", "siren": 111111111, "name": "Not in CSV"},
            {"id": "id-3", "siren": 222222222, "name": "Also not in CSV"},
        ]

        orphans = detect_orphans(csv_sirens, db_establishments)

        assert len(orphans) == 2
        orphan_sirens = {o["siren"] for o in orphans}
        assert orphan_sirens == {111111111, 222222222}

    def test_detect_orphans_none_missing(self):
        """All establishments in CSV should result in no orphans."""
        csv_sirens = {123456789, 987654321}
        db_establishments = [
            {"id": "id-1", "siren": 123456789, "name": "In CSV"},
            {"id": "id-2", "siren": 987654321, "name": "Also in CSV"},
        ]

        orphans = detect_orphans(csv_sirens, db_establishments)

        assert len(orphans) == 0

    def test_detect_orphans_all_missing(self):
        """All establishments not in CSV should be orphans."""
        csv_sirens = {999999999}
        db_establishments = [
            {"id": "id-1", "siren": 123456789, "name": "Not in CSV"},
            {"id": "id-2", "siren": 987654321, "name": "Also not in CSV"},
        ]

        orphans = detect_orphans(csv_sirens, db_establishments)

        assert len(orphans) == 2

    def test_detect_orphans_empty_csv(self):
        """Empty CSV should make all DB establishments orphans."""
        csv_sirens = set()
        db_establishments = [
            {"id": "id-1", "siren": 123456789, "name": "Orphan"},
        ]

        orphans = detect_orphans(csv_sirens, db_establishments)

        assert len(orphans) == 1

    def test_detect_orphans_empty_db(self):
        """Empty DB should result in no orphans."""
        csv_sirens = {123456789}
        db_establishments = []

        orphans = detect_orphans(csv_sirens, db_establishments)

        assert len(orphans) == 0


class TestIsSafeToDelete:
    """Tests for safe deletion check."""

    def test_safe_to_delete_no_data(self):
        """Establishment with no critical data should be safe."""
        usage = {"users": 0, "campaigns": 0, "groups": 0}
        assert is_safe_to_delete(usage) is True

    def test_not_safe_with_users(self):
        """Establishment with users should not be safe."""
        usage = {"users": 1, "campaigns": 0, "groups": 0}
        assert is_safe_to_delete(usage) is False

    def test_not_safe_with_campaigns(self):
        """Establishment with campaigns should not be safe."""
        usage = {"users": 0, "campaigns": 1, "groups": 0}
        assert is_safe_to_delete(usage) is False

    def test_not_safe_with_groups(self):
        """Establishment with groups should not be safe."""
        usage = {"users": 0, "campaigns": 0, "groups": 1}
        assert is_safe_to_delete(usage) is False

    def test_safe_with_non_critical_data(self):
        """Establishment with only non-critical data should be safe."""
        usage = {
            "users": 0,
            "campaigns": 0,
            "groups": 0,
            "geo_perimeters": 5,
            "drafts": 3,
            "settings": 1,
        }
        assert is_safe_to_delete(usage) is True

    def test_safe_with_empty_usage(self):
        """Empty usage dict should be safe (defaults to 0)."""
        usage = {}
        assert is_safe_to_delete(usage) is True


class TestGetDeletableOrphans:
    """Tests for filtering deletable orphans."""

    def test_filter_deletable(self):
        """Only safe orphans should be returned."""
        orphans = [
            {"id": "id-1", "siren": 111111111, "name": "Safe"},
            {"id": "id-2", "siren": 222222222, "name": "Has users"},
            {"id": "id-3", "siren": 333333333, "name": "Also safe"},
        ]
        usage = {
            "id-1": {"users": 0, "campaigns": 0, "groups": 0},
            "id-2": {"users": 5, "campaigns": 0, "groups": 0},
            "id-3": {"users": 0, "campaigns": 0, "groups": 0},
        }

        deletable = get_deletable_orphans(orphans, usage)

        assert len(deletable) == 2
        deletable_ids = {o["id"] for o in deletable}
        assert deletable_ids == {"id-1", "id-3"}

    def test_filter_none_deletable(self):
        """No orphans should be returned if all have critical data."""
        orphans = [
            {"id": "id-1", "siren": 111111111, "name": "Has users"},
            {"id": "id-2", "siren": 222222222, "name": "Has campaigns"},
        ]
        usage = {
            "id-1": {"users": 1, "campaigns": 0, "groups": 0},
            "id-2": {"users": 0, "campaigns": 1, "groups": 0},
        }

        deletable = get_deletable_orphans(orphans, usage)

        assert len(deletable) == 0

    def test_filter_all_deletable(self):
        """All orphans should be returned if none have critical data."""
        orphans = [
            {"id": "id-1", "siren": 111111111, "name": "Safe 1"},
            {"id": "id-2", "siren": 222222222, "name": "Safe 2"},
        ]
        usage = {
            "id-1": {"users": 0, "campaigns": 0, "groups": 0},
            "id-2": {"users": 0, "campaigns": 0, "groups": 0},
        }

        deletable = get_deletable_orphans(orphans, usage)

        assert len(deletable) == 2

    def test_filter_with_missing_usage(self):
        """Orphans with missing usage should be considered safe."""
        orphans = [
            {"id": "id-1", "siren": 111111111, "name": "No usage data"},
        ]
        usage = {}  # No usage data

        deletable = get_deletable_orphans(orphans, usage)

        assert len(deletable) == 1


class TestIntegration:
    """Integration tests combining multiple functions."""

    def test_full_orphan_detection_flow(self):
        """Test complete orphan detection pipeline."""
        # Create temp CSV
        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as f:
            writer = csv.DictWriter(f, fieldnames=['Siren', 'Name'])
            writer.writeheader()
            writer.writerow({'Siren': '123456789', 'Name': 'Active 1'})
            writer.writerow({'Siren': '987654321', 'Name': 'Active 2'})
            f.flush()
            csv_path = f.name

        try:
            # Load CSV SIRENs
            csv_sirens = load_csv_sirens(csv_path)
            assert len(csv_sirens) == 2

            # Mock DB establishments
            db_establishments = [
                {"id": "id-1", "siren": 123456789, "name": "Active 1"},
                {"id": "id-2", "siren": 987654321, "name": "Active 2"},
                {"id": "id-3", "siren": 111111111, "name": "Orphan 1"},
                {"id": "id-4", "siren": 222222222, "name": "Orphan 2"},
            ]

            # Detect orphans
            orphans = detect_orphans(csv_sirens, db_establishments)
            assert len(orphans) == 2

            # Check deletability
            usage = {
                "id-3": {"users": 0, "campaigns": 0, "groups": 0},
                "id-4": {"users": 1, "campaigns": 0, "groups": 0},
            }
            deletable = get_deletable_orphans(orphans, usage)
            assert len(deletable) == 1
            assert deletable[0]["id"] == "id-3"

        finally:
            os.unlink(csv_path)

    def test_edge_case_same_siren_different_format(self):
        """Test that SIRENs are normalized (decimal vs integer)."""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as f:
            writer = csv.DictWriter(f, fieldnames=['Siren', 'Name'])
            writer.writeheader()
            writer.writerow({'Siren': '123456789.0', 'Name': 'Decimal format'})
            f.flush()
            csv_path = f.name

        try:
            csv_sirens = load_csv_sirens(csv_path)

            db_establishments = [
                {"id": "id-1", "siren": 123456789, "name": "Integer format"},
            ]

            orphans = detect_orphans(csv_sirens, db_establishments)

            # Should not be an orphan since 123456789.0 == 123456789
            assert len(orphans) == 0

        finally:
            os.unlink(csv_path)

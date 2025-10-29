#!/usr/bin/env python3
"""
Unit and functional tests for calculate_distances.py

Tests cover:
- Haversine distance calculation
- French geographic classification rules
- Country detection logic
- Batch address data loading
- End-to-end distance calculation

Run tests with:
    pytest test_calculate_distances.py -v
    pytest test_calculate_distances.py -v -k test_haversine  # Run specific test
"""

import pytest
import math
from unittest.mock import Mock, patch, MagicMock
from calculate_distances import DistanceCalculator


class TestHaversineDistance:
    """Test the Haversine distance formula."""

    def test_same_location(self):
        """Distance between same coordinates should be 0."""
        distance = DistanceCalculator.haversine_distance(48.8566, 2.3522, 48.8566, 2.3522)
        assert distance == 0.0

    def test_paris_marseille(self):
        """Distance between Paris and Marseille should be ~660 km."""
        # Paris: 48.8566°N, 2.3522°E
        # Marseille: 43.2965°N, 5.3698°E
        distance = DistanceCalculator.haversine_distance(48.8566, 2.3522, 43.2965, 5.3698)
        # Expected distance is approximately 660 km
        assert 655 < distance < 665, f"Expected ~660 km, got {distance:.2f} km"

    def test_paris_lyon(self):
        """Distance between Paris and Lyon should be ~400 km."""
        # Paris: 48.8566°N, 2.3522°E
        # Lyon: 45.7640°N, 4.8357°E
        distance = DistanceCalculator.haversine_distance(48.8566, 2.3522, 45.7640, 4.8357)
        # Expected distance is approximately 392 km
        assert 385 < distance < 400, f"Expected ~392 km, got {distance:.2f} km"

    def test_short_distance(self):
        """Test short distance within same city (Paris)."""
        # Two points in Paris, ~3 km apart
        distance = DistanceCalculator.haversine_distance(48.8566, 2.3522, 48.8738, 2.2950)
        # Should be less than 10 km
        assert 0 < distance < 10, f"Expected < 10 km, got {distance:.2f} km"

    def test_negative_coordinates(self):
        """Test with negative coordinates (western hemisphere)."""
        # New York: 40.7128°N, -74.0060°W
        # Los Angeles: 34.0522°N, -118.2437°W
        distance = DistanceCalculator.haversine_distance(40.7128, -74.0060, 34.0522, -118.2437)
        # Expected distance is approximately 3944 km
        assert 3900 < distance < 4000, f"Expected ~3944 km, got {distance:.2f} km"

    def test_symmetric(self):
        """Distance should be the same regardless of point order."""
        dist1 = DistanceCalculator.haversine_distance(48.8566, 2.3522, 43.2965, 5.3698)
        dist2 = DistanceCalculator.haversine_distance(43.2965, 5.3698, 48.8566, 2.3522)
        assert abs(dist1 - dist2) < 0.001, "Distance should be symmetric"


class TestFrenchGeographicRules:
    """Test French geographic classification rules."""

    @pytest.fixture
    def calculator(self):
        """Create a DistanceCalculator instance for testing."""
        calc = Mock(spec=DistanceCalculator)
        calc.metro_regions = ['11', '24', '27', '28', '32', '44', '52', '53', '75', '76', '84', '93', '94']
        calc.overseas_regions = ['01', '02', '03', '04', '06']
        calc.calculate_french_geographic_rules = DistanceCalculator.calculate_french_geographic_rules.__get__(calc)
        calc.same_region = DistanceCalculator.same_region.__get__(calc)
        calc.is_metro_region = DistanceCalculator.is_metro_region.__get__(calc)
        calc.is_overseas_region = DistanceCalculator.is_overseas_region.__get__(calc)
        calc.get_region_from_postal_code = DistanceCalculator.get_region_from_postal_code.__get__(calc)
        calc.load_regions = Mock()  # Mock to avoid side effects
        return calc

    def test_rule_1_same_postal_code(self, calculator):
        """Rule 1: Same postal code should return 1."""
        result = calculator.calculate_french_geographic_rules('75001', '75001')
        assert result == 1

    def test_rule_2_same_department(self, calculator):
        """Rule 2: Same department (different postal codes) should return 2."""
        result = calculator.calculate_french_geographic_rules('75001', '75015')
        assert result == 2

    def test_rule_3_same_region(self, calculator):
        """Rule 3: Same region (different departments) should return 3."""
        # Paris (75) and Val-d'Oise (95) are both in Île-de-France region (11)
        with patch.object(calculator, 'get_region_from_postal_code') as mock_get_region:
            mock_get_region.side_effect = lambda pc: '11' if pc[:2] in ['75', '95'] else None
            result = calculator.calculate_french_geographic_rules('75001', '95000')
            assert result == 3

    def test_rule_4_different_regions_metro(self, calculator):
        """Rule 4: Different regions, owner in metropolitan France should return 4."""
        # Paris (75) in Île-de-France (11) and Lyon (69) in Auvergne-Rhône-Alpes (84)
        with patch.object(calculator, 'get_region_from_postal_code') as mock_get_region:
            mock_get_region.side_effect = lambda pc: '11' if pc[:2] == '75' else '84'
            result = calculator.calculate_french_geographic_rules('75001', '69001')
            assert result == 4

    def test_rule_5_owner_overseas(self, calculator):
        """Rule 5: Owner in overseas territories should return 5."""
        # Guadeloupe (971) and Paris (75)
        with patch.object(calculator, 'get_region_from_postal_code') as mock_get_region:
            mock_get_region.side_effect = lambda pc: '01' if pc[:2] == '97' else '11'
            with patch.object(calculator, 'is_overseas_region', return_value=True):
                result = calculator.calculate_french_geographic_rules('97110', '75001')
                assert result == 5

    def test_rule_7_default(self, calculator):
        """Rule 7: Default case when no other rule applies should return 7."""
        # Edge case: postal codes that don't match any specific rule
        with patch.object(calculator, 'same_region', return_value=False):
            with patch.object(calculator, 'is_metro_region', return_value=False):
                with patch.object(calculator, 'is_overseas_region', return_value=False):
                    result = calculator.calculate_french_geographic_rules('00000', '99999')
                    assert result == 7


class TestCountryDetection:
    """Test country detection logic."""

    @pytest.fixture
    def calculator(self):
        """Create a DistanceCalculator instance with mocked country detector."""
        with patch('calculate_distances.CountryDetector'):
            calc = Mock(spec=DistanceCalculator)
            calc.country_detector = Mock()
            calc.detect_country_simple = DistanceCalculator.detect_country_simple.__get__(calc)
            return calc

    def test_empty_address_returns_france(self, calculator):
        """Empty or null addresses should default to FRANCE."""
        assert calculator.detect_country_simple('') == 'FRANCE'
        assert calculator.detect_country_simple('   ') == 'FRANCE'
        assert calculator.detect_country_simple('nan') == 'FRANCE'
        assert calculator.detect_country_simple('null') == 'FRANCE'
        assert calculator.detect_country_simple('none') == 'FRANCE'

    def test_french_address_detected(self, calculator):
        """French addresses should be detected correctly."""
        calculator.country_detector.detect_country.return_value = 'FRANCE'
        result = calculator.detect_country_simple('123 Rue de la Paix, 75001 Paris')
        assert result == 'FRANCE'

    def test_foreign_address_detected(self, calculator):
        """Foreign addresses should be detected correctly."""
        calculator.country_detector.detect_country.return_value = 'FOREIGN'
        result = calculator.detect_country_simple('10 Downing Street, London SW1A 2AA')
        assert result == 'FOREIGN'

    def test_detection_error_defaults_to_france(self, calculator):
        """Detection errors should default to FRANCE."""
        calculator.country_detector.detect_country.side_effect = Exception('Detection failed')
        result = calculator.detect_country_simple('Some ambiguous address')
        assert result == 'FRANCE'


class TestProcessSinglePair:
    """Test processing of single owner-housing pairs."""

    @pytest.fixture
    def calculator(self):
        """Create a DistanceCalculator instance for testing."""
        with patch('calculate_distances.CountryDetector'):
            calc = Mock(spec=DistanceCalculator)
            calc.stats = {
                'missing_both_data': 0,
                'missing_owner_data': 0,
                'missing_housing_data': 0,
                'addresses_with_coords': 0,
                'addresses_without_coords': 0,
                'france_detected': 0,
                'foreign_detected': 0,
                'distances_calculated': 0,
                'geographic_rules_applied': 0
            }
            calc.process_single_pair = DistanceCalculator.process_single_pair.__get__(calc)
            calc.haversine_distance = DistanceCalculator.haversine_distance
            calc.detect_country_simple = Mock(return_value='FRANCE')
            calc.calculate_french_geographic_rules = Mock(return_value=1)
            calc.log_classification = Mock()
            return calc

    def test_both_addresses_with_coordinates(self, calculator):
        """Test pair with both addresses having coordinates."""
        address_cache = {
            ('owner123', 'Owner'): ('75001', '123 Rue de Rivoli', 48.8566, 2.3522),
            ('housing456', 'Housing'): ('75015', '456 Rue de Vaugirard', 48.8422, 2.2996)
        }

        distance, classification = calculator.process_single_pair('owner123', 'housing456', address_cache)

        assert distance is not None
        assert 0 < distance < 10  # Should be a few km within Paris
        assert calculator.stats['distances_calculated'] == 1
        assert calculator.stats['addresses_with_coords'] == 2

    def test_missing_owner_data(self, calculator):
        """Test pair with missing owner data."""
        address_cache = {
            ('housing456', 'Housing'): ('75015', '456 Rue de Vaugirard', 48.8422, 2.2996)
        }

        distance, classification = calculator.process_single_pair('owner123', 'housing456', address_cache)

        assert distance is None
        assert classification == 7  # Default classification
        assert calculator.stats['missing_owner_data'] == 1

    def test_missing_housing_data(self, calculator):
        """Test pair with missing housing data."""
        address_cache = {
            ('owner123', 'Owner'): ('75001', '123 Rue de Rivoli', 48.8566, 2.3522)
        }

        distance, classification = calculator.process_single_pair('owner123', 'housing456', address_cache)

        assert distance is None
        assert classification == 7  # Default classification
        assert calculator.stats['missing_housing_data'] == 1

    def test_foreign_owner_address(self, calculator):
        """Test pair with foreign owner address."""
        calculator.detect_country_simple = Mock(side_effect=lambda addr: 'FOREIGN' if 'London' in addr else 'FRANCE')

        address_cache = {
            ('owner123', 'Owner'): ('SW1A', '10 Downing Street, London', None, None),
            ('housing456', 'Housing'): ('75015', '456 Rue de Vaugirard', 48.8422, 2.2996)
        }

        distance, classification = calculator.process_single_pair('owner123', 'housing456', address_cache)

        assert distance is None
        assert classification == 6  # Foreign address rule
        assert calculator.stats['foreign_detected'] == 1

    def test_addresses_without_coordinates_but_french(self, calculator):
        """Test pair where addresses have no coordinates but are in France."""
        address_cache = {
            ('owner123', 'Owner'): ('75001', '123 Rue de Rivoli', None, None),
            ('housing456', 'Housing'): ('75001', '456 Rue de Rivoli', None, None)
        }

        distance, classification = calculator.process_single_pair('owner123', 'housing456', address_cache)

        assert distance is None  # No coordinates, so no distance
        assert classification == 1  # Same postal code (75001)
        assert calculator.stats['geographic_rules_applied'] == 1


class TestBatchAddressData:
    """Test batch address data loading."""

    @pytest.fixture
    def calculator(self):
        """Create a DistanceCalculator instance with mocked cursor."""
        calc = Mock(spec=DistanceCalculator)
        calc.cursor = Mock()
        calc.batch_get_address_data = DistanceCalculator.batch_get_address_data.__get__(calc)
        return calc

    def test_batch_loading_owner_and_housing(self, calculator):
        """Test loading addresses for both owners and housing in batch."""
        pairs = [
            {'owner_id': 'owner1', 'housing_id': 'housing1'},
            {'owner_id': 'owner2', 'housing_id': 'housing2'},
            {'owner_id': 'owner1', 'housing_id': 'housing3'}  # Duplicate owner
        ]

        # Mock cursor responses
        owner_rows = [
            {'ref_id': 'owner1', 'postal_code': '75001', 'address': 'Addr 1', 'latitude': 48.86, 'longitude': 2.35},
            {'ref_id': 'owner2', 'postal_code': '75002', 'address': 'Addr 2', 'latitude': 48.87, 'longitude': 2.34}
        ]
        housing_rows = [
            {'ref_id': 'housing1', 'postal_code': '75011', 'address': 'Housing 1', 'latitude': 48.85, 'longitude': 2.38},
            {'ref_id': 'housing2', 'postal_code': '75012', 'address': 'Housing 2', 'latitude': 48.84, 'longitude': 2.39},
            {'ref_id': 'housing3', 'postal_code': '75013', 'address': 'Housing 3', 'latitude': 48.83, 'longitude': 2.36}
        ]

        calculator.cursor.execute = Mock()
        calculator.cursor.fetchall = Mock(side_effect=[owner_rows, housing_rows])

        result = calculator.batch_get_address_data(pairs)

        # Should have cached 2 unique owners and 3 unique housing
        assert len(result) == 5
        assert ('owner1', 'Owner') in result
        assert ('owner2', 'Owner') in result
        assert ('housing1', 'Housing') in result
        assert ('housing2', 'Housing') in result
        assert ('housing3', 'Housing') in result

        # Verify that execute was called twice (once for owners, once for housing)
        assert calculator.cursor.execute.call_count == 2

    def test_batch_loading_with_empty_pairs(self, calculator):
        """Test batch loading with no pairs."""
        pairs = []
        result = calculator.batch_get_address_data(pairs)
        assert result == {}

    def test_batch_loading_handles_database_error(self, calculator):
        """Test that batch loading handles database errors gracefully."""
        pairs = [{'owner_id': 'owner1', 'housing_id': 'housing1'}]
        calculator.cursor.execute.side_effect = Exception('Database error')

        result = calculator.batch_get_address_data(pairs)

        assert result == {}  # Should return empty dict on error


class TestFunctionalEndToEnd:
    """Functional tests simulating real-world scenarios."""

    @pytest.fixture
    def calculator(self):
        """Create a DistanceCalculator instance with minimal mocking."""
        with patch('calculate_distances.CountryDetector'):
            calc = Mock(spec=DistanceCalculator)
            calc.stats = {
                'missing_both_data': 0,
                'missing_owner_data': 0,
                'missing_housing_data': 0,
                'addresses_with_coords': 0,
                'addresses_without_coords': 0,
                'france_detected': 0,
                'foreign_detected': 0,
                'distances_calculated': 0,
                'geographic_rules_applied': 0
            }
            calc.metro_regions = ['11', '84']
            calc.overseas_regions = ['01']
            calc.process_single_pair = DistanceCalculator.process_single_pair.__get__(calc)
            calc.haversine_distance = DistanceCalculator.haversine_distance
            calc.detect_country_simple = Mock(return_value='FRANCE')
            calc.calculate_french_geographic_rules = DistanceCalculator.calculate_french_geographic_rules.__get__(calc)
            calc.same_region = Mock(return_value=False)
            calc.is_metro_region = Mock(return_value=True)
            calc.is_overseas_region = Mock(return_value=False)
            calc.log_classification = Mock()
            return calc

    def test_scenario_owner_housing_same_city(self, calculator):
        """
        Scenario: Owner and housing in same city (Paris)
        Expected: Small distance, classification = 1 (same postal code)
        """
        calculator.same_region = Mock(return_value=True)
        calculator.calculate_french_geographic_rules = Mock(return_value=1)

        address_cache = {
            ('owner1', 'Owner'): ('75001', '1 Rue de Rivoli', 48.8606, 2.3376),
            ('housing1', 'Housing'): ('75001', '10 Rue de Rivoli', 48.8603, 2.3381)
        }

        distance, classification = calculator.process_single_pair('owner1', 'housing1', address_cache)

        assert distance is not None
        assert distance < 1  # Less than 1 km
        assert classification == 1

    def test_scenario_owner_housing_different_regions(self, calculator):
        """
        Scenario: Owner in Paris, housing in Lyon (different regions)
        Expected: ~400 km distance, classification = 4 (different regions, owner in metro)
        """
        calculator.calculate_french_geographic_rules = Mock(return_value=4)

        address_cache = {
            ('owner2', 'Owner'): ('75001', 'Paris Address', 48.8566, 2.3522),
            ('housing2', 'Housing'): ('69001', 'Lyon Address', 45.7640, 4.8357)
        }

        distance, classification = calculator.process_single_pair('owner2', 'housing2', address_cache)

        assert distance is not None
        assert 385 < distance < 400
        assert classification == 4

    def test_scenario_foreign_owner_french_housing(self, calculator):
        """
        Scenario: Foreign owner, French housing
        Expected: No distance, classification = 6 (foreign address)
        """
        calculator.detect_country_simple = Mock(side_effect=lambda addr: 'FOREIGN' if 'London' in addr else 'FRANCE')

        address_cache = {
            ('owner3', 'Owner'): ('SW1A', '10 Downing Street, London', None, None),
            ('housing3', 'Housing'): ('75001', 'Paris Address', 48.8566, 2.3522)
        }

        distance, classification = calculator.process_single_pair('owner3', 'housing3', address_cache)

        assert distance is None
        assert classification == 6

    def test_scenario_incomplete_data(self, calculator):
        """
        Scenario: Missing owner address data
        Expected: No distance, classification = 7 (default)
        """
        address_cache = {
            ('housing4', 'Housing'): ('75001', 'Paris Address', 48.8566, 2.3522)
        }

        distance, classification = calculator.process_single_pair('owner4', 'housing4', address_cache)

        assert distance is None
        assert classification == 7
        assert calculator.stats['missing_owner_data'] == 1


class TestRegionDetection:
    """Test region detection and classification."""

    @pytest.fixture
    def calculator(self):
        """Create a DistanceCalculator instance."""
        calc = Mock(spec=DistanceCalculator)
        calc.metro_regions = ['11', '24', '27', '28', '32', '44', '52', '53', '75', '76', '84', '93', '94']
        calc.overseas_regions = ['01', '02', '03', '04', '06']
        calc.is_metro_region = DistanceCalculator.is_metro_region.__get__(calc)
        calc.is_overseas_region = DistanceCalculator.is_overseas_region.__get__(calc)
        calc.get_region_from_postal_code = DistanceCalculator.get_region_from_postal_code.__get__(calc)
        return calc

    def test_paris_is_ile_de_france_region(self, calculator):
        """Paris (75) should be in Île-de-France region (11)."""
        with patch.object(calculator, 'get_region_from_postal_code', return_value='11'):
            assert calculator.is_metro_region('75001') == True

    def test_guadeloupe_is_overseas(self, calculator):
        """Guadeloupe (971) should be overseas."""
        with patch.object(calculator, 'get_region_from_postal_code', return_value='01'):
            assert calculator.is_overseas_region('97110') == True

    def test_lyon_is_metro(self, calculator):
        """Lyon (69) should be in metropolitan France."""
        with patch.object(calculator, 'get_region_from_postal_code', return_value='84'):
            assert calculator.is_metro_region('69001') == True


if __name__ == '__main__':
    pytest.main([__file__, '-v'])

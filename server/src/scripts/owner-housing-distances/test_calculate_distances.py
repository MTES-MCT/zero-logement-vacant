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

import math
from unittest.mock import MagicMock, Mock, patch

import pytest
from calculate_distances import DistanceCalculator, LocationScope
from country_detector import CountryDetector


class TestHaversineDistance:
    """Test the Haversine distance formula."""

    def test_same_location(self):
        """Distance between same coordinates should be 0."""
        distance = DistanceCalculator.haversine_distance(
            48.8566, 2.3522, 48.8566, 2.3522
        )
        assert distance == pytest.approx(0.0, abs=1e-10)

    def test_paris_marseille(self):
        """Distance between Paris and Marseille should be ~660 km."""
        # Paris: 48.8566°N, 2.3522°E
        # Marseille: 43.2965°N, 5.3698°E
        distance = DistanceCalculator.haversine_distance(
            48.8566, 2.3522, 43.2965, 5.3698
        )
        # Expected distance is approximately 660 km
        assert 655 < distance < 665, f"Expected ~660 km, got {distance:.2f} km"

    def test_paris_lyon(self):
        """Distance between Paris and Lyon should be ~400 km."""
        # Paris: 48.8566°N, 2.3522°E
        # Lyon: 45.7640°N, 4.8357°E
        distance = DistanceCalculator.haversine_distance(
            48.8566, 2.3522, 45.7640, 4.8357
        )
        # Expected distance is approximately 392 km
        assert 385 < distance < 400, f"Expected ~392 km, got {distance:.2f} km"

    def test_short_distance(self):
        """Test short distance within same city (Paris)."""
        # Two points in Paris, ~3 km apart
        distance = DistanceCalculator.haversine_distance(
            48.8566, 2.3522, 48.8738, 2.2950
        )
        # Should be less than 10 km
        assert 0 < distance < 10, f"Expected < 10 km, got {distance:.2f} km"

    def test_negative_coordinates(self):
        """Test with negative coordinates (western hemisphere)."""
        # New York: 40.7128°N, -74.0060°W
        # Los Angeles: 34.0522°N, -118.2437°W
        distance = DistanceCalculator.haversine_distance(
            40.7128, -74.0060, 34.0522, -118.2437
        )
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
        calc.metro_regions = [
            "11",
            "24",
            "27",
            "28",
            "32",
            "44",
            "52",
            "53",
            "75",
            "76",
            "84",
            "93",
            "94",
        ]
        calc.overseas_regions = ["01", "02", "03", "04", "06"]
        calc.calculate_french_geographic_rules = (
            DistanceCalculator.calculate_french_geographic_rules.__get__(calc)
        )
        calc.same_region = DistanceCalculator.same_region.__get__(calc)
        calc.is_metro_region = DistanceCalculator.is_metro_region.__get__(calc)
        calc.is_overseas_region = DistanceCalculator.is_overseas_region.__get__(calc)
        calc.get_region_from_postal_code = (
            DistanceCalculator.get_region_from_postal_code.__get__(calc)
        )
        calc.load_regions = Mock()  # Mock to avoid side effects
        return calc

    def test_rule_1_same_postal_code(self, calculator):
        """Rule 1: Same postal code should return 1."""
        result = calculator.calculate_french_geographic_rules("75001", "75001")
        assert result == 1

    def test_rule_2_same_department(self, calculator):
        """Rule 2: Same department (different postal codes) should return 2."""
        result = calculator.calculate_french_geographic_rules("75001", "75015")
        assert result == 2

    def test_rule_3_same_region(self, calculator):
        """Rule 3: Same region (different departments) should return 3."""
        # Paris (75) and Val-d'Oise (95) are both in Île-de-France region (11)
        with patch.object(calculator, "get_region_from_postal_code") as mock_get_region:
            mock_get_region.side_effect = lambda pc: (
                "11" if pc[:2] in ["75", "95"] else None
            )
            result = calculator.calculate_french_geographic_rules("75001", "95000")
            assert result == 3

    def test_rule_4_different_regions_metro(self, calculator):
        """Rule 4: Different regions, owner in metropolitan France should return 4."""
        # Paris (75) in Île-de-France (11) and Lyon (69) in Auvergne-Rhône-Alpes (84)
        with patch.object(calculator, "get_region_from_postal_code") as mock_get_region:
            mock_get_region.side_effect = lambda pc: "11" if pc[:2] == "75" else "84"
            result = calculator.calculate_french_geographic_rules("75001", "69001")
            assert result == 4

    def test_rule_5_owner_overseas(self, calculator):
        """Rule 5: Owner in overseas territories should return 5."""
        # Guadeloupe (971) and Paris (75)
        with patch.object(calculator, "get_region_from_postal_code") as mock_get_region:
            mock_get_region.side_effect = lambda pc: "01" if pc[:2] == "97" else "11"
            with patch.object(calculator, "is_overseas_region", return_value=True):
                result = calculator.calculate_french_geographic_rules("97110", "75001")
                assert result == 5

    def test_rule_7_default(self, calculator):
        """Rule 7: Default case when no other rule applies should return 7."""
        # Edge case: postal codes that don't match any specific rule
        with patch.object(calculator, "same_region", return_value=False):
            with patch.object(calculator, "is_metro_region", return_value=False):
                with patch.object(calculator, "is_overseas_region", return_value=False):
                    result = calculator.calculate_french_geographic_rules(
                        "00000", "99999"
                    )
                    assert result == 7


class TestCountryDetection:
    """Test country detection logic."""

    @pytest.fixture
    def calculator(self):
        """Create a DistanceCalculator instance with mocked country detector."""
        with patch("calculate_distances.CountryDetector"):
            calc = Mock(spec=DistanceCalculator)
            calc.country_detector = Mock()
            calc.country_cache = {}
            calc.detect_country_simple = (
                DistanceCalculator.detect_country_simple.__get__(calc)
            )
            return calc

    def test_empty_address_returns_unknown(self, calculator):
        """Empty or null addresses should not be treated as French proof."""
        assert calculator.detect_country_simple("") == "UNKNOWN"
        assert calculator.detect_country_simple("   ") == "UNKNOWN"
        assert calculator.detect_country_simple("nan") == "UNKNOWN"
        assert calculator.detect_country_simple("null") == "UNKNOWN"
        assert calculator.detect_country_simple("none") == "UNKNOWN"

    def test_french_address_detected(self, calculator):
        """French addresses should be detected correctly."""
        calculator.country_detector.detect_country.return_value = "FRANCE"
        result = calculator.detect_country_simple("123 Rue de la Paix, 75001 Paris")
        assert result == "FRANCE"

    def test_foreign_address_detected(self, calculator):
        """Foreign addresses should be detected correctly."""
        calculator.country_detector.detect_country.return_value = "FOREIGN"
        result = calculator.detect_country_simple("10 Downing Street, London SW1A 2AA")
        assert result == "FOREIGN"

    def test_french_like_address_without_ban_match_is_unknown(self):
        """Text-only French-looking addresses are not authoritative enough."""
        detector = CountryDetector(model_name="rule-based", use_llm=False)

        assert detector.detect_country("38200 VIENNE") == "UNKNOWN"
        assert detector.detect_country("12 RUE DES CLERCS 38200 VIENNE") == "UNKNOWN"
        assert detector.detect_country("123 Rue de la Paix, 75001 Paris") == "UNKNOWN"

    @pytest.mark.parametrize(
        "address",
        [
            "10115 Berlin Allemagne",
            "28013 Madrid Espagne",
            "90210 Beverly Hills USA",
            "98000 Monaco",
            "10 Downing Street, London, Royaume-Uni",
        ],
    )
    def test_explicit_foreign_country_beats_french_like_postal_code(self, address):
        """Explicit foreign countries should win over French-like postal codes."""
        detector = CountryDetector(model_name="rule-based", use_llm=False)

        assert detector.detect_country(address) == "FOREIGN"

    @pytest.mark.parametrize(
        "address",
        [
            "Berlin",
            "10 Downing Street, London SW1A 2AA",
            "98000 Monte Carlo",
            "10115 Berlin",
            "10115 Jean-Baptiste Clément Berlin",
            "10115 A Berlin",
            "10115 Avenue Berlin",
            "10115 Main Street Berlin",
            "123 A Main Street",
        ],
    )
    def test_ambiguous_foreign_location_without_country_is_unknown(self, address):
        """Foreign-looking addresses without an explicit country stay unclassified."""
        detector = CountryDetector(model_name="rule-based", use_llm=False)

        assert detector.detect_country(address) == "UNKNOWN"

    @pytest.mark.parametrize(
        "address",
        [
            "Paris, France",
            "1 rue de la Paix 75001 Paris France",
            "97110 Pointe-à-Pitre Guadeloupe",
            "98713 Papeete Polynésie française",
            "97600 Mamoudzou Mayotte",
        ],
    )
    def test_explicit_france_country_or_territory_is_france(self, address):
        """Explicit France or French territory names are accepted as France."""
        detector = CountryDetector(model_name="rule-based", use_llm=False)

        assert detector.detect_country(address) == "FRANCE"

    @pytest.mark.parametrize(
        "address",
        [
            "Avenue de l'Angleterre 75000 Paris",
            "Avenue de l'Angleterre",
            "Promenade des Anglais 06000 Nice",
            "1 rue d'Italie",
            "1 rue d'Italie 75013 Paris",
        ],
    )
    def test_country_terms_inside_french_street_names_are_unknown(self, address):
        """Street names that contain country words should not imply abroad."""
        detector = CountryDetector(model_name="rule-based", use_llm=False)

        assert detector.detect_country(address) == "UNKNOWN"

    @pytest.mark.parametrize(
        ("address", "expected"),
        [
            ("1 rue d'Italie, Italie", "FOREIGN"),
            ("1 avenue de France, France", "FRANCE"),
        ],
    )
    def test_explicit_final_country_component_beats_street_name(
        self, address, expected
    ):
        """A final country component is explicit even when the street shares its name."""
        detector = CountryDetector(model_name="rule-based", use_llm=False)

        assert detector.detect_country(address) == expected

    @pytest.mark.parametrize(
        "address",
        [
            "97110 Pointe-à-Pitre Guadeloupe",
            "98713 Papeete Polynésie française",
            "97600 Mamoudzou Mayotte",
        ],
    )
    def test_french_overseas_postal_codes_stay_france(self, address):
        """French overseas postal codes should still be classified as France."""
        detector = CountryDetector(model_name="rule-based", use_llm=False)

        assert detector.detect_country(address) == "FRANCE"

    def test_distance_calculator_delegates_country_detection(self, calculator):
        """DistanceCalculator should keep country rules centralized in CountryDetector."""
        calculator.country_detector.detect_country.return_value = "FOREIGN"

        assert calculator.detect_country_simple("38200 VIENNE") == "FOREIGN"
        calculator.country_detector.detect_country.assert_called_once_with(
            "38200 VIENNE"
        )

    def test_detection_error_defaults_to_france(self, calculator):
        """Detection errors should not make an address French by default."""
        calculator.country_detector.detect_country.side_effect = Exception(
            "Detection failed"
        )
        result = calculator.detect_country_simple("Some ambiguous address")
        assert result == "UNKNOWN"


class TestProcessSinglePair:
    """Test processing of single owner-housing pairs."""

    @pytest.fixture
    def calculator(self):
        """Create a DistanceCalculator instance for testing."""
        with patch("calculate_distances.CountryDetector"):
            calc = Mock(spec=DistanceCalculator)
            calc.stats = DistanceCalculator._empty_stats()
            calc.process_single_pair = DistanceCalculator.process_single_pair.__get__(
                calc
            )
            calc.haversine_distance = DistanceCalculator.haversine_distance
            calc._has_coordinates = DistanceCalculator._has_coordinates
            calc._country_from_address_data = (
                DistanceCalculator._country_from_address_data.__get__(calc)
            )
            calc.detect_country_simple = Mock(return_value="FRANCE")
            calc.calculate_french_geographic_rules = Mock(return_value=1)
            calc.log_classification = Mock()
            return calc

    def test_both_addresses_with_coordinates(self, calculator):
        """Test pair with both addresses having coordinates."""
        address_cache = {
            ("owner123", "Owner"): (
                "75001",
                "123 Rue de Rivoli",
                48.8566,
                2.3522,
                "75001",
                "owner-ban",
            ),
            ("housing456", "Housing"): (
                "75015",
                "456 Rue de Vaugirard",
                48.8422,
                2.2996,
                "75015",
                "housing-ban",
            ),
        }

        distance, classification = calculator.process_single_pair(
            "owner123", "housing456", address_cache
        )

        assert distance is not None
        assert 0 < distance < 10  # Should be a few km within Paris
        assert calculator.stats["distances_calculated"] == 1
        assert calculator.stats["addresses_with_coords"] == 2

    def test_missing_owner_data(self, calculator):
        """Test pair with missing owner data."""
        address_cache = {
            ("housing456", "Housing"): (
                "75015",
                "456 Rue de Vaugirard",
                48.8422,
                2.2996,
                "75015",
                "housing-ban",
            )
        }

        distance, classification = calculator.process_single_pair(
            "owner123", "housing456", address_cache
        )

        assert distance is None
        assert classification == 7  # Default classification
        assert calculator.stats["missing_owner_data"] == 1

    def test_missing_housing_data(self, calculator):
        """Test pair with missing housing data."""
        address_cache = {
            ("owner123", "Owner"): (
                "75001",
                "123 Rue de Rivoli",
                48.8566,
                2.3522,
                "75001",
                "owner-ban",
            )
        }

        distance, classification = calculator.process_single_pair(
            "owner123", "housing456", address_cache
        )

        assert distance is None
        assert classification == 7  # Default classification
        assert calculator.stats["missing_housing_data"] == 1

    def test_foreign_owner_address(self, calculator):
        """Test pair with foreign owner address."""
        calculator.detect_country_simple = Mock(
            side_effect=lambda addr: "FOREIGN" if "London" in addr else "FRANCE"
        )

        address_cache = {
            ("owner123", "Owner"): (
                "SW1A",
                "10 Downing Street, London",
                None,
                None,
                None,
                None,
            ),
            ("housing456", "Housing"): (
                "75015",
                "456 Rue de Vaugirard",
                48.8422,
                2.2996,
                "75015",
                "housing-ban",
            ),
        }

        distance, classification = calculator.process_single_pair(
            "owner123", "housing456", address_cache
        )

        assert distance is None
        assert classification == 6  # Foreign address rule
        assert calculator.stats["foreign_detected"] == 1

    def test_unknown_owner_address(self, calculator):
        """Ambiguous owner addresses should remain unclassified, not foreign."""
        calculator.detect_country_simple = Mock(
            side_effect=lambda addr: "UNKNOWN" if "Berlin" in addr else "FRANCE"
        )

        address_cache = {
            ("owner123", "Owner"): ("10115", "10115 Berlin", None, None, None, None),
            ("housing456", "Housing"): (
                "75015",
                "456 Rue de Vaugirard",
                48.8422,
                2.2996,
                "75015",
                "housing-ban",
            ),
        }

        distance, classification = calculator.process_single_pair(
            "owner123", "housing456", address_cache
        )

        assert distance is None
        assert classification == 7
        assert calculator.stats["unknown_detected"] == 1

    def test_address_without_coordinates_or_country_evidence_is_unclassified(
        self, calculator
    ):
        """A BAN row without coordinates or explicit country should not be assumed French."""
        address_cache = {
            ("owner123", "Owner"): ("75001", None, None, None, "75001", None),
            ("housing456", "Housing"): (
                "75001",
                "456 Rue de Vaugirard",
                48.8422,
                2.2996,
                "75001",
                "housing-ban",
            ),
        }

        distance, classification = calculator.process_single_pair(
            "owner123", "housing456", address_cache
        )

        assert distance is None
        assert classification == 7
        assert calculator.stats["unknown_detected"] == 1

    def test_addresses_without_coordinates_but_french(self, calculator):
        """Test pair where addresses have no coordinates but are in France."""
        address_cache = {
            ("owner123", "Owner"): (
                "75001",
                "123 Rue de Rivoli",
                None,
                None,
                "75001",
                "owner-ban",
            ),
            ("housing456", "Housing"): (
                "75001",
                "456 Rue de Rivoli",
                None,
                None,
                "75001",
                "housing-ban",
            ),
        }

        distance, classification = calculator.process_single_pair(
            "owner123", "housing456", address_cache
        )

        assert distance is None  # No coordinates, so no distance
        assert classification == 1  # Same postal code (75001)
        assert calculator.stats["geographic_rules_applied"] == 1

    def test_same_ban_id_returns_same_address(self, calculator):
        """Same BAN id should return app classification 0."""
        address_cache = {
            ("owner123", "Owner"): (
                "75001",
                "123 Rue de Rivoli",
                48.8566,
                2.3522,
                "75001",
                "ban-1",
            ),
            ("housing456", "Housing"): (
                "75001",
                "123 Rue de Rivoli",
                48.8566,
                2.3522,
                "75001",
                "ban-1",
            ),
        }

        _, classification = calculator.process_single_pair(
            "owner123", "housing456", address_cache
        )

        assert classification == 0

    def test_same_non_empty_ban_id_stays_same_address_without_coords_or_country(
        self, calculator
    ):
        """Matching BAN identity remains usable when country and coordinates are absent."""
        calculator.detect_country_simple = Mock(return_value="UNKNOWN")
        address_cache = {
            ("owner123", "Owner"): (
                "75013",
                "1 rue d'Italie",
                None,
                None,
                "75113",
                "ban-1",
            ),
            ("housing456", "Housing"): (
                "75013",
                "1 rue d'Italie",
                None,
                None,
                "75113",
                "ban-1",
            ),
        }

        distance, classification = calculator.process_single_pair(
            "owner123", "housing456", address_cache
        )

        assert distance is None
        assert classification == 0

    @pytest.mark.parametrize("ban_id", [None, ""])
    def test_missing_ban_id_does_not_imply_same_address(self, calculator, ban_id):
        """Only a non-empty shared BAN id is valid identity evidence."""
        address_cache = {
            ("owner123", "Owner"): (
                "75001",
                "123 Rue de Rivoli, France",
                None,
                None,
                "75001",
                ban_id,
            ),
            ("housing456", "Housing"): (
                "75001",
                "123 Rue de Rivoli, France",
                None,
                None,
                "75001",
                ban_id,
            ),
        }

        _, classification = calculator.process_single_pair(
            "owner123", "housing456", address_cache
        )

        assert classification == 1

    def test_short_distance_with_distinct_ban_ids_uses_geographic_rules(
        self, calculator
    ):
        """Nearby coordinates are not enough to classify two addresses as identical."""
        address_cache = {
            ("owner123", "Owner"): (
                "75001",
                "123 Rue de Rivoli",
                48.8566,
                2.3522,
                "75001",
                "owner-ban",
            ),
            ("housing456", "Housing"): (
                "75001",
                "125 Rue de Rivoli",
                48.8567,
                2.3523,
                "75001",
                "housing-ban",
            ),
        }

        _, classification = calculator.process_single_pair(
            "owner123", "housing456", address_cache
        )

        assert classification == 1


class TestBatchAddressData:
    """Test batch address data loading."""

    @pytest.fixture
    def calculator(self):
        """Create a DistanceCalculator instance with mocked cursor."""
        calc = Mock(spec=DistanceCalculator)
        calc.cursor = Mock()
        calc.batch_get_address_data = DistanceCalculator.batch_get_address_data.__get__(
            calc
        )
        return calc

    def test_batch_loading_owner_and_housing(self, calculator):
        """Test loading addresses for both owners and housing in batch."""
        pairs = [
            {"owner_id": "owner1", "housing_id": "housing1"},
            {"owner_id": "owner2", "housing_id": "housing2"},
            {"owner_id": "owner1", "housing_id": "housing3"},  # Duplicate owner
        ]

        # Mock cursor responses
        owner_rows = [
            {
                "ref_id": "owner1",
                "postal_code": "75001",
                "address": "Addr 1",
                "latitude": 48.86,
                "longitude": 2.35,
                "geo_code": "75001",
                "ban_id": "ban-owner-1",
            },
            {
                "ref_id": "owner2",
                "postal_code": "75002",
                "address": "Addr 2",
                "latitude": 48.87,
                "longitude": 2.34,
                "geo_code": "75002",
                "ban_id": "ban-owner-2",
            },
        ]
        housing_rows = [
            {
                "ref_id": "housing1",
                "postal_code": "75011",
                "address": "Housing 1",
                "latitude": 48.85,
                "longitude": 2.38,
                "geo_code": "75111",
                "ban_id": "ban-housing-1",
            },
            {
                "ref_id": "housing2",
                "postal_code": "75012",
                "address": "Housing 2",
                "latitude": 48.84,
                "longitude": 2.39,
                "geo_code": "75112",
                "ban_id": "ban-housing-2",
            },
            {
                "ref_id": "housing3",
                "postal_code": "75013",
                "address": "Housing 3",
                "latitude": 48.83,
                "longitude": 2.36,
                "geo_code": "75113",
                "ban_id": "ban-housing-3",
            },
        ]

        calculator.cursor.execute = Mock()
        calculator.cursor.fetchall = Mock(side_effect=[owner_rows, housing_rows])

        result = calculator.batch_get_address_data(pairs)

        # Should have cached 2 unique owners and 3 unique housing
        assert len(result) == 5
        assert ("owner1", "Owner") in result
        assert ("owner2", "Owner") in result
        assert ("housing1", "Housing") in result
        assert ("housing2", "Housing") in result
        assert ("housing3", "Housing") in result

        # Verify that execute was called twice (once for owners, once for housing)
        assert calculator.cursor.execute.call_count == 2

    def test_batch_loading_with_empty_pairs(self, calculator):
        """Test batch loading with no pairs."""
        pairs = []
        result = calculator.batch_get_address_data(pairs)
        assert result == {}

    def test_batch_loading_propagates_database_error(self, calculator):
        """A failed address query must abort the batch instead of looking like no data."""
        pairs = [{"owner_id": "owner1", "housing_id": "housing1"}]
        calculator.cursor.execute.side_effect = Exception("Database error")

        with pytest.raises(Exception, match="Database error"):
            calculator.batch_get_address_data(pairs)


class TestFunctionalEndToEnd:
    """Functional tests simulating real-world scenarios."""

    @pytest.fixture
    def calculator(self):
        """Create a DistanceCalculator instance with minimal mocking."""
        with patch("calculate_distances.CountryDetector"):
            calc = Mock(spec=DistanceCalculator)
            calc.stats = DistanceCalculator._empty_stats()
            calc.metro_regions = ["11", "84"]
            calc.overseas_regions = ["01"]
            calc.process_single_pair = DistanceCalculator.process_single_pair.__get__(
                calc
            )
            calc.haversine_distance = DistanceCalculator.haversine_distance
            calc._has_coordinates = DistanceCalculator._has_coordinates
            calc._country_from_address_data = (
                DistanceCalculator._country_from_address_data.__get__(calc)
            )
            calc.detect_country_simple = Mock(return_value="FRANCE")
            calc.calculate_french_geographic_rules = (
                DistanceCalculator.calculate_french_geographic_rules.__get__(calc)
            )
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
            ("owner1", "Owner"): (
                "75001",
                "1 Rue de Rivoli",
                48.8606,
                2.3376,
                "75001",
                "owner-ban",
            ),
            ("housing1", "Housing"): (
                "75001",
                "10 Rue de Rivoli",
                48.8616,
                2.3386,
                "75001",
                "housing-ban",
            ),
        }

        distance, classification = calculator.process_single_pair(
            "owner1", "housing1", address_cache
        )

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
            ("owner2", "Owner"): (
                "75001",
                "Paris Address",
                48.8566,
                2.3522,
                "75001",
                "owner-ban",
            ),
            ("housing2", "Housing"): (
                "69001",
                "Lyon Address",
                45.7640,
                4.8357,
                "69001",
                "housing-ban",
            ),
        }

        distance, classification = calculator.process_single_pair(
            "owner2", "housing2", address_cache
        )

        assert distance is not None
        assert 385 < distance < 400
        assert classification == 4

    def test_scenario_foreign_owner_french_housing(self, calculator):
        """
        Scenario: Foreign owner, French housing
        Expected: No distance, classification = 6 (foreign address)
        """
        calculator.detect_country_simple = Mock(
            side_effect=lambda addr: "FOREIGN" if "London" in addr else "FRANCE"
        )

        address_cache = {
            ("owner3", "Owner"): (
                "SW1A",
                "10 Downing Street, London",
                None,
                None,
                None,
                None,
            ),
            ("housing3", "Housing"): (
                "75001",
                "Paris Address",
                48.8566,
                2.3522,
                "75001",
                "housing-ban",
            ),
        }

        distance, classification = calculator.process_single_pair(
            "owner3", "housing3", address_cache
        )

        assert distance is None
        assert classification == 6

    def test_scenario_incomplete_data(self, calculator):
        """
        Scenario: Missing owner address data
        Expected: No distance, classification = 7 (default)
        """
        address_cache = {
            ("housing4", "Housing"): (
                "75001",
                "Paris Address",
                48.8566,
                2.3522,
                "75001",
                "housing-ban",
            )
        }

        distance, classification = calculator.process_single_pair(
            "owner4", "housing4", address_cache
        )

        assert distance is None
        assert classification == 7
        assert calculator.stats["missing_owner_data"] == 1


class TestRunFailurePropagation:
    """Test that orchestration failures cannot produce a successful report."""

    def test_address_batch_query_error_aborts_run_before_processing_or_writing(self):
        calc = DistanceCalculator("postgresql://example")
        calc.connect = Mock()
        calc.disconnect = Mock()
        calc.count_owner_housing_pairs = Mock(return_value=1)
        calc.fetch_owner_housing_pair_batch = Mock(
            return_value=[
                {
                    "owner_id": "owner-1",
                    "housing_id": "housing-1",
                    "housing_geo_code": "75001",
                }
            ]
        )
        calc.batch_get_address_data = Mock(
            side_effect=RuntimeError("Address batch query failed")
        )
        calc.process_single_pair = Mock()
        calc.update_database = Mock()

        with pytest.raises(RuntimeError, match="Address batch query failed"):
            calc.run(LocationScope(data_file_year="lovac-2026"), batch_size=1)

        calc.process_single_pair.assert_not_called()
        calc.update_database.assert_not_called()
        calc.disconnect.assert_called_once_with()

    def test_database_write_error_aborts_run_and_disconnects(self):
        calc = DistanceCalculator("postgresql://example")
        calc.connect = Mock()
        calc.disconnect = Mock()
        calc.count_owner_housing_pairs = Mock(return_value=1)
        calc.fetch_owner_housing_pair_batch = Mock(
            return_value=[
                {
                    "owner_id": "owner-1",
                    "housing_id": "housing-1",
                    "housing_geo_code": "75001",
                }
            ]
        )
        calc.batch_get_address_data = Mock(return_value={})
        calc.process_single_pair = Mock(return_value=(None, 7))
        calc.update_database = Mock(
            side_effect=RuntimeError("1 database update failed")
        )

        with pytest.raises(RuntimeError, match="database update failed"):
            calc.run(LocationScope(data_file_year="lovac-2026"), batch_size=1)

        calc.process_single_pair.assert_called_once_with("owner-1", "housing-1", {})
        calc.update_database.assert_called_once()
        calc.disconnect.assert_called_once_with()

    def test_pair_processing_error_aborts_run_before_writing(self):
        calc = DistanceCalculator("postgresql://example")
        calc.connect = Mock()
        calc.disconnect = Mock()
        calc.count_owner_housing_pairs = Mock(return_value=1)
        calc.fetch_owner_housing_pair_batch = Mock(
            return_value=[
                {
                    "owner_id": "owner-1",
                    "housing_id": "housing-1",
                    "housing_geo_code": "75001",
                }
            ]
        )
        calc.batch_get_address_data = Mock(return_value={})
        calc.process_single_pair = Mock(side_effect=RuntimeError("invalid pair"))
        calc.update_database = Mock()

        with pytest.raises(RuntimeError, match="invalid pair"):
            calc.run(LocationScope(data_file_year="lovac-2026"), batch_size=1)

        calc.update_database.assert_not_called()
        calc.disconnect.assert_called_once_with()


class TestDatabaseUpdates:
    """Test guarded persistence behavior."""

    def test_update_database_dry_run_does_not_write(self):
        calc = Mock(spec=DistanceCalculator)
        calc.db_url = "postgresql://example"
        calc.stats = DistanceCalculator._empty_stats()
        calc.update_database = DistanceCalculator.update_database.__get__(calc)
        calc._update_batch_worker = Mock()

        updated = calc.update_database(
            [
                {
                    "owner_id": "00000000-0000-0000-0000-000000000001",
                    "housing_id": "00000000-0000-0000-0000-000000000002",
                    "housing_geo_code": "38200",
                    "distance": 0.123,
                    "classification": 1,
                }
            ],
            dry_run=True,
        )

        assert updated == 0
        calc._update_batch_worker.assert_not_called()

    def test_partial_batch_failure_raises_instead_of_returning_success(self):
        calc = Mock(spec=DistanceCalculator)
        calc.db_url = "postgresql://example"
        calc.stats = DistanceCalculator._empty_stats()
        calc.update_database = DistanceCalculator.update_database.__get__(calc)
        calc._update_batch_worker = Mock(
            side_effect=[
                (0, 10_000, None),
                (1, 0, "write failed"),
            ]
        )
        update = {
            "owner_id": "00000000-0000-0000-0000-000000000001",
            "housing_id": "00000000-0000-0000-0000-000000000002",
            "housing_geo_code": "38200",
            "distance": 0.123,
            "classification": 1,
        }

        with pytest.raises(RuntimeError, match="1 database update.*10,000"):
            calc.update_database([update] * 10_001)

        assert calc.stats["errors"] == 1
        assert calc._update_batch_worker.call_count == 2

    def test_update_batch_filters_on_housing_geo_code(self):
        calc = Mock(spec=DistanceCalculator)
        calc._update_batch_worker = DistanceCalculator._update_batch_worker.__get__(
            calc
        )

        cursor = Mock()
        conn = Mock()
        conn.cursor.return_value = cursor

        with patch("calculate_distances.psycopg2.connect", return_value=conn), patch(
            "calculate_distances.execute_values", return_value=[(1,)]
        ) as execute_values:
            _, updated, error = calc._update_batch_worker(
                (
                    0,
                    [
                        {
                            "owner_id": "00000000-0000-0000-0000-000000000001",
                            "housing_id": "00000000-0000-0000-0000-000000000002",
                            "housing_geo_code": "38200",
                            "distance": 0.123,
                            "classification": 1,
                        }
                    ],
                    "postgresql://example",
                )
            )

        assert error is None
        assert updated == 1
        query = execute_values.call_args.args[1]
        values = execute_values.call_args.args[2]
        assert "oh.housing_geo_code = data.housing_geo_code::text" in query
        assert "RETURNING 1" in query
        assert execute_values.call_args.kwargs["fetch"] is True
        assert values[0][-1] == "38200"

    def test_update_batch_rolls_back_when_a_target_row_is_missing(self):
        calc = Mock(spec=DistanceCalculator)
        calc._update_batch_worker = DistanceCalculator._update_batch_worker.__get__(
            calc
        )

        cursor = Mock()
        conn = Mock()
        conn.cursor.return_value = cursor
        update = {
            "owner_id": "00000000-0000-0000-0000-000000000001",
            "housing_id": "00000000-0000-0000-0000-000000000002",
            "housing_geo_code": "38200",
            "distance": 0.123,
            "classification": 1,
        }

        with patch("calculate_distances.psycopg2.connect", return_value=conn), patch(
            "calculate_distances.execute_values", return_value=[]
        ):
            _, updated, error = calc._update_batch_worker(
                (0, [update], "postgresql://example")
            )

        assert updated == 0
        assert "expected to update 1 row" in error
        conn.commit.assert_not_called()
        conn.rollback.assert_called_once_with()


class TestCandidateScope:
    """Test candidate selection safeguards."""

    def test_default_candidates_are_missing_relative_only(self):
        calc = Mock(spec=DistanceCalculator)
        calc.cursor = Mock()
        calc.cursor.fetchone.return_value = {"count": 42}
        calc._scope_sql = DistanceCalculator._scope_sql.__get__(calc)
        calc.count_owner_housing_pairs = (
            DistanceCalculator.count_owner_housing_pairs.__get__(calc)
        )

        count = calc.count_owner_housing_pairs(
            LocationScope(data_file_year="lovac-2026", geo_codes=("38200",))
        )

        query = calc.cursor.execute.call_args.args[0]
        params = calc.cursor.execute.call_args.args[1]
        assert count == 42
        assert "oh.locprop_relative_ban IS NULL" in query
        assert "locprop_distance_ban IS NULL OR" not in query
        assert params["data_file_year"] == "lovac-2026"
        assert params["geo_codes"] == ["38200"]

    def test_force_candidates_do_not_filter_missing_values(self):
        calc = Mock(spec=DistanceCalculator)
        calc.cursor = Mock()
        calc.cursor.fetchone.return_value = {"count": 42}
        calc._scope_sql = DistanceCalculator._scope_sql.__get__(calc)
        calc.count_owner_housing_pairs = (
            DistanceCalculator.count_owner_housing_pairs.__get__(calc)
        )

        calc.count_owner_housing_pairs(
            LocationScope(data_file_year="lovac-2026"), force=True
        )

        query = calc.cursor.execute.call_args.args[0]
        assert "locprop_relative_ban IS NULL" not in query


class TestRegionDetection:
    """Test region detection and classification."""

    @pytest.fixture
    def calculator(self):
        """Create a DistanceCalculator instance."""
        calc = Mock(spec=DistanceCalculator)
        calc.metro_regions = [
            "11",
            "24",
            "27",
            "28",
            "32",
            "44",
            "52",
            "53",
            "75",
            "76",
            "84",
            "93",
            "94",
        ]
        calc.overseas_regions = ["01", "02", "03", "04", "06"]
        calc.is_metro_region = DistanceCalculator.is_metro_region.__get__(calc)
        calc.is_overseas_region = DistanceCalculator.is_overseas_region.__get__(calc)
        calc.get_region_from_postal_code = (
            DistanceCalculator.get_region_from_postal_code.__get__(calc)
        )
        return calc

    def test_paris_is_ile_de_france_region(self, calculator):
        """Paris (75) should be in Île-de-France region (11)."""
        with patch.object(calculator, "get_region_from_postal_code", return_value="11"):
            assert calculator.is_metro_region("75001") == True

    def test_guadeloupe_is_overseas(self, calculator):
        """Guadeloupe (971) should be overseas."""
        with patch.object(calculator, "get_region_from_postal_code", return_value="01"):
            assert calculator.is_overseas_region("97110") == True

    def test_lyon_is_metro(self, calculator):
        """Lyon (69) should be in metropolitan France."""
        with patch.object(calculator, "get_region_from_postal_code", return_value="84"):
            assert calculator.is_metro_region("69001") == True


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

#!/usr/bin/env python3
"""
Conservative country detection for the owner-housing distance post-process.

The distance script should rely on BAN geocoding results for French addresses.
This detector only reads explicit country evidence from free text:

- "FRANCE" when the address explicitly names France or a French overseas
  territory as the country.
- "FOREIGN" when the address explicitly names a non-French country.
- "UNKNOWN" otherwise.

It intentionally does not infer France from postal codes, city names, street
types, accents, departments, or French-looking words. Missing a country falls
back to classification 7; a false country match can corrupt user-facing data.
"""

from __future__ import annotations

import logging
import re
import unicodedata
from dataclasses import dataclass
from typing import Optional

COUNTRY_FRANCE = "FRANCE"
COUNTRY_FOREIGN = "FOREIGN"
COUNTRY_UNKNOWN = "UNKNOWN"


@dataclass(frozen=True)
class CountryDetectionResult:
    value: str
    reason: str
    confidence: str


FRANCE_TERMS = (
    "france",
    "republique francaise",
    "french republic",
)

FRENCH_OVERSEAS_TERMS = (
    "guadeloupe",
    "martinique",
    "guyane",
    "guyane francaise",
    "mayotte",
    "la reunion",
    "reunion",
    "nouvelle caledonie",
    "polynesie francaise",
    "wallis et futuna",
    "saint pierre et miquelon",
    "saint barthelemy",
    "saint martin",
)

# Country-level terms only. Cities, states, regions, street words, and address
# qualifiers deliberately do not belong here.
FOREIGN_COUNTRY_TERMS = (
    "afghanistan",
    "afrique du sud",
    "albanie",
    "albania",
    "algeria",
    "algerie",
    "allemagne",
    "andorra",
    "andorre",
    "angola",
    "angleterre",
    "argentina",
    "argentine",
    "armenia",
    "armenie",
    "australia",
    "australie",
    "austria",
    "autriche",
    "belarus",
    "belgique",
    "belgium",
    "benin",
    "bresil",
    "brunei",
    "bulgaria",
    "bulgarie",
    "burkina faso",
    "cambodia",
    "cambodge",
    "cameroun",
    "cameroon",
    "canada",
    "chili",
    "china",
    "chine",
    "colombia",
    "colombie",
    "congo",
    "costa rica",
    "croatia",
    "croatie",
    "cuba",
    "cyprus",
    "chypre",
    "danemark",
    "denmark",
    "deutschland",
    "dominican republic",
    "egypte",
    "egypt",
    "emirats arabes unis",
    "england",
    "espagne",
    "estonia",
    "estonie",
    "etats unis",
    "ethiopia",
    "ethiopie",
    "finland",
    "finlande",
    "gabon",
    "germany",
    "ghana",
    "greece",
    "grece",
    "guinea",
    "guinee",
    "haiti",
    "hongrie",
    "hungary",
    "iceland",
    "inde",
    "india",
    "indonesia",
    "indonesie",
    "iran",
    "iraq",
    "irak",
    "ireland",
    "irlande",
    "islande",
    "israel",
    "italia",
    "italie",
    "italy",
    "japon",
    "japan",
    "kenya",
    "korea",
    "kuwait",
    "koweit",
    "laos",
    "latvia",
    "lettonie",
    "lebanon",
    "liban",
    "liechtenstein",
    "lithuania",
    "lituanie",
    "luxembourg",
    "madagascar",
    "malaisie",
    "malaysia",
    "mali",
    "malta",
    "malte",
    "maroc",
    "mexico",
    "mexique",
    "moldavie",
    "moldova",
    "monaco",
    "morocco",
    "mozambique",
    "netherlands",
    "nicaragua",
    "niger",
    "nigeria",
    "norvege",
    "norway",
    "oman",
    "pakistan",
    "panama",
    "paraguay",
    "pays bas",
    "perou",
    "peru",
    "philippines",
    "poland",
    "pologne",
    "portugal",
    "qatar",
    "republique dominicaine",
    "romania",
    "roumanie",
    "royaume uni",
    "russia",
    "russie",
    "san marino",
    "senegal",
    "serbia",
    "serbie",
    "singapore",
    "singapour",
    "slovakia",
    "slovaquie",
    "slovenia",
    "slovenie",
    "south africa",
    "spain",
    "sri lanka",
    "suisse",
    "sweden",
    "switzerland",
    "syrie",
    "syria",
    "tanzania",
    "tanzanie",
    "thailand",
    "thailande",
    "togo",
    "tunisia",
    "tunisie",
    "turkey",
    "turquie",
    "uae",
    "uk",
    "ukraine",
    "united kingdom",
    "united states",
    "uruguay",
    "usa",
    "vatican",
    "venezuela",
    "vietnam",
)

STREET_OR_BUILDING_TERMS = (
    "allee",
    "avenue",
    "batiment",
    "boulevard",
    "chemin",
    "cours",
    "impasse",
    "place",
    "promenade",
    "quai",
    "residence",
    "route",
    "rue",
    "square",
    "tour",
    "villa",
)


def _normalize(text: str) -> str:
    without_accents = "".join(
        char
        for char in unicodedata.normalize("NFKD", text)
        if not unicodedata.combining(char)
    )
    lowered = without_accents.lower()
    normalized = re.sub(r"[^a-z0-9]+", " ", lowered)
    return re.sub(r"\s+", " ", normalized).strip()


def _split_components(address: str) -> tuple[str, ...]:
    return tuple(
        component
        for component in (_normalize(part) for part in re.split(r"[,;\n\r|]+", address))
        if component
    )


def _contains_digit(text: str) -> bool:
    return any(char.isdigit() for char in text)


def _ends_with_term(normalized: str, term: str) -> bool:
    return normalized == term or normalized.endswith(f" {term}")


def _embedded_in_french_name(normalized: str, term: str) -> bool:
    street_terms = "|".join(re.escape(token) for token in STREET_OR_BUILDING_TERMS)
    pattern = (
        rf"\b(?:{street_terms})\s+"
        rf"(?:(?:de|du|des|d|l|la|le|les)\s+){{0,2}}"
        rf"{re.escape(term)}\b"
    )
    return bool(re.search(pattern, normalized))


def _has_explicit_country(address: str, terms: tuple[str, ...]) -> Optional[str]:
    normalized = _normalize(address)
    if not normalized:
        return None

    components = _split_components(address)
    last_component = components[-1] if components else ""
    has_separator = len(components) > 1

    for term in sorted(terms, key=len, reverse=True):
        normalized_term = _normalize(term)
        if not normalized_term:
            continue
        if normalized == normalized_term:
            return term
        if has_separator and last_component == normalized_term:
            return term
        if _embedded_in_french_name(normalized, normalized_term):
            continue
        if _contains_digit(normalized) and _ends_with_term(normalized, normalized_term):
            return term
    return None


class CountryDetector:
    """Detects explicit country evidence in address text."""

    def __init__(self, model_name: str = "rule-based", use_llm: bool = False):
        if use_llm or model_name != "rule-based":
            logging.info(
                "CountryDetector ignores model_name/use_llm; only explicit "
                "country evidence is supported."
            )
        self.stats = self._empty_stats()

    @staticmethod
    def _empty_stats() -> dict[str, int]:
        return {
            "total_processed": 0,
            "rule_based_used": 0,
            "llm_used": 0,
            "france_count": 0,
            "foreign_count": 0,
            "unknown_count": 0,
            "errors": 0,
        }

    @staticmethod
    def _decision(
        value: str, reason: str, confidence: str = "high"
    ) -> CountryDetectionResult:
        return CountryDetectionResult(
            value=value,
            reason=reason,
            confidence=confidence,
        )

    def classify_address(self, address: Optional[str]) -> CountryDetectionResult:
        if not address or not str(address).strip():
            return self._decision(COUNTRY_UNKNOWN, "empty_address", "low")

        normalized = str(address).strip()

        france_term = _has_explicit_country(
            normalized,
            FRANCE_TERMS + FRENCH_OVERSEAS_TERMS,
        )
        if france_term:
            return self._decision(COUNTRY_FRANCE, f"explicit_france:{france_term}")

        foreign_term = _has_explicit_country(normalized, FOREIGN_COUNTRY_TERMS)
        if foreign_term:
            return self._decision(
                COUNTRY_FOREIGN,
                f"explicit_foreign_country:{foreign_term}",
            )

        return self._decision(COUNTRY_UNKNOWN, "no_explicit_country", "low")

    def detect_country(self, address: Optional[str]) -> str:
        if not address or not str(address).strip():
            return COUNTRY_UNKNOWN

        self.stats["total_processed"] += 1
        self.stats["rule_based_used"] += 1

        try:
            result = self.classify_address(address).value
        except Exception as error:
            logging.error("Country classification error for %r: %s", address, error)
            self.stats["errors"] += 1
            return COUNTRY_UNKNOWN

        if result == COUNTRY_FRANCE:
            self.stats["france_count"] += 1
        elif result == COUNTRY_FOREIGN:
            self.stats["foreign_count"] += 1
        else:
            self.stats["unknown_count"] += 1

        return result

    def is_foreign_country(self, address: Optional[str]) -> bool:
        return self.detect_country(address) == COUNTRY_FOREIGN

    def get_statistics(self) -> dict[str, int]:
        return self.stats.copy()

    def get_version(self) -> str:
        return "EXPLICIT_COUNTRY_ONLY_2026_06_29"

    def reset_statistics(self) -> None:
        self.stats = self._empty_stats()

    @classmethod
    def compare_models(
        cls, test_addresses: list[str], models: list[str] | None = None
    ) -> dict:
        detector = cls()
        classifications = [
            detector.detect_country(address) for address in test_addresses
        ]
        return {
            "rule-based": {
                "classifications": classifications,
                "stats": detector.get_statistics(),
                "available": True,
            }
        }


def detect_country(address: Optional[str]) -> str:
    return CountryDetector().detect_country(address)


def is_foreign_country(address: Optional[str]) -> bool:
    return CountryDetector().is_foreign_country(address)

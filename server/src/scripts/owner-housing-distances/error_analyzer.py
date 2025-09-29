#!/usr/bin/env python3
"""
Error Analysis Script

Analyzes misclassified addresses from model evaluation to identify patterns
and suggest improvements to the rule-based model.
"""

import argparse
import json
import logging
import os
import sys
from collections import defaultdict, Counter
from typing import List, Dict, Tuple
import re

# Add the project root to Python path for imports
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..', '..'))

class ErrorAnalyzer:
    """Analyzes classification errors to identify improvement patterns."""

    def __init__(self, results_file: str):
        """Initialize with model comparison results file."""
        self.results_file = results_file
        self.results = self._load_results()

    def _load_results(self) -> Dict:
        """Load results from JSON file."""
        try:
            with open(self.results_file, 'r', encoding='utf-8') as f:
                results = json.load(f)
            return results
        except Exception as e:
            logging.error(f"Failed to load results file: {e}")
            return {}

    def analyze_false_negatives(self, model_name: str = "rule-based") -> List[Dict]:
        """Analyze false negatives (French addresses classified as foreign)."""
        if model_name not in self.results:
            logging.error(f"Model {model_name} not found in results")
            return []

        model_results = self.results[model_name]
        if 'predictions' not in model_results:
            logging.error("No predictions found in results")
            return []

        # Find false negatives: expected FRANCE, predicted FOREIGN
        false_negatives = []
        for prediction in model_results['predictions']:
            if prediction['expected'] == 'FRANCE' and prediction['predicted'] == 'FOREIGN':
                false_negatives.append(prediction)

        logging.info(f"Found {len(false_negatives)} false negatives")
        return false_negatives

    def analyze_false_positives(self, model_name: str = "rule-based") -> List[Dict]:
        """Analyze false positives (Foreign addresses classified as French)."""
        if model_name not in self.results:
            logging.error(f"Model {model_name} not found in results")
            return []

        model_results = self.results[model_name]
        if 'predictions' not in model_results:
            logging.error("No predictions found in results")
            return []

        # Find false positives: expected FOREIGN, predicted FRANCE
        false_positives = []
        for prediction in model_results['predictions']:
            if prediction['expected'] == 'FOREIGN' and prediction['predicted'] == 'FRANCE':
                false_positives.append(prediction)

        logging.info(f"Found {len(false_positives)} false positives")
        return false_positives

    def identify_patterns(self, errors: List[Dict]) -> Dict:
        """Identify patterns in misclassified addresses."""
        patterns = {
            'country_mentions': Counter(),
            'postal_codes': Counter(),
            'city_names': Counter(),
            'street_prefixes': Counter(),
            'common_words': Counter(),
            'length_distribution': defaultdict(int),
            'comma_count': Counter(),
            'has_numbers': {'yes': 0, 'no': 0},
            'examples_by_pattern': defaultdict(list)
        }

        # French DOM-TOM territories that should be classified as FRANCE
        dom_tom_territories = [
            'martinique', 'guadeloupe', 'réunion', 'guyane', 'guyane française',
            'mayotte', 'nouvelle-calédonie', 'polynésie française', 'wallis-et-futuna',
            'saint-pierre-et-miquelon', 'saint-barthélemy', 'saint-martin'
        ]

        foreign_country_keywords = [
            'usa', 'canada', 'germany', 'italy', 'spain', 'uk', 'switzerland',
            'belgium', 'netherlands', 'luxembourg', 'monaco', 'andorra',
            'united states', 'united kingdom', 'great britain'
        ]

        for error in errors:
            address = error['address'].lower()

            # Length analysis
            length_category = f"{len(address)//20*20}-{len(address)//20*20+19}"
            patterns['length_distribution'][length_category] += 1

            # Comma count
            comma_count = address.count(',')
            patterns['comma_count'][comma_count] += 1

            # Numbers presence
            if re.search(r'\d', address):
                patterns['has_numbers']['yes'] += 1
            else:
                patterns['has_numbers']['no'] += 1

            # Country mentions
            for country in foreign_country_keywords:
                if country in address:
                    patterns['country_mentions'][country] += 1
                    patterns['examples_by_pattern'][f'country:{country}'].append(address[:100])

            # DOM-TOM territories
            for territory in dom_tom_territories:
                if territory in address:
                    patterns['country_mentions'][f'DOM-TOM:{territory}'] += 1
                    patterns['examples_by_pattern'][f'DOM-TOM:{territory}'].append(address[:100])

            # Postal codes (French format: 5 digits starting with specific numbers)
            french_postal_match = re.search(r'\b(\d{5})\b', address)
            if french_postal_match:
                postal = french_postal_match.group(1)
                patterns['postal_codes'][postal] += 1

                # Special French postal codes
                if postal.startswith(('97', '98')):  # DOM-TOM
                    patterns['examples_by_pattern']['DOM-TOM_postal'].append(address[:100])
                elif postal.startswith(('01', '02', '03', '04', '05', '06', '07', '08', '09')):  # Mainland France
                    patterns['examples_by_pattern']['mainland_postal'].append(address[:100])

            # City names analysis
            city_match = re.search(r',\s*([^,]+)(?:,|$)', address)
            if city_match:
                city = city_match.group(1).strip()
                patterns['city_names'][city] += 1

            # Street prefixes
            street_prefixes = ['rue', 'avenue', 'boulevard', 'place', 'impasse', 'chemin', 'allée']
            for prefix in street_prefixes:
                if prefix in address:
                    patterns['street_prefixes'][prefix] += 1

            # Common words that might be misleading
            common_words = address.split()
            for word in common_words:
                if len(word) > 3:  # Skip short words
                    patterns['common_words'][word] += 1

        return patterns

    def generate_analysis_report(self, model_name: str = "rule-based") -> str:
        """Generate comprehensive error analysis report."""
        false_negatives = self.analyze_false_negatives(model_name)
        false_positives = self.analyze_false_positives(model_name)

        report = []
        report.append("=" * 80)
        report.append("ERROR ANALYSIS REPORT")
        report.append("=" * 80)
        report.append(f"Model: {model_name}")
        report.append(f"Total False Negatives (FRANCE → FOREIGN): {len(false_negatives)}")
        report.append(f"Total False Positives (FOREIGN → FRANCE): {len(false_positives)}")
        report.append("")

        if false_negatives:
            report.append("📍 FALSE NEGATIVES ANALYSIS (French addresses classified as Foreign)")
            report.append("-" * 60)

            fn_patterns = self.identify_patterns(false_negatives)

            # Show most common problematic patterns
            report.append("\n🔍 Common patterns in false negatives:")

            # Country mentions
            if fn_patterns['country_mentions']:
                report.append("\nCountry mentions:")
                for country, count in fn_patterns['country_mentions'].most_common(10):
                    report.append(f"  • {country}: {count} occurrences")

            # Postal codes
            if fn_patterns['postal_codes']:
                report.append(f"\nPostal codes (top 10):")
                for postal, count in fn_patterns['postal_codes'].most_common(10):
                    report.append(f"  • {postal}: {count} occurrences")

            # Examples by pattern
            report.append("\n📋 Examples of misclassified French addresses:")
            for i, fn in enumerate(false_negatives[:20]):  # Show first 20 examples
                report.append(f"  {i+1}. \"{fn['address']}\"")

            if len(false_negatives) > 20:
                report.append(f"  ... and {len(false_negatives) - 20} more")

        if false_positives:
            report.append("\n\n📍 FALSE POSITIVES ANALYSIS (Foreign addresses classified as French)")
            report.append("-" * 60)

            fp_patterns = self.identify_patterns(false_positives)

            report.append("\n📋 Examples of misclassified Foreign addresses:")
            for i, fp in enumerate(false_positives[:20]):  # Show first 20 examples
                report.append(f"  {i+1}. \"{fp['address']}\"")

            if len(false_positives) > 20:
                report.append(f"  ... and {len(false_positives) - 20} more")

        # Generate improvement suggestions
        report.append("\n\n🔧 IMPROVEMENT SUGGESTIONS")
        report.append("-" * 40)

        if false_negatives:
            fn_patterns = self.identify_patterns(false_negatives)

            # Check for DOM-TOM issues
            dom_tom_count = sum(1 for fn in false_negatives
                              if any(territory in fn['address'].lower()
                                   for territory in ['martinique', 'guadeloupe', 'réunion', 'guyane', 'mayotte', 'nouvelle-calédonie', 'polynésie française']))
            if dom_tom_count > 0:
                report.append(f"1. DOM-TOM Recognition: {dom_tom_count} addresses contain DOM-TOM territories")
                report.append("   → Improve detection of French overseas territories")

            # Check for postal code issues
            postal_97_98_count = sum(1 for fn in false_negatives
                                   if re.search(r'\b9[78]\d{3}\b', fn['address']))
            if postal_97_98_count > 0:
                report.append(f"2. DOM-TOM Postal Codes: {postal_97_98_count} addresses with 97xxx/98xxx codes")
                report.append("   → Strengthen recognition of DOM-TOM postal codes (97xxx, 98xxx)")

            # Check for country keyword conflicts
            country_mentions = fn_patterns['country_mentions']
            if country_mentions:
                report.append("3. Country Keyword Conflicts detected:")
                for country, count in country_mentions.most_common(5):
                    report.append(f"   → {country}: {count} false negatives")

        report.append("\n" + "=" * 80)

        return "\n".join(report)

    def suggest_rule_improvements(self, model_name: str = "rule-based") -> List[str]:
        """Suggest specific improvements to rule-based classification."""
        false_negatives = self.analyze_false_negatives(model_name)

        suggestions = []

        if not false_negatives:
            return ["No false negatives found - model is performing perfectly!"]

        patterns = self.identify_patterns(false_negatives)

        # DOM-TOM postal code improvements
        dom_tom_postal_count = sum(1 for fn in false_negatives
                                 if re.search(r'\b9[78]\d{3}\b', fn['address']))
        if dom_tom_postal_count > 0:
            suggestions.append(f"Add stronger DOM-TOM postal code rules (found {dom_tom_postal_count} cases with 97xxx/98xxx)")

        # Territory name improvements
        dom_tom_names = ['martinique', 'guadeloupe', 'réunion', 'guyane', 'mayotte', 'nouvelle-calédonie']
        territory_issues = []
        for fn in false_negatives:
            address_lower = fn['address'].lower()
            for territory in dom_tom_names:
                if territory in address_lower:
                    territory_issues.append(territory)

        if territory_issues:
            territory_counts = Counter(territory_issues)
            suggestions.append(f"Improve DOM-TOM territory recognition: {dict(territory_counts)}")

        # French city names that might be confused
        city_issues = []
        for fn in false_negatives:
            address = fn['address']
            # Look for patterns that might be causing confusion
            if 'fort-de-france' in address.lower():
                city_issues.append('Fort-de-France')
            elif 'saint-denis' in address.lower() and 'réunion' in address.lower():
                city_issues.append('Saint-Denis, Réunion')

        if city_issues:
            suggestions.append(f"Improve recognition of specific French cities: {set(city_issues)}")

        return suggestions


def setup_logging():
    """Setup logging configuration."""
    log_format = '%(asctime)s - %(levelname)s - %(message)s'

    logs_dir = os.path.join(os.path.dirname(__file__), 'logs')
    os.makedirs(logs_dir, exist_ok=True)

    logging.basicConfig(
        level=logging.INFO,
        format=log_format,
        handlers=[logging.StreamHandler(sys.stdout)]
    )


def main():
    """Main function."""
    parser = argparse.ArgumentParser(description="Analyze classification errors")
    parser.add_argument(
        '--results-file',
        required=True,
        help='Path to model comparison JSON results file'
    )
    parser.add_argument(
        '--model',
        default='rule-based',
        help='Model to analyze'
    )
    parser.add_argument(
        '--output',
        help='Output file for analysis report'
    )

    args = parser.parse_args()

    setup_logging()

    if not os.path.exists(args.results_file):
        logging.error(f"Results file not found: {args.results_file}")
        return

    analyzer = ErrorAnalyzer(args.results_file)
    report = analyzer.generate_analysis_report(args.model)

    print(report)

    if args.output:
        with open(args.output, 'w', encoding='utf-8') as f:
            f.write(report)
        logging.info(f"Analysis report saved to: {args.output}")

    # Generate improvement suggestions
    suggestions = analyzer.suggest_rule_improvements(args.model)
    print("\n🚀 ACTIONABLE IMPROVEMENTS:")
    for i, suggestion in enumerate(suggestions, 1):
        print(f"{i}. {suggestion}")


if __name__ == "__main__":
    main()
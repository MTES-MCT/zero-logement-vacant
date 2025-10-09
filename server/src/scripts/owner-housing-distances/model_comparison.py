#!/usr/bin/env python3
"""
Model Comparison Script

This script compares different LLM models for address classification performance.
Tests multiple models on a set of sample addresses and provides detailed metrics.
"""

import argparse
import logging
import sys
import os
import json
from datetime import datetime
from typing import List, Dict
import pandas as pd
from tqdm import tqdm

# Add the project root to Python path for imports
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..', '..'))

from country_detector import CountryDetector

class ModelComparator:
    """Compares performance of different address classification models."""

    def __init__(self):
        """Initialize the model comparator."""
        self.test_addresses = self._load_test_addresses()
        self.results = {}

    def _load_test_addresses(self) -> List[str]:
        """Load test addresses from dataset files or create default set."""
        # Try to load from generated datasets first
        test_data_dir = os.path.join(os.path.dirname(__file__), 'test_data', 'datasets')

        # Priority order: quick_test for fast comparison, then comprehensive_test
        dataset_files = [
            os.path.join(test_data_dir, 'quick_test.csv'),
            os.path.join(test_data_dir, 'comprehensive_test.csv'),
        ]

        for dataset_file in dataset_files:
            if os.path.exists(dataset_file):
                try:
                    import pandas as pd
                    df = pd.read_csv(dataset_file, encoding='utf-8')
                    if 'address' in df.columns:
                        addresses = df['address'].tolist()
                        logging.info(f"Loaded {len(addresses)} test addresses from {os.path.basename(dataset_file)}")
                        return addresses
                except Exception as e:
                    logging.warning(f"Failed to load dataset {dataset_file}: {e}")
                    continue

        # Fallback to hardcoded test addresses
        logging.info("Using hardcoded test addresses (run dataset_builder.py to create extended datasets)")
        test_addresses = [
            # Clear French addresses
            "123 Rue de Rivoli, 75001 Paris, France",
            "45 Avenue des Champs-Élysées, Paris",
            "10 Place Bellecour, 69002 Lyon",
            "25 Rue du Faubourg Saint-Antoine, Paris",
            "Villa des Roses, 06000 Nice",
            "Résidence du Parc, Toulouse",
            "15 bis avenue de la République, Marseille",

            # Clear foreign addresses
            "123 Main Street, New York, NY 10001, USA",
            "456 Oxford Street, London W1D 1BS, UK",
            "Via del Corso 123, 00186 Roma, Italy",
            "Unter den Linden 1, 10117 Berlin, Germany",
            "Calle Mayor 15, 28013 Madrid, Spain",
            "Rue de la Loi 175, 1048 Brussels, Belgium",
            "P.O. Box 123, Toronto, ON M5V 3A8, Canada",

            # Ambiguous/tricky addresses
            "Monaco-Ville, Monaco",
            "Andorra la Vella, Andorra",
            "Genève, Suisse",
            "Luxembourg, Luxembourg",
            "Route de France, Genève",
            "Avenue de France, Brussels",

            # French overseas territories
            "Fort-de-France, 97200 Martinique",
            "Pointe-à-Pitre, 97110 Guadeloupe",
            "Saint-Denis, 97400 Réunion",
            "Cayenne, 97300 Guyane française",

            # Edge cases
            "Libreville, Gabon",  # City name similar to French
            "Saint-Louis, Missouri, USA",  # French-sounding but US
            "Paris, Texas, USA",  # French city name but US
            "Londres, Ontario, Canada",  # French version of London
        ]

        return test_addresses

    def compare_models(self, models: List[str] = None) -> Dict:
        """
        Compare performance of different models.

        Args:
            models: List of model names to compare

        Returns:
            Dictionary with detailed comparison results
        """
        if models is None:
            models = [
                "rule-based",
                "auto",
                "camembert",
                "ollama:llama3.2:8b",
                "bert",
                "xlm"
            ]

        logging.info(f"Starting model comparison with {len(self.test_addresses)} test addresses")
        logging.info(f"Models to test: {models}")

        results = {}

        for model_name in models:
            logging.info(f"\n{'='*50}")
            logging.info(f"Testing model: {model_name}")
            logging.info(f"{'='*50}")

            try:
                detector = CountryDetector(
                    model_name=model_name,
                    use_llm=(model_name not in ["rule-based"])
                )

                start_time = datetime.now()
                classifications = []
                errors = []

                with tqdm(total=len(self.test_addresses), desc=f"Testing {model_name}") as pbar:
                    for i, address in enumerate(self.test_addresses):
                        try:
                            result = detector.detect_country(address)
                            classifications.append({
                                'address': address,
                                'classification': result,
                                'index': i
                            })
                        except Exception as e:
                            error_msg = f"Error on '{address}': {str(e)}"
                            logging.error(error_msg)
                            errors.append(error_msg)
                            classifications.append({
                                'address': address,
                                'classification': 'ERROR',
                                'index': i
                            })

                        pbar.update(1)

                end_time = datetime.now()
                duration = (end_time - start_time).total_seconds()

                stats = detector.get_statistics()

                # Calculate metrics
                success_count = len([c for c in classifications if c['classification'] != 'ERROR'])
                france_count = len([c for c in classifications if c['classification'] == 'FRANCE'])
                foreign_count = len([c for c in classifications if c['classification'] == 'FOREIGN'])
                error_count = len([c for c in classifications if c['classification'] == 'ERROR'])

                results[model_name] = {
                    'available': True,
                    'classifications': classifications,
                    'duration_seconds': duration,
                    'average_time_per_address': duration / len(self.test_addresses) if self.test_addresses else 0,
                    'total_addresses': len(self.test_addresses),
                    'success_count': success_count,
                    'france_count': france_count,
                    'foreign_count': foreign_count,
                    'error_count': error_count,
                    'success_rate': (success_count / len(self.test_addresses) * 100) if self.test_addresses else 0,
                    'france_percentage': (france_count / len(self.test_addresses) * 100) if self.test_addresses else 0,
                    'foreign_percentage': (foreign_count / len(self.test_addresses) * 100) if self.test_addresses else 0,
                    'detector_stats': stats,
                    'errors': errors
                }

                logging.info(f"✅ {model_name} completed successfully")
                logging.info(f"   Duration: {duration:.2f}s")
                logging.info(f"   Success rate: {results[model_name]['success_rate']:.1f}%")
                logging.info(f"   France: {france_count}, Foreign: {foreign_count}, Errors: {error_count}")

            except Exception as e:
                error_msg = f"Model {model_name} failed to initialize: {str(e)}"
                logging.warning(error_msg)
                results[model_name] = {
                    'available': False,
                    'error': error_msg,
                    'classifications': [],
                    'duration_seconds': 0,
                    'success_rate': 0
                }

        return results

    def evaluate_with_labels(self, models: List[str] = None, dataset_name: str = None) -> Dict:
        """
        Evaluate models against a labeled dataset.

        Args:
            models: List of model names to test
            dataset_name: Name of dataset file to use

        Returns:
            Dictionary with detailed evaluation results including accuracy
        """
        if models is None:
            models = [
                "rule-based",
                "auto",
                "camembert",
                "ollama:llama3.2:8b",
                "bert",
                "xlm"
            ]

        # Load labeled dataset
        test_data_dir = os.path.join(os.path.dirname(__file__), 'test_data', 'datasets')

        if dataset_name:
            dataset_file = os.path.join(test_data_dir, f"{dataset_name}.csv")
        else:
            # Try different datasets in order of preference
            dataset_files = [
                os.path.join(test_data_dir, 'comprehensive_test.csv'),
                os.path.join(test_data_dir, 'quick_test.csv'),
                os.path.join(test_data_dir, 'large_test.csv'),
            ]
            dataset_file = None
            for file_path in dataset_files:
                if os.path.exists(file_path):
                    dataset_file = file_path
                    break

        if not dataset_file or not os.path.exists(dataset_file):
            logging.error(f"No labeled dataset found. Run dataset_builder.py first.")
            return {}

        try:
            import pandas as pd
            df = pd.read_csv(dataset_file, encoding='utf-8')

            if 'address' not in df.columns or 'expected_label' not in df.columns:
                logging.error("Dataset must have 'address' and 'expected_label' columns")
                return {}

            test_data = [(row['address'], row['expected_label']) for _, row in df.iterrows()]
            logging.info(f"Loaded {len(test_data)} labeled test cases from {os.path.basename(dataset_file)}")

        except Exception as e:
            logging.error(f"Failed to load labeled dataset: {e}")
            return {}

        results = {}

        for model_name in models:
            logging.info(f"\n{'='*50}")
            logging.info(f"Evaluating model: {model_name}")
            logging.info(f"{'='*50}")

            try:
                detector = CountryDetector(
                    model_name=model_name,
                    use_llm=(model_name not in ["rule-based"])
                )

                start_time = datetime.now()
                predictions = []
                correct = 0
                total = 0

                with tqdm(total=len(test_data), desc=f"Testing {model_name}") as pbar:
                    for address, expected_label in test_data:
                        try:
                            predicted_label = detector.detect_country(address)
                            predictions.append({
                                'address': address,
                                'expected': expected_label,
                                'predicted': predicted_label,
                                'correct': predicted_label == expected_label
                            })

                            if predicted_label == expected_label:
                                correct += 1
                            total += 1

                        except Exception as e:
                            logging.error(f"Error predicting '{address}': {e}")
                            predictions.append({
                                'address': address,
                                'expected': expected_label,
                                'predicted': 'ERROR',
                                'correct': False
                            })
                            total += 1

                        pbar.update(1)

                end_time = datetime.now()
                duration = (end_time - start_time).total_seconds()

                # Calculate detailed metrics
                accuracy = correct / total * 100 if total > 0 else 0

                # Confusion matrix
                true_positives = len([p for p in predictions if p['expected'] == 'FRANCE' and p['predicted'] == 'FRANCE'])
                false_positives = len([p for p in predictions if p['expected'] == 'FOREIGN' and p['predicted'] == 'FRANCE'])
                true_negatives = len([p for p in predictions if p['expected'] == 'FOREIGN' and p['predicted'] == 'FOREIGN'])
                false_negatives = len([p for p in predictions if p['expected'] == 'FRANCE' and p['predicted'] == 'FOREIGN'])

                # Precision and Recall for FRANCE classification
                precision = true_positives / (true_positives + false_positives) * 100 if (true_positives + false_positives) > 0 else 0
                recall = true_positives / (true_positives + false_negatives) * 100 if (true_positives + false_negatives) > 0 else 0
                f1_score = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0

                stats = detector.get_statistics()

                results[model_name] = {
                    'available': True,
                    'total_tested': total,
                    'correct_predictions': correct,
                    'accuracy': accuracy,
                    'precision': precision,
                    'recall': recall,
                    'f1_score': f1_score,
                    'confusion_matrix': {
                        'true_positives': true_positives,
                        'false_positives': false_positives,
                        'true_negatives': true_negatives,
                        'false_negatives': false_negatives
                    },
                    'predictions': predictions,
                    'duration_seconds': duration,
                    'average_time_per_address': duration / total if total > 0 else 0,
                    'detector_stats': stats,
                    'dataset_used': os.path.basename(dataset_file)
                }

                logging.info(f"✅ {model_name} completed")
                logging.info(f"   Accuracy: {accuracy:.1f}%")
                logging.info(f"   Precision: {precision:.1f}%")
                logging.info(f"   Recall: {recall:.1f}%")
                logging.info(f"   F1-Score: {f1_score:.1f}%")
                logging.info(f"   Duration: {duration:.2f}s")

            except Exception as e:
                error_msg = f"Model {model_name} failed: {str(e)}"
                logging.warning(error_msg)
                results[model_name] = {
                    'available': False,
                    'error': error_msg,
                    'accuracy': 0
                }

        return results

    def generate_report(self, results: Dict) -> str:
        """Generate a detailed comparison report."""
        report = []
        report.append("="*80)
        report.append("ADDRESS CLASSIFICATION MODEL COMPARISON REPORT")
        report.append("="*80)
        report.append(f"Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        report.append(f"Test addresses: {len(self.test_addresses)}")
        report.append("")

        # Available models summary
        available_models = [name for name, result in results.items() if result.get('available', False)]
        unavailable_models = [name for name, result in results.items() if not result.get('available', False)]

        report.append(f"📊 MODELS TESTED")
        report.append("-" * 40)
        report.append(f"Available models: {len(available_models)}")
        report.append(f"Unavailable models: {len(unavailable_models)}")

        if unavailable_models:
            report.append(f"Unavailable: {', '.join(unavailable_models)}")
        report.append("")

        # Performance comparison table
        report.append("🏆 PERFORMANCE COMPARISON")
        report.append("-" * 40)

        if available_models:
            # Sort by success rate then by speed
            sorted_models = sorted(
                [(name, results[name]) for name in available_models],
                key=lambda x: (x[1]['success_rate'], -x[1]['duration_seconds']),
                reverse=True
            )

            # Headers
            report.append(f"{'Model':<20} {'Success%':<10} {'Time(s)':<10} {'France':<8} {'Foreign':<8} {'Errors':<8}")
            report.append("-" * 80)

            for model_name, result in sorted_models:
                report.append(f"{model_name:<20} "
                            f"{result['success_rate']:>7.1f}% "
                            f"{result['duration_seconds']:>8.2f}s "
                            f"{result['france_count']:>6} "
                            f"{result['foreign_count']:>7} "
                            f"{result['error_count']:>6}")

            report.append("")

            # Best model recommendation
            best_model = sorted_models[0]
            report.append("🎯 RECOMMENDATION")
            report.append("-" * 40)
            report.append(f"Best performing model: {best_model[0]}")
            report.append(f"Success rate: {best_model[1]['success_rate']:.1f}%")
            report.append(f"Average time per address: {best_model[1]['average_time_per_address']:.3f}s")
            report.append("")

        # Detailed results by address
        report.append("📝 DETAILED CLASSIFICATION RESULTS")
        report.append("-" * 40)

        # Create a table showing all classifications for each address
        for i, address in enumerate(self.test_addresses):
            report.append(f"\nAddress {i+1}: {address}")
            for model_name in available_models:
                result = results[model_name]
                classification = next(
                    (c['classification'] for c in result['classifications'] if c['index'] == i),
                    'N/A'
                )
                report.append(f"  {model_name:<15}: {classification}")

        report.append("")
        report.append("="*80)

        return '\n'.join(report)

    def save_results(self, results: Dict, output_file: str = None):
        """Save comparison results to files."""
        if output_file is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_file = f"model_comparison_{timestamp}"

        # Ensure logs directory exists
        logs_dir = os.path.join(os.path.dirname(__file__), 'logs')
        os.makedirs(logs_dir, exist_ok=True)

        # Save JSON results
        json_file = os.path.join(logs_dir, f"{output_file}.json")
        with open(json_file, 'w', encoding='utf-8') as f:
            json.dump(results, f, indent=2, ensure_ascii=False, default=str)

        # Save text report - only generate for regular comparison (not evaluation)
        try:
            report_file = os.path.join(logs_dir, f"{output_file}_report.txt")
            # Check if this is evaluation results (has accuracy) or regular results (has success_rate)
            sample_result = next(iter(results.values())) if results else {}

            if 'accuracy' in sample_result:
                # Generate evaluation report
                report = self._generate_evaluation_report(results)
            else:
                # Generate regular comparison report
                report = self.generate_report(results)

            with open(report_file, 'w', encoding='utf-8') as f:
                f.write(report)

            logging.info(f"Report saved to: {report_file}")
        except Exception as e:
            logging.warning(f"Failed to save text report: {e}")
            report_file = None

        logging.info(f"Results saved to: {json_file}")

        return json_file, report_file

    def _generate_evaluation_report(self, results: Dict) -> str:
        """Generate evaluation report for labeled dataset results."""
        report = []
        report.append("="*80)
        report.append("ADDRESS CLASSIFICATION MODEL EVALUATION REPORT")
        report.append("="*80)
        report.append(f"Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

        # Get dataset info
        sample_result = next((r for r in results.values() if r.get('available', False)), {})
        if sample_result.get('dataset_used'):
            report.append(f"Dataset: {sample_result['dataset_used']}")
            report.append(f"Total test cases: {sample_result.get('total_tested', 0)}")

        report.append("")

        # Available models summary
        available_models = [name for name, result in results.items() if result.get('available', False)]
        unavailable_models = [name for name, result in results.items() if not result.get('available', False)]

        report.append(f"📊 MODELS EVALUATED")
        report.append("-" * 40)
        report.append(f"Available models: {len(available_models)}")
        report.append(f"Unavailable models: {len(unavailable_models)}")

        if unavailable_models:
            report.append(f"Unavailable: {', '.join(unavailable_models)}")
        report.append("")

        # Performance table
        report.append("🎯 EVALUATION RESULTS")
        report.append("-" * 40)

        if available_models:
            # Sort by accuracy
            sorted_models = sorted(
                [(name, results[name]) for name in available_models],
                key=lambda x: x[1]['accuracy'],
                reverse=True
            )

            # Headers
            report.append(f"{'Model':<20} {'Accuracy':<10} {'Precision':<10} {'Recall':<10} {'F1-Score':<10} {'Time(s)':<10}")
            report.append("-" * 80)

            for model_name, result in sorted_models:
                report.append(f"{model_name:<20} "
                            f"{result['accuracy']:>7.1f}% "
                            f"{result['precision']:>8.1f}% "
                            f"{result['recall']:>7.1f}% "
                            f"{result['f1_score']:>8.1f}% "
                            f"{result['duration_seconds']:>8.2f}s")

            report.append("")

            # Best model
            best_model = sorted_models[0]
            report.append("🏆 BEST MODEL")
            report.append("-" * 40)
            report.append(f"Model: {best_model[0]}")
            report.append(f"Accuracy: {best_model[1]['accuracy']:.1f}%")
            report.append(f"Precision: {best_model[1]['precision']:.1f}%")
            report.append(f"Recall: {best_model[1]['recall']:.1f}%")
            report.append(f"F1-Score: {best_model[1]['f1_score']:.1f}%")

            # Confusion matrix
            cm = best_model[1]['confusion_matrix']
            report.append("")
            report.append("Confusion Matrix:")
            report.append(f"True Positives (FRANCE correctly): {cm['true_positives']}")
            report.append(f"False Positives (FOREIGN as FRANCE): {cm['false_positives']}")
            report.append(f"True Negatives (FOREIGN correctly): {cm['true_negatives']}")
            report.append(f"False Negatives (FRANCE as FOREIGN): {cm['false_negatives']}")

        report.append("")
        report.append("="*80)

        return '\n'.join(report)

def setup_logging():
    """Setup logging configuration."""
    log_format = '%(asctime)s - %(levelname)s - %(message)s'

    # Ensure logs directory exists
    logs_dir = os.path.join(os.path.dirname(__file__), 'logs')
    os.makedirs(logs_dir, exist_ok=True)

    log_file = os.path.join(logs_dir, f'model_comparison_{datetime.now().strftime("%Y%m%d_%H%M%S")}.log')

    logging.basicConfig(
        level=logging.INFO,
        format=log_format,
        handlers=[
            logging.FileHandler(log_file),
            logging.StreamHandler(sys.stdout)
        ]
    )

def main():
    """Main function."""
    parser = argparse.ArgumentParser(
        description="Compare performance of different address classification models"
    )
    parser.add_argument(
        '--models',
        nargs='+',
        default=None,
        help='List of models to compare (default: all available)'
    )
    parser.add_argument(
        '--output',
        help='Output file prefix (default: auto-generated timestamp)'
    )
    parser.add_argument(
        '--evaluate',
        action='store_true',
        help='Evaluate models with labeled dataset (requires running dataset_builder.py first)'
    )
    parser.add_argument(
        '--dataset',
        help='Specific dataset name to use for evaluation (e.g., quick_test, comprehensive_test)'
    )

    args = parser.parse_args()

    # Setup logging
    setup_logging()

    logging.info("Starting model comparison script")
    logging.info(f"Models to test: {args.models or 'all available'}")

    # Initialize comparator
    comparator = ModelComparator()

    try:
        if args.evaluate:
            # Run evaluation with labeled data
            logging.info("Running evaluation with labeled dataset...")
            results = comparator.evaluate_with_labels(args.models, args.dataset)

            # Print report with accuracy metrics
            if results:
                print("\n" + "="*80)
                print("MODEL EVALUATION RESULTS (WITH ACCURACY)")
                print("="*80)

                available_results = {name: result for name, result in results.items() if result.get('available', False)}

                if available_results:
                    # Sort by accuracy
                    sorted_models = sorted(
                        available_results.items(),
                        key=lambda x: x[1]['accuracy'],
                        reverse=True
                    )

                    # Headers
                    print(f"{'Model':<20} {'Accuracy':<10} {'Precision':<10} {'Recall':<10} {'F1-Score':<10} {'Time(s)':<10}")
                    print("-" * 80)

                    for model_name, result in sorted_models:
                        print(f"{model_name:<20} "
                              f"{result['accuracy']:>7.1f}% "
                              f"{result['precision']:>8.1f}% "
                              f"{result['recall']:>7.1f}% "
                              f"{result['f1_score']:>8.1f}% "
                              f"{result['duration_seconds']:>8.2f}s")

                    # Best model
                    best_model = sorted_models[0]
                    print(f"\n🏆 BEST MODEL: {best_model[0]}")
                    print(f"   Accuracy: {best_model[1]['accuracy']:.1f}%")
                    print(f"   Dataset: {best_model[1].get('dataset_used', 'unknown')}")
                    print("="*80)

        else:
            # Run regular comparison without labels
            results = comparator.compare_models(args.models)

            # Print report
            report = comparator.generate_report(results)
            print(report)

            # Find best model
            available_results = {name: result for name, result in results.items() if result.get('available', False)}
            if available_results:
                best_model = max(available_results.items(), key=lambda x: x[1]['success_rate'])
                logging.info(f"\n🏆 BEST MODEL: {best_model[0]} ({best_model[1]['success_rate']:.1f}% success rate)")

        # Save results
        json_file, report_file = comparator.save_results(results, args.output)

    except KeyboardInterrupt:
        logging.info("Model comparison interrupted by user")
    except Exception as e:
        logging.error(f"Model comparison failed with error: {e}")
        sys.exit(1)

    logging.info("Model comparison completed successfully")


if __name__ == "__main__":
    main()
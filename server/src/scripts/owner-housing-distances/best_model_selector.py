#!/usr/bin/env python3
"""
Best Model Selector

This script automatically determines the best available LLM model for address classification
by running quick tests and saving the configuration for future use.
"""

import argparse
import logging
import sys
import os
import json
from datetime import datetime
from typing import Dict, Optional

# Add the project root to Python path for imports
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..', '..'))

from model_comparison import ModelComparator

class BestModelSelector:
    """Automatically selects and configures the best available model."""

    def __init__(self):
        """Initialize the selector."""
        self.config_file = os.path.join(os.path.dirname(__file__), 'best_model_config.json')
        self.test_addresses = [
            # Quick test set for model selection
            "123 Rue de Rivoli, 75001 Paris, France",
            "456 Oxford Street, London W1D 1BS, UK",
            "Via del Corso 123, 00186 Roma, Italy",
            "10 Place Bellecour, 69002 Lyon",
            "123 Main Street, New York, NY 10001, USA",
            "Fort-de-France, 97200 Martinique",
            "Monaco-Ville, Monaco",
            "Genève, Suisse"
        ]

    def run_quick_test(self, models: list = None) -> Dict:
        """Run a quick test to evaluate models."""
        if models is None:
            models = ["rule-based", "camembert", "ollama:llama3.2:8b", "bert", "xlm"]

        logging.info("Running quick model evaluation...")

        comparator = ModelComparator()
        # Override test addresses with our quick set
        comparator.test_addresses = self.test_addresses

        results = comparator.compare_models(models)
        return results

    def calculate_score(self, model_result: Dict) -> float:
        """
        Calculate a composite score for a model based on performance metrics.

        Args:
            model_result: Result dictionary for a model

        Returns:
            Composite score (higher is better)
        """
        if not model_result.get('available', False):
            return 0.0

        success_rate = model_result.get('success_rate', 0) / 100.0  # 0-1
        speed_score = 1.0 / max(model_result.get('average_time_per_address', 1), 0.001)  # Higher for faster

        # Normalize speed score to 0-1 range (cap at 100 addresses per second)
        speed_score = min(speed_score / 100.0, 1.0)

        # Weighted score: 70% accuracy, 30% speed
        composite_score = (success_rate * 0.7) + (speed_score * 0.3)

        return composite_score

    def select_best_model(self, results: Dict) -> Optional[str]:
        """
        Select the best model based on composite scoring.

        Args:
            results: Comparison results from ModelComparator

        Returns:
            Name of best model or None if no models available
        """
        available_models = {
            name: result for name, result in results.items()
            if result.get('available', False)
        }

        if not available_models:
            logging.warning("No models available for selection")
            return None

        # Calculate scores for each model
        model_scores = {}
        for model_name, result in available_models.items():
            score = self.calculate_score(result)
            model_scores[model_name] = {
                'score': score,
                'success_rate': result.get('success_rate', 0),
                'avg_time': result.get('average_time_per_address', 0),
                'details': result
            }
            logging.info(f"{model_name}: score={score:.3f}, success={result.get('success_rate', 0):.1f}%, time={result.get('average_time_per_address', 0):.3f}s")

        # Select highest scoring model
        best_model_name = max(model_scores.keys(), key=lambda x: model_scores[x]['score'])
        best_score = model_scores[best_model_name]

        logging.info(f"Selected best model: {best_model_name} (score: {best_score['score']:.3f})")

        return best_model_name

    def save_config(self, best_model: str, results: Dict):
        """Save the best model configuration."""
        config = {
            'best_model': best_model,
            'selected_on': datetime.now().isoformat(),
            'test_results': results,
            'selection_criteria': {
                'weight_accuracy': 0.7,
                'weight_speed': 0.3,
                'test_addresses_count': len(self.test_addresses)
            }
        }

        with open(self.config_file, 'w', encoding='utf-8') as f:
            json.dump(config, f, indent=2, ensure_ascii=False, default=str)

        logging.info(f"Best model configuration saved to: {self.config_file}")

    def load_config(self) -> Optional[Dict]:
        """Load existing configuration if available."""
        if not os.path.exists(self.config_file):
            return None

        try:
            with open(self.config_file, 'r', encoding='utf-8') as f:
                config = json.load(f)
            logging.info(f"Loaded existing config: {config.get('best_model')} (selected on {config.get('selected_on')})")
            return config
        except Exception as e:
            logging.warning(f"Failed to load config: {e}")
            return None

    def get_recommended_model(self, force_reselect: bool = False) -> str:
        """
        Get the recommended model, running selection if needed.

        Args:
            force_reselect: Force re-selection even if config exists

        Returns:
            Name of recommended model
        """
        if not force_reselect:
            existing_config = self.load_config()
            if existing_config and existing_config.get('best_model'):
                return existing_config['best_model']

        logging.info("Running model selection...")
        results = self.run_quick_test()
        best_model = self.select_best_model(results)

        if best_model:
            self.save_config(best_model, results)
            return best_model
        else:
            logging.warning("No suitable model found, falling back to rule-based")
            return "rule-based"

    def print_recommendation_report(self, recommended_model: str):
        """Print a recommendation report."""
        config = self.load_config()

        print("\n" + "="*60)
        print("MODEL RECOMMENDATION REPORT")
        print("="*60)
        print(f"Recommended model: {recommended_model}")

        if config and config.get('test_results'):
            results = config['test_results']
            if recommended_model in results:
                model_result = results[recommended_model]
                print(f"Success rate: {model_result.get('success_rate', 0):.1f}%")
                print(f"Average time per address: {model_result.get('average_time_per_address', 0):.3f}s")
                print(f"France classifications: {model_result.get('france_count', 0)}")
                print(f"Foreign classifications: {model_result.get('foreign_count', 0)}")
                print(f"Errors: {model_result.get('error_count', 0)}")

        print(f"Configuration file: {self.config_file}")
        print("="*60)


def setup_logging():
    """Setup logging configuration."""
    log_format = '%(asctime)s - %(levelname)s - %(message)s'

    # Ensure logs directory exists
    logs_dir = os.path.join(os.path.dirname(__file__), 'logs')
    os.makedirs(logs_dir, exist_ok=True)

    log_file = os.path.join(logs_dir, f'best_model_selector_{datetime.now().strftime("%Y%m%d_%H%M%S")}.log')

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
        description="Automatically select the best available LLM model for address classification"
    )
    parser.add_argument(
        '--force-reselect',
        action='store_true',
        help='Force re-selection even if existing configuration found'
    )
    parser.add_argument(
        '--models',
        nargs='+',
        help='Specific models to test (default: all available)'
    )

    args = parser.parse_args()

    # Setup logging
    setup_logging()

    logging.info("Starting best model selector")

    # Initialize selector
    selector = BestModelSelector()

    try:
        if args.models:
            logging.info(f"Testing specific models: {args.models}")
            results = selector.run_quick_test(args.models)
            best_model = selector.select_best_model(results)
            if best_model:
                selector.save_config(best_model, results)
        else:
            best_model = selector.get_recommended_model(args.force_reselect)

        # Print recommendation
        selector.print_recommendation_report(best_model)

        logging.info(f"✅ Recommended model: {best_model}")

    except KeyboardInterrupt:
        logging.info("Model selection interrupted by user")
    except Exception as e:
        logging.error(f"Model selection failed: {e}")
        sys.exit(1)

    logging.info("Best model selection completed")


if __name__ == "__main__":
    main()
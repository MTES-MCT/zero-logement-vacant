#!/usr/bin/env python3
"""
Script to generate a detailed report on an NPAI verification CSV file
"""

import pandas as pd
import argparse
import logging
from datetime import datetime
from pathlib import Path

def setup_logging():
    """Configure logging"""
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )

def analyze_csv(file_path: str):
    """Analyze CSV file and generate detailed report"""
    try:
        df = pd.read_csv(file_path)

        # Check required columns
        required_columns = ['status', 'similarity_score']
        missing_columns = [col for col in required_columns if col not in df.columns]

        if missing_columns:
            logging.error(f"Missing columns in CSV: {missing_columns}")
            logging.info(f"Available columns: {list(df.columns)}")
            return

        # General statistics
        total_addresses = len(df)

        # Count different statuses
        status_counts = df['status'].value_counts()

        # Calculate percentages
        valid_count = status_counts.get('valid', 0)
        ambiguous_count = status_counts.get('ambiguous', 0)
        valid_alternatives_count = status_counts.get('valid_with_alternatives', 0)

        valid_pct = (valid_count / total_addresses) * 100 if total_addresses > 0 else 0
        ambiguous_pct = (ambiguous_count / total_addresses) * 100 if total_addresses > 0 else 0
        valid_alternatives_pct = (valid_alternatives_count / total_addresses) * 100 if total_addresses > 0 else 0

        # Similarity score statistics
        similarity_scores = df['similarity_score'].dropna()
        avg_similarity = similarity_scores.mean() if len(similarity_scores) > 0 else 0
        min_similarity = similarity_scores.min() if len(similarity_scores) > 0 else 0
        max_similarity = similarity_scores.max() if len(similarity_scores) > 0 else 0

        # Generate report
        logging.info("NPAI VERIFICATION SUMMARY")
        logging.info("=" * 50)
        logging.info(f"Total addresses verified: {total_addresses}")
        logging.info("")

        # Address categories explanation
        logging.info("ADDRESS CATEGORIES EXPLAINED:")
        logging.info("-" * 35)
        logging.info("• Valid addresses: Addresses found exactly in the reference database")
        logging.info("  → Perfect match, address confirmed as valid")
        logging.info("")
        logging.info("• Ambiguous addresses: Addresses with multiple possible matches")
        logging.info("  → System cannot determine the correct address with certainty")
        logging.info("  → Requires manual verification to resolve ambiguity")
        logging.info("")
        logging.info("• Valid with alternatives: Valid addresses but with suggested variants")
        logging.info("  → Original address is valid but alternative formats exist")
        logging.info("  → Ex: '1 rue de la Paix' vs '1 r de la Paix' vs '1 rue Paix'")
        logging.info("")

        # Main statistics
        logging.info("VERIFICATION RESULTS:")
        logging.info("-" * 25)
        logging.info(f"Valid addresses: {valid_count} ({valid_pct:.1f}%)")
        logging.info(f"Ambiguous addresses: {ambiguous_count} ({ambiguous_pct:.1f}%)")
        logging.info(f"Valid addresses with alternatives: {valid_alternatives_count} ({valid_alternatives_pct:.1f}%)")
        logging.info("")

        # Similarity scores explanation
        logging.info("SIMILARITY SCORE EXPLANATION:")
        logging.info("-" * 35)
        logging.info("Score from 0.0 to 1.0 indicating proximity between entered address")
        logging.info("and address found in the reference database:")
        logging.info("• 1.0 = Exact match (character by character)")
        logging.info("• 0.9-0.99 = Very close (minor differences: accents, spaces)")
        logging.info("• 0.7-0.89 = Close (abbreviations, different word order)")
        logging.info("• 0.5-0.69 = Similar (similar structure but notable differences)")
        logging.info("• < 0.5 = Low similarity (doubtful match)")
        logging.info("")
        logging.info(f"Average similarity score: {avg_similarity:.3f}")
        logging.info(f"Similarity scores - Min: {min_similarity:.3f}, Max: {max_similarity:.3f}")

        # Detailed statistics by status
        if len(status_counts) > 0:
            logging.info("")
            logging.info("DETAILED STATUS BREAKDOWN")
            logging.info("-" * 30)
            for status, count in status_counts.items():
                pct = (count / total_addresses) * 100
                logging.info(f"{status}: {count} ({pct:.1f}%)")

        # Statistics by similarity score range with business explanations
        if len(similarity_scores) > 0:
            logging.info("")
            logging.info("SIMILARITY SCORE DISTRIBUTION")
            logging.info("-" * 35)

            ranges = [
                (0.0, 0.5, "Unreliable (0.0-0.5)", "Doubtful matches - Manual verification required"),
                (0.5, 0.7, "Average (0.5-0.7)", "Partial similarity - Special attention recommended"),
                (0.7, 0.85, "Good (0.7-0.85)", "Good match - Minor differences acceptable"),
                (0.85, 0.95, "Very good (0.85-0.95)", "Very good match - High confidence"),
                (0.95, 1.0, "Excellent (0.95-1.0)", "Near-perfect match - Maximum confidence")
            ]

            for min_score, max_score, label, description in ranges:
                count = len(similarity_scores[(similarity_scores >= min_score) & (similarity_scores <= max_score)])
                pct = (count / len(similarity_scores)) * 100 if len(similarity_scores) > 0 else 0
                logging.info(f"{label}: {count} ({pct:.1f}%)")
                logging.info(f"  → {description}")

        # Business recommendations based on results
        logging.info("")
        logging.info("BUSINESS RECOMMENDATIONS:")
        logging.info("-" * 30)

        if ambiguous_count > 0:
            ambiguous_rate = (ambiguous_count / total_addresses) * 100
            if ambiguous_rate > 10:
                logging.info("⚠️  WARNING: High ambiguous addresses rate")
                logging.info(f"   {ambiguous_count} addresses ({ambiguous_rate:.1f}%) require manual verification")
            else:
                logging.info(f"✓ Acceptable ambiguous addresses rate: {ambiguous_rate:.1f}%")

        if len(similarity_scores) > 0:
            low_quality_scores = len(similarity_scores[similarity_scores < 0.7])
            low_quality_rate = (low_quality_scores / len(similarity_scores)) * 100

            if low_quality_rate > 20:
                logging.info("⚠️  WARNING: Concerning match quality")
                logging.info(f"   {low_quality_scores} addresses ({low_quality_rate:.1f}%) have score < 0.7")
                logging.info("   → Recommendation: Review matching criteria or source data quality")
            elif low_quality_rate > 10:
                logging.info(f"⚠️  {low_quality_scores} addresses ({low_quality_rate:.1f}%) have low similarity score")
                logging.info("   → Recommendation: Spot verification advised")
            else:
                logging.info(f"✓ Overall match quality satisfactory")

        success_rate = ((valid_count + valid_alternatives_count) / total_addresses) * 100 if total_addresses > 0 else 0
        if success_rate > 80:
            logging.info(f"✓ Excellent success rate: {success_rate:.1f}% of addresses validated")
        elif success_rate > 60:
            logging.info(f"⚠️  Moderate success rate: {success_rate:.1f}% of addresses validated")
        else:
            logging.info(f"⚠️  Low success rate: {success_rate:.1f}% of addresses validated")
            logging.info("   → Recommendation: Check input data quality")

    except FileNotFoundError:
        logging.error(f"File not found: {file_path}")
    except pd.errors.EmptyDataError:
        logging.error("CSV file is empty")
    except Exception as e:
        logging.error(f"Error analyzing file: {e}")

def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(description="Generate report on NPAI verification CSV file")
    parser.add_argument("csv_file", help="Path to CSV file to analyze")

    args = parser.parse_args()

    setup_logging()

    csv_path = Path(args.csv_file)
    if not csv_path.exists():
        logging.error(f"File {csv_path} does not exist")
        return

    logging.info(f"Analyzing file: {csv_path}")
    analyze_csv(str(csv_path))

if __name__ == "__main__":
    main()

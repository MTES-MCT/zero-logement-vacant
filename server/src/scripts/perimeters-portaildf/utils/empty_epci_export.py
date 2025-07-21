#!/usr/bin/env python3
"""
Script to analyze ZLV establishment synchronization logs and extract
establishments with 0 communes for CSV export.
"""

import re
import csv
import argparse
import logging
from typing import List, Dict, Optional
from dataclasses import dataclass
from datetime import datetime
import os

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@dataclass
class EstablishmentAnalysis:
    """Represents an establishment analysis result."""
    name: str
    old_name: Optional[str] = None
    new_name: Optional[str] = None
    old_commune_count: Optional[int] = None
    new_commune_count: Optional[int] = None
    has_name_change: bool = False
    has_zero_communes: bool = False
    timestamp: Optional[str] = None

class LogAnalyzer:
    """Analyzes ZLV synchronization logs to find establishments with issues."""
    
    def __init__(self, log_file: str):
        self.log_file = log_file
        self.establishments = {}
        
        # Regex patterns for log parsing
        self.patterns = {
            'processing': re.compile(r'🏢 Processing establishment: (.+?) \(ID:'),
            'name_change': re.compile(r'📝 Name change detected: \'(.+?)\' → \'(.+?)\''),
            'perimeter_change': re.compile(r'📐 Perimeter changes detected: (\d+) → (\d+) communes'),
            'timestamp': re.compile(r'^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2},\d{3})'),
            'no_changes': re.compile(r'✅ No changes needed for (.+)'),
            'france_entiere': re.compile(r'🇫🇷 Skipping (.+?) - France entière'),
            'api_mismatch': re.compile(r'❌ No Cerema structure found for (.+)')
        }
    
    def parse_log_file(self) -> Dict[str, EstablishmentAnalysis]:
        """
        Parse the log file and extract establishment information.
        
        Returns:
            Dict[str, EstablishmentAnalysis]: Establishments indexed by name
        """
        logger.info(f"📖 Parsing log file: {self.log_file}")
        
        if not os.path.exists(self.log_file):
            logger.error(f"❌ Log file not found: {self.log_file}")
            return {}
        
        current_establishment = None
        current_timestamp = None
        
        try:
            with open(self.log_file, 'r', encoding='utf-8') as f:
                for line_num, line in enumerate(f, 1):
                    line = line.strip()
                    if not line:
                        continue
                    
                    # Extract timestamp
                    timestamp_match = self.patterns['timestamp'].match(line)
                    if timestamp_match:
                        current_timestamp = timestamp_match.group(1)
                    
                    # Check for establishment processing
                    processing_match = self.patterns['processing'].search(line)
                    if processing_match:
                        current_establishment = processing_match.group(1)
                        if current_establishment not in self.establishments:
                            self.establishments[current_establishment] = EstablishmentAnalysis(
                                name=current_establishment,
                                timestamp=current_timestamp
                            )
                        continue
                    
                    # Skip if no current establishment
                    if not current_establishment:
                        continue
                    
                    establishment = self.establishments[current_establishment]
                    
                    # Check for name changes
                    name_change_match = self.patterns['name_change'].search(line)
                    if name_change_match:
                        establishment.old_name = name_change_match.group(1)
                        establishment.new_name = name_change_match.group(2)
                        establishment.has_name_change = True
                        logger.debug(f"📝 Name change: {establishment.old_name} → {establishment.new_name}")
                        continue
                    
                    # Check for perimeter changes
                    perimeter_change_match = self.patterns['perimeter_change'].search(line)
                    if perimeter_change_match:
                        establishment.old_commune_count = int(perimeter_change_match.group(1))
                        establishment.new_commune_count = int(perimeter_change_match.group(2))
                        
                        if establishment.new_commune_count == 0:
                            establishment.has_zero_communes = True
                            logger.debug(f"🚨 Zero communes detected: {current_establishment}")
                        continue
                    
                    # Check for no changes
                    no_changes_match = self.patterns['no_changes'].search(line)
                    if no_changes_match:
                        # Reset current establishment as we're done with this one
                        current_establishment = None
                        continue
                    
                    # Check for France entière (these won't have commune counts)
                    france_entiere_match = self.patterns['france_entiere'].search(line)
                    if france_entiere_match:
                        current_establishment = None
                        continue
                    
                    # Check for API mismatch
                    api_mismatch_match = self.patterns['api_mismatch'].search(line)
                    if api_mismatch_match:
                        current_establishment = None
                        continue
        
        except IOError as e:
            logger.error(f"❌ Error reading log file: {e}")
            return {}
        
        logger.info(f"📊 Parsed {len(self.establishments)} establishments from log")
        return self.establishments
    
    def filter_zero_communes(self) -> List[EstablishmentAnalysis]:
        """
        Filter establishments that have 0 communes.
        
        Returns:
            List[EstablishmentAnalysis]: Establishments with 0 communes
        """
        zero_communes = []
        
        for establishment in self.establishments.values():
            if establishment.has_zero_communes:
                zero_communes.append(establishment)
        
        logger.info(f"🚨 Found {len(zero_communes)} establishments with 0 communes")
        return zero_communes
    
    def export_to_csv(self, establishments: List[EstablishmentAnalysis], output_file: str):
        """
        Export establishments to CSV file.
        
        Args:
            establishments: List of establishments to export
            output_file: Output CSV file path
        """
        if not establishments:
            logger.info("✅ No establishments with 0 communes found!")
            return
        
        try:
            with open(output_file, 'w', newline='', encoding='utf-8') as csvfile:
                fieldnames = [
                    'old_name',
                    'new_name', 
                    'old_commune_count'
                ]
                
                writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
                writer.writeheader()
                
                for est in establishments:
                    writer.writerow({
                        'old_name': est.old_name or '',
                        'new_name': est.new_name or '',
                        'old_commune_count': est.old_commune_count or ''
                    })
            
            logger.info(f"📄 Exported {len(establishments)} establishments to {output_file}")
            
        except IOError as e:
            logger.error(f"❌ Error writing CSV file: {e}")
    
    def generate_summary_report(self, establishments: List[EstablishmentAnalysis]):
        """
        Generate a summary report of the analysis.
        
        Args:
            establishments: List of establishments to analyze
        """
        total_analyzed = len(self.establishments)
        zero_communes = len(establishments)
        name_changes = sum(1 for est in establishments if est.has_name_change)
        
        logger.info(f"\n📊 === ANALYSIS SUMMARY ===")
        logger.info(f"📖 Total establishments analyzed: {total_analyzed}")
        logger.info(f"🚨 Establishments with 0 communes: {zero_communes}")
        logger.info(f"📝 With name changes: {name_changes}")
        
        if zero_communes > 0:
            logger.info(f"📈 Percentage with 0 communes: {(zero_communes/total_analyzed)*100:.1f}%")
            
            # Show examples
            logger.info(f"\n🔍 === EXAMPLES OF ESTABLISHMENTS WITH 0 COMMUNES ===")
            for est in establishments[:5]:  # Show first 5
                logger.info(f"  • {est.name}")
                if est.has_name_change:
                    logger.info(f"    📝 Name: '{est.old_name}' → '{est.new_name}'")
                if est.old_commune_count is not None:
                    logger.info(f"    📐 Communes: {est.old_commune_count} → {est.new_commune_count}")
        else:
            logger.info("✅ No establishments with 0 communes found!")
    
    def analyze_all_issues(self) -> Dict[str, List[EstablishmentAnalysis]]:
        """
        Analyze all types of issues in the log.
        
        Returns:
            Dict with different categories of issues
        """
        issues = {
            'zero_communes': [],
            'name_changes': [],
            'commune_decreases': []
        }
        
        for est in self.establishments.values():
            if est.has_zero_communes:
                issues['zero_communes'].append(est)
            
            if est.has_name_change:
                issues['name_changes'].append(est)
            
            if (est.old_commune_count is not None and 
                est.new_commune_count is not None and
                est.new_commune_count < est.old_commune_count):
                issues['commune_decreases'].append(est)
        
        return issues

def main():
    """Main function."""
    parser = argparse.ArgumentParser(description='Analyze ZLV synchronization logs')
    parser.add_argument('log_file', help='Path to the log file to analyze')
    parser.add_argument('--output', '-o', default='establishments_zero_communes.csv',
                       help='Output CSV file (default: establishments_zero_communes.csv)')
    parser.add_argument('--all-issues', action='store_true',
                       help='Show analysis of all issues, not just zero communes')
    
    args = parser.parse_args()
    
    try:
        # Initialize analyzer
        analyzer = LogAnalyzer(args.log_file)
        
        # Parse log file
        establishments = analyzer.parse_log_file()
        
        if not establishments:
            logger.error("❌ No establishments found in log file")
            return
        
        if args.all_issues:
            # Analyze all issues
            issues = analyzer.analyze_all_issues()
            
            logger.info(f"\n🔍 === ALL ISSUES ANALYSIS ===")
            logger.info(f"🚨 Zero communes: {len(issues['zero_communes'])}")
            logger.info(f"📝 Name changes: {len(issues['name_changes'])}")
            logger.info(f"📉 Commune decreases: {len(issues['commune_decreases'])}")
            
            # Export zero communes
            if issues['zero_communes']:
                analyzer.export_to_csv(issues['zero_communes'], args.output)
        else:
            # Focus on zero communes only
            zero_communes = analyzer.filter_zero_communes()
            
            # Generate report
            analyzer.generate_summary_report(zero_communes)
            
            # Export to CSV
            analyzer.export_to_csv(zero_communes, args.output)
        
        logger.info(f"\n🎉 Analysis completed!")
        
    except KeyboardInterrupt:
        logger.info("⏹️ Analysis interrupted by user")
    except Exception as e:
        logger.error(f"❌ Error during analysis: {e}")
        exit(1)

if __name__ == "__main__":
    main()
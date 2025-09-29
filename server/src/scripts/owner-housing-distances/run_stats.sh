#!/bin/bash
# Script to run the statistics report with virtual environment

# Activate virtual environment
source venv/bin/activate

# Run the statistics script with passed arguments
python statistics_report.py "$@"
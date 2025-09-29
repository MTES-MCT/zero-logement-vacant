#!/bin/bash
# Script to run the model comparison with virtual environment

# Activate virtual environment
source venv/bin/activate

# Run the model comparison script with passed arguments
python model_comparison.py "$@"
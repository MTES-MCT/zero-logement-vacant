#!/bin/bash
# Script to run the best model selector with virtual environment

# Activate virtual environment
source venv/bin/activate

# Run the best model selector script with passed arguments
python best_model_selector.py "$@"
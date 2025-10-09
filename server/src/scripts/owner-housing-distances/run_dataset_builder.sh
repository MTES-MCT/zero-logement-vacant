#!/bin/bash
# Script to run the dataset builder with virtual environment

# Activate virtual environment
source venv/bin/activate

# Install additional dependencies if needed
pip install requests tqdm > /dev/null 2>&1

# Run the dataset builder script with passed arguments
python dataset_builder.py "$@"
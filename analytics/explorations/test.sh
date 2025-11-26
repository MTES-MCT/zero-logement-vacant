#!/bin/bash

# Script to create a file per establishment with list of owners
# Usage: ./create_owner_lists.sh input_file.csv

if [ $# -eq 0 ]; then
    echo "Usage: $0 <input_csv_file>"
    exit 1
fi

INPUT_FILE="$1"

if [ ! -f "$INPUT_FILE" ]; then
    echo "Error: File '$INPUT_FILE' not found!"
    exit 1
fi

OUTPUT_DIR="establishments_owners"
mkdir -p "$OUTPUT_DIR"

echo "Creating owner lists by establishment..."
echo "Input file: $INPUT_FILE"
echo "Output directory: $OUTPUT_DIR"
echo ""

# Use AWK to process and create files
awk -F'\t' '
NR==1 {
    # Store header positions
    for(i=1; i<=NF; i++) {
        if($i == "name") name_col=i
        if($i == "email") email_col=i
        if($i == "owner_id") owner_id_col=i
        if($i == "name_1") establishment_col=i
    }
    next
}
{
    establishment=$establishment_col
    owner_name=$name_col
    email=$email_col
    owner_id=$owner_id_col
    
    # Replace special characters in filename
    safe_name=establishment
    gsub(/[\/\\:*?"<>|]/, "_", safe_name)
    filename="'"$OUTPUT_DIR"'/" safe_name ".csv"
    
    # Write header if first time seeing this establishment
    if (!(establishment in seen)) {
        print "Owner Name,Email,Owner ID" > filename
        seen[establishment]=1
        count[establishment]=0
    }
    
    # Append owner information
    print owner_name "," email "," owner_id >> filename
    count[establishment]++
}
END {
    print "\n✓ Done! Created " length(seen) " files:\n"
    for (est in count) {
        print "  " est " → " count[est] " owners"
    }
}
' "$INPUT_FILE"

echo ""
echo "Files created in '$OUTPUT_DIR':"
ls -1 "$OUTPUT_DIR"
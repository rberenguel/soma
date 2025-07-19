#!/bin/bash
set -e

# --- Configuration ---
INPUT_DIR="inputs"
PLACEHOLDER_IMG="placeholder.png"
OUTPUT_IMG="grid.png"
# ---

# Grid and tile dimensions
COLS=16
ROWS=15
GEOMETRY="1300x980"
TOTAL_CELLS=$((COLS * ROWS))

# 1. Initialize an array with placeholders for every cell
echo "Initializing ${COLS}x${ROWS} grid with placeholders..."
montage_list=()
for (( i=0; i<TOTAL_CELLS; i++ )); do
    montage_list+=("$PLACEHOLDER_IMG")
done

# 2. Find source images (case-insensitive)
shopt -s nullglob nocaseglob
source_files=("$INPUT_DIR"/*.{jpg,jpeg,png})
shopt -u nullglob nocaseglob
echo "Found ${#source_files[@]} source images. Placing them in the grid by filename order..."

# 3. Iterate through found images and place them in the correct slot based on their number
for file in "${source_files[@]}"; do
    # Extract the leading number from the filename
    filename=$(basename "$file")
    if [[ "$filename" =~ ^([0-9]+) ]]; then
        num="${BASH_REMATCH[1]}"
        
        # Check if the number is within our grid size
        if [ "$num" -ge 1 ] && [ "$num" -le "$TOTAL_CELLS" ]; then
            # Array is 0-indexed, so place at num-1
            index=$((num - 1))
            montage_list[$index]="$file"
        fi
    fi
done

# 4. Generate the grid using ImageMagick
echo "Creating grid: $OUTPUT_IMG..."
montage "${montage_list[@]}" \
    -tile "${COLS}x" \
    -geometry "${GEOMETRY}+0+0" \
    "$OUTPUT_IMG"

convert -resize 50% grid.png grid_smaller.png
onvert -resize 50% grid_smaller.png grid_smallest.png

echo "Done."

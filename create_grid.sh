#!/bin/bash
set -e

# --- Configuration ---
INPUT_DIR="inputs"
PLACEHOLDER_IMG="placeholder.png"
OUTPUT_IMG="grid.png"
TMP_DIR="temp_placeholders"
FONT="monoid-regular.ttf"
FONT_COLOR="#666600"
# ---

# --- Grid and tile dimensions ---
COLS=16
ROWS=15
GEOMETRY="1300x980"
TOTAL_CELLS=$((COLS * ROWS))

# --- Automatically determine font size ---
# Heuristic: 1/6 of the placeholder's height. Adjust the divisor as needed.
PLACEHOLDER_HEIGHT=$(identify -format "%h" "$PLACEHOLDER_IMG")
FONT_SIZE=$(($PLACEHOLDER_HEIGHT / 6))

# --- Cleanup ---
trap 'rm -rf "$TMP_DIR"' EXIT
mkdir -p "$TMP_DIR"

# 1. Generate numbered placeholders for every cell
echo "Generating ${TOTAL_CELLS} numbered placeholders..."
montage_list=()
for (( i=1; i<=TOTAL_CELLS; i++ )); do
    numbered_placeholder="$TMP_DIR/placeholder_${i}.png"
    
    convert "$PLACEHOLDER_IMG" \
            -font "$FONT" \
            -pointsize "$FONT_SIZE" \
            -fill "$FONT_COLOR" \
            -gravity center \
            -annotate 0 "$i" \
            "$numbered_placeholder"
            
    montage_list[$((i-1))]="$numbered_placeholder"
done

# 2. Find source images (case-insensitive)
shopt -s nullglob nocaseglob
source_files=("$INPUT_DIR"/*.{jpg,jpeg,png})
shopt -u nullglob nocaseglob
echo "Found ${#source_files[@]} source images. Placing them in the grid..."

# 3. Iterate through found images and replace placeholders
for file in "${source_files[@]}"; do
    filename=$(basename "$file")
    if [[ "$filename" =~ ^([0-9]+) ]]; then
        num="${BASH_REMATCH[1]}"
        
        if [ "$num" -ge 1 ] && [ "$num" -le "$TOTAL_CELLS" ]; then
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

# 5. Create smaller versions
convert -resize 50% "$OUTPUT_IMG" "grid_smaller.png"
convert -resize 50% "grid_smaller.png" "grid_smallest.png"

echo "Done."
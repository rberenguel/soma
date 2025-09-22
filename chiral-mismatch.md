# Chiral Piece Color Mismatch Bug Analysis

## Symptom

When exporting a solved cube, the colors of the two chiral pieces (F, magenta and G, orange) are sometimes swapped in the generated PNG image. This doesn't happen consistently, but occurs roughly 50% of the time.

## Root Cause

The bug stems from a discrepancy between the grid data used for generating the solution's signature and the grid data used for rendering the export image.

1.  **Canonical Signature Generation**: The function `getCanonicalSignature` in `js/grid.js` is designed to find a single, canonical representation for any given solution to the Soma cube. It does this by generating 48 different orientations of the cube's 3D grid through rotations and reflections.

2.  **Chiral Swap on Reflection**: A key step in this process is handling the chiral pieces, F and G. When a grid is reflected, these two pieces must be swapped to maintain a valid Soma cube piece set. The `reflectAndSwapGrid` internal function handles this logic, using a `chiralSwapMap`.

3.  **Signature vs. Grid**: The function then calculates a string signature for each of the 48 grids (e.g., `flattenGrid`). It returns the lexicographically smallest signature as the canonical one. The issue is that this canonical signature might belong to a grid state where the chiral pieces have been swapped relative to the user's actual solution.

4.  **Export Mismatch**: The `exportCubeSolution` function in `js/export.js` receives two important pieces of data:
    *   The `solutionGrid`, which represents the user's physical arrangement of the pieces.
    *   The canonical signature, which is used for the filename and the text overlay.

    It then proceeds to render an image based on the original, unmodified `solutionGrid`. If the canonical signature was derived from a reflected-and-swapped grid, the signature and the rendered grid do not match. The signature implies F is in one position and G in another, but the image renders them based on their original placement, resulting in an apparent color swap.

## Proposed Solution

To fix this, the grid that corresponds to the canonical signature must be used for the export rendering.

1.  Modify `getCanonicalSignature` to return both the canonical signature **and** the corresponding 3D grid that generated it. The function should be renamed to `getCanonicalSignatureAndGrid` for clarity.

2.  Update the call sites in `js/soma.js` and `js/grid.js` to handle the new return format.

3.  When calling `exportCubeSolution`, pass the canonical grid returned by the new function instead of the original `solutionGrid`. This will ensure that the visual representation of the cube perfectly matches its canonical signature.

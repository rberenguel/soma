# Soma Cube Solution Tagging

This document explains the method used to generate a unique, canonical signature for any valid Soma cube solution. This signature allows us to determine if a new solution is genuinely unique or simply a rotation or reflection of a previously found solution.

## The Challenge: Symmetry and Chirality

A single solved Soma cube can be viewed from many different angles. The cube has 24 rotational symmetries. Furthermore, the puzzle contains two **chiral** pieces—pieces that are mirror images of each other. A simple geometric reflection of the entire cube would transform one chiral piece into the other.

To account for all 48 possible symmetric orientations (24 rotations and 24 reflections with chiral swaps), we need a method to normalize every view into a single, consistent representation.

## The Solution: Canonical Representation

The process involves generating all 48 possible orientations for a given solution and then selecting one of them as the "canonical" form based on a consistent rule. This canonical form is the solution's unique signature.

The algorithm is as follows:

1.  **Grid Representation**: The 3x3x3 solved cube is represented as a 3D array. Each cell in the array stores an identifier for the specific Soma piece that occupies it.

2.  **Generate Rotations**: For a given solution grid, we programmatically generate all 24 unique rotational views by applying a series of rotations around the X, Y, and Z axes.

3.  **Generate Reflected Orientations**:

    - A single mirror image of the grid is created by reflecting it along one axis.
    - Critically, the identifiers for the two chiral pieces are **swapped** within this reflected grid. This accounts for the fact that a reflection transforms one into the other.
    - The same 24 rotations from the previous step are then applied to this new, reflected-and-swapped grid.

4.  **Flatten to a String**: Each of the 48 generated 3D grids (24 from the original, 24 from the reflection) is "flattened" into a one-dimensional string of 27 characters. This is done by iterating through the grid in a fixed, predetermined order (e.g., along the Y-axis, then X, then Z).

5.  **Find the Canonical Signature**: We now have 48 different strings. These strings are sorted alphabetically (lexicographically), and the very first one in the sorted list is chosen.

This "smallest" string is the **canonical signature**. Because this process is deterministic, any valid solution, no matter its initial orientation, will always produce the exact same canonical signature. This allows for the robust cataloguing of the 240 unique Soma cube solutions.

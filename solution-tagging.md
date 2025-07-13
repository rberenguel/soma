# Soma Cube Solution Tagging

This document explains the method used to generate a unique, canonical signature for any valid Soma cube solution. This signature allows us to determine if a new solution is genuinely unique or simply a rotation or reflection of a previously found solution.

## The Challenge: Symmetry

A single solved Soma cube can be viewed from many different angles. The cube has 24 rotational symmetries and can also be reflected, resulting in 48 total symmetric orientations for any given solution. To catalogue unique solutions, we need a way to normalize all these different views into a single, consistent representation.

## The Solution: Canonical Representation

The process involves generating all 48 possible orientations for a given solution and then selecting one of them as the "canonical" form based on a consistent rule. This canonical form is the solution's unique signature.

The algorithm is as follows:

1.  **Grid Representation**: The 3x3x3 solved cube is represented as a 3D array. Each cell in the array stores an identifier for the specific Soma piece that occupies it. We assign a unique letter from 'A' to 'G' to each of the 7 pieces.

2.  **Generate Symmetries**: For any given solution grid, we programmatically generate all 48 symmetric grids:

    - **24 Rotations**: We apply a series of rotations around the X, Y, and Z axes to produce all possible rotational views of the cube.
    - **24 Reflections**: We take a mirror image (reflection) of the original grid and then apply the same 24 rotations to it.

3.  **Flatten to a String**: Each of the 48 generated 3D grids is "flattened" into a one-dimensional string of 27 characters. This is done by iterating through the grid in a fixed, predetermined order (e.g., Y, then X, then Z).

4.  **Find the Canonical Signature**: We now have 48 different strings, each representing the same solution from a different perspective. These strings are sorted alphabetically (lexicographically), and the very first one in the sorted list is chosen.

This "smallest" string is the **canonical signature**. Because this process is deterministic, any valid solution, no matter its initial orientation, will always produce the exact same canonical signature. This allows for robust and error-free cataloguing of the 240 unique Soma cube solutions.

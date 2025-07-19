# Soma Cube Solving Algorithm

The application includes a solver that can find all 240 unique solutions to the Soma cube. It uses an efficient backtracking algorithm combined with pre-computation to explore the search space.

## 1. Pre-computation: Piece Orientations

Before the search begins, the solver generates all possible unique 3D orientations for each of the 7 Soma pieces.

- For each piece, the 24 possible rotational orientations are generated.
- Duplicates are removed by normalizing each orientation (e.g., by sorting the coordinates of its blocks) and storing them in a `Set`.
- For each unique shape, multiple translated variants are created, centered on each of its constituent blocks.

This pre-computation prevents the solver from repeatedly calculating piece rotations during the main search, significantly speeding up the process.

## 2. The Backtracking Algorithm

The core of the solver is a recursive function that attempts to place pieces one by one into an empty 3x3x3 grid. This is a classic **backtracking** approach.

The algorithm can be summarized as: `solve(grid, pieces_to_place)`

1.  **Base Case**: If the list of `pieces_to_place` is empty, it means all 7 pieces have been successfully placed in the grid. A complete solution has been found. Its [canonical signature](./solution-tagging.md) is generated and stored in a master list of solutions. The function then returns.

2.  **Find an Empty Spot**: The algorithm scans the grid to find the first available empty cell. This provides a deterministic starting point for placing the next piece.

3.  **Recursive Step**: The algorithm iterates through the list of `pieces_to_place`. For each piece:
    a. It iterates through all of its pre-computed orientations.
    b. For each orientation, it checks if the piece **can be placed** at the current empty spot without overlapping existing pieces or going out of bounds.
    c. If it can be placed:
    i. **Place the piece**: The grid is updated with the new piece's blocks.
    ii. **Recurse**: The `solve` function is called again with the updated grid and the list of remaining pieces (the current piece is removed from the list passed to the next call).
    iii. **Backtrack**: After the recursive call returns (meaning it has either found a solution or exhausted all possibilities from that state), the piece is **removed** from the grid. This is the crucial backtracking step. It clears the way for the algorithm to try the next orientation or the next piece in the same spot.

By systematically placing and removing pieces, the algorithm explores all possible combinations until the entire search space has been covered, guaranteeing that all 240 unique solutions are found.

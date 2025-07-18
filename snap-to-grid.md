# Soma Cube Snap-to-Grid Logic

The intuitive "snap" functionality for placing pieces in the Soma cube is achieved through a combination of raycasting, a ghost piece for visual feedback, and grid-based coordinate rounding. Here's a breakdown of the process from the provided `soma.js` file.

### 1. Ghost Piece Creation

When a piece is first selected, the original piece becomes invisible. A semi-transparent clone, or "ghost piece," is created in its place. This ghost is what follows the cursor, showing a preview of the potential placement without changing the actual game state until the user confirms the move.

### 2. Raycasting for Position

As the user drags the piece, the application continuously fires a ray from the camera through the cursor's position into the 3D scene. This process, called **raycasting**, determines what object the cursor is pointing at.

The system checks for two types of intersections:

- Intersections with other pieces already in the puzzle area.
- Intersections with a large, invisible ground plane if no piece is hit.

### 3. Calculating the Snap Point

This is the core of the snapping effect. When the ray intersects the face of another cube:

- **Get Intersection Point & Normal**: The code retrieves the exact 3D point of intersection and the normal vector of the intersected face (a vector pointing directly away from the face).
- **Calculate Target Position**: The ideal placement for the ghost piece is calculated by taking the intersection point and shifting it outward along the normal vector by half a unit. This positions the ghost piece to be perfectly flush against the face it's targeting.
- **Round to the Grid**: The calculated target position is then rounded to the nearest whole number coordinates (e.g., `(2.1, 3.9, -1.05)` becomes `(2, 4, -1)`). This is the crucial step that forces the ghost piece to "snap" into the discrete cells of the 3x3x3 grid. It cannot exist in a "halfway" position.

### 4. Final Placement

When the user releases the piece (`pointerup`), the process is finalized:

- The original piece's position is instantly updated to the final, snapped position of the ghost piece.
- The ghost piece is removed from the scene, and the original piece is made visible again.

This combination of immediate visual feedback via the ghost piece and strict grid-based rounding creates a satisfying and precise placement experience.

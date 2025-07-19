// js/solver.js

export function initializeSolver(pieceDefs, pieces, helpers) {
  const { createNewGrid, rotateGrid, reflectGrid, flattenGrid, getCanonicalSignature } = helpers;

  function generateUniqueOrientations(shape) {
    const uniqueOrientations = new Set();
    let currentPoints = shape.map(p => ({ x: p[0], y: p[1], z: p[2] }));
    for (let cycle = 0; cycle < 2; cycle++) {
      for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
          for (let k = 0; k < 4; k++) {
            const min = currentPoints.reduce((acc, p) => ({
              x: Math.min(acc.x, p.x), y: Math.min(acc.y, p.y), z: Math.min(acc.z, p.z)
            }), { x: Infinity, y: Infinity, z: Infinity });
            const normalized = currentPoints.map(p => ({
              x: p.x - min.x, y: p.y - min.y, z: p.z - min.z
            }));
            normalized.sort((a, b) => a.x - b.x || a.y - b.y || a.z - b.z);
            uniqueOrientations.add(JSON.stringify(normalized));
            currentPoints = currentPoints.map(p => ({ x: p.x * 0 - p.y * 1, y: p.x * 1 + p.y * 0, z: p.z }));
          }
          currentPoints = currentPoints.map(p => ({ x: p.x * 0 + p.z * 1, y: p.y, z: p.x * -1 + p.z * 0 }));
        }
        currentPoints = currentPoints.map(p => ({ x: p.x, y: p.y * 0 - p.z * 1, z: p.y * 1 + p.z * 0 }));
      }
      currentPoints = currentPoints.map(p => ({ x: -p.x, y: p.y, z: p.z }));
    }
    return new Set(Array.from(uniqueOrientations).map(s => JSON.parse(s)));
  }

  function canPlace(grid, orientation, x, y, z) {
    for (const point of orientation) {
      const nX = x + point.x, nY = y + point.y, nZ = z + point.z;
      if (nX < 0 || nX >= 3 || nY < 0 || nY >= 3 || nZ < 0 || nZ >= 3 || grid[nX][nY][nZ] !== 0) {
        return false;
      }
    }
    return true;
  }

  function place(grid, orientation, pieceId, x, y, z) {
    orientation.forEach(p => { grid[x + p.x][y + p.y][z + p.z] = pieceId; });
  }

  function remove(grid, orientation, x, y, z) {
    orientation.forEach(p => { grid[x + p.x][y + p.y][z + p.z] = 0; });
  }

  //
  // --- CORE LOGIC FIX IS IN THIS FUNCTION ---
  //
  function solve(grid, piecesLeft, solutions) {
    if (piecesLeft.length === 0) {
      const tempGrid = createNewGrid();
      for(let x=0; x<3; x++) for(let y=0; y<3; y++) for(let z=0; z<3; z++) {
        if (grid[x][y][z] !== 0) {
          tempGrid[x][y][z] = pieces[grid[x][y][z] - 1];
        }
      }
      const signature = getCanonicalSignature(tempGrid);
      solutions.add(signature);
      return;
    }

    let x, y, z;
    let found = false;
    for (x = 0; x < 3; x++) { for (y = 0; y < 3; y++) { for (z = 0; z < 3; z++) {
      if (grid[x][y][z] === 0) { found = true; break; }
    } if (found) break; } if (found) break; }

    // **THE FIX:** Iterate over every available piece, not just the first one.
    for (let i = 0; i < piecesLeft.length; i++) {
      const pieceToTry = piecesLeft[i];
      // The remaining pieces are all pieces *except* the one we are about to try.
      const remainingPieces = piecesLeft.slice(0, i).concat(piecesLeft.slice(i + 1));

      for (const orientation of pieceToTry.orientations) {
        if (canPlace(grid, orientation, x, y, z)) {
          place(grid, orientation, pieceToTry.id, x, y, z);
          solve(grid, remainingPieces, solutions); // Recurse with the updated list of pieces
          remove(grid, orientation, x, y, z); // Backtrack
        }
      }
    }
  }

  console.log("Starting Soma solver...");
  const piecesToPlace = pieceDefs.map((def, i) => ({
      id: i + 1,
      orientations: generateUniqueOrientations(def.shape),
  }));

  const initialGrid = Array(3).fill(0).map(() => Array(3).fill(0).map(() => Array(3).fill(0)));
  const foundSolutions = new Set();
  
  solve(initialGrid, piecesToPlace, foundSolutions);

  const allSols = Array.from(foundSolutions).sort();
  console.log(`Solver finished. Found ${allSols.length} unique solutions.`);
  return allSols;
}
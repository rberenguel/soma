// js/solver.js

export function initializeSolver(pieceDefs, pieces, helpers) {
  const {
    createNewGrid,
    rotateGrid,
    reflectGrid,
    flattenGrid,
    getCanonicalSignature,
  } = helpers;

  function generateUniqueOrientations(shape) {
    const baseOrientations = new Set();
    const initialPoints = shape.map((p) => ({ x: p[0], y: p[1], z: p[2] }));

    // First, find the 24 unique rotational orientations
    const faceRotations = [
      (p) => p,
      (p) => p.map((pt) => ({ x: pt.x, y: -pt.z, z: pt.y })),
      (p) => p.map((pt) => ({ x: pt.x, y: -pt.y, z: -pt.z })),
      (p) => p.map((pt) => ({ x: pt.x, y: pt.z, z: -pt.y })),
      (p) => p.map((pt) => ({ x: pt.y, y: -pt.x, z: pt.z })),
      (p) => p.map((pt) => ({ x: -pt.y, y: pt.x, z: pt.z })),
    ];

    faceRotations.forEach((faceRot) => {
      let currentPoints = faceRot(initialPoints);
      for (let i = 0; i < 4; i++) {
        const sorted = [...currentPoints].sort(
          (a, b) => a.x - b.x || a.y - b.y || a.z - b.z,
        );
        baseOrientations.add(JSON.stringify(sorted));
        currentPoints = currentPoints.map((p) => ({ x: -p.z, y: p.y, z: p.x }));
      }
    });

    // Now, create the final list of orientations for the solver.
    // For each unique rotation, create variants centered on each of its blocks.
    const finalOrientations = new Set();
    const allOrientations = [];

    baseOrientations.forEach((o) => {
      const points = JSON.parse(o);
      points.forEach((anchor) => {
        const translated = points.map((p) => ({
          x: p.x - anchor.x,
          y: p.y - anchor.y,
          z: p.z - anchor.z,
        }));
        const signature = JSON.stringify(
          translated.sort((a, b) => a.x - b.x || a.y - b.y || a.z - b.z),
        );
        if (!finalOrientations.has(signature)) {
          finalOrientations.add(signature);
          allOrientations.push(translated);
        }
      });
    });

    return allOrientations;
  }
  function canPlace(grid, orientation, x, y, z) {
    for (const point of orientation) {
      const nX = x + point.x,
        nY = y + point.y,
        nZ = z + point.z;
      if (
        nX < 0 ||
        nX >= 3 ||
        nY < 0 ||
        nY >= 3 ||
        nZ < 0 ||
        nZ >= 3 ||
        grid[nX][nY][nZ] !== 0
      ) {
        return false;
      }
    }
    return true;
  }

  function place(grid, orientation, pieceId, x, y, z) {
    orientation.forEach((p) => {
      grid[x + p.x][y + p.y][z + p.z] = pieceId;
    });
  }

  function remove(grid, orientation, x, y, z) {
    orientation.forEach((p) => {
      grid[x + p.x][y + p.y][z + p.z] = 0;
    });
  }

  // In js/solver.js

  function solve(grid, piecesLeft, solutions) {
    if (piecesLeft.length === 0) {
      const tempGrid = createNewGrid();
      for (let x = 0; x < 3; x++)
        for (let y = 0; y < 3; y++)
          for (let z = 0; z < 3; z++) {
            if (grid[x][y][z] !== 0) {
              tempGrid[x][y][z] = pieces[grid[x][y][z] - 1];
            }
          }
      const signature = getCanonicalSignature(tempGrid);
      if (!solutions.has(signature)) {
        solutions.set(signature, tempGrid);
      }
      return;
    }

    let x, y, z;
    let found = false;
    for (x = 0; x < 3; x++) {
      for (y = 0; y < 3; y++) {
        for (z = 0; z < 3; z++) {
          if (grid[x][y][z] === 0) {
            found = true;
            break;
          }
        }
        if (found) break;
      }
      if (found) break;
    }

    for (let i = 0; i < piecesLeft.length; i++) {
      const pieceToTry = piecesLeft[i];
      const remainingPieces = piecesLeft
        .slice(0, i)
        .concat(piecesLeft.slice(i + 1));

      for (const orientation of pieceToTry.orientations) {
        if (canPlace(grid, orientation, x, y, z)) {
          place(grid, orientation, pieceToTry.id, x, y, z);
          solve(grid, remainingPieces, solutions);
          remove(grid, orientation, x, y, z);
        }
      }
    }
  }

  console.log("Starting Soma solver...");
  const piecesToPlace = pieceDefs.map((def, i) => ({
    id: i + 1,
    orientations: generateUniqueOrientations(def.shape),
  }));

  const initialGrid = Array(3)
    .fill(0)
    .map(() =>
      Array(3)
        .fill(0)
        .map(() => Array(3).fill(0)),
    );
  const foundSolutions = new Map(); // Use a Map instead of a Set

  solve(initialGrid, piecesToPlace, foundSolutions);

  const allSols = Array.from(foundSolutions.entries()).map(([sig, grid]) => ({
    signature: sig,
    grid: grid,
  }));
  console.log(`Solver finished. Found ${allSols.length} unique solutions.`);
  console.log(allSols);
  return allSols;
}

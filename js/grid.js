import * as THREE from "three";

export function updateGrid(pieces, solutionGrid) {
  solutionGrid.clear();
  let hasOverlap = false;

  for (const piece of pieces) {
    for (const cubeGroup of piece.children) {
      const worldPos = new THREE.Vector3();
      cubeGroup.getWorldPosition(worldPos);

      const gx = Math.round(worldPos.x);
      const gy = Math.round(worldPos.y);
      const gz = Math.round(worldPos.z);
      const key = `${gx},${gy},${gz}`;

      if (solutionGrid.has(key)) {
        hasOverlap = true;
      }
      solutionGrid.set(key, piece);
    }
  }
  // Note: Overlap detection is implicit. We can add explicit UI feedback later if needed.
}

export function checkWin(
  solutionGrid,
  gameMode,
  currentPuzzle,
  pieces,
  chiralSwapMap,
  allCanonicalSolutions,
) {
  const winMessage = document.getElementById("win-message");
  const mainText = document.getElementById("win-message-main-text");
  const solutionInfo = document.getElementById("solution-info");

  let isWin = false;

  if (gameMode === "CUBE") {
    let occupiedCount = 0;
    for (let x = -1; x <= 1; x++) {
      for (let y = 0; y <= 2; y++) {
        for (let z = -1; z <= 1; z++) {
          if (solutionGrid.has(`${x},${y},${z}`)) {
            occupiedCount++;
          }
        }
      }
    }
    if (occupiedCount === 27 && solutionGrid.size === 27) {
      isWin = true;
      mainText.innerHTML = "Congratulations!<br />You solved the cube!";
      solutionInfo.textContent = ""; // Clear previous

      if (allCanonicalSolutions && allCanonicalSolutions.length > 0) {
        const grid3d = createNewGrid();
        for (let x = -1; x <= 1; x++) {
          for (let y = 0; y <= 2; y++) {
            for (let z = -1; z <= 1; z++) {
              const key = `${x},${y},${z}`;
              if (solutionGrid.has(key)) {
                grid3d[x + 1][y][z + 1] = solutionGrid.get(key);
              }
            }
          }
        }
        const signature = getCanonicalSignature(grid3d, pieces, chiralSwapMap);
        const solutionIndex = allCanonicalSolutions.indexOf(signature);
        const solutionNumber = solutionIndex >= 0 ? solutionIndex + 1 : 0;
        solutionInfo.textContent = `Solution #${solutionNumber}/240: ${signature}`;
      }
    }
  } else if (currentPuzzle) {
    const puzzleGrid = currentPuzzle.grid;
    const offset = currentPuzzle.offset;
    const [width, height, depth] = [
      puzzleGrid.length,
      puzzleGrid[0].length,
      puzzleGrid[0][0].length,
    ];
    let targetCellCount = 0;
    let filledCorrectly = 0;

    for (let px = 0; px < width; px++) {
      for (let py = 0; py < height; py++) {
        for (let pz = 0; pz < depth; pz++) {
          if (puzzleGrid[px][py][pz] === 1) {
            targetCellCount++;
            // Transform puzzle file coordinates to world coordinates
            const vx = px - offset.x;
            const vy = py - offset.y;
            const vz = pz - offset.z;
            // Apply rotation
            const wx = vx;
            const wy = -vz;
            const wz = vy;

            if (solutionGrid.has(`${wx},${wy},${wz}`)) {
              filledCorrectly++;
            }
          }
        }
      }
    }

    if (
      filledCorrectly === targetCellCount &&
      solutionGrid.size === targetCellCount
    ) {
      isWin = true;
      mainText.innerHTML = "Congratulations!<br />You solved the puzzle!";
      solutionInfo.textContent = currentPuzzle.name;
    }
  }

  if (isWin) {
    winMessage.style.display = "block";
  } else {
    winMessage.style.display = "none";
  }
}

export function createNewGrid() {
  return Array(3)
    .fill(0)
    .map(() =>
      Array(3)
        .fill(0)
        .map(() => Array(3).fill(null)),
    );
}

export function rotateGrid(grid, axis) {
  const newGrid = createNewGrid();
  const N = 3;
  for (let x = 0; x < N; x++) {
    for (let y = 0; y < N; y++) {
      for (let z = 0; z < N; z++) {
        let nx, ny, nz;
        if (axis === "x") {
          nx = x;
          ny = z;
          nz = N - 1 - y;
        } else if (axis === "y") {
          nx = N - 1 - z;
          ny = y;
          nz = x;
        } else {
          nx = y;
          ny = N - 1 - x;
          nz = z;
        }
        newGrid[nx][ny][nz] = grid[x][y][z];
      }
    }
  }
  return newGrid;
}

export function reflectGrid(grid) {
  const newGrid = createNewGrid();
  const N = 3;
  for (let x = 0; x < N; x++) {
    for (let y = 0; y < N; y++) {
      for (let z = 0; z < N; z++) {
        newGrid[N - 1 - x][y][z] = grid[x][y][z];
      }
    }
  }
  return newGrid;
}

export function flattenGrid(grid, pieces) {
  let s = "";
  const pieceIdMap = new Map();
  pieces.forEach((p, i) =>
    pieceIdMap.set(p, String.fromCharCode("A".charCodeAt(0) + i)),
  );
  for (let y = 0; y < 3; y++) {
    for (let x = 0; x < 3; x++) {
      for (let z = 0; z < 3; z++) {
        const piece = grid[x][y][z];
        s += piece ? pieceIdMap.get(piece) : ".";
      }
    }
  }
  return s;
}

export function getCanonicalSignature(grid3d, pieces, chiralSwapMap) {
  const signatures = new Set();

  function reflectAndSwapGrid(g) {
    const newGrid = createNewGrid();
    const N = 3;
    for (let x = 0; x < N; x++) {
      for (let y = 0; y < N; y++) {
        for (let z = 0; z < N; z++) {
          newGrid[N - 1 - x][y][z] = g[x][y][z];
        }
      }
    }
    for (let x = 0; x < N; x++) {
      for (let y = 0; y < N; y++) {
        for (let z = 0; z < N; z++) {
          const piece = newGrid[x][y][z];
          if (chiralSwapMap.has(piece)) {
            newGrid[x][y][z] = chiralSwapMap.get(piece);
          }
        }
      }
    }
    return newGrid;
  }

  const gridsToCheck = [grid3d, reflectAndSwapGrid(grid3d)];

  gridsToCheck.forEach((initialGrid) => {
    const faceOrienters = [
      (g) => g,
      (g) => rotateGrid(g, "x"),
      (g) => rotateGrid(rotateGrid(g, "x"), "x"),
      (g) => rotateGrid(rotateGrid(rotateGrid(g, "x"), "x"), "x"),
      (g) => rotateGrid(g, "z"),
      (g) => rotateGrid(rotateGrid(rotateGrid(g, "z"), "z"), "z"),
    ];

    faceOrienters.forEach((orient) => {
      let currentGrid = orient(initialGrid);
      for (let i = 0; i < 4; i++) {
        signatures.add(flattenGrid(currentGrid, pieces));
        currentGrid = rotateGrid(currentGrid, "y");
      }
    });
  });

  return Array.from(signatures).sort()[0];
}

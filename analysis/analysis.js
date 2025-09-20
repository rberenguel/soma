// analysis.js

import { createNewGrid } from "../js/grid.js";

// --- HELPER FUNCTIONS FOR GRID MANIPULATION ---
// (These are needed to check all symmetric orientations)

function rotateGrid(grid, axis) {
  const newGrid = createNewGrid();
  const N = 3;
  for (let x = 0; x < N; x++) {
    for (let y = 0; y < N; y++) {
      for (let z = 0; z < N; z++) {
        let nx, ny, nz;
        if (axis === "x") {
          (nx = x), (ny = z), (nz = N - 1 - y);
        } else if (axis === "y") {
          (nx = N - 1 - z), (ny = y), (nz = x);
        } else {
          (nx = y), (ny = N - 1 - x), (nz = z);
        }
        newGrid[nx][ny][nz] = grid[x][y][z];
      }
    }
  }
  return newGrid;
}

function reflectAndSwapGrid(grid, chiralSwapMap) {
  const newGrid = createNewGrid();
  const N = 3;
  for (let x = 0; x < N; x++) {
    for (let y = 0; y < N; y++) {
      for (let z = 0; z < N; z++) {
        const originalPiece = grid[x][y][z];
        let finalPiece = originalPiece;
        if (chiralSwapMap.has(originalPiece)) {
          finalPiece = chiralSwapMap.get(originalPiece);
        }
        newGrid[N - 1 - x][y][z] = finalPiece;
      }
    }
  }
  return newGrid;
}

// --- CORE ANALYSIS FUNCTIONS (some are unchanged) ---

function signatureToGrid(signature, pieceIdMap) {
  const grid = createNewGrid();
  let i = 0;
  for (let y = 0; y < 3; y++) {
    for (let x = 0; x < 3; x++) {
      for (let z = 0; z < 3; z++) {
        const pieceChar = signature.charAt(i++);
        grid[x][y][z] = pieceIdMap.get(pieceChar) || null;
      }
    }
  }
  return grid;
}

/**
 * Corrected function to generate the meta-graph.
 * It now checks for swaps between a solution and all 48 symmetric orientations
 * of every other solution, fixing the core isomorphism testing flaw.
 */
export function generateMetaGraphFromGrids(
  allSolutions,
  graphClasses,
  pieces,
  chiralSwapMap,
) {
  console.log(
    "Generating meta-graph with DIRECT GRID COMPARISON (Corrected)...",
  );
  const metaGraph = new Map();
  const signatureToClassMap = new Map();
  graphClasses.forEach((signatures, label) => {
    signatures.forEach((sig) => signatureToClassMap.set(sig, label));
  });
  graphClasses.forEach((_, label) => metaGraph.set(label, []));

  const pieceNameMap = new Map(pieces.map((p) => [p, p.name]));

  for (let i = 0; i < allSolutions.length; i++) {
    for (let j = i + 1; j < allSolutions.length; j++) {
      const sol1 = allSolutions[i];
      const sol2 = allSolutions[j];
      const class1 = signatureToClassMap.get(sol1.signature);
      const class2 = signatureToClassMap.get(sol2.signature);

      if (class1 === class2) continue;

      let transformationFound = false;

      const gridsToTest = [
        sol2.grid,
        reflectAndSwapGrid(sol2.grid, chiralSwapMap),
      ];
      const faceOrienters = [
        (g) => g,
        (g) => rotateGrid(g, "x"),
        (g) => rotateGrid(rotateGrid(g, "x"), "x"),
        (g) => rotateGrid(rotateGrid(rotateGrid(g, "x"), "x"), "x"),
        (g) => rotateGrid(g, "z"),
        (g) => rotateGrid(rotateGrid(rotateGrid(g, "z"), "z"), "z"),
      ];

      for (const initialGrid of gridsToTest) {
        if (transformationFound) break;
        for (const orient of faceOrienters) {
          if (transformationFound) break;
          let currentGrid = orient(initialGrid);
          for (let k = 0; k < 4; k++) {
            currentGrid = rotateGrid(currentGrid, "y");

            const movedPieces = new Set();
            for (let x = 0; x < 3; x++) {
              for (let y = 0; y < 3; y++) {
                for (let z = 0; z < 3; z++) {
                  const piece1 = sol1.grid[x][y][z];
                  const piece2 = currentGrid[x][y][z];
                  if (piece1 !== piece2) {
                    if (piece1) movedPieces.add(pieceNameMap.get(piece1));
                    if (piece2) movedPieces.add(pieceNameMap.get(piece2));
                  }
                }
              }
            }

            if (movedPieces.size === 2 || movedPieces.size === 3) {
              const edgeLabel = Array.from(movedPieces).sort().join(",");
              if (!metaGraph.get(class1).some((e) => e.to === class2)) {
                metaGraph.get(class1).push({ to: class2, pieces: edgeLabel });
                metaGraph.get(class2).push({ to: class1, pieces: edgeLabel });
              }
              transformationFound = true;
              break;
            }
          }
        }
      }
    }
  }
  console.log("Meta-graph generation from grids complete.");
  return metaGraph;
}

export function generateGraphFromSignature(signature, pieces) {
  const pieceIdMap = new Map();
  const pieceCharMap = new Map();
  pieces.forEach((p, i) => {
    const char = String.fromCharCode("A".charCodeAt(0) + i);
    pieceIdMap.set(char, p);
    pieceCharMap.set(p, char);
  });

  const grid = signatureToGrid(signature, pieceIdMap);
  const graph = {};
  pieces.forEach((p) => (graph[pieceCharMap.get(p)] = new Set()));

  const DIRS = [
    [1, 0, 0],
    [-1, 0, 0],
    [0, 1, 0],
    [0, -1, 0],
    [0, 0, 1],
    [0, 0, -1],
  ];

  for (let x = 0; x < 3; x++) {
    for (let y = 0; y < 3; y++) {
      for (let z = 0; z < 3; z++) {
        const piece1 = grid[x][y][z];
        if (!piece1) continue;
        for (const [dx, dy, dz] of DIRS) {
          const nx = x + dx,
            ny = y + dy,
            nz = z + dz;
          if (nx >= 0 && nx < 3 && ny >= 0 && ny < 3 && nz >= 0 && nz < 3) {
            const piece2 = grid[nx][ny][nz];
            if (piece2 && piece1 !== piece2) {
              const id1 = pieceCharMap.get(piece1);
              const id2 = pieceCharMap.get(piece2);
              graph[id1].add(id2);
              graph[id2].add(id1);
            }
          }
        }
      }
    }
  }

  const finalGraph = {};
  for (const piece in graph) {
    finalGraph[piece] = Array.from(graph[piece]).sort();
  }
  return finalGraph;
}

export function getGraphCanonicalLabel(graph) {
  const PIECE_F = "F";
  const PIECE_G = "G";

  const getBestLabelForGraph = (g) => {
    let bestString = null;
    const nodes = Object.keys(g).sort();

    function permute(arr) {
      if (arr.length === 0) return [[]];
      const firstEl = arr[0];
      const rest = arr.slice(1);
      const permsWithoutFirst = permute(rest);
      const allPermutations = [];
      permsWithoutFirst.forEach((perm) => {
        for (let i = 0; i <= perm.length; i++) {
          const permWithFirst = [
            ...perm.slice(0, i),
            firstEl,
            ...perm.slice(i),
          ];
          allPermutations.push(permWithFirst);
        }
      });
      return allPermutations;
    }

    const permutations = permute(nodes);

    for (const p of permutations) {
      const mapping = new Map(nodes.map((n, i) => [n, p[i]]));
      const newGraph = {};
      for (const originalNode of nodes) {
        const newNode = mapping.get(originalNode);
        newGraph[newNode] = g[originalNode].map((n) => mapping.get(n)).sort();
      }

      let currentString = "";
      Object.keys(newGraph)
        .sort()
        .forEach((node) => {
          currentString += `${node}:${newGraph[node].join("")};`;
        });

      if (bestString === null || currentString < bestString) {
        bestString = currentString;
      }
    }
    return bestString;
  };

  const label1 = getBestLabelForGraph(graph);
  const swappedGraph = {};
  for (const node in graph) {
    let newNode = node;
    if (node === PIECE_F) newNode = PIECE_G;
    if (node === PIECE_G) newNode = PIECE_F;

    swappedGraph[newNode] = graph[node].map((neighbor) => {
      if (neighbor === PIECE_F) return PIECE_G;
      if (neighbor === PIECE_G) return PIECE_F;
      return neighbor;
    });
  }
  const label2 = getBestLabelForGraph(swappedGraph);
  return label1 < label2 ? label1 : label2;
}

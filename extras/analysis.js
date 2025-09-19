// analysis.js
import { createNewGrid } from "../js/grid.js";

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
  pieces.forEach((p) => {
    graph[pieceCharMap.get(p)] = new Set();
  });

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

// --- NEW FUNCTION TO FIND THE CANONICAL GRAPH LABEL ---
export function getGraphCanonicalLabel(graph) {
  const nodes = Object.keys(graph).sort();
  let canonicalString = null;

  // 1. A simple permutation generator
  function permute(arr, memo = []) {
    let result = [];
    for (let i = 0; i < arr.length; i++) {
      let cur = arr.splice(i, 1);
      if (arr.length === 0) {
        result.push(memo.concat(cur));
      }
      result = result.concat(permute(arr.slice(), memo.concat(cur)));
      arr.splice(i, 0, cur[0]);
    }
    return result;
  }

  const permutations = permute(nodes);

  // 2. For each permutation, relabel the graph and generate a string
  for (const p of permutations) {
    const mapping = new Map(nodes.map((n, i) => [n, p[i]]));
    const newGraph = {};

    // Relabel the vertices
    for (const originalNode of nodes) {
      const newNode = mapping.get(originalNode);
      const newNeighbors = graph[originalNode]
        .map((n) => mapping.get(n))
        .sort();
      newGraph[newNode] = newNeighbors;
    }

    // 3. Generate a consistent, sorted string representation
    let currentString = "";
    const sortedNewNodes = Object.keys(newGraph).sort();
    for (const node of sortedNewNodes) {
      currentString += `${node}:${newGraph[node].join("")};`;
    }

    // 4. Keep the lexicographically smallest string
    if (canonicalString === null || currentString < canonicalString) {
      canonicalString = currentString;
    }
  }
  return canonicalString;
}

export function generateMetaGraph(allSolutions, graphClasses, pieces) {
  console.log("Generating meta-graph based on 2-piece moves...");
  const metaGraph = new Map();

  const signatureToClassMap = new Map();
  graphClasses.forEach((signatures, label) => {
    signatures.forEach((sig) => signatureToClassMap.set(sig, label));
  });

  graphClasses.forEach((_, label) => metaGraph.set(label, []));

  const pieceChars = pieces.map((_, i) =>
    String.fromCharCode("A".charCodeAt(0) + i),
  );

  const getCoordMaps = (signature) => {
    const maps = {};
    pieceChars.forEach((p) => (maps[p] = []));
    for (let k = 0; k < 27; k++) {
      const char = signature.charAt(k);
      if (char !== ".") {
        const x = Math.floor(k / 9) % 3;
        const y = k % 3;
        const z = Math.floor(k / 3) % 3;
        maps[char].push(`${x},${y},${z}`);
      }
    }
    pieceChars.forEach((p) => maps[p].sort());
    return maps;
  };

  for (let i = 0; i < allSolutions.length; i++) {
    for (let j = i + 1; j < allSolutions.length; j++) {
      const sig1 = allSolutions[i];
      const sig2 = allSolutions[j];

      const coords1 = getCoordMaps(sig1);
      const coords2 = getCoordMaps(sig2);

      const changedPieces = [];
      for (const piece of pieceChars) {
        if (coords1[piece].join(";") !== coords2[piece].join(";")) {
          changedPieces.push(piece);
        }
      }

      // --- THE CRITICAL CHANGE IS HERE ---
      // An edge is a transition involving the minimum of 2 pieces.
      if (changedPieces.length === 2) {
        const movedPieces = changedPieces.sort(); // e.g., ['A', 'C']
        const class1 = signatureToClassMap.get(sig1);
        const class2 = signatureToClassMap.get(sig2);

        if (class1 !== class2) {
          const edgeLabel = movedPieces.join(",");
          if (
            !metaGraph
              .get(class1)
              .some((e) => e.to === class2 && e.pieces === edgeLabel)
          ) {
            metaGraph.get(class1).push({ to: class2, pieces: edgeLabel });
          }
          if (
            !metaGraph
              .get(class2)
              .some((e) => e.to === class1 && e.pieces === edgeLabel)
          ) {
            metaGraph.get(class2).push({ to: class1, pieces: edgeLabel });
          }
        }
      }
    }
  }
  console.log("Meta-graph generation complete.");
  console.log(metaGraph);
  return metaGraph;
}

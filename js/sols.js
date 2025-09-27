import * as THREE from "three";
import { pieceDefs } from "./config.js";
import {
  createNewGrid,
  rotateGrid,
  reflectGrid,
  flattenGrid,
  getCanonicalSignature,
  getCanonicalSignatureAndGrid,
} from "./grid.js";
import { initializeSolver } from "./solver.js";

// This is a modified, offline version of the export function.
// It returns a data URL instead of triggering a download directly.
function getSolutionImageData(
  solutionGrid,
  signature,
  solutionNumber,
  allCanonicalSignatures,
) {
  const gridSize = 3;
  const cellSize = 100;
  const padding = Math.round(cellSize / 5);
  const fontSize = Math.max(12, Math.round(cellSize * 0.32));
  const lineWidth = Math.max(1, Math.round(cellSize / 25));

  const canvas = document.createElement("canvas");
  canvas.width = gridSize * cellSize * 4 + padding * 5;
  canvas.height = gridSize * cellSize * 3 + padding * 4;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#01171c";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const faceLayout = {
    top: { x: 1, y: 0 },
    left: { x: 0, y: 1 },
    front: { x: 1, y: 1 },
    right: { x: 2, y: 1 },
    back: { x: 3, y: 1 },
    bottom: { x: 1, y: 2 },
  };

  const faces = {
    top: [],
    front: [],
    bottom: [],
    left: [],
    right: [],
    back: [],
  };
  for (let i = 0; i < gridSize; i++) {
    Object.values(faces).forEach((face) =>
      face.push(new Array(gridSize).fill(null)),
    );
  }

  for (let x = 0; x < gridSize; x++) {
    for (let y = 0; y < gridSize; y++) {
      for (let z = 0; z < gridSize; z++) {
        const piece = solutionGrid[x][y][z];
        if (!piece) continue;
        const color =
          "#" + piece.children[0].children[0].material.color.getHexString();
        if (y === gridSize - 1) faces.top[z][x] = color;
        if (y === 0) faces.bottom[2 - z][x] = color;
        if (z === gridSize - 1) faces.front[2 - y][x] = color;
        if (z === 0) faces.back[2 - y][2 - x] = color;
        if (x === gridSize - 1) faces.right[2 - y][2 - z] = color;
        if (x === 0) faces.left[2 - y][z] = color;
      }
    }
  }

  for (const faceName in faces) {
    const faceGrid = faces[faceName];
    const layout = faceLayout[faceName];
    const startX = layout.x * (gridSize * cellSize + padding) + padding;
    const startY = layout.y * (gridSize * cellSize + padding) + padding;
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        ctx.fillStyle = faceGrid[r][c] || "#ffffff";
        ctx.fillRect(
          startX + c * cellSize,
          startY + r * cellSize,
          cellSize,
          cellSize,
        );
        ctx.strokeStyle = "#073642";
        ctx.lineWidth = lineWidth;
        ctx.strokeRect(
          startX + c * cellSize,
          startY + r * cellSize,
          cellSize,
          cellSize,
        );
      }
    }
  }

  const textGridSlotX = 0;
  const textGridSlotY = 0;
  const textX =
    textGridSlotX * (gridSize * cellSize + padding) +
    padding +
    gridSize * cellSize * 3 +
    cellSize / 2;
  const textY =
    textGridSlotY * (gridSize * cellSize + padding) +
    padding +
    (gridSize * cellSize) / 2;
  ctx.fillStyle = "#93a1a1";
  ctx.font = `${fontSize}px monoidregular`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(signature, textX, textY);

  return canvas.toDataURL("image/png");
}

const exportButton = document.getElementById("export-all-button");
const statusElement = document.getElementById("status");

async function exportAllSolutions() {
  exportButton.disabled = true;
  statusElement.textContent = "Initializing...";

  // 1. Initialize Three.js pieces exactly as soma.js does.
  const pieces = pieceDefs.map((p) => {
    const group = new THREE.Group();
    const material = new THREE.MeshStandardMaterial({ color: p.color });
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const mesh = new THREE.Mesh(geo, material);
    const innerGroup = new THREE.Group();
    innerGroup.add(mesh);
    group.add(innerGroup);
    return group;
  });

  // 2. Create the chiralSwapMap with the CORRECT indices (5 and 6).
  const chiralSwapMap = new Map([
    [pieces[5], pieces[6]],
    [pieces[6], pieces[5]],
  ]);

  // 3. Create the solver helpers using the wrapper pattern from analysis/main.js
  const solverHelpers = {
    createNewGrid,
    rotateGrid,
    reflectGrid,
    flattenGrid: (grid) => flattenGrid(grid, pieces),
    getCanonicalSignature: (grid) =>
      getCanonicalSignature(grid, pieces, chiralSwapMap),
    getCanonicalSignatureAndGrid: (grid) =>
      getCanonicalSignatureAndGrid(grid, pieces, chiralSwapMap),
  };

  statusElement.textContent = "Solving... This may take a moment.";

  setTimeout(() => {
    // 4. Run the solver to get all solutions.
    const allSolutions = initializeSolver(pieceDefs, pieces, solverHelpers);

    if (allSolutions.length !== 240) {
      statusElement.textContent = `Error: Solver found ${allSolutions.length} solutions, but expected 240. Aborting.`;
      exportButton.disabled = false;
      return;
    }

    statusElement.textContent = `Found 240 solutions. Generating images...`;

    const zip = new JSZip();
    const allCanonicalSignatures = allSolutions.map((s) => s.signature);

    // 5. Generate all images in memory.
    allSolutions.forEach((solution, index) => {
      const solutionNumber = index + 1;
      const dataUrl = getSolutionImageData(
        solution.grid,
        solution.signature,
        solutionNumber,
        allCanonicalSignatures,
      );
      const imageData = dataUrl.split(",")[1];
      zip.file(`${solutionNumber}-${solution.signature}.png`, imageData, {
        base64: true,
      });
    });

    statusElement.textContent = "Creating ZIP file...";

    // 6. Generate and download the ZIP file.
    zip.generateAsync({ type: "blob" }).then(function (content) {
      const link = document.createElement("a");
      link.href = URL.createObjectURL(content);
      link.download = "soma-solutions.zip";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
      statusElement.textContent = "Export complete!";
      exportButton.disabled = false;
    });
  }, 10);
}

exportButton.addEventListener("click", exportAllSolutions);

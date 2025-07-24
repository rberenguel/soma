import * as THREE from "three";
import { createNewGrid } from "./grid.js";

async function exportCubeSolution(
  solutionGrid,
  getCanonicalSignature,
  allCanonicalSolutions,
) {
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

  const gridSize = 3;
  const cellSize = 100;
  const padding = Math.round(cellSize / 5);
  const fontSize = Math.max(12, Math.round(cellSize * 0.32));
  const lineWidth = Math.max(1, Math.round(cellSize / 25));
  const signature = getCanonicalSignature(grid3d);
  const solutionIndex = allCanonicalSolutions.indexOf(signature);
  const solutionNumber = solutionIndex + 1;
  try {
    await document.fonts.load(`${fontSize}px monoidregular`);
  } catch (e) {
    console.error("Font could not be loaded:", e);
  }
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
    faces.top.push(new Array(gridSize).fill(null));
    faces.front.push(new Array(gridSize).fill(null));
    faces.bottom.push(new Array(gridSize).fill(null));
    faces.left.push(new Array(gridSize).fill(null));
    faces.right.push(new Array(gridSize).fill(null));
    faces.back.push(new Array(gridSize).fill(null));
  }
  for (let x = 0; x < gridSize; x++) {
    for (let y = 0; y < gridSize; y++) {
      for (let z = 0; z < gridSize; z++) {
        const piece = grid3d[x][y][z];
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
  const link = document.createElement("a");
  const filename =
    solutionNumber > 0
      ? `${solutionNumber}-${signature}.png`
      : `0-${signature}.png`;
  link.download = `${filename}`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

function exportPuzzleSolution(scene, renderer, currentPuzzle) {
  const tempCamera = new THREE.PerspectiveCamera(
    30,
    window.innerWidth / window.innerHeight,
    0.1,
    1000,
  );
  tempCamera.position.set(10, 7, 10);
  tempCamera.lookAt(scene.position);

  renderer.render(scene, tempCamera);

  const canvas = document.createElement("canvas");
  const canvasSize = 1024;
  canvas.width = canvasSize;
  canvas.height = canvasSize;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(renderer.domElement, 0, 0, canvasSize, canvasSize);

  ctx.fillStyle = "#93a1a1";
  ctx.font = `bold 48px "Inter"`;
  ctx.textAlign = "center";
  ctx.fillText(currentPuzzle.name, canvasSize / 2, 60);

  const link = document.createElement("a");
  link.download = `${currentPuzzle.name}-solution.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

export function exportSolution(
  gameMode,
  solutionGrid,
  getCanonicalSignature,
  allCanonicalSolutions,
  scene,
  renderer,
  currentPuzzle,
) {
  if (gameMode === "PUZZLE") {
    exportPuzzleSolution(scene, renderer, currentPuzzle);
  } else {
    exportCubeSolution(
      solutionGrid,
      getCanonicalSignature,
      allCanonicalSolutions,
    );
  }
}

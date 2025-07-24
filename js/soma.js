import * as THREE from "three";
import { initializeSolver } from "./solver.js";
import { loadPuzzles } from "./puzzles.js";
import { pieceDefs } from "./config.js";
import { createSomaPieces } from "./pieces.js";
import {
  updateGrid,
  checkWin,
  createNewGrid,
  rotateGrid,
  reflectGrid,
  flattenGrid,
  getCanonicalSignature,
} from "./grid.js";
import {
  generatePuzzleWireframe,
  setupPreview,
  renderPreview,
  populatePuzzleList,
} from "./puzzle.js";
import { initializeUI, restartGame } from "./ui.js";
import { exportSolution } from "./export.js";
import { initializeTrackball } from "./trackball.js";
import { initializeInteractions, getRotationTarget } from "./interactions.js";

let allCanonicalSolutions = [];
let placementPlane = null;
const container = document.getElementById("container");
let scene, camera, renderer;
let raycaster, pointer;

const pieces = [];
let chiralSwapMap;

let solutionGrid = new Map();
let targetWireframe;

let gameMode = "CUBE"; // 'CUBE' or 'PUZZLE'
let currentPuzzle = null;
let puzzles = [];

async function init() {
  puzzles = await loadPuzzles();
  setupPreview();
  populatePuzzleList(puzzles);

  const savedPuzzle = sessionStorage.getItem("selectedPuzzle");
  if (savedPuzzle) {
    currentPuzzle = JSON.parse(savedPuzzle);
    gameMode = "PUZZLE";
  }

  setupGame();
}

function setupGame() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x01171c);

  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000,
  );
  camera.position.set(8, 8, 12);
  camera.lookAt(scene.position);
  camera.position.setLength(15);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  container.appendChild(renderer.domElement);

  raycaster = new THREE.Raycaster();
  pointer = new THREE.Vector2();

  const ambientLight = new THREE.AmbientLight(0x93a1a1, 5.8);
  scene.add(ambientLight);
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight.position.set(10, 20, 5);
  scene.add(dirLight);

  if (gameMode === "PUZZLE") {
    const { puzzleGroup, offset } = generatePuzzleWireframe(currentPuzzle.grid);
    targetWireframe = puzzleGroup;
    currentPuzzle.offset = offset; // Store the offset
    const winMessage = document.getElementById("win-message");
    winMessage.innerHTML = `Congratulations!<br />You solved the puzzle!
      <button id="hide-btn">Hide this</button>
      <button id="export-btn">Export solution</button>
      <button id="restart-btn" class="rot-btn">Restart</button>`;
  } else {
    const targetGeometry = new THREE.BoxGeometry(3, 3, 3);
    const edges = new THREE.EdgesGeometry(targetGeometry);
    targetWireframe = new THREE.LineSegments(
      edges,
      new THREE.LineBasicMaterial({ color: 0x586e75 }),
    );
    targetWireframe.position.set(0, 1, 0);
  }
  scene.add(targetWireframe);

  const planeGeo = new THREE.PlaneGeometry(100, 100);
  const planeMat = new THREE.MeshBasicMaterial({
    visible: false,
    side: THREE.DoubleSide,
  });
  placementPlane = new THREE.Mesh(planeGeo, planeMat);
  placementPlane.rotation.x = -Math.PI / 2;
  scene.add(placementPlane);

  const createdPieces = createSomaPieces(scene);
  pieces.push(...createdPieces);

  chiralSwapMap = new Map([
    [pieces[5], pieces[6]],
    [pieces[6], pieces[5]],
  ]);

  if (gameMode === "CUBE") {
    const solverHelpers = {
      createNewGrid,
      rotateGrid,
      reflectGrid,
      flattenGrid: (grid) => flattenGrid(grid, pieces),
      getCanonicalSignature: (grid) =>
        getCanonicalSignature(grid, pieces, chiralSwapMap),
    };
    const solutionsCacheKey = "somaSolutions_v1";
    try {
      const cachedSolutions = localStorage.getItem(solutionsCacheKey);
      if (cachedSolutions) {
        allCanonicalSolutions = JSON.parse(cachedSolutions);
      } else {
        allCanonicalSolutions = initializeSolver(
          pieceDefs,
          pieces,
          solverHelpers,
        );
        localStorage.setItem(
          solutionsCacheKey,
          JSON.stringify(allCanonicalSolutions),
        );
      }
    } catch (e) {
      console.error("Could not use localStorage. Re-computing solutions.", e);
      allCanonicalSolutions = initializeSolver(
        pieceDefs,
        pieces,
        solverHelpers,
      );
    }
  }

  const boundUpdateGrid = () => updateGrid(pieces, solutionGrid);
  const boundCheckWin = () => checkWin(solutionGrid, gameMode, currentPuzzle);
  const boundExport = () =>
    exportSolution(
      gameMode,
      solutionGrid,
      (grid) => getCanonicalSignature(grid, pieces, chiralSwapMap),
      allCanonicalSolutions,
      scene,
      renderer,
      currentPuzzle,
    );
  const boundRestart = () =>
    restartGame(pieces, boundUpdateGrid, boundCheckWin);

  boundUpdateGrid();
  boundCheckWin();

  initializeInteractions(
    scene,
    camera,
    renderer,
    raycaster,
    pointer,
    pieces,
    targetWireframe,
    placementPlane,
    boundUpdateGrid,
    boundCheckWin,
    boundExport,
  );

  initializeUI(boundExport, boundRestart, puzzles);

  initializeTrackball(getRotationTarget, () => scene, boundUpdateGrid);

  animate();
}

function animate() {
  requestAnimationFrame(animate);
  renderPreview();
  renderer.render(scene, camera);
}

init();

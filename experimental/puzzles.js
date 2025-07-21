import { loadPuzzles } from "../js/puzzles.js";

let scene, camera, renderer;
let pointerStartPos = { x: 0, y: 0 };
let isRotatingCamera = false;
let currentPuzzleIndex = 0;
let currentPuzzleGroup = new THREE.Group();
let PUZZLES = [];

const puzzleNameEl = document.getElementById("puzzle-name");
const container = document.getElementById("container");

async function main() {
  PUZZLES = await loadPuzzles();
  if (PUZZLES.length > 0) {
    init();
  } else {
    puzzleNameEl.innerText = "No puzzles found or error loading.";
  }
}

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x01171c);

  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000,
  );
  camera.position.set(10, 7, 10);
  camera.lookAt(scene.position);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  container.appendChild(renderer.domElement);

  const ambientLight = new THREE.AmbientLight(0x93a1a1, 1.0);
  scene.add(ambientLight);
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.4);
  dirLight.position.set(10, 20, 5);
  scene.add(dirLight);

  addEventListeners();
  displayPuzzle();
  animate();
}

function generatePuzzleWireframe(grid) {
  const puzzleGroup = new THREE.Group();
  const lineMaterial = new THREE.LineBasicMaterial({ color: 0x586e75 });
  const [width, height, depth] = [
    grid.length,
    grid[0].length,
    grid[0][0].length,
  ];

  const barycenter = new THREE.Vector3(0, 0, 0);
  let cubeCount = 0;

  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      for (let z = 0; z < depth; z++) {
        if (grid[x][y][z] === 1) {
          barycenter.add(new THREE.Vector3(x, y, z));
          cubeCount++;
        }
      }
    }
  }

  if (cubeCount > 0) {
    barycenter.divideScalar(cubeCount);
  }

  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      for (let z = 0; z < depth; z++) {
        if (grid[x][y][z] === 1) {
          const cubeGeo = new THREE.BoxGeometry(1, 1, 1);
          const edges = new THREE.EdgesGeometry(cubeGeo);
          const line = new THREE.LineSegments(edges, lineMaterial);

          line.position.set(
            x - barycenter.x,
            y - barycenter.y,
            z - barycenter.z,
          );

          puzzleGroup.add(line);
        }
      }
    }
  }

  puzzleGroup.rotation.x = Math.PI / 2;

  return puzzleGroup;
}

function displayPuzzle() {
  if (currentPuzzleGroup) {
    scene.remove(currentPuzzleGroup);
  }
  const puzzleData = PUZZLES[currentPuzzleIndex];
  puzzleNameEl.innerText = puzzleData.name;
  currentPuzzleGroup = generatePuzzleWireframe(puzzleData.grid);
  scene.add(currentPuzzleGroup);
}

function addEventListeners() {
  document.getElementById("next-btn").addEventListener("click", () => {
    currentPuzzleIndex = (currentPuzzleIndex + 1) % PUZZLES.length;
    displayPuzzle();
  });

  document.getElementById("prev-btn").addEventListener("click", () => {
    currentPuzzleIndex = (currentPuzzleIndex - 1 + PUZZLES.length) % PUZZLES.length;
    displayPuzzle();
  });

  container.addEventListener("wheel", (event) => {
    event.preventDefault();
    const newLength = camera.position.length() * (1 + event.deltaY * 0.001);
    camera.position.setLength(Math.max(2, Math.min(25, newLength)));
  });

  container.addEventListener("pointerdown", (event) => {
    isRotatingCamera = true;
    pointerStartPos.x = event.clientX;
    pointerStartPos.y = event.clientY;
  });

  container.addEventListener("pointermove", (event) => {
    if (!isRotatingCamera) return;
    const deltaX = event.clientX - pointerStartPos.x;
    const deltaY = event.clientY - pointerStartPos.y;
    pointerStartPos.x = event.clientX;
    pointerStartPos.y = event.clientY;

    const sensitivity = 0.004;
    const worldUp = new THREE.Vector3(0, 1, 0);

    camera.position.applyAxisAngle(worldUp, -deltaX * sensitivity);
    const right = new THREE.Vector3()
      .crossVectors(camera.up, camera.getWorldDirection(new THREE.Vector3()).negate())
      .normalize();
    camera.position.applyAxisAngle(right, -deltaY * sensitivity);
    camera.lookAt(scene.position);
  });

  container.addEventListener("pointerup", () => {
    isRotatingCamera = false;
  });
  container.addEventListener("pointerleave", () => {
    isRotatingCamera = false;
  });
}

function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}

main();

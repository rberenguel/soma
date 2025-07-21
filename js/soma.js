import { initializeSolver } from "./solver.js";
import { loadPuzzles } from "./puzzles.js";

let allCanonicalSolutions = [];
let ghostPiece = null;
let placementPlane = null;
let lastSelectedPiece = null;
const container = document.getElementById("container");
const infoPanel = document.getElementById("info");
const blur = document.getElementById("blur");
const puzzlePanel = document.getElementById("puzzle-panel");
let scene, camera, renderer;
let raycaster, pointer;

let isPinching = false;
let pinchStartDistance = 0;
let pinchStartCameraLength = 0;
const activePointers = [];
const MIN_ZOOM = 4;
const MAX_ZOOM = 25;

const pieces = [];
let chiralSwapMap;
const gridUnit = 1;
let selectedPiece = null;
const baseEmissive = new THREE.Color(0x000000);
const highlightEmissive = new THREE.Color(0xb58900);

let pointerStartPos = { x: 0, y: 0 };
let pieceStartPos = new THREE.Vector3();
let isDragging = false;
let isRotatingCamera = false;

let solutionGrid = new Map();
let targetWireframe;

let gameMode = "CUBE"; // 'CUBE' or 'PUZZLE'
let currentPuzzle = null;
let puzzles = [];
let previewRenderer, previewScene, previewCamera, previewWireframe;

const pieceDefs = [
  {
    color: 0x268bd2,
    shape: [
      [0, 0, 0],
      [1, 0, 0],
      [0, 1, 0],
    ],
    pivot: [0, 0, 0],
  }, // V-piece (Blue)
  {
    color: 0x6c71c4,
    shape: [
      [0, 0, 0],
      [1, 0, 0],
      [2, 0, 0],
      [0, 1, 0],
    ],
    pivot: [1, 0, 0],
  }, // L-piece (Violet)
  {
    color: 0xb58900,
    shape: [
      [0, 0, 0],
      [1, 0, 0],
      [2, 0, 0],
      [1, 1, 0],
    ],
    pivot: [1, 0, 0],
  }, // T-piece (Yellow)
  {
    color: 0x859900,
    shape: [
      [0, 0, 0],
      [1, 0, 0],
      [1, 1, 0],
      [2, 1, 0],
    ],
    pivot: [1, 1, 0],
  }, // Z-piece (Green)
  {
    color: 0xdc322f,
    shape: [
      [0, 0, 0],
      [1, 0, 0],
      [1, 1, 0],
      [1, 0, 1],
    ],
    pivot: [1, 0, 0],
  }, // P-piece (Red)
  {
    color: 0xd33682,
    shape: [
      [0, 0, 0],
      [1, 0, 0],
      [0, 1, 0],
      [0, 1, 1],
    ],
    pivot: [0, 0, 0],
  }, // A-Chiral (Magenta)
  {
    color: 0xcb4b16,
    shape: [
      [1, 0, 0],
      [0, 0, 0],
      [1, 1, 0],
      [1, 1, 1],
    ],
    pivot: [1, 0, 0],
  }, // B-Chiral (Orange)
];

async function init() {
  puzzles = await loadPuzzles();
  setupPreview();
  populatePuzzleList();

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

  const ambientLight = new THREE.AmbientLight(0x93a1a1, 1.0);
  scene.add(ambientLight);
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.4);
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

  createSomaPieces();
  chiralSwapMap = new Map([
    [pieces[5], pieces[6]],
    [pieces[6], pieces[5]],
  ]);

  if (gameMode === "CUBE") {
    const solverHelpers = {
      createNewGrid,
      rotateGrid,
      reflectGrid,
      flattenGrid,
      getCanonicalSignature,
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
    window.soma_allCanonicalSolutions = allCanonicalSolutions;
  }

  updateGrid();
  checkWin();
  addEventListeners();
  animate();
}

function createSomaPieces() {
  pieceDefs.forEach((def, i) => {
    const piece = createPiece(def.shape, def.pivot, def.color);
    const angle = (i / pieceDefs.length) * Math.PI * 2;
    const radius = 5;
    piece.position.set(
      Math.round(Math.cos(angle) * radius),
      1,
      Math.round(Math.sin(angle) * radius),
    );
    pieces.push(piece);
    scene.add(piece);
  });
}

function createPiece(shapeCoords, pivot, color) {
  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.6,
    metalness: 0.1,
    emissive: baseEmissive,
  });
  const group = new THREE.Group();
  const pivotVec = new THREE.Vector3(pivot[0], pivot[1], pivot[2]);
  const edgeMaterial = new THREE.LineBasicMaterial({
    color: 0x073642,
    linewidth: 2,
  });
  shapeCoords.forEach((posArr) => {
    const cubeGroup = new THREE.Group();
    const cubeGeo = new THREE.BoxGeometry(
      gridUnit * 0.95,
      gridUnit * 0.95,
      gridUnit * 0.95,
    );
    const cubeMesh = new THREE.Mesh(cubeGeo, material);
    const edges = new THREE.EdgesGeometry(cubeGeo);
    const line = new THREE.LineSegments(edges, edgeMaterial);
    cubeGroup.add(cubeMesh);
    cubeGroup.add(line);
    cubeGroup.position.set(
      posArr[0] - pivotVec.x,
      posArr[1] - pivotVec.y,
      posArr[2] - pivotVec.z,
    );
    group.add(cubeGroup);
  });
  group.position.add(pivotVec);
  group.userData.isPiece = true;
  return group;
}

function getPointerCoords(event) {
  const touch = event.touches ? event.touches[0] : event;
  return { x: touch.clientX, y: touch.clientY };
}

function updatePointer(event) {
  const coords = getPointerCoords(event);
  pointer.x = (coords.x / window.innerWidth) * 2 - 1;
  pointer.y = -(coords.y / window.innerHeight) * 2 + 1;
}

function getIntersectedObject() {
  raycaster.setFromCamera(pointer, camera);
  const intersects = raycaster.intersectObjects(pieces, true);
  if (intersects.length > 0) {
    let object = intersects[0].object;
    while (object.parent && !object.userData.isPiece) object = object.parent;
    return object;
  }
  return null;
}

function selectPiece(piece) {
  if (selectedPiece) deselectPiece();

  selectedPiece = piece;
  lastSelectedPiece = piece;

  ghostPiece = selectedPiece.clone(true);
  ghostPiece.userData.isPiece = false;
  ghostPiece.children.forEach((g) => {
    g.children[0].material = g.children[0].material.clone();
    g.children[0].material.transparent = true;
    g.children[0].material.opacity = 0.6;
    g.children[0].material.emissive.set(highlightEmissive);
  });
  scene.add(ghostPiece);

  selectedPiece.visible = false;
}

function deselectPiece() {
  if (!selectedPiece) return;

  selectedPiece.visible = true;

  if (ghostPiece) {
    scene.remove(ghostPiece);
    ghostPiece = null;
  }

  selectedPiece = null;
  updateGrid();
  checkWin();
}

function getPointersDistance(pointers) {
  const p1 = pointers[0];
  const p2 = pointers[1];
  const dx = p1.clientX - p2.clientX;
  const dy = p1.clientY - p2.clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

function addPointer(event) {
  activePointers.push(event);
}

function removePointer(event) {
  const index = activePointers.findIndex(
    (p) => p.pointerId === event.pointerId,
  );
  if (index > -1) {
    activePointers.splice(index, 1);
  }
}

function updatePointerCache(event) {
  const index = activePointers.findIndex(
    (p) => p.pointerId === event.pointerId,
  );
  if (index > -1) {
    activePointers[index] = event;
  }
}

function addEventListeners() {
  const rotatePiece = (axis) => {
    const target = ghostPiece || lastSelectedPiece;
    if (!target) return;

    const quaternion = new THREE.Quaternion();
    quaternion.setFromAxisAngle(axis, Math.PI / 2);
    target.quaternion.premultiply(quaternion);

    const euler = new THREE.Euler().setFromQuaternion(target.quaternion, "YXZ");
    euler.x = Math.round(euler.x / (Math.PI / 2)) * (Math.PI / 2);
    euler.y = Math.round(euler.y / (Math.PI / 2)) * (Math.PI / 2);
    euler.z = Math.round(euler.z / (Math.PI / 2)) * (Math.PI / 2);
    target.quaternion.setFromEuler(euler);

    if (!ghostPiece) {
      updateGrid();
      checkWin();
    }
  };

  document.getElementById("help-btn").addEventListener("click", () => {
    infoPanel.classList.remove("hidden");
    blur.classList.remove("hidden");
  });
  document.getElementById("close-info-btn").addEventListener("click", () => {
    infoPanel.classList.add("hidden");
    blur.classList.add("hidden");
  });

  document
    .getElementById("restart-btn")
    .addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      restartGame();
    });
  document.getElementById("export-btn").addEventListener("pointerdown", (e) => {
    e.stopPropagation();
    exportSolution();
  });

  document.getElementById("hide-btn").addEventListener("pointerdown", (e) => {
    e.stopPropagation();
    document.getElementById("win-message").style.display = "none";
  });

  document.getElementById("puzzle-menu-btn").addEventListener("click", () => {
    puzzlePanel.classList.toggle("hidden");
    blur.classList.toggle("hidden");
  });

  document.getElementById("cancel-puzzle-btn").addEventListener("click", () => {
    puzzlePanel.classList.add("hidden");
    blur.classList.add("hidden");
  });

  document.getElementById("solve-cube-btn").addEventListener("click", () => {
    sessionStorage.removeItem("selectedPuzzle");
    window.location.reload();
  });

  document.addEventListener("keyup", (e) => {
    if (e.key.toLowerCase() === "a") rotatePiece(new THREE.Vector3(1, 0, 0));
    if (e.key.toLowerCase() === "r") rotatePiece(new THREE.Vector3(0, 1, 0));
    if (e.key.toLowerCase() === "s") rotatePiece(new THREE.Vector3(0, 0, 1));
    if (e.key.toLowerCase() === "z") rotatePiece(new THREE.Vector3(1, 0, 0));
    if (e.key.toLowerCase() === "x") rotatePiece(new THREE.Vector3(0, 1, 0));
    if (e.key.toLowerCase() === "v") rotatePiece(new THREE.Vector3(0, 0, 1));
    if (e.key === "1") exportSolution();
  });

  const nudge = (dir) => {
    const target = ghostPiece || lastSelectedPiece;
    if (!target) return;
    target.position.add(dir);
    if (!ghostPiece) {
      updateGrid();
      checkWin();
    }
  };

  document.getElementById("nudge-up").addEventListener("pointerdown", (e) => {
    e.stopPropagation();
    const cameraUp = new THREE.Vector3(0, 1, 0);
    cameraUp.applyQuaternion(camera.quaternion);
    cameraUp.normalize();
    nudge(cameraUp.round());
  });
  document.getElementById("nudge-down").addEventListener("pointerdown", (e) => {
    e.stopPropagation();
    const cameraUp = new THREE.Vector3(0, 1, 0);
    cameraUp.applyQuaternion(camera.quaternion);
    cameraUp.normalize();
    nudge(cameraUp.round().negate());
  });
  document.getElementById("nudge-left").addEventListener("pointerdown", (e) => {
    e.stopPropagation();
    const cameraUp = new THREE.Vector3(1, 0, 0);
    cameraUp.applyQuaternion(camera.quaternion);
    cameraUp.normalize();
    nudge(cameraUp.round().negate());
  });
  document
    .getElementById("nudge-right")
    .addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      const cameraUp = new THREE.Vector3(1, 0, 0);
      cameraUp.applyQuaternion(camera.quaternion);
      cameraUp.normalize();
      nudge(cameraUp.round());
    });

  container.addEventListener("wheel", (event) => {
    event.preventDefault();
    const zoomSpeed = 0.001;
    const newLength = camera.position.length() * (1 + event.deltaY * zoomSpeed);
    camera.position.setLength(
      Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newLength)),
    );
  });
  container.addEventListener("pointerdown", (event) => {
    if (event.target !== renderer.domElement) return;
    addPointer(event);

    if (event.pointerType === "touch" && activePointers.length === 2) {
      isPinching = true;
      isDragging = false;
      pinchStartDistance = getPointersDistance(activePointers);
      pinchStartCameraLength = camera.position.length();
      if (selectedPiece) deselectPiece();
      return;
    }

    isDragging = false;
    isRotatingCamera = false;
    pointerStartPos = getPointerCoords(event);
    updatePointer(event);

    const intersected = getIntersectedObject();
    if (intersected) {
      if (selectedPiece !== intersected) selectPiece(intersected);
    } else if (selectedPiece) {
      selectedPiece.position.copy(ghostPiece.position);
      selectedPiece.quaternion.copy(ghostPiece.quaternion);
      deselectPiece();
    } else {
      isRotatingCamera = true;
      deselectPiece();
      lastSelectedPiece = null;
    }
  });
  container.addEventListener("pointermove", (event) => {
    if (event.target !== renderer.domElement) return;
    event.preventDefault();
    updatePointerCache(event);
    if (isPinching && activePointers.length === 2) {
      const currentDist = getPointersDistance(activePointers);
      if (currentDist === 0 || pinchStartDistance === 0) return;
      const scale = currentDist / pinchStartDistance;
      const newLength = pinchStartCameraLength / scale;
      camera.position.setLength(
        Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newLength)),
      );
      return;
    }
    const currentPos = getPointerCoords(event);
    const deltaX = currentPos.x - pointerStartPos.x;
    const deltaY = currentPos.y - pointerStartPos.y;
    if (
      !isDragging &&
      !selectedPiece &&
      (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5)
    ) {
      if (isRotatingCamera) {
        isDragging = true;
      }
    }
    if (selectedPiece && ghostPiece) {
      updatePointer(event);
      raycaster.setFromCamera(pointer, camera);
      /*const allIntersects = raycaster.intersectObjects(
        scene.children,
        true,
      );*/
      const allIntersects = raycaster.intersectObjects(pieces, true);
      const intersectsWithPieces = allIntersects.filter(
        (i) => i.object instanceof THREE.Mesh && i.face,
      );
      const intersectsWithPiecesOrTarget = allIntersects.filter(
        (i) =>
          i.object.parent?.userData?.isPiece || i.object === targetWireframe,
      );

      if (intersectsWithPieces.length > 0) {
        const intersect = intersectsWithPieces[0];
        const point = intersect.point;
        const normal = intersect.face.normal.clone();
        const normalMatrix = new THREE.Matrix3().getNormalMatrix(
          intersect.object.matrixWorld,
        );
        const worldNormal = normal.applyMatrix3(normalMatrix).normalize();
        const newPos = point.clone().add(worldNormal.multiplyScalar(0.5));
        ghostPiece.position.set(
          Math.round(newPos.x),
          Math.round(newPos.y),
          Math.round(newPos.z),
        );
      } else {
        const intersectsWithPlane = raycaster.intersectObject(placementPlane);
        if (intersectsWithPlane.length > 0) {
          const point = intersectsWithPlane[0].point;
          ghostPiece.position.set(
            Math.round(point.x),
            Math.round(point.y),
            Math.round(point.z),
          );
        }
      }
    } else if (isDragging && isRotatingCamera) {
      const camRotSensitivity = 0.004;
      const worldUp = new THREE.Vector3(0, 1, 0);
      camera.position.applyAxisAngle(worldUp, -deltaX * camRotSensitivity);
      const right = new THREE.Vector3()
        .crossVectors(
          camera.up,
          camera.getWorldDirection(new THREE.Vector3()).negate(),
        )
        .normalize();
      const currentAngle = camera.position.angleTo(worldUp);
      let verticalDelta = -deltaY * camRotSensitivity;
      const minPolarAngle = 0.1;
      const maxPolarAngle = Math.PI - 0.1;
      if (currentAngle + verticalDelta < minPolarAngle) {
        verticalDelta = minPolarAngle - currentAngle;
      } else if (currentAngle + verticalDelta > maxPolarAngle) {
        verticalDelta = maxPolarAngle - currentAngle;
      }
      camera.position.applyAxisAngle(right, verticalDelta);
      camera.lookAt(scene.position);
      pointerStartPos = currentPos;
    }
  });
  const onPointerUpOrCancel = (event) => {
    removePointer(event);
    if (activePointers.length < 2) {
      isPinching = false;
    }

    if (selectedPiece && ghostPiece) {
      selectedPiece.position.copy(ghostPiece.position);
      selectedPiece.quaternion.copy(ghostPiece.quaternion);
      deselectPiece();
    }

    isDragging = false;
    isRotatingCamera = false;
  };

  container.addEventListener("pointerup", onPointerUpOrCancel);
  container.addEventListener("pointercancel", onPointerUpOrCancel);
}

function updateGrid() {
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

function checkWin() {
  const winMessage = document.getElementById("win-message");
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
    }
  }

  if (isWin) {
    winMessage.style.display = "block";
    document.getElementById("restart-btn").style.display = "block";
    if (gameMode === "PUZZLE") {
      document.getElementById("hide-btn").style.display = "block";
    } else {
      document.getElementById("export-btn").style.display = "block";
    }
  } else {
    winMessage.style.display = "none";
    if (document.getElementById("hide-btn"))
      document.getElementById("hide-btn").style.display = "none";
    if (document.getElementById("restart-btn"))
      document.getElementById("restart-btn").style.display = "none";
    if (document.getElementById("export-btn"))
      document.getElementById("export-btn").style.display = "none";
  }
}

function animate() {
  requestAnimationFrame(animate);
  renderPreview();
  renderer.render(scene, camera);
}

function restartGame() {
  pieces.forEach((piece, i) => {
    const angle = (i / pieceDefs.length) * Math.PI * 2;
    const radius = 5;
    piece.position.set(
      Math.round(Math.cos(angle) * radius),
      1,
      Math.round(Math.sin(angle) * radius),
    );
    piece.quaternion.set(0, 0, 0, 1);
  });

  document.getElementById("win-message").style.display = "none";
  document.getElementById("restart-btn").style.display = "none";
  updateGrid();
  checkWin();
}

function createNewGrid() {
  return Array(3)
    .fill(0)
    .map(() =>
      Array(3)
        .fill(0)
        .map(() => Array(3).fill(null)),
    );
}

function rotateGrid(grid, axis) {
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

function reflectGrid(grid) {
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

function flattenGrid(grid) {
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

function getCanonicalSignature(grid3d) {
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
        signatures.add(flattenGrid(currentGrid));
        currentGrid = rotateGrid(currentGrid, "y");
      }
    });
  });

  return Array.from(signatures).sort()[0];
}

async function exportSolution() {
  if (gameMode === "PUZZLE") {
    exportPuzzleSolution();
    return;
  }

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

function exportPuzzleSolution() {
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

function setupPreview() {
  const previewContainer = document.getElementById("puzzle-preview");
  const size = previewContainer.clientWidth;

  previewScene = new THREE.Scene();
  previewCamera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
  previewCamera.position.set(6, 5, 6);
  previewCamera.lookAt(previewScene.position);

  previewRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  previewRenderer.setSize(size, size);
  previewContainer.appendChild(previewRenderer.domElement);

  const ambientLight = new THREE.AmbientLight(0x93a1a1, 1.2);
  previewScene.add(ambientLight);
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
  dirLight.position.set(10, 20, 5);
  previewScene.add(dirLight);
}

function renderPreview() {
  if (previewWireframe) {
    previewWireframe.rotation.y += 0.01;
    previewRenderer.render(previewScene, previewCamera);
  }
}

function populatePuzzleList() {
  const puzzleList = document.getElementById("puzzle-list");
  puzzleList.innerHTML = "";
  puzzles.forEach((puzzle) => {
    const item = document.createElement("div");
    item.textContent = puzzle.name;
    item.classList.add("puzzle-item");

    item.addEventListener("click", () => {
      sessionStorage.setItem("selectedPuzzle", JSON.stringify(puzzle));
      window.location.reload();
    });

    item.addEventListener("mouseenter", () => {
      if (previewWireframe) {
        previewScene.remove(previewWireframe);
      }
      const { puzzleGroup } = generatePuzzleWireframe(puzzle.grid, true);
      previewWireframe = puzzleGroup;
      previewScene.add(previewWireframe);
    });

    puzzleList.appendChild(item);
  });
}

function generatePuzzleWireframe(grid, forPreview = false) {
  const puzzleGroup = new THREE.Group();
  const lineMaterial = new THREE.LineBasicMaterial({
    color: forPreview ? 0x93a1a1 : 0x586e75,
  });
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

  const offset = barycenter.clone().round();

  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      for (let z = 0; z < depth; z++) {
        if (grid[x][y][z] === 1) {
          const cubeGeo = new THREE.BoxGeometry(1, 1, 1);
          const edges = new THREE.EdgesGeometry(cubeGeo);
          const line = new THREE.LineSegments(edges, lineMaterial);

          line.position.set(x - offset.x, y - offset.y, z - offset.z);

          puzzleGroup.add(line);
        }
      }
    }
  }

  puzzleGroup.rotation.x = Math.PI / 2;
  return { puzzleGroup, offset };
}

init();

window.soma_api = {
  getRotationTarget: () => ghostPiece || lastSelectedPiece,
  updateGrid: () => {
    updateGrid();
    checkWin();
  },
  getScene: () => scene,
};

(function () {
  const trackball = document.createElement("div");
  trackball.id = "trackball";
  trackball.classList.add("hidden");
  const knob = document.createElement("div");
  knob.id = "trackball-knob";
  trackball.appendChild(knob);
  document.body.appendChild(trackball);

  let isDragging = false;
  let lastPointerPos = { x: 0, y: 0 };
  let lastAngle = 0;
  let snapPreview = null;

  const trackballRect = trackball.getBoundingClientRect();
  const center = {
    x: trackballRect.left + trackballRect.width / 2,
    y: trackballRect.top + trackballRect.height / 2,
  };
  const radius = trackballRect.width / 2;

  function getRotationTarget() {
    return window.soma_api?.getRotationTarget();
  }
  function getScene() {
    return window.soma_api?.getScene();
  }
  function updateGrid() {
    window.soma_api?.updateGrid();
  }

  function createSnapPreview(targetPiece) {
    if (!targetPiece || !getScene()) return;
    const previewGroup = new THREE.Group();
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0x2aa198,
      transparent: true,
      opacity: 0.7,
    });

    targetPiece.children.forEach((cubeGroup) => {
      const cubeGeo = new THREE.BoxGeometry(1, 1, 1);
      const edges = new THREE.EdgesGeometry(cubeGeo);
      const line = new THREE.LineSegments(edges, lineMaterial);
      line.position.copy(cubeGroup.position);
      previewGroup.add(line);
    });
    snapPreview = previewGroup;
    getScene().add(snapPreview);
  }

  function updateSnapPreview(target) {
    if (!snapPreview || !target) return;
    snapPreview.position.copy(target.position);
    const euler = new THREE.Euler().setFromQuaternion(target.quaternion, "YXZ");
    euler.x = Math.round(euler.x / (Math.PI / 2)) * (Math.PI / 2);
    euler.y = Math.round(euler.y / (Math.PI / 2)) * (Math.PI / 2);
    euler.z = Math.round(euler.z / (Math.PI / 2)) * (Math.PI / 2);
    snapPreview.quaternion.setFromEuler(euler);
  }

  trackball.addEventListener("pointerdown", (e) => {
    const target = getRotationTarget();
    if (!target) return;
    e.stopPropagation();
    isDragging = true;
    trackball.setPointerCapture(e.pointerId);
    lastPointerPos = { x: e.clientX, y: e.clientY };
    lastAngle = Math.atan2(e.clientY - center.y, e.clientX - center.x);
    if (snapPreview) getScene()?.remove(snapPreview);
    createSnapPreview(target);
    updateSnapPreview(target);
  });

  trackball.addEventListener("pointermove", (e) => {
    if (!isDragging) return;
    e.stopPropagation();
    const target = getRotationTarget();
    if (!target) return;

    const delta = {
      x: e.clientX - lastPointerPos.x,
      y: e.clientY - lastPointerPos.y,
    };
    lastPointerPos = { x: e.clientX, y: e.clientY };
    const relativeX = e.clientX - center.x;
    const relativeY = e.clientY - center.y;
    const distFromCenter = Math.sqrt(
      relativeX * relativeX + relativeY * relativeY,
    );
    const angle = Math.atan2(relativeY, relativeX);
    const clampedDist = Math.min(distFromCenter, radius - 20);
    knob.style.transform = `translate(${Math.cos(angle) * clampedDist}px, ${Math.sin(angle) * clampedDist}px)`;
    const rollThreshold = radius * 0.3;
    if (distFromCenter > rollThreshold) {
      let deltaAngle = angle - lastAngle;
      if (deltaAngle > Math.PI) deltaAngle -= 2 * Math.PI;
      if (deltaAngle < -Math.PI) deltaAngle += 2 * Math.PI;
      const quatZ = new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(0, 0, 1),
        deltaAngle * 2.0,
      );
      target.quaternion.premultiply(quatZ);
      lastAngle = angle;
    }
    const quatX = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(1, 0, 0),
      delta.y * 0.02,
    );
    const quatY = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 1, 0),
      delta.x * 0.02,
    );
    target.quaternion.premultiply(quatX).premultiply(quatY);

    updateSnapPreview(target);
  });

  const onPointerUpOrCancel = (e) => {
    if (!isDragging) return;
    e.stopPropagation();
    isDragging = false;
    trackball.releasePointerCapture(e.pointerId);
    knob.style.transform = "translate(0,0)";

    const target = getRotationTarget();

    if (target && snapPreview) {
      target.quaternion.copy(snapPreview.quaternion);
      updateGrid();
    }

    if (snapPreview) {
      getScene()?.remove(snapPreview);
      snapPreview = null;
    }
  };

  trackball.addEventListener("pointerup", onPointerUpOrCancel);
  trackball.addEventListener("pointercancel", onPointerUpOrCancel);

  const nudgePad = document.getElementById("nudge-pad");
  let isTrackballVisible = false;

  setInterval(() => {
    const target = getRotationTarget();
    if (target && !isTrackballVisible) {
      trackball.classList.remove("hidden");
      nudgePad.classList.remove("hidden");
      isTrackballVisible = true;
    } else if (!target && isTrackballVisible) {
      trackball.classList.add("hidden");
      nudgePad.classList.add("hidden");
      isTrackballVisible = false;
      if (snapPreview) {
        getScene()?.remove(snapPreview);
        snapPreview = null;
      }
    }
  }, 250);
})();

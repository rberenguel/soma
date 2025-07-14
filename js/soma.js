let ghostPiece = null;
let placementPlane = null;
let lastSelectedPiece = null;
const container = document.getElementById("container");
let scene, camera, renderer;
let raycaster, pointer;

// New state for pinch-to-zoom
let isPinching = false;
let pinchStartDistance = 0;
let pinchStartCameraLength = 0;
const activePointers = [];
const MIN_ZOOM = 4;
const MAX_ZOOM = 25;

const pieces = [];
const gridUnit = 1;
let selectedPiece = null;
const baseEmissive = new THREE.Color(0x000000);
const highlightEmissive = new THREE.Color(0xb58900); // Solarized Yellow

let pointerStartPos = { x: 0, y: 0 };
let pieceStartPos = new THREE.Vector3();
let isDragging = false;

let solutionGrid;
let alignmentLine;

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

function init() {
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

  const targetGeometry = new THREE.BoxGeometry(3, 3, 3);
  const edges = new THREE.EdgesGeometry(targetGeometry);
  const line = new THREE.LineSegments(
    edges,
    new THREE.LineBasicMaterial({ color: 0x586e75 }),
  );
  line.position.set(0, 1, 0);
  scene.add(line);

  const planeGeo = new THREE.PlaneGeometry(100, 100);
  const planeMat = new THREE.MeshBasicMaterial({
    visible: false,
    side: THREE.DoubleSide,
  });
  placementPlane = new THREE.Mesh(planeGeo, planeMat);
  placementPlane.rotation.x = -Math.PI / 2;
  scene.add(placementPlane);

  createSomaPieces();
  updateGridAndCheckWin();
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
  updateGridAndCheckWin();
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
      updateGridAndCheckWin();
    }
  };

  document.getElementById("rot-x").addEventListener("pointerdown", (e) => {
    e.stopPropagation();
    rotatePiece(new THREE.Vector3(1, 0, 0));
  });
  document.getElementById("rot-y").addEventListener("pointerdown", (e) => {
    e.stopPropagation();
    rotatePiece(new THREE.Vector3(0, 1, 0));
  });
  document.getElementById("rot-z").addEventListener("pointerdown", (e) => {
    e.stopPropagation();
    rotatePiece(new THREE.Vector3(0, 0, 1));
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

  document.addEventListener("keyup", (e) => {
    if (e.key.toLowerCase() === "a") rotatePiece(new THREE.Vector3(1, 0, 0));
    if (e.key.toLowerCase() === "r") rotatePiece(new THREE.Vector3(0, 1, 0));
    if (e.key.toLowerCase() === "s") rotatePiece(new THREE.Vector3(0, 0, 1));
    if (e.key === "1") exportSolution();
  });

  container.addEventListener("pointerdown", (event) => {
    if (event.target !== renderer.domElement) return;
    addPointer(event);

    if (activePointers.length === 2) {
      isPinching = true;
      isDragging = false;
      pinchStartDistance = getPointersDistance(activePointers);
      pinchStartCameraLength = camera.position.length();
      if (selectedPiece) deselectPiece();
      return;
    }

    isDragging = false;
    pointerStartPos = getPointerCoords(event);
    updatePointer(event);
    const intersected = getIntersectedObject();

    if (intersected) {
      if (selectedPiece !== intersected) selectPiece(intersected);
    } else if (selectedPiece) {
      selectedPiece.position.copy(ghostPiece.position);
      selectedPiece.quaternion.copy(ghostPiece.quaternion);
      deselectPiece();
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
      isDragging = true;
    }

    if (selectedPiece && ghostPiece) {
      updatePointer(event);
      raycaster.setFromCamera(pointer, camera);
      const allIntersects = raycaster.intersectObjects(pieces, true);
      const intersectsWithPieces = allIntersects.filter(
        (i) => i.object instanceof THREE.Mesh && i.face,
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
    } else if (isDragging) {
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
      if (isDragging) {
        selectedPiece.position.copy(ghostPiece.position);
      }
      selectedPiece.quaternion.copy(ghostPiece.quaternion);
      deselectPiece();
    }
    isDragging = false;
  };

  container.addEventListener("pointerup", onPointerUpOrCancel);
  container.addEventListener("pointercancel", onPointerUpOrCancel);
}

function updateGridAndCheckWin() {
  const gridSize = 3;
  solutionGrid = Array(gridSize)
    .fill(0)
    .map(() =>
      Array(gridSize)
        .fill(0)
        .map(() => Array(gridSize).fill(null)),
    );
  let occupiedCount = 0;

  for (const piece of pieces) {
    for (const cubeGroup of piece.children) {
      const worldPos = new THREE.Vector3();
      cubeGroup.getWorldPosition(worldPos);

      const gx = Math.round(worldPos.x) + 1;
      const gy = Math.round(worldPos.y);
      const gz = Math.round(worldPos.z) + 1;

      if (
        gx >= 0 &&
        gx < gridSize &&
        gy >= 0 &&
        gy < gridSize &&
        gz >= 0 &&
        gz < gridSize
      ) {
        if (solutionGrid[gx][gy][gz]) {
          document.getElementById("win-message").style.display = "none";
          document.getElementById("restart-btn").style.display = "none";
          return;
        }
        solutionGrid[gx][gy][gz] = piece;
        occupiedCount++;
      }
    }
  }

  if (occupiedCount === 27) {
    document.getElementById("win-message").style.display = "block";
    document.getElementById("restart-btn").style.display = "block";
  } else {
    document.getElementById("win-message").style.display = "none";
    document.getElementById("restart-btn").style.display = "none";
  }
}

function animate() {
  requestAnimationFrame(animate);
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
  updateGridAndCheckWin();
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

function getCanonicalSignature(grid) {
  const signatures = new Set();
  function addAllRotations(g) {
    let current = g;
    for (let i = 0; i < 4; i++) {
      let currentY = current;
      for (let j = 0; j < 4; j++) {
        signatures.add(flattenGrid(currentY));
        currentY = rotateGrid(currentY, "x");
      }
      current = rotateGrid(current, "y");
    }
    current = rotateGrid(g, "z");
    for (let i = 0; i < 4; i++) {
      signatures.add(flattenGrid(current));
      current = rotateGrid(current, "y");
    }
    current = rotateGrid(g, "z");
    current = rotateGrid(current, "z");
    current = rotateGrid(current, "z");
    for (let i = 0; i < 4; i++) {
      signatures.add(flattenGrid(current));
      current = rotateGrid(current, "y");
    }
  }
  addAllRotations(grid);
  addAllRotations(reflectGrid(grid));
  return Array.from(signatures).sort()[0];
}

async function exportSolution() {
  const gridSize = 3;
  const cellSize = 50;
  const padding = 10;
  const signature = getCanonicalSignature(solutionGrid);
  try {
    await document.fonts.load("16px monoidregular");
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
        const piece = solutionGrid[x][y][z];
        if (!piece) continue;
        const color =
          "#" + piece.children[0].children[0].material.color.getHexString();
        if (y === gridSize - 1) faces.top[2 - z][x] = color;
        if (y === 0) faces.bottom[z][x] = color;
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
        ctx.lineWidth = 2;
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
  ctx.font = "16px monoidregular";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(signature, textX, textY);
  const link = document.createElement("a");
  link.download = `soma-solution-${signature}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

init();

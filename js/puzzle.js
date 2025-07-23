import * as THREE from "three";

let previewRenderer, previewScene, previewCamera, previewWireframe;

export function generatePuzzleWireframe(grid, forPreview = false) {
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

export function setupPreview() {
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

export function renderPreview() {
  if (previewWireframe) {
    previewWireframe.rotation.y += 0.01;
    previewRenderer.render(previewScene, previewCamera);
  }
}

export function populatePuzzleList(puzzles) {
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

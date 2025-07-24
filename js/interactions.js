import * as THREE from "three";
import { highlightEmissive } from "./config.js";
import { MIN_ZOOM, MAX_ZOOM } from "./config.js";

let scene,
  camera,
  renderer,
  raycaster,
  pointer,
  pieces,
  targetWireframe,
  placementPlane;
let selectedPiece = null,
  lastSelectedPiece = null,
  ghostPiece = null;
let isPinching = false,
  pinchStartDistance = 0,
  pinchStartCameraLength = 0;
const activePointers = [];
let pointerStartPos = { x: 0, y: 0 };
let isDragging = false,
  isRotatingCamera = false;

let updateGrid, checkWin, exportSolution;

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

function rotatePiece(axis) {
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
}

function nudge(dir) {
  const target = ghostPiece || lastSelectedPiece;
  if (!target) return;
  target.position.add(dir);
  if (!ghostPiece) {
    updateGrid();
    checkWin();
  }
}

export function initializeInteractions(
  _scene,
  _camera,
  _renderer,
  _raycaster,
  _pointer,
  _pieces,
  _targetWireframe,
  _placementPlane,
  _updateGrid,
  _checkWin,
  _exportSolution,
) {
  scene = _scene;
  camera = _camera;
  renderer = _renderer;
  raycaster = _raycaster;
  pointer = _pointer;
  pieces = _pieces;
  targetWireframe = _targetWireframe;
  placementPlane = _placementPlane;
  updateGrid = _updateGrid;
  checkWin = _checkWin;
  exportSolution = _exportSolution;

  const container = document.getElementById("container");

  document.addEventListener("keyup", (e) => {
    if (e.key.toLowerCase() === "a") rotatePiece(new THREE.Vector3(1, 0, 0));
    if (e.key.toLowerCase() === "r") rotatePiece(new THREE.Vector3(0, 1, 0));
    if (e.key.toLowerCase() === "s") rotatePiece(new THREE.Vector3(0, 0, 1));
    if (e.key.toLowerCase() === "z") rotatePiece(new THREE.Vector3(1, 0, 0));
    if (e.key.toLowerCase() === "x") rotatePiece(new THREE.Vector3(0, 1, 0));
    if (e.key.toLowerCase() === "v") rotatePiece(new THREE.Vector3(0, 0, 1));
    if (e.key === "1") exportSolution();
  });

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

export function getRotationTarget() {
  return ghostPiece || lastSelectedPiece;
}

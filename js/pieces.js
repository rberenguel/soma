import * as THREE from "three";
import { pieceDefs, gridUnit, baseEmissive } from "./config.js";

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

export function createSomaPieces(scene) {
  const pieces = [];
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
  return pieces;
}

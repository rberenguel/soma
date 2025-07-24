import * as THREE from "three";

export function initializeTrackball(getRotationTarget, getScene, updateGrid) {
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

  function createSnapPreview(targetPiece) {
    const scene = getScene();
    if (!targetPiece || !scene) return;
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
    scene.add(snapPreview);
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
    knob.style.transform = `translate(${Math.cos(angle) * clampedDist}px, ${
      Math.sin(angle) * clampedDist
    }px)`;
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
}

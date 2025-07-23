import * as THREE from "three";

export const MIN_ZOOM = 4;
export const MAX_ZOOM = 25;

export const gridUnit = 1;
export const baseEmissive = new THREE.Color(0x000000);
export const highlightEmissive = new THREE.Color(0xb58900);

export const pieceDefs = [
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

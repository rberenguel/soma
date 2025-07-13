# Soma Cube 3D

This is an interactive, web-based 3D puzzle game of the classic Soma cube, built using Three.js. The goal is to assemble the seven unique Soma pieces into a single 3x3x3 cube.

![](https://raw.githubusercontent.com/rberenguel/soma/soma/gh-pages/media/soma.png)

## Features

- **Interactive 3D Interface:** A clean, minimalist 3D environment to manipulate the puzzle pieces.
- **Drag & Drop and smooth placing:** Move pieces intuitively by dragging them or by selecting and placing them.
- **Piece Rotation:** Rotate pieces on all three axes (X, Y, Z) using on-screen buttons or keyboard shortcuts.
- **Camera Controls:** Orbit the camera by dragging the background and zoom using the slider.
- **Win Detection:** The application automatically detects when the cube is solved successfully.
- **Solution Export:** Export your completed solution as a PNG image. The image includes a unique canonical signature for your solution, so you can find all 240 solutions.

## Canonical Solution Tagging

A key challenge with the Soma cube is that a single solution can be rotated and reflected in 48 different ways. To uniquely identify each of the 240 possible solutions, this application generates a **canonical signature** for every valid solution.

This signature is a standardized string representation of the solved cube, allowing for easy comparison and cataloguing of unique solutions. For a detailed explanation of how this signature is generated, please see [Soma Cube Solution Tagging](./solution-tagging.md).

## Libraries Used

- [Three.js](https://threejs.org/) for 3D rendering and interaction.

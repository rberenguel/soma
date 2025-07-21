### Plan: Integrating Thorleif Puzzles into the Main Game

**Objective:** Allow the user to select a puzzle from the `puzzles.html` viewer and solve it in the main `soma.js` application, with custom win detection and a specialized image export for solved puzzles.

---

#### Phase 1: Game State and Mode Management

1.  **Introduce Game Modes**: In `soma.js`, create a state variable to track the current mode, e.g., `let gameMode = 'CUBE';` (`'CUBE'` or `'PUZZLE'`).
2.  **Store Puzzle Data**:
    - Create a global variable `let currentPuzzle = null;` to hold the definition of the active puzzle (its name and grid).
    - The `init` function will check if a puzzle has been passed from the viewer. If so, it sets `gameMode = 'PUZZLE'` and stores the puzzle data. Otherwise, it defaults to `'CUBE'`.

---

#### Phase 2: Puzzle Selection and Launching

1.  **Turn Viewer into a Launcher**: Modify `puzzles.html` and `puzzles.js`.
    - Add a "Solve This Puzzle" button to the viewer's UI.
    - When this button is clicked, it will open the main `index.html` page, passing the selected puzzle's data.
    - **Data Passing Method**: We'll use `sessionStorage` for this. When "Solve" is clicked, `puzzles.js` will `JSON.stringify` the selected puzzle object (name and grid) and save it to `sessionStorage.setItem('selectedPuzzle', puzzleData)`.
2.  **Modify `soma.js` to Receive Data**:
    - At the start of the `init` function in `soma.js`, it will check `sessionStorage.getItem('selectedPuzzle')`.
    - If data exists, it will `JSON.parse` it, store it in `currentPuzzle`, set `gameMode = 'PUZZLE'`, and then clear the storage with `sessionStorage.removeItem('selectedPuzzle')` to prevent it from being reloaded on a simple page refresh.

---

#### Phase 3: Dynamic Target and Game Logic

1.  **Conditional Target Rendering**:
    - In `soma.js`, modify the section that creates the target wireframe.
    - If `gameMode === 'CUBE'`, it will render the existing 3x3x3 cube.
    - If `gameMode === 'PUZZLE'`, it will use the `generatePuzzleWireframe` logic (copied from `puzzles.js`) to render the wireframe stored in `currentPuzzle.grid`.
2.  **Generalized Win Detection**:
    - Create a new function `checkPuzzleWin()`. This function will iterate through the `currentPuzzle.grid` and the player's `solutionGrid`. A win occurs if:
      - For every cell where `currentPuzzle.grid` has a `1`, the player's `solutionGrid` has a piece.
      - For every cell where `currentPuzzle.grid` has a `0`, the player's `solutionGrid` is `null`.
      - No pieces are placed outside the puzzle's defined boundaries.
    - The main `updateGridAndCheckWin` function will become a dispatcher: if `gameMode === 'CUBE'`, it calls the existing logic; if `gameMode === 'PUZZLE'`, it calls `checkPuzzleWin()`.

---

#### Phase 4: Custom Solution Export

1.  **Conditional Export Logic**:
    - The `exportSolution()` function will be modified to check the `gameMode`.
    - **If `gameMode === 'CUBE'`**: The existing export logic (with faces flattened and canonical signature) will run **PERFECTLY PRESERVED**, as requested.
    - **If `gameMode === 'PUZZLE'`**: A new export path will be triggered.
2.  **New Puzzle Export Function**:
    - Create `exportPuzzleSolution()`. This function will:
    - **Set Isometric View**: Temporarily move the camera to the exact isometric position we established in the viewer (e.g., `camera.position.set(10, 7, 10)`), pointing at the puzzle's barycenter.
    - **Render Scene**: Render a single frame of the solved puzzle with the pieces in place.
    - **Create Canvas**: Draw the rendered frame onto a new canvas.
    - **Add Title**: Add the puzzle's name (e.g., "SOMA002") from `currentPuzzle.name` onto the canvas, similar to how the signature is added now.
    - **Trigger Download**: Generate a PNG and trigger the download.
    - **Restore Camera**: After exporting, restore the camera to its previous position to not disorient the user.

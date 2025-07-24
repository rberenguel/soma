import { pieceDefs } from "./config.js";

export function restartGame(pieces, updateGrid, checkWin) {
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

export function initializeUI(exportSolution, restartGame) {
  const infoPanel = document.getElementById("info");
  const blur = document.getElementById("blur");
  const puzzlePanel = document.getElementById("puzzle-panel");

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
}

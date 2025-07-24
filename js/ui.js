import { pieceDefs } from "./config.js";
import { populatePuzzleList } from "./puzzle.js";

let allPuzzles = [];
let currentPage = 0;
const puzzlesPerPage = 10;

function updateDisplayedPuzzles() {
  const startIndex = currentPage * puzzlesPerPage;
  const endIndex = startIndex + puzzlesPerPage;
  const puzzlesToDisplay = allPuzzles.slice(startIndex, endIndex);

  populatePuzzleList(puzzlesToDisplay); // Use the original populatePuzzleList

  // Update pagination info
  const totalPages = Math.ceil(allPuzzles.length / puzzlesPerPage);
  document.getElementById("puzzle-page-info").textContent =
    `${currentPage + 1}/${totalPages}`;

  // Enable/disable pagination buttons
  document.getElementById("prev-puzzle-page").disabled = currentPage === 0;
  document.getElementById("next-puzzle-page").disabled =
    currentPage >= totalPages - 1;
}

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

export async function initializeUI(exportSolution, restartGame, puzzles) {
  const infoPanel = document.getElementById("info");
  const blur = document.getElementById("blur");
  const puzzlePanel = document.getElementById("puzzle-panel");

  // Load puzzles and render initial list
  allPuzzles = puzzles;
  updateDisplayedPuzzles();

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

  // Pagination event listeners
  document.getElementById("prev-puzzle-page").addEventListener("click", () => {
    if (currentPage > 0) {
      currentPage--;
      updateDisplayedPuzzles();
    }
  });

  document.getElementById("next-puzzle-page").addEventListener("click", () => {
    const totalPages = Math.ceil(allPuzzles.length / puzzlesPerPage);
    if (currentPage < totalPages - 1) {
      currentPage++;
      updateDisplayedPuzzles();
    }
  });
}

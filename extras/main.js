// analysis_driver.js
import { initializeSolver } from "../js/solver.js";
import * as gridHelpers from "../js/grid.js";
import { pieceDefs } from "../js/config.js";
import {
  generateGraphFromSignature,
  getGraphCanonicalLabel,
} from "./analysis.js";

const pieces = pieceDefs.map((def, i) => ({
  id: i,
  name: String.fromCharCode("A".charCodeAt(0) + i),
}));

const chiralSwapMap = new Map([
  [pieces[5], pieces[6]],
  [pieces[6], pieces[5]],
]);

const solverHelpers = {
  ...gridHelpers,
  getCanonicalSignature: (grid) =>
    gridHelpers.getCanonicalSignature(grid, pieces, chiralSwapMap),
  flattenGrid: (grid) => gridHelpers.flattenGrid(grid, pieces),
};

console.log("Starting Soma solver for analysis...");
const allSolutions = initializeSolver(pieceDefs, pieces, solverHelpers);
console.log(`Solver finished. Found ${allSolutions.length} unique solutions.`);

const solutionGraphs = new Map();
allSolutions.forEach((sig) => {
  const graph = generateGraphFromSignature(sig, pieces);
  solutionGraphs.set(sig, graph);
});

// --- NEW: Group solutions by their canonical graph class ---
console.log("Classifying graphs by isomorphism...");
const graphClasses = new Map();
solutionGraphs.forEach((graph, signature) => {
  const label = getGraphCanonicalLabel(graph);
  if (!graphClasses.has(label)) {
    graphClasses.set(label, []);
  }
  graphClasses.get(label).push(signature);
});
console.log(`Found ${graphClasses.size} unique graph classes.`);

// --- MODIFIED: Render results grouped by class ---
const resultsContainer = document.getElementById("results");
let classIndex = 1;
graphClasses.forEach((signatures, label) => {
  const classEl = document.createElement("div");
  classEl.className = "solution"; // Re-use the same style

  // Get a representative graph for this class
  const representativeSignature = signatures[0];
  const representativeGraph = solutionGraphs.get(representativeSignature);

  let mermaidSyntax = "graph TD;\n";
  const drawnEdges = new Set();
  for (const node in representativeGraph) {
    representativeGraph[node].forEach((neighbor) => {
      const edge = [node, neighbor].sort().join("---");
      if (!drawnEdges.has(edge)) {
        mermaidSyntax += `    ${edge};\n`;
        drawnEdges.add(edge);
      }
    });
  }

  classEl.innerHTML = `
    <h2>Graph Class #${classIndex++} (${signatures.length} solutions)</h2>
    <div class="mermaid">${mermaidSyntax}</div>
    <p><strong>Signatures in this class:</strong></p>
    <pre><code>${signatures.join("\n")}</code></pre>
  `;
  resultsContainer.appendChild(classEl);
});

mermaid.initialize({ startOnLoad: true, theme: "dark" });

// --- UPDATED: Expose the new class data ---
window.somaAnalysis = {
  allSolutions,
  solutionGraphs,
  graphClasses,
  getGraphForSolution: (index) => solutionGraphs.get(allSolutions[index]),
};
console.log(
  "Analysis data is available. Try `somaAnalysis.graphClasses` in the console.",
);

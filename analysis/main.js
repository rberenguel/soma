// analysis_driver.js
import { initializeSolver } from "../js/solver.js";
import { rotateGrid, reflectAndSwapGrid } from "./analysis.js";
import { createNewGrid } from "../js/grid.js";
import * as gridHelpers from "../js/grid.js";
import { pieceDefs } from "../js/config.js";
import {
  generateGraphFromSignature,
  //generateMetaGraph,
  generateMetaGraphFromGrids,
  getGraphCanonicalLabel,
} from "./analysis.js";
import { renderClassChordDiagram } from "./class_viz.js";

const pieces = pieceDefs.map((def, i) => ({
  id: i,
  name: String.fromCharCode("A".charCodeAt(0) + i),
}));

const chiralSwapMap = new Map([
  [pieces[5], pieces[6]],
  [pieces[6], pieces[5]],
]);

function saveSvg(svgElement, filename) {
  const serializer = new XMLSerializer();
  let source = serializer.serializeToString(svgElement);
  // Add namespace
  if (!source.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)) {
    source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
  }
  const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

const solverHelpers = {
  ...gridHelpers,
  getCanonicalSignature: (grid) =>
    gridHelpers.getCanonicalSignature(grid, pieces, chiralSwapMap),
  flattenGrid: (grid) => gridHelpers.flattenGrid(grid, pieces),
};

console.log("Starting Soma solver for analysis...");
const allSolutions = initializeSolver(pieceDefs, pieces, solverHelpers);
console.log(`Solver finished. Found ${allSolutions.length} unique solutions.`);

// --- CACHE FOR COMPUTED DATA ---
let solutionGraphs = null;
let graphClasses = null;

// --- BUTTONS AND CONTAINERS ---
const computeClassesBtn = document.getElementById("compute-classes-btn");
const computeMetaBtn = document.getElementById("compute-meta-btn");
const computeSolutionGraphBtn = document.getElementById("compute-solution-graph-btn"); // Add this
const resultsContainer = document.getElementById("results-container");
const metaGraphContainer = document.getElementById("meta-graph-container");

// --- ON-DEMAND COMPUTATION FUNCTIONS ---

/*
function computeAndRenderClasses() {
  computeClassesBtn.disabled = true;
  computeClassesBtn.textContent = 'Computing...';
  setTimeout(() => {
    solutionGraphs = new Map();
    allSolutions.forEach(sig => solutionGraphs.set(sig, generateGraphFromSignature(sig, pieces)));
    graphClasses = new Map();
    solutionGraphs.forEach((graph, signature) => {
      const label = getGraphCanonicalLabel(graph);
      if (!graphClasses.has(label)) graphClasses.set(label, []);
      graphClasses.get(label).push(signature);
    });
    const signatureToIndexMap = new Map();
    allSolutions.forEach((sig, index) => signatureToIndexMap.set(sig, index + 1));
    resultsContainer.innerHTML = '';
    let classIndex = 0;
    graphClasses.forEach((signatures, label) => {
      classIndex++;
      const classEl = document.createElement('div');
      classEl.className = 'solution';
      const representativeGraph = solutionGraphs.get(signatures[0]);
      
      const pieceNames = Object.keys(representativeGraph).sort();
      const nameToIndex = new Map(pieceNames.map((n, i) => [n, i]));
      const matrix = Array(7).fill(0).map(() => Array(7).fill(0));
      for (const [node, neighbors] of Object.entries(representativeGraph)) {
        for (const neighbor of neighbors) {
          matrix[nameToIndex.get(node)][nameToIndex.get(neighbor)] = 1;
        }
      }
      const pieceColors = ['#268bd2', '#6c71c4', '#b58900', '#859900', '#dc322f', '#d33682', '#cb4b16'];
      const chordData = { matrix, names: pieceNames, colors: pieceColors };

      
      
      // Give each diagram container a unique ID
      const chordId = `chord-${classIndex}`;
      const mermaidId = `mermaid-${classIndex}`;
      
      classEl.innerHTML = `
        <h2>Graph Class #${classIndex} (${signatures.length} solutions)</h2>
        <div class="viz-container">
          <div class="chord-diagram-container" id="${chordId}"></div>
          <div class="mermaid-diagram-container" id="${mermaidId}"></div>
        </div>
        <p><strong>Signatures in this class:</strong></p>
        <pre><code></code></pre>`;
      
      const codeBlock = classEl.querySelector('code');
      codeBlock.textContent = signatures.map(sig => `${signatureToIndexMap.get(sig)}: ${sig}`).join('\n');
      
      resultsContainer.appendChild(classEl);

      // Render D3 diagram (unchanged)
      renderClassChordDiagram(`#${chordId}`, chordData);
      
      // --- FIX: Render each Mermaid diagram individually using mermaid.render() ---
      // This avoids the global conflict with the external D3 library.
      const mermaidContainer = document.getElementById(mermaidId);
      mermaid.render(mermaidId + '-svg', mermaidSyntax, (svgCode) => {
          mermaidContainer.innerHTML = svgCode;
      });
    });

    computeClassesBtn.textContent = 'Computation Complete';
    computeMetaBtn.disabled = false;
    // We no longer need the global mermaid.run() call here
  }, 10);
}
*/
function computeAndRenderClasses() {
  computeClassesBtn.disabled = true;
  computeClassesBtn.textContent = "Computing...";
  setTimeout(() => {
    solutionGraphs = new Map();
    allSolutions.forEach((solutionObject, index) => {
      if (!solutionObject || typeof solutionObject.signature !== "string") {
        console.error(
          `Problem at index ${index}: The solution object or its signature is invalid.`,
          solutionObject,
        );
        return;
      }
      const sig = solutionObject.signature;
      solutionGraphs.set(sig, generateGraphFromSignature(sig, pieces));
    });

    graphClasses = new Map();
    solutionGraphs.forEach((graph, signature) => {
      const label = getGraphCanonicalLabel(graph);
      if (!graphClasses.has(label)) graphClasses.set(label, []);
      graphClasses.get(label).push(signature);
    });

    const signatureToIndexMap = new Map();
    allSolutions.forEach((solutionObject, index) => {
      signatureToIndexMap.set(solutionObject.signature, index + 1);
    });

    // --- NEW: Create a consistent ID map for filenames ---
    const classLabelToNodeId = new Map();
    let nodeIdCounter = 0;
    graphClasses.forEach((_, label) => {
      classLabelToNodeId.set(label, `C${nodeIdCounter++}`);
    });
    // --- END NEW ---

    resultsContainer.innerHTML = "";
    let classIndex = 0;
    graphClasses.forEach((signatures, label) => {
      classIndex++;
      const classEl = document.createElement("div");
      classEl.className = "solution";
      const representativeGraph = solutionGraphs.get(signatures[0]);

      const pieceNames = Object.keys(representativeGraph).sort();
      const nameToIndex = new Map(pieceNames.map((n, i) => [n, i]));
      const matrix = Array(7)
        .fill(0)
        .map(() => Array(7).fill(0));
      for (const [node, neighbors] of Object.entries(representativeGraph)) {
        for (const neighbor of neighbors) {
          matrix[nameToIndex.get(node)][nameToIndex.get(neighbor)] = 1;
        }
      }
      const pieceColors = [
        "#268bd2",
        "#6c71c4",
        "#b58900",
        "#859900",
        "#dc322f",
        "#d33682",
        "#cb4b16",
      ];
      const chordData = { matrix, names: pieceNames, colors: pieceColors };

      let mermaidSyntax = "graph TD;\n";
      const drawnEdges = new Set();
      for (const node in representativeGraph) {
        representativeGraph[node].forEach((neighbor) => {
          const edge = [node, neighbor].sort().join("---");
          if (!drawnEdges.has(edge)) mermaidSyntax += `    ${edge};\n`;
          drawnEdges.add(edge);
        });
      }

      const chordId = `chord-${classIndex}`;
      const classId = classLabelToNodeId.get(label); // Get the 'C0', 'C1', etc. ID

      classEl.innerHTML = `
        <h2>Graph Class #${classIndex} (${signatures.length} solutions)</h2>
        <button class="save-svg-btn" data-target-id="${chordId}" data-filename="class_${classId}.svg">
          Save Chord Diagram SVG
        </button>
        <div class="viz-container">
          <div class="chord-diagram-container" id="${chordId}"></div>
          <div class="mermaid-diagram-container graph-viz"></div>
        </div>
        <p><strong>Signatures in this class:</strong></p>
        <pre><code></code></pre>`;

      const codeBlock = classEl.querySelector("code");
      codeBlock.textContent = signatures
        .map((sig) => `${signatureToIndexMap.get(sig)}: ${sig}`)
        .join("\n");
      resultsContainer.appendChild(classEl);

      renderClassChordDiagram(`#${chordId}`, chordData);
      const graphViz = classEl.querySelector(".graph-viz");
      graphViz.textContent = mermaidSyntax;
      graphViz.classList.add("mermaid");
    });

    // --- NEW: Add a single event listener for all save buttons ---
    resultsContainer.addEventListener("click", (event) => {
      if (event.target.classList.contains("save-svg-btn")) {
        const button = event.target;
        const targetId = button.dataset.targetId;
        const filename = button.dataset.filename;
        const svgEl = document.querySelector(`#${targetId} svg`);
        if (svgEl) {
          saveSvg(svgEl, filename);
          button.textContent = "Saved!";
          setTimeout(() => {
            button.textContent = "Save Chord Diagram SVG";
          }, 2000);
        } else {
          console.error("SVG element not found for", targetId);
        }
      }
    });
    // --- END NEW ---

    computeClassesBtn.textContent = "Computation Complete";
    computeMetaBtn.disabled = false;
    computeSolutionGraphBtn.disabled = false;
    mermaid.run();
  }, 10);
}

function computeAndRenderMetaGraph() {
  computeMetaBtn.disabled = true;
  computeMetaBtn.textContent = "Computing...";
  setTimeout(() => {
    const metaGraph = generateMetaGraphFromGrids(
      allSolutions,
      graphClasses,
      pieces,
      chiralSwapMap,
    );

    // --- MODIFIED: Full component discovery ---
    const connectedComponents = [];
    const singletonClasses = [];
    const visited = new Set();

    // First, find all singletons
    metaGraph.forEach((edges, label) => {
      if (edges.length === 0) {
        singletonClasses.push(label);
        visited.add(label); // Mark them as "visited" so we don't process them again
      }
    });

    // Now, find each distinct connected component using BFS
    for (const startNode of metaGraph.keys()) {
      if (!visited.has(startNode)) {
        const component = [];
        const queue = [startNode];
        visited.add(startNode);

        while (queue.length > 0) {
          const currentNode = queue.shift();
          component.push(currentNode);
          const neighbors = metaGraph.get(currentNode).map((edge) => edge.to);
          for (const neighbor of neighbors) {
            if (!visited.has(neighbor)) {
              visited.add(neighbor);
              queue.push(neighbor);
            }
          }
        }
        connectedComponents.push(component);
      }
    }
    // --- END MODIFICATION ---
    if (singletonClasses.length > 0) {
      singletonClasses.forEach((label, i) => {
        const solutionsInSingleton = graphClasses.get(label);
        console.log(
          `Solutions in Singleton #${i + 1} (Label: ${label.substring(0, 15)}...):`,
          solutionsInSingleton,
        );
      });
    }

    const metaGraphViz = document.getElementById("meta-graph-viz");
    let mermaidMetaSyntax = "graph TD;\n";
    let garbuixSyntax = "";
    const classLabelToNodeId = new Map();
    let nodeIdCounter = 0;
    graphClasses.forEach((_, label) => {
      classLabelToNodeId.set(label, `C${nodeIdCounter++}`);
    });

    // --- MODIFIED: Generate a subgraph for EACH component ---
    connectedComponents.forEach((component, index) => {
      mermaidMetaSyntax += `    subgraph "Component ${index + 1} (${component.length} classes)"\n`;
      garbuixSyntax += `cluster component_${index + 1} {\n`;
      component.forEach((label) => {
        const nodeId = classLabelToNodeId.get(label);
        const classNum = parseInt(nodeId.substring(1));
        const numSols = graphClasses.get(label).length;
        mermaidMetaSyntax += `        ${nodeId}("Class ${classNum + 1} (${numSols})");\n`;
        garbuixSyntax += `${nodeId} Class ${classNum + 1} (${numSols})\n`;
      });
      mermaidMetaSyntax += "    end\n\n";
      garbuixSyntax += `}\n`;
    });

    if (singletonClasses.length > 0) {
      mermaidMetaSyntax += `    subgraph "Isolated Classes (${singletonClasses.length} Singletons)"\n`;
      garbuixSyntax += `cluster singletons {\n`;
      singletonClasses.forEach((label) => {
        const nodeId = classLabelToNodeId.get(label);
        const classNum = parseInt(nodeId.substring(1));
        const numSols = graphClasses.get(label).length;
        mermaidMetaSyntax += `        ${nodeId}("Class ${classNum + 1} (${numSols})");\n`;
        garbuixSyntax += `${nodeId} Class ${classNum + 1} (${numSols})\n`;
      });
      mermaidMetaSyntax += "    end\n\n";
      garbuixSyntax += `}\n`;
    }
    // --- END MODIFICATION ---

    // Add edges (this part is unchanged)
    metaGraph.forEach((edges, classLabel) => {
      const fromNodeId = classLabelToNodeId.get(classLabel);
      edges.forEach((edge) => {
        const toNodeId = classLabelToNodeId.get(edge.to);
        if (fromNodeId < toNodeId) {
          // Use a solid line for 2-piece moves and a dotted line for 3-piece moves
          const isThreePieceMove = edge.pieces.split(",").length === 3;
          let link,
            garb = "";
          if (isThreePieceMove) {
            link = `-. "${edge.pieces}" .-`; // Dotted line
            garb = "style=dotted";
          } else {
            link = `-- "${edge.pieces}" ---`; // Solid line
          }
          mermaidMetaSyntax += `    ${fromNodeId} ${link} ${toNodeId};\n`;
          garbuixSyntax += `${fromNodeId} ->  ${toNodeId} ${edge.pieces} ; arrowhead=none ${garb}\n`;
        }
      });
    });

    const dataToStore = {
      metaGraph: Array.from(metaGraph.entries()), // Convert Map to array
      graphClasses: Array.from(graphClasses.entries()), // Convert Map to array
      connectedComponents,
      singletonClasses,
    };

    // 2. Store data in sessionStorage
    try {
      sessionStorage.setItem("somaMetaGraphData", JSON.stringify(dataToStore));
      console.log(
        "Meta-graph data saved to sessionStorage. Opening visualization tab...",
      );
      // 3. Open the new visualization page
      window.open("meta_viz.html", "_blank");
    } catch (e) {
      console.error(
        "Failed to store data in sessionStorage. It might be too large or disabled.",
        e,
      );
      alert(
        "Could not open visualization. Data is too large for sessionStorage.",
      );
    }
    // --- END NEW LOGIC ---

    const summaryP = metaGraphContainer.querySelector("p");
    summaryP.textContent = `Found ${connectedComponents.length} connected component(s) and ${singletonClasses.length} isolated classes (singletons). An edge represents a 2-piece move.`;
    console.log(garbuixSyntax);
    console.log(mermaidMetaSyntax);
    metaGraphViz.textContent = mermaidMetaSyntax;
    metaGraphViz.classList.add("mermaid");
    metaGraphContainer.style.display = "block";

    mermaid.run().then(() => {
      const svgElement = metaGraphViz.querySelector("svg");
      if (svgElement) {
        svgPanZoom(svgElement, {
          zoomEnabled: true,
          controlIconsEnabled: true,
          fit: true,
          center: true,
        });
      }
    });

    computeMetaBtn.textContent = "Computation Complete";
    window.somaAnalysis = {
      allSolutions,
      solutionGraphs,
      graphClasses,
      metaGraph,
    };
    console.log("All analysis data is available in `window.somaAnalysis`.");
  }, 10);
}

function computeAndRenderSolutionGraph() {
  computeSolutionGraphBtn.disabled = true;
  computeSolutionGraphBtn.textContent = "Analysing…";

  setTimeout(() => {
    console.log("Generating full solution graph...");

    // Sort solutions to get a canonical order for IDs and consistent processing
    const sortedSolutions = [...allSolutions].sort((a, b) =>
      a.signature.localeCompare(b.signature),
    );

    const pieceNameMap = new Map(pieces.map((p) => [p, p.name]));

    // Create nodes with correct image paths based on the canonical (sorted) order
    const nodes = sortedSolutions.map((sol, i) => ({
      id: sol.signature,
      imagePath: `images/sols/${i + 1}-${sol.signature}.png`,
    }));

    const links = [];
    const adjacency = new Map(nodes.map((n) => [n.id, 0]));

    for (let i = 0; i < sortedSolutions.length; i++) {
      for (let j = i + 1; j < sortedSolutions.length; j++) {
        const sol1 = sortedSolutions[i];
        const sol2 = sortedSolutions[j];

        let transformationFound = false;

        const gridsToTest = [
          sol2.grid,
          reflectAndSwapGrid(sol2.grid, chiralSwapMap),
        ];
        const faceOrienters = [
          (g) => g,
          (g) => rotateGrid(g, "x"),
          (g) => rotateGrid(rotateGrid(g, "x"), "x"),
          (g) => rotateGrid(rotateGrid(rotateGrid(g, "x"), "x"), "x"),
          (g) => rotateGrid(g, "z"),
          (g) => rotateGrid(rotateGrid(rotateGrid(g, "z"), "z"), "z"),
        ];

        for (const initialGrid of gridsToTest) {
          if (transformationFound) break;
          for (const orient of faceOrienters) {
            if (transformationFound) break;
            let currentGrid = orient(initialGrid);
            for (let k = 0; k < 4; k++) {
              currentGrid = rotateGrid(currentGrid, "y");

              const movedPieces = new Set();
              for (let x = 0; x < 3; x++) {
                for (let y = 0; y < 3; y++) {
                  for (let z = 0; z < 3; z++) {
                    const piece1 = sol1.grid[x][y][z];
                    const piece2 = currentGrid[x][y][z];
                    if (piece1 !== piece2) {
                      if (piece1) movedPieces.add(pieceNameMap.get(piece1));
                      if (piece2) movedPieces.add(pieceNameMap.get(piece2));
                    }
                  }
                }
              }

              if (movedPieces.size === 2 || movedPieces.size === 3) {
                const edgeLabel = Array.from(movedPieces).sort().join(",");
                links.push({
                  source: sol1.signature,
                  target: sol2.signature,
                  pieces: edgeLabel,
                  moveType: movedPieces.size,
                });
                adjacency.set(sol1.signature, adjacency.get(sol1.signature) + 1);
                adjacency.set(sol2.signature, adjacency.get(sol2.signature) + 1);
                transformationFound = true;
                break;
              }
            }
          }
        }
      }
    }

    console.log(
      `Full solution graph generation complete. Found ${nodes.length} nodes and ${links.length} links.`,
    );

    // Verification step for disconnected nodes
    const disconnectedNodes = [];
    adjacency.forEach((degree, signature) => {
      if (degree === 0) {
        const solIndex = sortedSolutions.findIndex(
          (s) => s.signature === signature,
        );
        disconnectedNodes.push({ signature, id: solIndex + 1 });
      }
    });

    if (disconnectedNodes.length > 0) {
      console.warn(
        "WARNING: The following solutions are disconnected from the graph:",
      );
      disconnectedNodes.forEach((node) => {
        console.warn(
          `  - Canonical ID: ${node.id}, Signature: ${node.signature}`,
        );
      });
    } else {
      console.log(
        "Graph connectivity check passed. All nodes have at least one edge.",
      );
    }

    const dataToStore = { nodes, links };

    try {
      sessionStorage.setItem(
        "somaSolutionGraphData",
        JSON.stringify(dataToStore),
      );
      console.log(
        "Solution graph data saved to sessionStorage. Opening visualization tab...",
      );
      window.open("solution_viz.html", "_blank");
    } catch (e) {
      console.error(
        "Failed to store data in sessionStorage. It might be too large or disabled.",
        e,
      );
      alert(
        "Could not open visualization. Data is too large for sessionStorage.",
      );
    }

    computeSolutionGraphBtn.textContent = "Computation Complete";
  }, 10);
}

// --- EVENT LISTENERS ---
computeSolutionGraphBtn.addEventListener("click", computeAndRenderSolutionGraph);
computeClassesBtn.addEventListener("click", computeAndRenderClasses);
computeMetaBtn.addEventListener("click", computeAndRenderMetaGraph);

mermaid.initialize({ startOnLoad: false, theme: "dark" });

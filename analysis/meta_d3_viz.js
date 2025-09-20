// meta_d3_viz.js
function saveSvg(svgElement, filename) {
  const serializer = new XMLSerializer();
  let source = serializer.serializeToString(svgElement);
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
// --- 1. RETRIEVE AND PARSE DATA ---
const storedData = sessionStorage.getItem("somaMetaGraphData");
if (!storedData) {
  document.body.innerHTML =
    "<h1>No graph data found. Please generate it from the main page first.</h1>";
  throw new Error("Graph data not found in sessionStorage.");
}

const pieceColors = new Map([
  ["A", "#268bd2"],
  ["B", "#6c71c4"],
  ["C", "#b58900"],
  ["D", "#859900"],
  ["E", "#dc322f"],
  ["F", "#d33682"],
  ["G", "#cb4b16"],
]);

const { metaGraph, graphClasses, connectedComponents, singletonClasses } =
  JSON.parse(storedData, (key, value) => {
    if (key === "metaGraph" || key === "graphClasses") return new Map(value);
    return value;
  });

// --- 2. TRANSFORM DATA FOR D3 ---

const nodes = [];
const links = [];
const classLabelToNodeId = new Map();
let classIndex = 0;
const componentMap = new Map();

[...connectedComponents, singletonClasses].forEach((component, i) => {
  component.forEach((label) => componentMap.set(label, i));
});

graphClasses.forEach((solutions, label) => {
  const id = `C${classIndex++}`;
  classLabelToNodeId.set(label, id);
  nodes.push({
    id: id,
    label: `Class ${classIndex} (${solutions.length})`,
    solutionCount: solutions.length,
    component: componentMap.get(label) ?? -1,
  });
});

metaGraph.forEach((edges, classLabel) => {
  const sourceId = classLabelToNodeId.get(classLabel);
  edges.forEach((edge) => {
    const targetId = classLabelToNodeId.get(edge.to);
    if (sourceId < targetId) {
      // Avoid duplicate links
      links.push({
        source: sourceId,
        target: targetId,
        pieces: edge.pieces,
        moveType: edge.pieces.split(",").length,
      });
    }
  });
});

const imagePaths = nodes.map((d) => `./images/class_${d.id}.svg`);
const classImageData = new Map();
try {
  const svgPromises = imagePaths.map((path) =>
    fetch(path).then((res) => {
      if (!res.ok) throw new Error(`Failed to fetch ${path}`);
      return res.text();
    }),
  );
  const svgStrings = await Promise.all(svgPromises);

  nodes.forEach((node, i) => {
    // Convert raw SVG text to a Base64 Data URI
    const dataUri = `data:image/svg+xml;base64,${btoa(svgStrings[i])}`;
    classImageData.set(node.id, dataUri);
  });
} catch (error) {
  console.error(
    "Could not load node images. Make sure they are in the '/images' folder.",
    error,
  );
  alert(
    "Error: Could not load the SVG images for the nodes. Check the console for details.",
  );
}

const solutionCounts = nodes.map((d) => d.solutionCount);
const [minSolutions, maxSolutions] = d3.extent(solutionCounts);
const sizeScale = d3
  .scaleSqrt()
  .domain([minSolutions, maxSolutions])
  .range([40, 90]);

// --- 3. D3 VISUALIZATION SETUP ---
const width = window.innerWidth;
const height = window.innerHeight;
let isLocked = false;
const svg = d3
  .select("body")
  .append("svg")
  .attr("viewBox", [0, 0, width, height]);

const color = d3.scaleOrdinal(d3.schemeCategory10);
//const radiusScale = d3.scaleSqrt().domain([1, 48]).range([5, 25]);

const simulation = d3
  .forceSimulation(nodes)
  .force(
    "link",
    d3
      .forceLink(links)
      .id((d) => d.id)
      .distance(500),
  )
  .force("charge", d3.forceManyBody().strength(-550))
  .force("center", d3.forceCenter(width / 2, height / 2));

const tooltip = d3.select("body").append("div").attr("class", "tooltip");

const totalEdgeWidth = 4; // This is 'N', the total thickness in pixels.

const linkGroups = svg
  .append("g")
  .attr("class", "links")
  .selectAll("g.link-group")
  .data(links)
  .join("g")
  .attr("class", (d) => `link-group move-${d.moveType}-piece`)
  .on("mouseover", function (event, d) {
    const group = d3.select(this);
    // Increase strand opacity (unchanged)
    group.selectAll("line.strand").style("stroke-opacity", 1.0);

    // NEW: Add the text label on hover
    group
      .append("text")
      .attr("class", "link-label")
      .attr("x", (d.source.x + d.target.x) / 2)
      .attr("y", (d.source.y + d.target.y) / 2)
      .text(d.pieces.split(",").join(""));

    // Tooltip logic (unchanged)
    tooltip.transition().duration(200).style("opacity", 0.9);
    tooltip
      .html(`Move: ${d.pieces}`)
      .style("left", event.pageX + 5 + "px")
      .style("top", event.pageY - 28 + "px");
  })
  .on("mouseout", function () {
    const group = d3.select(this);
    // Restore strand opacity (unchanged)
    group.selectAll("line.strand").style("stroke-opacity", 0.5);

    // NEW: Remove the text label on mouseout
    group.select("text.link-label").remove();

    // Tooltip logic (unchanged)
    tooltip.transition().duration(500).style("opacity", 0);
  });

// Populate each group with its corresponding strands
linkGroups.each(function (d) {
  const group = d3.select(this);
  const strands = d.pieces.split(",");
  const numStrands = strands.length;
  const strandWidth = Math.max(1, totalEdgeWidth / numStrands);

  // --- FIX: Add an invisible 'hit area' for reliable mouse events ---
  group
    .append("line")
    .attr("class", "hit-area")
    .style("stroke", "transparent")
    .style("stroke-width", 15); // A wide, invisible area

  // --- The original strand creation logic is the same ---
  strands.forEach((piece) => {
    group
      .append("line")
      .attr("class", "strand")
      .classed("three-piece", d.moveType === 3)
      .style("stroke", pieceColors.get(piece))
      .style("stroke-width", strandWidth.toFixed(2))
      .style("stroke-opacity", 0.5);
  });
});

//const nodeSize = 60;

const node = svg
  .append("g")
  .selectAll("g")
  .data(nodes)
  .join("g")
  .attr("class", "node")
  .call(
    d3.drag().on("start", dragstarted).on("drag", dragged).on("end", dragended),
  );

node
  .append("circle")
  .attr("r", (d) => sizeScale(d.solutionCount) / 2 + 2) // Radius is half the image size + border
  .attr("fill", "#002b36") // Match the SVG background
  .attr("stroke", "#93a1a1") // A bright, neutral border color (Solarized Base1)
  .attr("stroke-width", 1.5);

// Use the sizeScale to set the width and height of the image
node
  .append("image")
  .attr("href", (d) => classImageData.get(d.id)) //`./images/class_${d.id}.svg`)
  .attr("width", (d) => sizeScale(d.solutionCount))
  .attr("height", (d) => sizeScale(d.solutionCount))
  .attr("x", (d) => -sizeScale(d.solutionCount) / 2) // Center the image
  .attr("y", (d) => -sizeScale(d.solutionCount) / 2);

// Adjust the text label's position based on the dynamic node size
node
  .append("text")
  .text((d) => d.label)
  .style("text-anchor", "middle")
  .attr("y", (d) => sizeScale(d.solutionCount) / 2 + 12);

simulation.on("tick", () => {
  linkGroups.each(function (d) {
    const group = d3.select(this);
    const { source, target } = d;

    group
      .select("line.hit-area")
      .attr("x1", source.x)
      .attr("y1", source.y)
      .attr("x2", target.x)
      .attr("y2", target.y);
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    if (length === 0) return;

    const nx = -dy / length; // Normalized perpendicular x
    const ny = dx / length; // Normalized perpendicular y

    const numStrands = d.pieces.split(",").length;
    const strandWidth = Math.max(1, totalEdgeWidth / numStrands);

    group.selectAll("line.strand").each(function (_, i) {
      // Calculate the offset for this strand from the center line
      const offset = (i - (numStrands - 1) / 2) * strandWidth;
      d3.select(this)
        .attr("x1", source.x + offset * nx)
        .attr("y1", source.y + offset * ny)
        .attr("x2", target.x + offset * nx)
        .attr("y2", target.y + offset * ny);
    });
  });
  node.attr("transform", (d) => `translate(${d.x},${d.y})`);
});

// --- 4. DRAG FUNCTIONS ---
function dragstarted(event, d) {
  if (!event.active) {
    if (!isLocked) {
      // If unlocked, reheat the simulation to make it feel alive
      simulation.alphaTarget(0.3).restart();
    } else {
      // If locked, just give it a small energy boost to ensure the tick runs
      simulation.alpha(0.1).restart();
    }
  }
  d.fx = d.x;
  d.fy = d.y;
}

function dragged(event, d) {
  // We only need to update the node's data. The tick function, which is
  // now guaranteed to be running, will handle all visual updates.
  d.fx = event.x;
  d.fy = event.y;
}

function dragended(event, d) {
  // Only cool down the simulation and un-pin the node if the layout is NOT locked
  if (!isLocked) {
    if (!event.active) {
      simulation.alphaTarget(0);
    }
    d.fx = null;
    d.fy = null;
  }
}

const lockBtn = document.getElementById("lock-btn");
const downloadBtn = document.getElementById("download-btn");

lockBtn.addEventListener("click", () => {
  isLocked = true;

  // --- NEW: Disable the forces instead of stopping the simulation ---
  simulation.force("charge").strength(0); // Turn off repulsion
  simulation.force("link").strength(0); // Turn off the link spring force
  simulation.force("center", null); // Remove the centering force

  // Keep the simulation ticking with a low "alpha" to redraw edges on drag
  simulation.alpha(0.1).restart();

  // Update UI (this is unchanged)
  lockBtn.textContent = "Positions Locked ✨";
  lockBtn.disabled = true;
  downloadBtn.disabled = false;

  // Give a visual cue that nodes are locked (this is unchanged)
  node.selectAll("circle").attr("stroke", "#2aa198");
});

downloadBtn.addEventListener("click", () => {
  saveSvg(svg.node(), "soma-meta-graph.svg");
});

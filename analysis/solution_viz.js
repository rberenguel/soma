// solution_viz.js

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

async function renderGraph() {
  const storedData = sessionStorage.getItem("somaSolutionGraphData");
  if (!storedData) {
    document.body.innerHTML =
      "<h1>No graph data found. Please generate it from the main page first.</h1>";
    throw new Error("Graph data not found in sessionStorage.");
  }

  const { nodes, links: allLinks } = JSON.parse(storedData); // Rename links to allLinks
  let currentLinks = [...allLinks]; // Start with all links
  let showThreePieceMoves = true;

  const pieceColors = new Map([
    ["A", "#268bd2"],
    ["B", "#6c71c4"],
    ["C", "#b58900"],
    ["D", "#859900"],
    ["E", "#dc322f"],
    ["F", "#d33682"],
    ["G", "#cb4b16"],
  ]);

  const width = window.innerWidth;
  const height = window.innerHeight;
  let isLocked = false;
  const svg = d3
    .select("body")
    .append("svg")
    .attr("viewBox", [0, 0, width, height])
    .attr("id", "solution-graph-svg");
  const graphGroup = svg.append("g").attr("class", "graph-group"); // New group for D3 elements

  const nodeSize = 35;

  // Initialize SVG Pan Zoom
  const panZoomInstance = svgPanZoom("#solution-graph-svg", {
    zoomEnabled: true,
    controlIconsEnabled: true,
    fit: true,
    center: true,
    minZoom: 0.1,
    maxZoom: 10,
    zoomScaleSensitivity: 0.2,
    preventMouseEventsDefault: false, // Allow D3 drag to work
  });

  const connectedNodeIds = new Set();
  allLinks.forEach((l) => {
    const sourceId = typeof l.source === "object" ? l.source.id : l.source;
    const targetId = typeof l.target === "object" ? l.target.id : l.target;
    connectedNodeIds.add(sourceId);
    connectedNodeIds.add(targetId);
  });
  const isolatedNodes = nodes.filter((n) => !connectedNodeIds.has(n.id));

  function isolatedNodeGravity(alpha) {
    const gravity = 0.05 * alpha;
    isolatedNodes.forEach((node) => {
      node.vx += (width / 2 - node.x) * gravity;
      node.vy += (height / 2 - node.y) * gravity;
    });
  }

  const simulation = d3
    .forceSimulation(nodes)
    .force(
      "link",
      d3
        .forceLink(currentLinks)
        .id((d) => d.id)
        .distance(150)
        .strength(0.4),
    )
    .force("charge", d3.forceManyBody().strength(-80))
    .force("collide", d3.forceCollide().radius(nodeSize * 0.9))
    .force("center", d3.forceCenter(width / 2, height / 2).strength(0.05))
    .force("isolatedGravity", isolatedNodeGravity);

  const tooltip = d3.select("body").append("div").attr("class", "tooltip");
  const totalEdgeWidth = 2;

  // --- REFACTORED: Link drawing logic ---
  let linkGroups = graphGroup.append("g").attr("class", "links").selectAll("g");

  function updateLinks() {
    // Data join
    linkGroups = linkGroups.data(
      currentLinks,
      (d) => `${d.source.id}-${d.target.id}`,
    );

    // Exit
    linkGroups.exit().remove();

    // Enter
    const linkGroupsEnter = linkGroups
      .enter()
      .append("g")
      .attr("class", (d) => `link-group move-${d.moveType}-piece`);

    linkGroupsEnter.each(function (d) {
      const group = d3.select(this);
      const strands = d.pieces.split(",");
      const strandWidth = Math.max(0.5, totalEdgeWidth / strands.length);
      group
        .append("line")
        .attr("class", "hit-area")
        .style("stroke", "transparent")
        .style("stroke-width", 10);
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

    // Merge
    linkGroups = linkGroupsEnter.merge(linkGroups);

    linkGroups
      .on("mouseover", function (event, d) {
        const group = d3.select(this);
        group.selectAll("line.strand").style("stroke-opacity", 1.0);
        const coloredPieces = d.pieces
          .split(",")
          .map(
            (p) =>
              `<span style="color: ${pieceColors.get(p)}; font-weight: bold;">${p}</span>`,
          )
          .join("");
        tooltip
          .html(`Move: ${coloredPieces}`)
          .style("left", event.pageX + 5 + "px")
          .style("top", event.pageY - 28 + "px");
        tooltip.transition().duration(200).style("opacity", 0.9);
      })
      .on("mouseout", function () {
        const group = d3.select(this);
        group.selectAll("line.strand").style("stroke-opacity", 0.5);
        tooltip.transition().duration(500).style("opacity", 0);
      });

    // Update simulation
    simulation.force("link").links(currentLinks);
    simulation.alpha(0.3).restart();
  }
  // --- END REFACTOR ---

  const viewerContainer = d3.select("#viewer-container");
  const viewerTitle = d3.select("#viewer-title");
  const viewerImage = d3.select("#viewer-image");

  const node = graphGroup
    .append("g")
    .selectAll("g")
    .data(nodes)
    .join("g")
    .attr("class", "node")
    .call(
      d3
        .drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended),
    )
    .on("click", (event, d) => {
      event.stopPropagation();
      viewerTitle.text(`Solution #${d.canonicalId}`);
      viewerImage.attr(
        "src",
        d3.select(event.currentTarget).select("image").attr("href"),
      );
      viewerContainer.style("display", "flex");
    })
    .on("mouseover", (event, d) => {
      tooltip
        .html(`Solution #${d.canonicalId}`)
        .style("left", event.pageX + 5 + "px")
        .style("top", event.pageY - 28 + "px");
      tooltip.transition().duration(200).style("opacity", 0.9);
    })
    .on("mouseout", () => {
      tooltip.transition().duration(500).style("opacity", 0);
    });

  svg.on("click", () => {
    viewerContainer.style("display", "none");
  });

  node
    .append("image")
    .attr("href", (d) => d.imagePath)
    .attr("width", nodeSize)
    .attr("height", nodeSize)
    .attr("x", -nodeSize / 2)
    .attr("y", -nodeSize / 2)
    .attr("onerror", "this.setAttribute('href', '../media/placeholder.png')");

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
      const dx = target.x - source.x,
        dy = target.y - source.y,
        length = Math.sqrt(dx * dx + dy * dy);
      if (length === 0) return;
      const nx = -dy / length,
        ny = dx / length;
      const numStrands = d.pieces.split(",").length,
        strandWidth = Math.max(0.5, totalEdgeWidth / numStrands);
      group.selectAll("line.strand").each(function (_, i) {
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

  function dragstarted(event, d) {
    event.sourceEvent.stopPropagation(); // Prevent panzoom from firing
    panZoomInstance.disablePan();
    if (!event.active) {
      if (!isLocked) {
        simulation.alphaTarget(0.3).restart();
      } else {
        simulation.alpha(0.1).restart();
      }
    }
    d.fx = d.x;
    d.fy = d.y;
  }
  function dragged(event, d) {
    d.fx = event.x;
    d.fy = event.y;
  }
  function dragended(event, d) {
    panZoomInstance.enablePan();
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
    simulation.force("charge").strength(0);
    simulation.force("link").strength(0);
    simulation.force("center", null);
    simulation.alpha(0.1).restart();
    lockBtn.textContent = "Positions Locked ✨";
    lockBtn.disabled = true;
    downloadBtn.disabled = false;
    node.selectAll("circle").attr("stroke", "#2aa198");
  });

  downloadBtn.addEventListener("click", () => {
    saveSvg(svg.node(), "soma-solution-graph.svg");
  });

  const loadLocalTriggerBtn = document.getElementById("load-local-trigger-btn");
  const loadLocalInput = document.getElementById("load-local-input");

  loadLocalTriggerBtn.addEventListener("click", () => {
    loadLocalInput.click();
  });

  loadLocalInput.addEventListener("change", (event) => {
    const files = event.target.files;
    if (!files || files.length === 0) {
      return;
    }
    const localImageMap = new Map();
    const fileNameRegex = /^(\d+)-/;
    for (const file of files) {
      const match = file.name.match(fileNameRegex);
      if (match && match[1]) {
        const canonicalId = parseInt(match[1], 10);
        const objectURL = URL.createObjectURL(file);
        localImageMap.set(canonicalId, objectURL);
      }
    }
    node.each(function (d) {
      if (localImageMap.has(d.canonicalId)) {
        const newUrl = localImageMap.get(d.canonicalId);
        const g = d3.select(this);
        g.select("image").remove();
        g.append("image")
          .attr("href", newUrl)
          .attr("width", nodeSize)
          .attr("height", nodeSize)
          .attr("x", -nodeSize / 2)
          .attr("y", -nodeSize / 2)
          .attr(
            "onerror",
            "this.setAttribute('href', '../media/placeholder.png')",
          );
      }
    });
    window.addEventListener("beforeunload", () => {
      localImageMap.forEach((url) => URL.revokeObjectURL(url));
    });
  });

  // --- NEW: Toggle Logic ---
  const toggleBtn = document.getElementById("toggle-3-piece-btn");
  toggleBtn.addEventListener("click", () => {
    showThreePieceMoves = !showThreePieceMoves;
    currentLinks = showThreePieceMoves
      ? [...allLinks]
      : allLinks.filter((l) => l.moveType === 2);
    updateLinks();
    toggleBtn.style.backgroundColor = showThreePieceMoves
      ? "#073642"
      : "#586e75";
  });
  // --- END NEW ---

  updateLinks(); // Initial draw
}

renderGraph();

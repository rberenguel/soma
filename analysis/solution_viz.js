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

function saveJson(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
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

  const { nodes, links: allLinks } = JSON.parse(storedData);
  let currentLinks = [...allLinks];
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
  const graphGroup = svg.append("g").attr("class", "graph-group");

  const nodeSize = 35;

  const panZoomInstance = svgPanZoom("#solution-graph-svg", {
    zoomEnabled: true,
    controlIconsEnabled: true,
    fit: true,
    center: true,
    minZoom: 0.1,
    maxZoom: 10,
    zoomScaleSensitivity: 0.2,
    preventMouseEventsDefault: false,
  });

  const mainSimulation = d3
    .forceSimulation(nodes)
    .force(
      "link",
      d3
        .forceLink(allLinks)
        .id((d) => d.id)
        .distance(150)
        .strength(0.4),
    )
    .force("charge", d3.forceManyBody().strength(-80))
    .force("collide", d3.forceCollide().radius(nodeSize * 0.9))
    .force("center", d3.forceCenter(width / 2, height / 2).strength(0.05));

  let activeSimulation = mainSimulation;

  const tooltip = d3.select("body").append("div").attr("class", "tooltip");
  const totalEdgeWidth = 2;

  let linkGroups = graphGroup.append("g").attr("class", "links").selectAll("g");

  function updateLinks(linksData) {
    linkGroups = linkGroups.data(
      linksData,
      (d) => `${d.source.id}-${d.target.id}`,
    );
    linkGroups.exit().remove();
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

    linkGroups = linkGroupsEnter.merge(linkGroups);

    linkGroups
      .on("mouseover", function (event, d) {
        d3.select(this).selectAll("line.strand").style("stroke-opacity", 1.0);
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
        d3.select(this).selectAll("line.strand").style("stroke-opacity", 0.5);
        tooltip.transition().duration(500).style("opacity", 0);
      });
  }

  const viewerContainer = d3.select("#viewer-container");
  const viewerTitle = d3.select("#viewer-title");
  const viewerImage = d3.select("#viewer-image");

  const node = graphGroup
    .append("g")
    .selectAll("g")
    .data(nodes, (d) => d.id)
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

  node
    .append("circle")
    .attr("r", nodeSize / 2 + 4)
    .attr("fill", "none")
    .attr("stroke-width", 3)
    .style("opacity", 0);

  /*
  activeSimulation.on("tick", () => {
    linkGroups.each(function (d) {
      const group = d3.select(this);
      const { source, target } = d;
      group.select("line.hit-area").attr("x1", source.x).attr("y1", source.y).attr("x2", target.x).attr("y2", target.y);
      const dx = target.x - source.x, dy = target.y - source.y, length = Math.sqrt(dx * dx + dy * dy);
      if (length === 0) return;
      const nx = -dy / length, ny = dx / length;
      const numStrands = d.pieces.split(",").length, strandWidth = Math.max(0.5, totalEdgeWidth / numStrands);
      group.selectAll("line.strand").each(function (_, i) {
        const offset = (i - (numStrands - 1) / 2) * strandWidth;
        d3.select(this)
          .attr("x1", source.x + offset * nx).attr("y1", source.y + offset * ny)
          .attr("x2", target.x + offset * nx).attr("y2", target.y + offset * ny);
      });
    });
    node.attr("transform", (d) => `translate(${d.x},${d.y})`);
  });
  */
  function simulationTick() {
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
  }
  mainSimulation.on("tick", simulationTick);
  function dragstarted(event, d) {
    event.sourceEvent.stopPropagation();
    panZoomInstance.disablePan();
    if (!event.active)
      activeSimulation.alphaTarget(isLocked ? 0.1 : 0.3).restart();
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
      if (!event.active) activeSimulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }
  }

  document.getElementById("lock-btn").addEventListener("click", function () {
    isLocked = true;
    mainSimulation.force("charge").strength(0);
    mainSimulation.force("link").strength(0);
    mainSimulation.force("center", null);
    mainSimulation.alpha(0.1).restart();
    this.textContent = "Positions Locked ✨";
    this.disabled = true;
    document.getElementById("download-btn").disabled = false;
  });

  document.getElementById("download-btn").addEventListener("click", () => {
    saveSvg(svg.node(), "soma-solution-graph.svg");
  });

  const loadLocalInput = document.getElementById("load-local-input");
  document
    .getElementById("load-local-trigger-btn")
    .addEventListener("click", () => {
      loadLocalInput.click();
    });

  loadLocalInput.addEventListener("change", (event) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    const localImageMap = new Map();
    const fileNameRegex = /^(\d+)-/;
    for (const file of files) {
      const match = file.name.match(fileNameRegex);
      if (match && match[1]) {
        localImageMap.set(parseInt(match[1], 10), URL.createObjectURL(file));
      }
    }
    node.each(function (d) {
      if (localImageMap.has(d.canonicalId)) {
        const g = d3.select(this);
        g.select("image").attr("href", localImageMap.get(d.canonicalId));
      }
    });
    window.addEventListener("beforeunload", () => {
      localImageMap.forEach((url) => URL.revokeObjectURL(url));
    });
  });

  const toggleBtn = document.getElementById("toggle-3-piece-btn");
  toggleBtn.addEventListener("click", () => {
    showThreePieceMoves = !showThreePieceMoves;
    currentLinks = showThreePieceMoves
      ? [...allLinks]
      : allLinks.filter((l) => l.moveType === 2);
    updateLinks(currentLinks);
    mainSimulation.force("link").links(currentLinks);
    mainSimulation.alpha(1).restart();
    toggleBtn.style.backgroundColor = showThreePieceMoves
      ? "#073642"
      : "#586e75";
  });

  // --- NEW: Hamiltonian Path/Tour ---
  const tourBtn = document.getElementById("tour-btn");
  let tourPath = null;
  let tourIsHighlighted = false;
  let tourSimulation = null;

  tourBtn.addEventListener("click", () => {
    if (tourIsHighlighted) {
      clearTourHighlight();
      return;
    }

    tourBtn.disabled = true;
    tourBtn.textContent = "Loading / Calculating...";

    setTimeout(async () => {
      try {
        const response = await fetch("tour.json");
        if (!response.ok) throw new Error("tour.json not found.");
        const path = await response.json();
        tourPath = path;
        console.log(
          `Successfully loaded tour of length ${path.length} from tour.json`,
        );
        highlightTour(path);
      } catch (e) {
        console.log("tour.json not found. Calculating a new tour with ACO...");
        findAndComputeTour();
      } finally {
        tourBtn.disabled = false;
      }
    }, 10);
  });

  function findAndComputeTour() {
    const adj = new Map(nodes.map((n) => [n.id, []]));
    currentLinks.forEach((l) => {
      const sourceId = typeof l.source === "object" ? l.source.id : l.source;
      const targetId = typeof l.target === "object" ? l.target.id : l.target;
      adj.get(sourceId).push({ node: targetId, pieces: l.pieces });
      adj.get(targetId).push({ node: sourceId, pieces: l.pieces });
    });

    const components = getConnectedComponents(nodes, adj);
    if (components.length === 0) {
      console.error("No connected components found.");
      tourBtn.textContent = "Find Tour";
      return;
    }
    const largestComponent = components.reduce((a, b) =>
      a.length > b.length ? a : b,
    );

    const bestPath = antColonyOptimization(largestComponent, adj);

    tourPath = bestPath;

    if (tourPath && tourPath.length > 0) {
      highlightTour(tourPath);
      const moveChanges = calculateMoveChanges(tourPath, adj);
      console.log(
        `[ACO] Best tour found with ${tourPath.length} / ${largestComponent.length} nodes and ${moveChanges} move changes.`,
      );
    } else {
      console.error("ACO could not find a tour in the largest component.");
      tourBtn.textContent = "Find Tour";
    }
  }

  function clearTourHighlight() {
    if (tourSimulation) tourSimulation.stop();
    activeSimulation = mainSimulation;

    node.style("opacity", 1);
    linkGroups.style("opacity", 1);

    node.select("circle").style("opacity", 0);

    mainSimulation.alphaTarget(0.3).restart();

    tourIsHighlighted = false;
    tourBtn.textContent = "Find Tour";
  }

  function highlightTour(path) {
    mainSimulation.stop();

    const pathSet = new Set(path);
    const pathLinks = [];
    const pathLinksSet = new Set();

    for (let i = 0; i < path.length - 1; i++) {
      const source = path[i];
      const target = path[i + 1];
      const edge = allLinks.find(
        (l) =>
          (l.source.id === source && l.target.id === target) ||
          (l.source.id === target && l.target.id === source),
      );
      if (edge) {
        pathLinks.push(edge);
        pathLinksSet.add(`${source}-${target}`);
        pathLinksSet.add(`${target}-${source}`);
      }
    }

    node.style("opacity", (d) => (pathSet.has(d.id) ? 1 : 0.1));
    linkGroups.style("opacity", (d) => {
      const linkId = `${d.source.id}-${d.target.id}`;
      return pathLinksSet.has(linkId) ? 1 : 0.05;
    });

    node
      .select("circle")
      .style("opacity", (d) =>
        d.id === path[0] || d.id === path[path.length - 1] ? 1 : 0,
      )
      .attr("stroke", (d) => (d.id === path[0] ? "#859900" : "#dc322f"));

    const tourNodes = nodes.filter((n) => pathSet.has(n.id));
    tourSimulation = d3
      .forceSimulation(tourNodes)
      .force(
        "link",
        d3
          .forceLink(pathLinks)
          .id((d) => d.id)
          .distance(50)
          .strength(1),
      )
      .force("charge", d3.forceManyBody().strength(-10))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .on("tick", simulationTick);

    activeSimulation = tourSimulation;
    activeSimulation.alpha(1).restart();

    tourIsHighlighted = true;
    tourBtn.textContent = "Clear Tour Highlight";
  }

  function antColonyOptimization(componentNodeIds, adj) {
    const n_ants = 20;
    const n_iterations = 200;
    const alpha = 1.0;
    const beta = 5.0;
    const evaporation_rate = 0.2;
    const Q = 100;

    const pheromones = new Map();
    componentNodeIds.forEach((u) => {
      (adj.get(u) || []).forEach((vInfo) => {
        pheromones.set([u, vInfo.node].sort().join("-"), 1.0);
      });
    });

    let bestPath = [];

    for (let i = 0; i < n_iterations; i++) {
      const all_paths = [];

      for (let j = 0; j < n_ants; j++) {
        const startNode =
          componentNodeIds[Math.floor(Math.random() * componentNodeIds.length)];
        const path = [startNode];
        const visited = new Set([startNode]);

        while (path.length < componentNodeIds.length) {
          const currentNode = path[path.length - 1];
          const neighbors = (adj.get(currentNode) || []).filter(
            (n) => !visited.has(n.node),
          );
          if (neighbors.length === 0) break;

          const probabilities = [];
          let total_prob = 0;

          for (const neighbor of neighbors) {
            const edge = [currentNode, neighbor.node].sort().join("-");
            const pheromone = Math.pow(pheromones.get(edge) || 1.0, alpha);
            const onward_neighbors = (adj.get(neighbor.node) || []).filter(
              (n) => !visited.has(n.node),
            ).length;
            const heuristic = Math.pow(1.0 / (onward_neighbors + 1), beta);
            const prob = pheromone * heuristic;
            probabilities.push({ node: neighbor.node, prob });
            total_prob += prob;
          }

          if (total_prob === 0) break;

          const rand = Math.random() * total_prob;
          let cumulative_prob = 0;
          let next_node = null;

          for (const p of probabilities) {
            cumulative_prob += p.prob;
            if (rand <= cumulative_prob) {
              next_node = p.node;
              break;
            }
          }

          if (next_node) {
            path.push(next_node);
            visited.add(next_node);
          } else {
            break;
          }
        }
        all_paths.push(path);
      }

      pheromones.forEach((value, key) => {
        pheromones.set(key, value * (1.0 - evaporation_rate));
      });

      for (const path of all_paths) {
        if (path.length > bestPath.length) {
          bestPath = [...path];
          console.log(
            `New best path found with ${bestPath.length} nodes on iteration ${i + 1}`,
          );
        }
        const pheromone_deposit =
          Q / (componentNodeIds.length - path.length + 1);
        for (let k = 0; k < path.length - 1; k++) {
          const edge = [path[k], path[k + 1]].sort().join("-");
          pheromones.set(edge, (pheromones.get(edge) || 0) + pheromone_deposit);
        }
      }

      if (bestPath.length === componentNodeIds.length) break;
    }
    return bestPath;
  }

  function getConnectedComponents(nodes, adj) {
    const visited = new Set();
    const components = [];
    nodes.forEach((node) => {
      if (!visited.has(node.id)) {
        const component = [];
        const q = [node.id];
        visited.add(node.id);
        while (q.length > 0) {
          const u = q.shift();
          component.push(u);
          (adj.get(u) || []).forEach((vInfo) => {
            if (!visited.has(vInfo.node)) {
              visited.add(vInfo.node);
              q.push(vInfo.node);
            }
          });
        }
        components.push(component);
      }
    });
    return components;
  }

  function calculateMoveChanges(path, adj) {
    let changes = 0;
    let lastPieces = null;
    for (let i = 0; i < path.length - 1; i++) {
      const u = path[i];
      const v = path[i + 1];
      const edge = (adj.get(u) || []).find((e) => e.node === v);
      if (edge) {
        if (lastPieces && edge.pieces !== lastPieces) changes++;
        lastPieces = edge.pieces;
      }
    }
    return changes;
  }

  window.saveTourData = () => {
    if (tourPath && tourPath.length > 0) {
      saveJson(tourPath, "tour.json");
      console.log(`Saved a tour of length ${tourPath.length} to tour.json`);
    } else {
      console.error("No tour data to save. Please find a tour first.");
    }
  };
  // --- END NEW ---

  updateLinks(allLinks);
}

renderGraph();

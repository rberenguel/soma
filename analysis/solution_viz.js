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
    document.body.innerHTML = "<h1>No graph data found. Please generate it from the main page first.</h1>";
    throw new Error("Graph data not found in sessionStorage.");
  }
  
  const { nodes, links } = JSON.parse(storedData);
  
  const pieceColors = new Map([
    ['A', '#268bd2'], ['B', '#6c71c4'], ['C', '#b58900'],
    ['D', '#859900'], ['E', '#dc322f'], ['F', '#d33682'],
    ['G', '#cb4b16']
  ]);

  const width = window.innerWidth;
  const height = window.innerHeight;
  let isLocked = false;
  const svg = d3.select("body").append("svg").attr("viewBox", [0, 0, width, height]);

  const nodeSize = 35;

  // --- CUSTOM FORCE FOR ISOLATED NODES ---
  const connectedNodeIds = new Set();
  links.forEach(l => {
    // d3 works with objects, but the initial data is just IDs
    const sourceId = typeof l.source === 'object' ? l.source.id : l.source;
    const targetId = typeof l.target === 'object' ? l.target.id : l.target;
    connectedNodeIds.add(sourceId);
    connectedNodeIds.add(targetId);
  });
  const isolatedNodes = nodes.filter(n => !connectedNodeIds.has(n.id));
  
  function isolatedNodeGravity(alpha) {
    const gravity = 0.05 * alpha; // A gentle pull
    isolatedNodes.forEach(node => {
      node.vx += (width / 2 - node.x) * gravity;
      node.vy += (height / 2 - node.y) * gravity;
    });
  }
  // --- END CUSTOM FORCE ---

  const simulation = d3.forceSimulation(nodes)
    .force("link", d3.forceLink(links).id(d => d.id).distance(150).strength(0.4))
    .force("charge", d3.forceManyBody().strength(-80))
    .force("collide", d3.forceCollide().radius(nodeSize * 0.9))
    .force("center", d3.forceCenter(width / 2, height / 2).strength(0.05))
    .force("isolatedGravity", isolatedNodeGravity); // Add the custom force

  const tooltip = d3.select("body").append("div").attr("class", "tooltip");
  const totalEdgeWidth = 2;

  const linkGroups = svg.append("g")
    .attr("class", "links")
    .selectAll("g")
    .data(links)
    .join("g")
    .attr("class", d => `link-group move-${d.moveType}-piece`)
    .on("mouseover", function(event, d) {
      const group = d3.select(this);
      group.selectAll("line.strand").style("stroke-opacity", 1.0);
      group.append("text").attr("class", "link-label").attr("x", (d.source.x + d.target.x) / 2).attr("y", (d.source.y + d.target.y) / 2).text(d.pieces.split(',').join(''));
      tooltip.transition().duration(200).style("opacity", .9).html(`Move: ${d.pieces}`).style("left", (event.pageX + 5) + "px").style("top", (event.pageY - 28) + "px");
    })
    .on("mouseout", function() {
      const group = d3.select(this);
      group.selectAll("line.strand").style("stroke-opacity", 0.5);
      group.select("text.link-label").remove();
      tooltip.transition().duration(500).style("opacity", 0);
    });

  linkGroups.each(function(d) {
    const group = d3.select(this);
    const strands = d.pieces.split(',');
    const strandWidth = Math.max(0.5, totalEdgeWidth / strands.length);

    group.append("line").attr("class", "hit-area").style("stroke", "transparent").style("stroke-width", 10);
    strands.forEach(piece => {
      group.append("line").attr("class", "strand").classed("three-piece", d.moveType === 3).style("stroke", pieceColors.get(piece)).style("stroke-width", strandWidth.toFixed(2)).style("stroke-opacity", 0.5);
    });
  });

  const node = svg.append("g").selectAll("g").data(nodes).join("g").attr("class", "node")
    .call(d3.drag().on("start", dragstarted).on("drag", dragged).on("end", dragended));

  node.append("image")
    .attr("href", d => d.imagePath)
    .attr("width", nodeSize).attr("height", nodeSize)
    .attr("x", -nodeSize / 2).attr("y", -nodeSize / 2)
    .attr("onerror", "this.setAttribute('href', '../media/placeholder.png')");

  simulation.on("tick", () => {
    linkGroups.each(function(d) {
      const group = d3.select(this);
      const { source, target } = d;
      group.select("line.hit-area").attr("x1", source.x).attr("y1", source.y).attr("x2", target.x).attr("y2", target.y);
      const dx = target.x - source.x, dy = target.y - source.y, length = Math.sqrt(dx * dx + dy * dy);
      if (length === 0) return;
      const nx = -dy / length, ny = dx / length;
      const numStrands = d.pieces.split(',').length, strandWidth = Math.max(0.5, totalEdgeWidth / numStrands);
      group.selectAll("line.strand").each(function(_, i) {
        const offset = (i - (numStrands - 1) / 2) * strandWidth;
        d3.select(this).attr("x1", source.x + offset * nx).attr("y1", source.y + offset * ny).attr("x2", target.x + offset * nx).attr("y2", target.y + offset * ny);
      });
    });
    node.attr("transform", d => `translate(${d.x},${d.y})`);
  });

  function dragstarted(event, d) {
    if (!event.active) {
      if (!isLocked) { simulation.alphaTarget(0.3).restart(); }
      else { simulation.alpha(0.1).restart(); }
    }
    d.fx = d.x; d.fy = d.y;
  }
  function dragged(event, d) {
    d.fx = event.x; d.fy = event.y;
  }
  function dragended(event, d) {
    if (!isLocked) {
      if (!event.active) { simulation.alphaTarget(0); }
      d.fx = null; d.fy = null;
    }
  }
  
  const lockBtn = document.getElementById('lock-btn');
  const downloadBtn = document.getElementById('download-btn');
  
  lockBtn.addEventListener('click', () => {
    isLocked = true;
    simulation.force("charge").strength(0);
    simulation.force("link").strength(0);
    simulation.force("center", null);
    simulation.alpha(0.1).restart();
    lockBtn.textContent = 'Positions Locked ✨';
    lockBtn.disabled = true;
    downloadBtn.disabled = false;
    node.selectAll("circle").attr("stroke", "#2aa198");
  });
  
  downloadBtn.addEventListener('click', () => {
    saveSvg(svg.node(), 'soma-solution-graph.svg');
  });
}

renderGraph();
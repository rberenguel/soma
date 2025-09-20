// class_viz.js
export function renderClassChordDiagram(targetSelector, graphData) {
  const { matrix, names, colors } = graphData;

  const container = d3.select(targetSelector);
  container.html(""); // Clear previous content

  const width = 300; // Fixed size for the small multiples
  const height = 300;

  const svg = container
    .append("svg")
    .attr("viewBox", [-width / 2, -height / 2, width, height]);

  const outerRadius = Math.min(width, height) * 0.5 - 20,
    innerRadius = outerRadius - 10;

  const chord = d3.chord().padAngle(0.05).sortSubgroups(d3.descending);

  const arc = d3.arc().innerRadius(innerRadius).outerRadius(outerRadius);

  const ribbon = d3.ribbon().radius(innerRadius);

  const color = d3.scaleOrdinal(names, colors);

  const chords = chord(matrix);

  const group = svg.append("g").selectAll("g").data(chords.groups).join("g");

  group
    .append("path")
    .attr("fill", (d) => color(names[d.index]))
    .attr("stroke", (d) => d3.rgb(color(names[d.index])).darker())
    .attr("d", arc);

  group
    .append("text")
    .each((d) => (d.angle = (d.startAngle + d.endAngle) / 2))
    .attr("dy", "0.35em")
    .attr(
      "transform",
      (d) => `
        rotate(${(d.angle * 180) / Math.PI - 90})
        translate(${outerRadius + 5})
        ${d.angle > Math.PI ? "rotate(180)" : ""}
      `,
    )
    .attr("text-anchor", (d) => (d.angle > Math.PI ? "end" : null))
    .text((d) => names[d.index]);

  svg
    .append("g")
    .attr("fill-opacity", 0.67)
    .selectAll("path")
    .data(chords)
    .join("path")
    .attr("d", ribbon)
    .attr("fill", (d) => color(names[d.target.index]))
    .attr("stroke", (d) => d3.rgb(color(names[d.target.index])).darker());
}

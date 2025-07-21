function parseThorleifBlock(blockText) {
  const lines = blockText
    .trim()
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l);
  if (lines.length < 2) return null;

  const name = lines[0].substring(1);
  const gridLines = lines.slice(1);

  const sampleLine = gridLines[0].substring(1);
  const zParts = sampleLine.split("/");

  const height = gridLines.length; // Y-axis
  const depth = zParts.length; // Z-axis
  const width = zParts[0].length; // X-axis

  if (width === 0 || height === 0 || depth === 0) return null;

  const grid = Array(width)
    .fill(0)
    .map(() =>
      Array(height)
        .fill(0)
        .map(() => Array(depth).fill(0)),
    );

  for (let y = 0; y < height; y++) {
    const lineZparts = gridLines[y].substring(1).split("/");
    for (let z = 0; z < depth; z++) {
      const cells = lineZparts[z] || "";
      for (let x = 0; x < width; x++) {
        if (x < cells.length && cells[x] !== ".") {
          grid[x][y][z] = 1;
        }
      }
    }
  }

  return { name, grid };
}

export async function loadPuzzles() {
  const puzzles = [];
  try {
    const response = await fetch("extra-puzzles/puzzles.md");
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const markdownText = await response.text();
    const codeBlockRegex = /```([\s\S]*?)```/g;
    let match;
    while ((match = codeBlockRegex.exec(markdownText)) !== null) {
      const puzzle = parseThorleifBlock(match[1]);
      if (puzzle) {
        puzzles.push(puzzle);
      }
    }
    console.log(`Loaded ${puzzles.length} puzzles.`);
  } catch (e) {
    console.error("Failed to load or parse puzzles.md:", e);
  }
  return puzzles;
}

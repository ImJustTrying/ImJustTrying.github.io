/*
 * Kevin Vicente
 * June 2020
 *
 * Here we implement all of the distinct maze generation and graph search algorithms.
 * This file depends on dom.ts, ui.ts, and graph.ts.
 * An explanation of how this file does what it does:
 * (1) We have a draw queue, which is a queue of vertices to animate on the canvas
 * (2) We have have two drawing procedures -- one for drawing mazes and the other for paths
 * (3) We have a procedure for every maze generation and graph traversal algorithm, which will add
 * vertices to the draw queue, and will also call window.requestAnimationFrame() on the
 * appropriate drawing procedure.
 * (4) We assume that only a single maze generation or graph traversal procedure is running at any
 * given point in time during execution.
 */

const draw_queue: Vertex[] = [];

function draw_maze(timestamp: number): void {

}

function draw_path(timestamp: number): void {

}

function recursive_backtracker(): Vertex {
  // Fill the entire graph with walls
  const width: number = ui.state.get_width();
  const height: number = ui.state.get_height();
  for (let x = 0; x < width; x += 1) {
    for (let y = 0; y < height; y += 1) {
      if (x === 0 && y === 0) { continue; }
      ui.state.set_wall({x:x, y:y});
    }
  }
  window.requestAnimationFrame(

  const initial: Vertex = {x: 0, y: 0};
  const stack: Vertex[] = [initial];

  while (stack.length > 0) {
    const current: Vertex = stack.pop();
    const neighbors: Vertex[] =
      ui.state
      .get_neighbors(current, true)
      .filter((v) => !ui.state.was_visited(v));

    if (neighbors.length > 0) {
      stack.push(current);
      ui.state.set_void(neighbors[0]);
      ui.state.mark_visited(neighbors[0]);
      stack.push(neighbors[0]);
    }
  }

  
}

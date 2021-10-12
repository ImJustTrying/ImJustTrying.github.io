/*
 * Kevin Vicente
 * June 2020
 *
 * Here we implement all of the distinct graph search algorithms.
 * This file depends on dom.ts, ui.ts, and graph.ts.
 * An explanation of how this file does what it does:
 * (1) We have a draw queue, which is a queue of vertices to animate on the canvas
 * (2) We have have one drawing procedure -- for drawing paths
 * (3) We have a procedure for every graph traversal algorithm, which will add
 * vertices to the draw queue, and will also call window.requestAnimationFrame() on the
 * appropriate drawing procedure.
 * (4) We assume that only a graph traversal procedure is running at any
 * given point in time during execution.
 */

interface Chamber {
  x1: number,
  y1: number,
  x2: number,
  y2: number
}

const draw_queue: Vertex[] = [];
let last_vertex;
let set_interval_id;

// Drawing procedure. Note that this is called using setInterval, not directly.
function draw_path(): void {
  const cs: number = ui.cell_size;
  if (draw_queue.length > 0) {
    const v: Vertex = draw_queue.shift();
    if (!ui.state.is_special_vertex_at(last_vertex)) {
      // Change the color of the last drawn vertex to dark gray
      ui.ctx.fillRect(last_vertex.x * cs, last_vertex.y * cs, cs, cs);
    }
    if (!ui.state.is_special_vertex_at(v)) {
      // Change the color of the newly drawn vertex to light gray
      ui.ctx.fillStyle = "#cccccc";
      ui.ctx.fillRect(v.x * cs, v.y * cs, cs, cs);
      ui.ctx.fillStyle = "#8c8c8c";
    }
    last_vertex = v;
  } else {
    // Draw path with red cells
    ui.ctx.fillStyle = "#cc0000";
    let current: Vertex = last_vertex.ancestor;
    while (current.ancestor !== undefined) {
      ui.ctx.fillRect(current.x * cs, current.y * cs, cs, cs);
      current = current.ancestor;
    }
    ui.ctx.fillStyle = "#ffffff";

    clearInterval(set_interval_id);
    set_interval_id = undefined;
    last_vertex = undefined;
  }
}


// Graph algorithms
function bfs(): void {
  const first: Vertex = ui.state.get_special_vertex(CellType.Start);
  first.ancestor = undefined;
  const queue: Vertex[] = [first];
  ui.state.clear_visited();
  ui.state.clear_marked();

  while (queue.length > 0) {
    const current: Vertex = queue.shift();
    const special_vertex: Option<Vertex> = ui.state.get_special_vertex_at(current);
    ui.state.set_visited(current);
    draw_queue.push(current);
    if (special_vertex.ok && special_vertex.value.cell_type === CellType.Goal) {
      break;
    }

    ui.state.get_neighbors(current, true)
    .filter((v) =>
      !ui.state.was_visited(v) && !ui.state.is_marked(v) && !ui.state.is_wall(v)
    ).map((v) => {
      ui.state.set_marked(v);
      queue.push(v);
      v.ancestor = current;
    });
  }

  draw();
  last_vertex = draw_queue.shift();
  set_interval_id = setInterval(draw_path, 1000 / draw_frequency);
}


// The evaluation function will take the current state and the total accumulated cost up to and
// excluding the current state.
function best_first_search(evaluation: (Vertex, number) => number): void {
  ui.state.clear_visited();
  ui.state.clear_marked();

  const first: Vertex = ui.state.get_special_vertex(CellType.Start);
  first.ancestor = undefined;
  const frontier: PriorityQueue = new PriorityQueue([new QElem(first, evaluation(first, 0), 0)]);

  while (!frontier.is_empty()) {
    const current: QElem = frontier.dequeue().value;
    const special_vertex_opt: Option<Vertex> = ui.state.get_special_vertex_at(current.element);
    ui.state.set_visited(current.element);
    draw_queue.push(current.element);
    if (special_vertex_opt.ok && special_vertex_opt.value.cell_type === CellType.Goal) {
      break;
    }

    ui.state.get_neighbors(current.element)
    .filter((v) =>
      !(ui.state.was_visited(v) || ui.state.is_marked(v) || ui.state.is_wall(v))
    ).map((v) => {
      ui.state.set_marked(v);
      frontier.enqueue(v, evaluation(v, current.cost), current.cost + 1);
      v.ancestor = current.element;
    });
  }

  draw();
  last_vertex = draw_queue.shift();
  set_interval_id = setInterval(draw_path, 1000 / draw_frequency);
}

// We do BFS from the bottom right to find an empty cell to place the goal vertex
function get_goal(): Vertex {
  const br: Vertex = { x: ui.state.get_width() - 1, y: ui.state.get_height() - 1 };
  const queue: Vertex[] = [br];
  ui.state.clear_visited();

  while (queue.length > 0) {
    const current: Vertex = queue.shift();
    ui.state.set_visited(current);
    if (!ui.state.is_wall(current) && !ui.state.is_special_vertex_at(current)) {
      return current;
    }
    // Only push vertices to the queue if they have not been visited and they are not already in
    // the queue
    ui.state.get_neighbors(current, true)
      .filter((v) => !ui.state.was_visited(v))
      .filter((v) => !queue.reduce((acc, e) => vertices_equal(v, e) || acc, false))
      .map((v) => queue.push(v));
  }
  ui.state.set_void(br);
  return br;
}

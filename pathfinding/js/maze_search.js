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
var draw_queue = [];
var last_vertex;
var set_interval_id;
// Drawing procedures
function draw_maze(timestamp) {
}
function draw_path() {
    var cs = ui.cell_size;
    if (draw_queue.length > 0) {
        var v = draw_queue.shift();
        if (last_vertex !== undefined && !ui.state.is_special_vertex_at(last_vertex)) {
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
    }
    else {
        // Fill the last vertex with white
        ui.ctx.fillRect(last_vertex.x * cs, last_vertex.y * cs, cs, cs);
        ui.ctx.fillStyle = "#ffffff";
        clearInterval(set_interval_id);
        set_interval_id = undefined;
        last_vertex = undefined;
    }
}
// Graph algorithms
function bfs() {
    var queue = [ui.state.get_special_vertex(CellType.Start)];
    ui.state.clear_visited();
    ui.state.clear_marked();
    while (queue.length > 0) {
        var current = queue.shift();
        var special_vertex = ui.state.get_special_vertex_at(current);
        ui.state.set_visited(current);
        if (special_vertex.ok && special_vertex.value.cell_type === CellType.Goal) {
            break;
        }
        if (!special_vertex.ok) {
            draw_queue.push(current);
        }
        ui.state.get_neighbors(current, true)
            .filter(function (v) {
            return !ui.state.was_visited(v) && !ui.state.is_marked(v) && !ui.state.is_wall(v);
        }).map(function (v) {
            ui.state.set_marked(v);
            queue.push(v);
        });
    }
    console.debug(draw_queue.length);
    draw();
    set_interval_id = setInterval(draw_path, 1000 / draw_frequency);
}
// The evaluation function will take the current state and the total accumulated cost up to and
// excluding the current state.
function best_first_search(evaluation) {
    ui.state.clear_visited();
    ui.state.clear_marked();
    var first = ui.state.get_special_vertex(CellType.Start);
    var frontier = new PriorityQueue([new QElem(first, evaluation(first, 0), 0)]);
    var _loop_1 = function () {
        var current = frontier.dequeue().value;
        var special_vertex_opt = ui.state.get_special_vertex_at(current.element);
        ui.state.set_visited(current.element);
        if (special_vertex_opt.ok && special_vertex_opt.value.cell_type === CellType.Goal) {
            return "break";
        }
        if (!special_vertex_opt.ok) {
            draw_queue.push(current.element);
        }
        ui.state.get_neighbors(current.element)
            .filter(function (v) {
            return !(ui.state.was_visited(v) || ui.state.is_marked(v) || ui.state.is_wall(v));
        }).map(function (v) {
            ui.state.set_marked(v);
            frontier.enqueue(v, evaluation(v, current.cost), current.cost + 1);
        });
    };
    while (!frontier.is_empty()) {
        var state_1 = _loop_1();
        if (state_1 === "break")
            break;
    }
    draw();
    set_interval_id = setInterval(draw_path, 1000 / draw_frequency);
}
// We do BFS from the bottom right to find an empty cell to place the goal vertex
function get_goal() {
    var br = { x: ui.state.get_width() - 1, y: ui.state.get_height() - 1 };
    var queue = [br];
    ui.state.clear_visited();
    while (queue.length > 0) {
        var current = queue.shift();
        ui.state.set_visited(current);
        if (!ui.state.is_wall(current) && !ui.state.is_special_vertex_at(current)) {
            return current;
        }
        // Only push vertices to the queue if they have not been visited and they are not already in
        // the queue
        ui.state.get_neighbors(current, true)
            .filter(function (v) { return !ui.state.was_visited(v); })
            .filter(function (v) { return !queue.reduce(function (acc, e) { return vertices_equal(v, e) || acc; }, false); })
            .map(function (v) { return queue.push(v); });
    }
    ui.state.set_void(br);
    return br;
}

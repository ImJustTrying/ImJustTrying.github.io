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
        if (last_vertex !== undefined) {
            // Change the color of the last drawn vertex to dark gray
            ui.ctx.fillRect(last_vertex.x * cs, last_vertex.y * cs, cs, cs);
        }
        // Change the color of the newly drawn vertex to light gray
        ui.ctx.fillStyle = "#cccccc";
        ui.ctx.fillRect(v.x * cs, v.y * cs, cs, cs);
        ui.ctx.fillStyle = "#8c8c8c";
        last_vertex = v;
        if (ui.state.is_special_vertex_at(v) || ui.state.is_special_vertex_at(last_vertex)) {
            draw_icons();
        }
    }
    else {
        // Fill the last vertex with white
        ui.ctx.fillRect(last_vertex.x * cs, last_vertex.y * cs, cs, cs);
        ui.ctx.fillStyle = "#ffffff";
        clearInterval(set_interval_id);
        if (ui.state.is_special_vertex_at(last_vertex)) {
            draw_icons();
        }
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
        draw_queue.push(current);
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
    set_interval_id = setInterval(draw_path, draw_frequency);
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
        draw_queue.push(current.element);
        ui.state.set_visited(current.element);
        if (special_vertex_opt.ok && special_vertex_opt.value.cell_type === CellType.Goal) {
            return "break";
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
    set_interval_id = setInterval(draw_path, draw_frequency);
}
// Maze generation algorithms
function recursive_backtracker() {
    console.debug("called");
    // Fill the entire graph with walls
    var width = ui.state.get_width();
    var height = ui.state.get_height();
    for (var x = 0; x < width; x += 1) {
        for (var y = 0; y < height; y += 1) {
            if (x === 0 && y === 0) {
                continue;
            }
            ui.state.set_wall({ x: x, y: y });
        }
    }
    ui.state.clear_visited();
    var i = 0;
    var initial = { x: 0, y: 0 };
    var stack = [initial];
    ui.state.set_visited(initial);
    while (stack.length > 0 && i < 2000) {
        var current = stack.pop();
        var neighbors = ui.state
            .get_neighbors(current, true)
            .filter(function (v) { return !ui.state.was_visited(v); });
        if (neighbors.length > 0) {
            stack.push(current);
            ui.state.set_void(neighbors[0]);
            ui.state.set_visited(neighbors[0]);
            stack.push(neighbors[0]);
        }
        i += 1;
    }
    console.debug(i);
}
function randomized_kruskal() {
}
function recursive_division() {
    ui.state.clear_walls();
    var chambers = [{
            x1: 0,
            y1: 0,
            x2: ui.state.get_width() - 1,
            y2: ui.state.get_height() - 1
        }];
    var i = 0;
    function check_bounds(chamber, wall, is_vertical) {
        var blocking_lower_hole;
        var blocking_upper_hole;
        if (is_vertical) {
            blocking_lower_hole =
                !ui.state.is_wall({ x: wall, y: chamber.y1 - 1 }) &&
                    ui.state.is_wall({ x: wall - 1, y: chamber.y1 - 1 }) &&
                    ui.state.is_wall({ x: wall + 1, y: chamber.y1 - 1 });
            blocking_upper_hole =
                !ui.state.is_wall({ x: wall, y: chamber.y2 + 1 }) &&
                    ui.state.is_wall({ x: wall - 1, y: chamber.y2 + 1 }) &&
                    ui.state.is_wall({ x: wall + 1, y: chamber.y2 + 1 });
        }
        else {
            blocking_lower_hole =
                !ui.state.is_wall({ x: chamber.x1 - 1, y: wall }) &&
                    ui.state.is_wall({ x: chamber.x1 - 1, y: wall - 1 }) &&
                    ui.state.is_wall({ x: chamber.x1 - 1, y: wall + 1 });
            blocking_upper_hole =
                !ui.state.is_wall({ x: chamber.x2 + 1, y: wall }) &&
                    ui.state.is_wall({ x: chamber.x2 + 1, y: wall - 1 }) &&
                    ui.state.is_wall({ x: chamber.x2 + 1, y: wall + 1 });
        }
        return [blocking_lower_hole, blocking_upper_hole];
    }
    while (chambers.length > 0) {
        // Generate two random walls that span the entire width and height of the chamber respectively
        var chamber = chambers.shift();
        var chamber_width = chamber.x2 - chamber.x1 + 1;
        var chamber_height = chamber.y2 - chamber.y1 + 1;
        if (chamber_width >= 2 && chamber_height >= 2) {
            var is_vertical = void 0;
            var wall = void 0;
            var hole = void 0;
            if (chamber_width > chamber_height) {
                is_vertical = true;
            }
            else if (chamber_height > chamber_width) {
                is_vertical = false;
            }
            else {
                is_vertical = gen_random_int(0, 2).value === 0;
            }
            if (is_vertical) {
                wall = gen_random_int(chamber.x1, chamber.x2 + 1).value;
                var blocking = check_bounds(chamber, wall, is_vertical);
                if (blocking[0] || blocking[1]) {
                    var invalid_walls = [wall];
                    var failed = false;
                    while (blocking[0] || blocking[1]) {
                        wall = gen_random_int(chamber.x1, chamber.x2 + 1, invalid_walls).value;
                        if (wall === undefined) {
                            failed = true;
                            break;
                        }
                        blocking = check_bounds(chamber, wall, is_vertical);
                    }
                    if (failed) {
                        continue;
                    }
                    console.debug("((" + chamber.x1 + ", " + chamber.y1 + "), (" + chamber.x2 + ", " + chamber.y2 + "))");
                }
                hole = gen_random_int(chamber.y1, chamber.y2 + 1).value;
                // set the wall in the ui's graph
                for (var y = chamber.y1; y <= chamber.y2; y += 1) {
                    if (y === 0 && wall === 0 || y === hole) {
                        continue;
                    }
                    ui.state.set_wall({ x: wall, y: y });
                }
                // Now add the subchambers to the queue
                chambers.push({ x1: chamber.x1, x2: wall - 1, y1: chamber.y1, y2: chamber.y2 });
                chambers.push({ x1: wall + 1, x2: chamber.x2, y1: chamber.y1, y2: chamber.y2 });
            }
            else {
                wall = gen_random_int(chamber.y1, chamber.y2 + 1).value;
                var blocking = check_bounds(chamber, wall, is_vertical);
                if (blocking[0] || blocking[1]) {
                    console.debug("((" + chamber.x1 + ", " + chamber.y1 + "), (" + chamber.x2 + ", " + chamber.y2 + "))");
                    while (blocking[0] || blocking[1]) {
                        wall = gen_random_int(chamber.y1, chamber.y2 + 1).value;
                        blocking = check_bounds(chamber, wall, is_vertical);
                    }
                }
                hole = gen_random_int(chamber.x1, chamber.x2 + 1).value;
                for (var x = chamber.x1; x <= chamber.x2; x += 1) {
                    if (x === 0 && wall === 0 || x === hole) {
                        continue;
                    }
                    ui.state.set_wall({ x: x, y: wall });
                }
                chambers.push({ x1: chamber.x1, x2: chamber.x2, y1: chamber.y1, y2: wall - 1 });
                chambers.push({ x1: chamber.x1, x2: chamber.x2, y1: wall + 1, y2: chamber.y2 });
            }
            draw();
            i += 1;
        }
    }
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

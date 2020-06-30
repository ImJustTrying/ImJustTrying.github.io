/*
 * Kevin Vicente
 * June 2020
 *
 * Contains all the UI code, which establishes a view component -- i.e. code that serves as a
 * user-facing interface to the state of the graph, which is handled by graph.ts.
 * We use two canvases to display the UI -- one is the background, which is simply the grid lines
 * that are drawn only once; the other is the foreground where icons and walls are drawn.
 */
var Search;
(function (Search) {
    Search[Search["AStar"] = 0] = "AStar";
    Search[Search["Dijkstra"] = 1] = "Dijkstra";
    Search[Search["BFS"] = 2] = "BFS";
    Search[Search["DFS"] = 3] = "DFS";
})(Search || (Search = {}));
var Maze;
(function (Maze) {
    Maze[Maze["Division"] = 0] = "Division";
    Maze[Maze["BinaryTree"] = 1] = "BinaryTree";
    Maze[Maze["Backtracker"] = 2] = "Backtracker";
    Maze[Maze["Kruskal"] = 3] = "Kruskal";
    Maze[Maze["Prim"] = 4] = "Prim";
    Maze[Maze["Wilson"] = 5] = "Wilson";
})(Maze || (Maze = {}));
var ui;
var avg_draw_time = 0; // In milliseconds
var draw_calls = 0;
var last_draw_count = 0;
var search_method = Search.AStar;
var maze_generator = Maze.Division;
var walling_enabled = false;
var last_mouse_cell = { x: 0, y: 0 };
var mouse = { x: 0, y: 0 };
var wall_drawing = true; // If false, we erase walls when moused over
function update_mouse_coords(event) {
    event.preventDefault();
    //event.stopPropogation();
    var rect = this.getBoundingClientRect();
    var pixel_coord = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    mouse.x = pixel_coord.x;
    mouse.y = pixel_coord.y;
}
function change_wall_status(event) {
    if (walling_enabled) {
        var cell_coord = {
            x: (mouse.x - mouse.x % ui.cell_size) / ui.cell_size,
            y: (mouse.y - mouse.y % ui.cell_size) / ui.cell_size
        };
        // We want to flip once we enter the cell, but not again until we leave it
        if (!vertices_equal(last_mouse_cell, cell_coord) &&
            cell_coord.x < ui.state.width && cell_coord.y < ui.state.height) {
            // console.debug(`drawing wall at (${cell_coord.x}, ${cell_coord.y})`);
            if (wall_drawing) {
                ui.state.set_wall(cell_coord);
                ui.ctx.fillRect(cell_coord.x * ui.cell_size, cell_coord.y * ui.cell_size, ui.cell_size, ui.cell_size);
            }
            else {
                ui.state.set_void(cell_coord);
                ui.ctx.clearRect(cell_coord.x * ui.cell_size, cell_coord.y * ui.cell_size, ui.cell_size, ui.cell_size);
            }
            last_mouse_cell = cell_coord;
        }
    }
}
function draw_grid() {
    var ctx = ui.background.getContext("2d", { alpha: false });
    var cellsize = ui.cell_size;
    var graph_width_in_pixels = ui.state.width * cellsize;
    var graph_height_in_pixels = ui.state.height * cellsize;
    ctx.save();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1;
    // Draw gridlines
    for (var x = 0; x <= ui.state.width; x += 1) {
        for (var y = 0; y <= ui.state.height; y += 1) {
            // The reasoning behind this is explained here:
            // https://stackoverflow.com/questions/7530593/html5-canvas-and-line-width/7531540#7531540
            var x_coord = x * cellsize + 0.5;
            var y_coord = y * cellsize + 0.5;
            ctx.moveTo(x_coord, 0);
            ctx.lineTo(x_coord, graph_height_in_pixels);
            ctx.moveTo(0, y_coord);
            ctx.lineTo(graph_width_in_pixels, y_coord);
        }
    }
    ctx.stroke();
    ctx.restore();
}
function draw(timestamp) {
    var start_time = performance.now();
    //console.debug("draw was called");
    var ctx = ui.ctx;
    var cellsize = ui.cell_size;
    var vertices = ui.state.get_special_vertices_copy();
    // Corresponds to the cell that the mouse is bounded by
    var cell_coord = {
        x: (mouse.x - mouse.x % cellsize) / cellsize,
        y: (mouse.y - mouse.y % cellsize) / cellsize
    };
    ctx.font = "600 " + cellsize.toString() + "px 'Font Awesome 5 Free'";
    ctx.fillStyle = "white";
    ctx.textBaseline = "bottom";
    ui.clear();
    // If the mouse exits the grid, draw the 
    if (cell_coord.x >= ui.state.width) {
        cell_coord.x = ui.state.width - 1;
    }
    if (cell_coord.y >= ui.state.height) {
        cell_coord.y = ui.state.height - 1;
    }
    /*
    // Draw icons for special vertices
    if (ui.drag[0]) {
      ctx.fillText(ui.drag[1].icon, mouse.x, mouse.y);
    }
    for (const vertex of vertices) {
      if (!vertices_equal(vertex, ui.drag[1])) { // Don't draw the icon we're dragging
        ctx.fillText(vertex.icon, vertex.x * cellsize, (vertex.y + 1) * cellsize);
      }
    }
    */
    // Draw walls
    ctx.fillStyle = "#fff";
    for (var _i = 0, _a = ui.state.get_walls(); _i < _a.length; _i++) {
        var v = _a[_i];
        ctx.fillRect(v.x * cellsize, v.y * cellsize, cellsize, cellsize);
    }
    avg_draw_time = (avg_draw_time * draw_calls + performance.now() - start_time) / (draw_calls + 1);
    draw_calls += 1;
}
var UI = /** @class */ (function () {
    function UI(cell_size, state) {
        this.cell_size = cell_size;
        this.state = state;
        this.foreground = document.querySelector("#foreground");
        this.background = document.querySelector("#background");
        this.ctx = this.foreground.getContext("2d");
        this.drag = [false, { x: -1, y: -1 }];
        this.resize();
        // We add some event listeners for dragging and dropping icons.
        // Note that these only updated the dragging variable -- the actual drawing is done in draw().
        var drag = this.drag;
        var ctx = this.ctx;
        this.foreground.addEventListener("click", function (event) {
            var rect = this.getBoundingClientRect();
            var pixel_coord = { x: event.clientX - rect.left, y: event.clientY - rect.top };
            var cell_coord = {
                x: (pixel_coord.x - pixel_coord.x % cell_size) / cell_size,
                y: (pixel_coord.y - pixel_coord.y % cell_size) / cell_size
            };
            // If we are not currently dragging anything, check that there is a special vertex at the
            // cell that was clicked, and if there is set dragging to true.
            if (!drag[0]) {
                var special_vertices = state.get_special_vertices_copy();
                for (var i = 0; i < special_vertices.length; i += 1) {
                    if (vertices_equal(special_vertices[i], cell_coord)) {
                        drag[0] = true;
                        drag[1] = special_vertices[i];
                        this.addEventListener("mousemove", update_mouse_coords);
                        this.event_listener_exists = true;
                    }
                }
                // If we don't click on a special vertex, we want to fill the selected cell with a wall if
                // empty, otherwise remove the wall
                if (walling_enabled) {
                    state.flip_wall_status(cell_coord);
                }
            }
            // Otherwise, if we are dragging something check that the cell that was clicked is empty --
            // i.e. has no special vertices, and if empty set dragging to false.
            else {
                var special_vertices = state.get_special_vertices_copy();
                for (var i = 0; i < special_vertices.length; i += 1) {
                    if (vertices_equal(special_vertices[i], cell_coord)) {
                        return;
                    }
                }
                drag[0] = !state.set_special_vertex(cell_coord, drag[1].cell_type);
                if (this.event_listener_exists) {
                    this.removeEventListener("mousemove", update_mouse_coords);
                    this.event_listener_exists = false;
                }
            }
        });
        this.foreground.addEventListener("mousedown", function (event) {
            walling_enabled = true;
            this.addEventListener("mousemove", update_mouse_coords);
            this.addEventListener("mousemove", change_wall_status);
        });
        this.foreground.addEventListener("mouseup", function (event) {
            this.removeEventListener("mousemove", update_mouse_coords);
            this.removeEventListener("mousemove", change_wall_status);
            walling_enabled = false;
        });
    }
    UI.prototype.resize = function () {
        this.foreground.width = window.innerWidth - 10;
        this.background.width = window.innerWidth - 10;
        this.foreground.height = window.innerHeight - 60;
        this.background.height = window.innerHeight - 60;
        this.state.width = (this.foreground.width - this.foreground.width % this.cell_size) / this.cell_size;
        this.state.height = (this.foreground.height - this.foreground.height % this.cell_size) / this.cell_size;
    };
    UI.prototype.clear = function () {
        this.ctx.clearRect(0, 0, this.foreground.width, this.foreground.height);
    };
    return UI;
}());
// These are all DOM methods -- i.e. onX methods
function init() {
    document.fonts.ready.then(function () {
        var state = new Graph();
        ui = new UI(30, state);
        state.set_special_vertex({ x: 0, y: 0 }, CellType.Start);
        state.set_special_vertex({
            x: state.width - 1,
            y: state.height - 1
        }, CellType.Goal);
        draw_grid();
        window.requestAnimationFrame(draw);
    });
    setInterval(function () {
        console.debug("new draw calls: " + (draw_calls - last_draw_count));
        console.debug("draw rate: " + (draw_calls - last_draw_count) / 5 + " per second");
        console.debug("average draw call time: " + avg_draw_time * 0.001 + " seconds");
        last_draw_count = draw_calls;
    }, 5000);
}
function resize() {
    ui.resize();
    ui.state.set_special_vertex({ x: 0, y: 0 }, CellType.Start);
    ui.state.set_special_vertex({
        x: ui.state.width - 1,
        y: ui.state.height - 1
    }, CellType.Goal);
    draw_grid();
    window.requestAnimationFrame(draw);
}
function update_search() {
    var element = document.getElementById("search");
    var value = element.options[element.selectedIndex].value;
    switch (value) {
        case "astar": {
            search_method = Search.AStar;
            break;
        }
        case "dijkstra": {
            search_method = Search.Dijkstra;
            break;
        }
        case "bfs": {
            search_method = Search.BFS;
            break;
        }
        case "dfs": {
            search_method = Search.DFS;
            break;
        }
    }
}
function update_maze() {
    var element = document.getElementById("maze");
    var value = element.options[element.selectedIndex].value;
    switch (value) {
        case "rediv": {
            maze_generator = Maze.Division;
            break;
        }
        case "binary": {
            maze_generator = Maze.BinaryTree;
            break;
        }
        case "reback": {
            maze_generator = Maze.Backtracker;
            break;
        }
        case "kruskal": {
            maze_generator = Maze.Kruskal;
            break;
        }
        case "prim": {
            maze_generator = Maze.Prim;
            break;
        }
        case "wilson": {
            maze_generator = Maze.Wilson;
            break;
        }
    }
}
function switch_menu_state() {
    var menu = document.getElementById("edit-menu");
    var btn = document.getElementById("menu-slider");
    var arrows = document.getElementById("arrows");
    menu.style.width = (menu.style.width === "") ? "125px" : "";
    btn.style.right = (btn.style.right === "") ? "125px" : "";
    arrows.style.transform = (arrows.style.transform === "") ? "rotate(180deg)" : "";
}
function enable_btn(draw_walls) {
    wall_drawing = draw_walls;
    var write = document.getElementById("write");
    var erase = document.getElementById("erase");
    if (draw_walls) {
        write.classList.remove("disabled");
        write.classList.add("enabled");
        erase.classList.remove("enabled");
        erase.classList.add("disabled");
    }
    else {
        write.classList.remove("enabled");
        write.classList.add("disabled");
        erase.classList.remove("disabled");
        erase.classList.add("enabled");
    }
}

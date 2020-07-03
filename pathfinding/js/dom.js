/*
 * Kevin Vicente
 * June 2020
 *
 * This file will hold all the "onX" functions -- e.g. onload, onclick, etc.
 * Depends on ui.ts.
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
var search_method = Search.AStar;
var maze_generator = Maze.Division;
// These are all the DOM functions
function init() {
    document.fonts.ready.then(function () {
        var state = new Graph();
        ui = new UI(30, state);
        state.set_special_vertex({
            x: Math.floor(state.get_width() / 4),
            y: Math.floor(state.get_height() / 2)
        }, CellType.Start);
        state.set_special_vertex({
            x: Math.floor(3 * state.get_width() / 4),
            y: Math.floor(state.get_height() / 2)
        }, CellType.Goal);
        draw_grid();
        window.requestAnimationFrame(draw);
    });
    setInterval(function () {
        console.debug("new draw calls: " + (draw_calls - last_draw_count));
        console.debug("draw rate: " + (draw_calls - last_draw_count) / 5 + " per second");
        console.debug("average draw call time: " + avg_draw_time * 0.001 + " seconds");
        last_draw_count = draw_calls;
    }, 15000);
}
function resize() {
    ui.resize();
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
    editing[1] = draw_walls;
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
function zoom(zoom_in) {
    if (zoom_in && ui.cell_size <= 50) {
        ui.cell_size += 5;
    }
    else if (!zoom_in && ui.cell_size >= 30) {
        ui.cell_size -= 5;
    }
    resize();
    draw_grid();
    window.requestAnimationFrame(draw);
}
function clear_grid() {
    ui.state.clear_walls();
    window.requestAnimationFrame(draw);
}
function pathfind() {
    // Disable all buttons while pathfinding
    var btns = document.getElementsByTagName("button");
    for (var i = 0; i < btns.length; i += 1) {
        btns[i].disabled = true;
    }
    // Re-enable buttons
    for (var i = 0; i < btns.length; i += 1) {
        btns[i].disabled = false;
    }
}
function intermediates(add) {
    if (add) {
        ui.state.add_intermediate();
    }
    else {
        ui.state.remove_intermediate();
    }
    window.requestAnimationFrame(draw);
}

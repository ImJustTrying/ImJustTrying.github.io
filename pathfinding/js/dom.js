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
    Search[Search["UCS"] = 1] = "UCS";
    Search[Search["BFS"] = 2] = "BFS";
    Search[Search["GS"] = 3] = "GS";
})(Search || (Search = {}));
var search_method;
var draw_frequency = 1;
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
    update_search();
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
        case "ucs": {
            search_method = Search.UCS;
            break;
        }
        case "bfs": {
            search_method = Search.BFS;
            break;
        }
        case "gs": {
            search_method = Search.GS;
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
        write.classList.remove("disabled_color");
        write.classList.add("enabled");
        erase.classList.remove("enabled");
        erase.classList.add("disabled_color");
    }
    else {
        write.classList.remove("enabled");
        write.classList.add("disabled_color");
        erase.classList.remove("disabled_color");
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
    function manhattan_distance(v1, v2) {
        return Math.abs(v1.y - v2.y) + Math.abs(v1.x - v2.x);
    }
    // Disable all buttons while pathfinding
    var btns = document.getElementsByTagName("button");
    for (var i = 0; i < btns.length; i += 1) {
        btns[i].disabled = true;
    }
    switch (search_method) {
        case Search.BFS:
            bfs();
            break;
        case Search.GS:
            best_first_search(function (state, net_cost) {
                return manhattan_distance(state, ui.state.get_special_vertex(CellType.Goal));
            });
            break;
        case Search.UCS:
            best_first_search(function (state, net_cost) {
                return net_cost + 1;
            });
            break;
        case Search.AStar:
            best_first_search(function (state, net_cost) {
                return (net_cost + 1) +
                    manhattan_distance(state, ui.state.get_special_vertex(CellType.Goal));
            });
            break;
    }
    // Re-enable buttons
    for (var i = 0; i < btns.length; i += 1) {
        btns[i].disabled = false;
    }
}
// Rate is in Hz
function change_speed(rate) {
    var max_frequency = 10;
    var min_frequency = 1;
    if (rate === Infinity) {
        draw_frequency = 100;
    }
    else if (rate === -Infinity) {
        draw_frequency = 1;
    }
    else {
        if (rate < min_frequency) {
            draw_frequency = min_frequency;
        }
        else if (rate > max_frequency) {
            draw_frequency = max_frequency;
        }
        else {
            draw_frequency = rate;
        }
    }
    if (set_interval_id !== undefined) {
        clearInterval(set_interval_id);
        set_interval_id = setInterval(draw_path, 1000 / draw_frequency);
    }
}

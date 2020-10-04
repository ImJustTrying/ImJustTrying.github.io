/*
 * Kevin Vicente
 * June 2020
 *
 * This file will hold all the "onX" functions -- e.g. onload, onclick, etc.
 * Depends on ui.ts.
 */

enum Search {
  AStar, UCS, BFS, GS
}

enum Maze {
  Division, BinaryTree, Backtracker, Kruskal, Prim, Wilson
}

let search_method: Search = Search.AStar;
let maze_generator: Maze = Maze.Division;
let draw_frequency: number = 1000;

// These are all the DOM functions
function init(): void {
  (document as any).fonts.ready.then(function() {
    const state = new Graph();
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

  setInterval(function() {
    console.debug(`new draw calls: ${draw_calls - last_draw_count}`);
    console.debug(`draw rate: ${(draw_calls - last_draw_count) / 5} per second`);
    console.debug(`average draw call time: ${avg_draw_time * 0.001} seconds`);
    last_draw_count = draw_calls;
  }, 15000);
}

function resize(): void {
  ui.resize();
  draw_grid();
  window.requestAnimationFrame(draw);
}

function update_search(): void {
  const element: any = document.getElementById("search");
  const value = element.options[element.selectedIndex].value;
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

function update_maze(): void {
  const element: any = document.getElementById("maze");
  const value = element.options[element.selectedIndex].value;
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

function switch_menu_state(): void {
  const menu: any = document.getElementById("edit-menu");
  const btn: any = document.getElementById("menu-slider");
  const arrows: any = document.getElementById("arrows");
  menu.style.width = (menu.style.width === "") ? "125px" : "";
  btn.style.right = (btn.style.right === "") ? "125px" : "";
  arrows.style.transform = (arrows.style.transform === "") ? "rotate(180deg)" : "";
}

function enable_btn(draw_walls: boolean): void {
  editing[1] = draw_walls;
  const write = document.getElementById("write");
  const erase = document.getElementById("erase");
  if (draw_walls) {
    write.classList.remove("disabled");
    write.classList.add("enabled");
    erase.classList.remove("enabled");
    erase.classList.add("disabled");
  } else {
    write.classList.remove("enabled");
    write.classList.add("disabled");
    erase.classList.remove("disabled")
    erase.classList.add("enabled");
  }
}

function zoom(zoom_in: boolean): void {
  if (zoom_in && ui.cell_size <= 50) {
    ui.cell_size += 5;
  } else if (!zoom_in && ui.cell_size >= 30) {
    ui.cell_size -= 5;
  }
  resize();
  draw_grid();
  window.requestAnimationFrame(draw);
}

function clear_grid(): void {
  ui.state.clear_walls();
  window.requestAnimationFrame(draw);
}

function pathfind(): void {
  function manhattan_distance(v1: Vertex, v2: Vertex): number {
    return Math.abs(v1.y - v2.y) + Math.abs(v1.x - v2.x);
  }

  // Disable all buttons while pathfinding
  const btns = document.getElementsByTagName("button")
  for (let i = 0; i < btns.length; i += 1) {
    btns[i].disabled = true;
  }

  switch (search_method) {
    case Search.BFS:
      bfs();
      break;
    case Search.GS:
      best_first_search(function(state: Vertex, net_cost: number): number {
        return manhattan_distance(state, ui.state.get_special_vertex(CellType.Goal));
      });
      break;
    case Search.UCS:
      best_first_search(function(state: Vertex, net_cost: number): number {
        return net_cost + 1;
      });
      break;
    case Search.AStar:
       best_first_search(function(state: Vertex, net_cost: number): number {
         return (net_cost + 1) +
           manhattan_distance(state, ui.state.get_special_vertex(CellType.Goal));
      });
      break;
  }

  // Re-enable buttons
  for (let i = 0; i < btns.length; i += 1) {
    btns[i].disabled = false;
  }
}

function gen_maze(): void {
  // Disable all buttons while pathfinding
  const btns = document.getElementsByTagName("button")
  for (let i = 0; i < btns.length; i += 1) {
    btns[i].disabled = true;
  }

  clear_grid();
  ui.state.clear_intermediates();
  ui.state.set_special_vertex({ x: 0, y: 0 }, CellType.Start);
  switch (maze_generator) {
    case Maze.Division:
      recursive_division();
      break;
    case Maze.Backtracker:
      recursive_backtracker();
      break;
    case Maze.Kruskal:
      randomized_kruskal();
      break;
  }
  ui.state.set_special_vertex(get_goal(), CellType.Goal);
  window.requestAnimationFrame(draw);
  //window.requestAnimationFrame(draw_maze);

  // Re-enable buttons
  for (let i = 0; i < btns.length; i += 1) {
    btns[i].disabled = false;
  }
}

function intermediates(add: boolean) {
  if (add) {
    ui.state.add_intermediate();
  } else {
    ui.state.remove_intermediate();
  }
  window.requestAnimationFrame(draw);
}

// Rate is in KHz
function change_speed(rate: number): void {
  if (rate === Infinity) {
    draw_frequency = 100;
  } else {
    draw_frequency = (rate < 100) ? 100 : rate;
  }
  clearInterval(set_interval_id);
  set_interval_id = setInterval(draw_path, draw_frequency);
}

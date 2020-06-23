/*
 * Kevin Vicente
 * June 2020
 *
 * Contains all the UI code, which establishes a view component -- i.e. code that serves as a
 * user-facing interface to the state of the graph, which is handled by graph.ts.
 */

enum Search {
  AStar, Dijkstra, BFS, DFS
}

enum Maze {
  Division, BinaryTree, Backtracker, Kruskal, Prim, Wilson
}


let ui: UI;
let avg_draw_time: number = 0; // In milliseconds
let draw_calls: number = 0;
let search_method: Search = Search.AStar;
let maze_generator: Maze = Maze.Division;
let walling_enabled: boolean = false;
let initial_draw: boolean = true;
let last_mouse_cell: Vertex = { x: 0, y: 0 };
const mouse: Vertex = { x: 0, y: 0 };
let wall_drawing: boolean = true; // If false, we erase walls when moused over


function update_mouse_coords(event) {
  event.preventDefault();
  //event.stopPropogation();
  const rect = this.getBoundingClientRect();
  const pixel_coord = { x : event.clientX - rect.left, y : event.clientY - rect.top };
  mouse.x = pixel_coord.x;
  mouse.y = pixel_coord.y;
  if (ui.drag[0]) {
    window.requestAnimationFrame(draw);
  }
}

function change_wall_status(event) {
  if (walling_enabled) {
    const cell_coord = {
      x : (mouse.x - mouse.x % ui.cell_size) / ui.cell_size,
      y : (mouse.y - mouse.y % ui.cell_size) / ui.cell_size
    };
    // We want to flip once we enter the cell, but not again until we leave it
    if (!vertices_equal(last_mouse_cell, cell_coord) &&
        cell_coord.x < ui.state.width && cell_coord.y < ui.state.height) {
      console.debug(`drawing wall at (${cell_coord.x}, ${cell_coord.y})`);
      ui.state.set_wall(cell_coord);
      last_mouse_cell = cell_coord;
    }
  }
}

function draw(timestamp): void {
  const start_time = performance.now();
  console.debug("draw was called");
  const ctx = ui.ctx;
  const cellsize: number = ui.cell_size;
  const start: Vertex = ui.state.get_special_vertex(CellType.Start);
  const goal: Vertex = ui.state.get_special_vertex(CellType.Goal);
  const intermediates: Vertex[] = ui.state.get_special_vertex(CellType.Intermediate);

  ctx.font = "600 " + cellsize.toString() + "px 'Font Awesome 5 Free'";
  ctx.fillStyle = "white";
  ctx.textBaseline = "bottom";
  const vertices = ui.state.get_special_vertices_copy();


  // This branch of execution is more expensive -- we redraw the grid lines and filled walls and
  // special vertices. We reserve this branch for when it's necessary, otherwise we prefer to use
  // the alternative branch of execution.
  if (ui.drag[0] || initial_draw) {
    // Draw gridlines
    ui.clear();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1;
    const graph_width_in_pixels = ui.state.width * cellsize;
    const graph_height_in_pixels = ui.state.height * cellsize;

    for (let x = 0; x <= ui.state.width; x += 1) {
      for (let y = 0; y <= ui.state.height; y += 1) {
        // The reasoning behind this is explained here:
        // https://stackoverflow.com/questions/7530593/html5-canvas-and-line-width/7531540#7531540
        const x_coord: number = x * cellsize + 0.5;
        const y_coord: number = y * cellsize + 0.5;

        ctx.moveTo(x_coord, 0);
        ctx.lineTo(x_coord, graph_height_in_pixels);
        ctx.moveTo(0, y_coord);
        ctx.lineTo(graph_width_in_pixels, y_coord);
      }
    }
    ctx.stroke();

    // Corresponds to the cell that the mouse is bounded by
    const cell_coord = {
      x : (mouse.x - mouse.x % cellsize) / cellsize,
      y : (mouse.y - mouse.y % cellsize) / cellsize
    };

    // If the mouse exits the grid, draw the 
    if (cell_coord.x >= ui.state.width) { cell_coord.x = ui.state.width - 1; }
    if (cell_coord.y >= ui.state.height) { cell_coord.y = ui.state.height - 1; }

    // Draw icons for special vertices
    if (ui.drag[0]) {
      ctx.fillText(ui.drag[1].icon, cell_coord.x * cellsize, (cell_coord.y + 1) * cellsize);
    }
    for (const vertex of vertices) {
      if (!vertices_equal(vertex, ui.drag[1])) {
        ctx.fillText(vertex.icon, vertex.x * cellsize, (vertex.y + 1) * cellsize);
      }
    }

    // Draw walls
    ctx.fillStyle = "#fff";
    for (const v of ui.state.get_walls()) {
      ctx.fillRect(v.x * cellsize, v.y * cellsize, cellsize, cellsize);
    }

    initial_draw = false;
  }
  
  else {
    for (const vertex of vertices) {
      ctx.fillText(vertex.icon, vertex.x * cellsize, (vertex.y + 1) * cellsize);
    }

    // Draw walls
    ctx.fillStyle = "#fff";
    for (let i = 0; i < ui.state.new_walls.length;) {
      const v: Vertex = ui.state.new_walls[i];
      ctx.fillRect(v.x * cellsize, v.y * cellsize, cellsize, cellsize);
      ui.state.new_walls.shift();
    }
    ctx.fillStyle = "#000";
    for (let i = 0; i < ui.state.old_walls.length;) {
      const v: Vertex = ui.state.old_walls[i];
      ctx.fillRect(v.x * cellsize + 1, v.y * cellsize + 1, cellsize - 1, cellsize - 1);
      ui.state.old_walls.shift();
    }
  }

  avg_draw_time = (avg_draw_time * draw_calls + performance.now() - start_time) / (draw_calls + 1);
  draw_calls += 1;
}



class UI {
  canvas;
  ctx;
  cell_size: number; // In pixels
  state: Graph;
  // The boolean represents whether something is currently being dragged
  // The string is the fontawesome unicode value for the icon being dragged
  drag: [boolean, Vertex];

  constructor(cell_size: number, state: Graph) {
    this.cell_size = cell_size;
    this.state = state;
    this.canvas = document.querySelector("#canvas");
    this.ctx = this.canvas.getContext("2d");
    this.drag = [false, {x:-1,y:-1}];
    this.resize();


    // We add some event listeners for dragging and dropping icons.
    // Note that these only updated the dragging variable -- the actual drawing is done in draw().
    let drag = this.drag;
    const ctx = this.ctx;

    this.canvas.addEventListener("click", function(event) {
      const rect = this.getBoundingClientRect();
      const pixel_coord = { x : event.clientX - rect.left, y : event.clientY - rect.top };
      const cell_coord = {
        x : (pixel_coord.x - pixel_coord.x % cell_size) / cell_size,
        y : (pixel_coord.y - pixel_coord.y % cell_size) / cell_size
      };

      // If we are not currently dragging anything, check that there is a special vertex at the
      // cell that was clicked, and if there is set dragging to true.
      if (!drag[0]) {
        const special_vertices = state.get_special_vertices_copy();
        for (let i = 0; i < special_vertices.length; i += 1) {
          if (vertices_equal(special_vertices[i], cell_coord)) {
            drag[0] = true;
            drag[1] = special_vertices[i];
            this.addEventListener("mousemove", update_mouse_coords);
            this.event_listener_exists = true;
            return;
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
        const special_vertices = state.get_special_vertices_copy();
        for (let i = 0; i < special_vertices.length; i += 1) {
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

      window.requestAnimationFrame(draw);
    });

    this.canvas.addEventListener("mousedown", function(event) {
      walling_enabled = true;
      this.addEventListener("mousemove", update_mouse_coords);
      this.addEventListener("mousemove", change_wall_status);
    });

    this.canvas.addEventListener("mouseup", function(event) {
      this.removeEventListener("mousemove", update_mouse_coords);
      this.removeEventListener("mousemove", change_wall_status);
      walling_enabled = false;
    });
  }


  resize(): void {
    this.canvas.width = window.innerWidth - 10;
    this.canvas.height = window.innerHeight - 60;
    this.state.width = (this.canvas.width - this.canvas.width % this.cell_size) / this.cell_size;
    this.state.height = (this.canvas.height - this.canvas.height % this.cell_size) / this.cell_size;
  }

  clear(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
}



// These are all DOM methods -- i.e. onX methods
function init(): void {
  (document as any).fonts.ready.then(function() {
    const state = new Graph();
    ui = new UI(30, state);
    state.set_special_vertex({x: 0, y: 0}, CellType.Start);
    state.set_special_vertex({
      x: state.width - 1,
      y: state.height - 1,
    }, CellType.Goal);
    window.requestAnimationFrame(draw);
  });
}

function resize(): void {
  ui.resize();
  ui.state.set_special_vertex({x: 0, y: 0}, CellType.Start);
  ui.state.set_special_vertex({
    x: ui.state.width - 1,
    y: ui.state.height - 1,
  }, CellType.Goal);
  initial_draw = true;
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

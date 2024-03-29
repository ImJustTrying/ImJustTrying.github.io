/*
 * Kevin Vicente
 * June 2020
 *
 * Contains all the UI code, which establishes a view component -- i.e. code that serves as a
 * user-facing interface to the state of the graph, which is handled by graph.ts.
 * We use two canvases to display the UI -- one is the background, which is simply the grid lines
 * that are drawn only once; the other is the foreground where icons and walls are drawn.
 * Depends on graph.ts.
 */


let ui: UI;
let avg_draw_time: number = 0; // In milliseconds
let draw_calls: number = 0;
let last_draw_count: number = 0;
// first value determines if editing (i.e. drawing/erasing walls) is enabled.
// the second is whether walls are being drawn (true) or erased (false).
let editing: [boolean, boolean] = [false, true];
let last_mouse_cell: Vertex = { x: 0, y: 0 };
const mouse: Vertex = { x: 0, y: 0 };


// Event handlers
function update_mouse_coords(event, coord: Vertex = undefined) {
  if (coord === undefined) {
    event.preventDefault();
    //event.stopPropogation();
    const rect = this.getBoundingClientRect();
    const pixel_coord = { x : event.clientX - rect.left, y : event.clientY - rect.top };
    mouse.x = pixel_coord.x;
    mouse.y = pixel_coord.y;
  } else {
    mouse.x = coord.x;
    mouse.y = coord.y;
  }
}

// A mousemove event handler
function change_wall_status(event) {
  if (editing[0]) {
    const cell_coord = {
      x : (mouse.x - mouse.x % ui.cell_size) / ui.cell_size,
      y : (mouse.y - mouse.y % ui.cell_size) / ui.cell_size
    };

    // We want to flip once we enter the cell, but not again until we leave it
    if (!vertices_equal(last_mouse_cell, cell_coord) && ui.state.bound_check(cell_coord) &&
        !ui.state.is_special_vertex_at(cell_coord)) {
      if (editing[1]) {
        ui.state.set_wall(cell_coord);
        ui.ctx.fillRect(
          cell_coord.x * ui.cell_size,
          cell_coord.y * ui.cell_size,
          ui.cell_size,
          ui.cell_size
        );
      } else {
        ui.state.set_void(cell_coord);
        ui.ctx.clearRect(
          cell_coord.x * ui.cell_size,
          cell_coord.y * ui.cell_size,
          ui.cell_size,
          ui.cell_size
        );
      }
      last_mouse_cell = cell_coord;
    }
  }
}


// Drawing functions
function draw_grid(): void {
  const ctx = ui.background.getContext("2d", { alpha: false });
  const cellsize: number = ui.cell_size;
  const width = ui.state.get_width();
  const height = ui.state.get_height();
  const graph_width_in_pixels = width * cellsize;
  const graph_height_in_pixels = height * cellsize;
  ctx.save();
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 1;

  // Draw gridlines
  for (let x = 0; x <= width; x += 1) {
    for (let y = 0; y <= height; y += 1) {
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
  ctx.restore();
}

function draw_icons(): void {
  const ctx = ui.ctx;
  const cellsize: number = ui.cell_size;
  const vertices: Vertex[] = ui.state.get_special_vertices_copy();

  ctx.fillStyle = "white";
  ctx.textBaseline = "bottom";
  ctx.font = "600 " + cellsize.toString() + "px 'Font Awesome 5 Free'";

  // Draw icons for special vertices
  if (ui.drag[0]) {
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    ctx.fillText(ui.drag[1].icon, mouse.x, mouse.y);
    ctx.textBaseline = "bottom";
    ctx.textAlign = "start";
  }

  for (const vertex of vertices) {
    // Don't draw the icon we're dragging
    if (!vertices_equal(vertex, ui.drag[1]) && ui.state.bound_check(vertex)) {
      ctx.fillText(vertex.icon, vertex.x * cellsize, (vertex.y + 1) * cellsize);
    }
  }
}

function draw_walls(): void {
  const ctx = ui.ctx;
  const cellsize: number = ui.cell_size;

  // Draw walls
  ctx.fillStyle = "#ffffff";
  for (const v of ui.state.get_walls()) {
    if (ui.state.bound_check(v)) {
      ctx.fillRect(v.x * cellsize, v.y * cellsize, cellsize, cellsize);
    }
  }
}

function draw(timestamp: number = 0): void {
  if (ui.drag[0]) {
    window.requestAnimationFrame(draw);
  }

  const start_time = performance.now();
  ui.clear();
  draw_walls();
  draw_icons();
  avg_draw_time = (avg_draw_time * draw_calls + performance.now() - start_time) / (draw_calls + 1);
  draw_calls += 1;
}



class UI {
  // There is no need to keep these private -- especially since we're going to frequently change
  // the internal state of the UI object from outside the object itself.
  foreground;
  background;
  ctx;
  cell_size: number; // In pixels
  state: Graph;
  // The boolean represents whether something is currently being dragged
  drag: [boolean, Vertex];

  constructor(cell_size: number, state: Graph) {
    this.cell_size = cell_size;
    this.state = state;
    this.foreground = document.querySelector("#foreground");
    this.background = document.querySelector("#background");
    this.ctx = this.foreground.getContext("2d");
    this.drag = [false, {x:-1,y:-1}];

    this.resize();

    // We add some event listeners for dragging and dropping icons.
    // Note that these only updated the dragging variable -- the actual drawing is done in draw().
    let drag = this.drag;
    const ctx = this.ctx;


    this.foreground.addEventListener("mousedown", function(event) {
      const rect = this.getBoundingClientRect();
      const pixel_coord = { x : event.clientX - rect.left, y : event.clientY - rect.top };
      const cell_coord = {
        x : (pixel_coord.x - pixel_coord.x % ui.cell_size) / ui.cell_size,
        y : (pixel_coord.y - pixel_coord.y % ui.cell_size) / ui.cell_size
      };

      // If we are not currently dragging anything, check that there is a special vertex at the
      // cell that was clicked, and if there is set dragging to true.
      if (!drag[0]) {
        if (state.is_special_vertex_at(cell_coord)) {
          const vertex: Option<Vertex> = state.get_special_vertex_at(cell_coord);
          if (vertex.ok) {
            drag[0] = true;
            drag[1] = vertex.value;
            this.addEventListener("mousemove", update_mouse_coords);
            this.event_listener_exists = true;
            update_mouse_coords(undefined, pixel_coord);
            window.requestAnimationFrame(draw);
          }
        } else {
          editing[0] = true;
          this.addEventListener("mousemove", update_mouse_coords);
          this.addEventListener("mousemove", change_wall_status);

          // If we don't click on a special vertex, we want to fill or erase the selected cell
          // according to the user's editing mode
          if (state.bound_check(cell_coord)) {
            if (editing[1]) {
              state.set_wall(cell_coord);
              ui.ctx.fillRect(
                cell_coord.x * ui.cell_size,
                cell_coord.y * ui.cell_size,
                ui.cell_size,
                ui.cell_size
              );
            } else {
              state.set_void(cell_coord);
              ui.ctx.clearRect(
                cell_coord.x * ui.cell_size,
                cell_coord.y * ui.cell_size,
                ui.cell_size,
                ui.cell_size
              );
            }
          }
        }
      }

      // Otherwise, if we are dragging something check that the cell that was clicked is empty --
      // i.e. has no special vertices, and if empty set dragging to false.
      else {
        if (state.is_wall(cell_coord)) {
          return;
        }

        // If there is a special vertex with a different cell type, then
        // do not do anything and return
        if (state.is_special_vertex_at(cell_coord)) {
          const v: Option<Vertex> = state.get_special_vertex_at(cell_coord);
          if (!(v.ok && v.value.cell_type === drag[1].cell_type)) {
            return;
          }
        }

        if (drag[1].cell_type === CellType.Intermediate) {
          drag[0] = !state.set_special_vertex(
            cell_coord,
            drag[1].cell_type,
          );
        } else {
          drag[0] = !state.set_special_vertex(cell_coord, drag[1].cell_type);
        }

        if (this.event_listener_exists && !drag[0]) {
          // Set ui.drag[1] to an invalid cell so that the moved vertex will be drawn should it be
          // placed in the same cell it was grabbed from.
          drag[1] = { x: -1, y: -1 };
          this.removeEventListener("mousemove", update_mouse_coords);
          this.event_listener_exists = false;
          window.requestAnimationFrame(draw);
        }
      }
    });

    this.foreground.addEventListener("mouseup", function(event) {
      if (editing[0]) {
        this.removeEventListener("mousemove", update_mouse_coords);
        this.removeEventListener("mousemove", change_wall_status);
        editing[0] = false;
      }
    });
  }


  resize(): void {
    const width: number = window.innerWidth - 10;
    const height: number = window.innerHeight - 60;
    this.foreground.width = width;
    this.background.width = width;
    this.foreground.height = height;
    this.background.height = height;
    this.state.set_width_and_height(
      (width - width % this.cell_size) / this.cell_size, 
      (height - height % this.cell_size) / this.cell_size
    );

    // Here, we will clear the outer edges of the canvas -- i.e. the parts not in the grid
    // This is because walls that were originally on the grid may not be within the new bounds, so
    // we need to clear them here.
    this.ctx.clearRect(
      this.state.get_width() * this.cell_size,
      0,
      width - this.state.get_width() * this.cell_size,
      height
    );
  }

  clear(): void {
    this.ctx.clearRect(0, 0, this.foreground.width, this.foreground.height);
  }
}

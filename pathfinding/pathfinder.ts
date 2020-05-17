let ui: UI;
let state: Graph;

interface Result<T> {
  success: boolean;
  value?: T;
}

class UI {
  private canvas;
  private ctx;
  private cell_size: number; // In pixels
  private graph_width: number; // In cells
  private graph_height: number; // In cells

  constructor(cell_size) {
    this.cell_size = cell_size;
    this.canvas = document.querySelector("#canvas");
    this.ctx = this.canvas.getContext("2d");
    this.resize();
  }

  get_width_in_cells(): number { return this.graph_width; }
  get_height_in_cells(): number { return this.graph_width; }

  resize(): void {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.graph_width = (this.canvas.width - this.canvas.width % this.cell_size) / this.cell_size;
    this.graph_height = (this.canvas.height - this.canvas.height % this.cell_size) / this.cell_size;
  }

  draw(state: Graph): void {
    // Draw gridlines
    this.ctx.strokeStyle = "#fff";
    this.ctx.lineWidth = 1;
    const graph_width_in_pixels = this.graph_width * this.cell_size;
    const graph_height_in_pixels = this.graph_height * this.cell_size;

    for (let x = 0; x <= this.graph_width; x += 1) {
      for (let y = 0; y <= this.graph_height; y += 1) {
        // The reasoning behind this is explained here:
        // https://stackoverflow.com/questions/7530593/html5-canvas-and-line-width/7531540#7531540
        const x_coord: number = x * this.cell_size + 0.5;
        const y_coord: number = y * this.cell_size + 0.5;

        this.ctx.moveTo(x_coord, 0);
        this.ctx.lineTo(x_coord, graph_height_in_pixels);
        this.ctx.moveTo(0, y_coord);
        this.ctx.lineTo(graph_width_in_pixels, y_coord);
      }
    }
    this.ctx.stroke();

    // Draw icons
    const start: Vertex = state.get_start();
    const goal: Vertex = state.get_goal();
    this.ctx.font = "600 " + this.cell_size.toString() + "px 'Font Awesome 5 Free'";
    this.ctx.fillStyle = "white";
    this.ctx.textBaseline = "bottom";
    // The unicode values are for font awesome
    this.ctx.fillText("\uf0a9", start.x * this.cell_size, (start.y + 1) * this.cell_size);
    this.ctx.fillText("\uf140", goal.x * this.cell_size, (goal.y + 1) * this.cell_size);
  }
}


/*
 * Because our graph is very well defined, we don't need to represent it with traditional methods
 * e.g. transition matrices. Instead, we just have this class serve as a method of checking when
 * certain actions are valid or when certain transitions exist.
 * We represent a vertex with a cartesian coordinate, and we assert that for all 0 < x < width and
 * 0 < y < height, there are transitions from (x,y) to (x+1,y), (x-1,y), (x,y-1), and (x,y+1).
 * (0,0) is the top-left vertex as viewed in the UI.
 */

interface Vertex {
  x: number;
  y: number;
}

class Graph {
  private start: Vertex;
  private goal: Vertex;
  public width: number;
  public height: number;

  constructor(width, height) {
    this.width = width;
    this.height = height;
  }

  get_neighbors(vertex: Vertex): Vertex[] {
    let neighbors = [];
    if (vertex.x > 0)           { neighbors.push({x: vertex.x - 1, y: vertex.y}); }
    if (vertex.x < this.width)  { neighbors.push({x: vertex.x + 1, y: vertex.y}); }
    if (vertex.y > 0)           { neighbors.push({x: vertex.x, y: vertex.y - 1}); }
    if (vertex.y < this.height) { neighbors.push({x: vertex.x, y: vertex.y + 1}); }
    return neighbors;
  }

  get_start(): Vertex { return this.start; }
  get_goal(): Vertex { return this.goal; }

  set_start(start: Vertex): boolean {
    if (start.x >= 0 && start.x <= this.width && start.y >= 0 && start.y <= this.height) {
      this.start = start;
      return true;
    }
    return false;
  }

  set_goal(goal: Vertex): boolean {
    if (goal.x >= 0 && goal.x <= this.width && goal.y >= 0 && goal.y <= this.height) {
      this.goal = goal;
      return true;
    }
    return false;
  }
}



function init(): void {
  (document as any).fonts.ready.then(_ => {
    ui = new UI(40);
    state = new Graph(ui.get_width_in_cells(), ui.get_height_in_cells());
    state.set_start({x: 0, y: 0});
    state.set_goal({
      x: Math.floor(ui.get_width_in_cells() / 2),
      y: Math.floor(ui.get_height_in_cells() / 2)
    });
    ui.draw(state);
  });
}

function resize(): void {
  ui.resize();
  state.set_start({x: 0, y: 0});
  state.set_goal({
    x: Math.floor(ui.get_width_in_cells() / 2),
    y: Math.floor(ui.get_height_in_cells() / 2)
  });
  ui.draw(state);
}



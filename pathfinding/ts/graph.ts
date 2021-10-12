/*
 * Kevin Vicente
 * June 2020
 *
 * This file contains all the code pertaining to maintaining the state of the pathfinder -- i.e.
 * where special vertices are, what vertices are walled and which are not, etc. We also perform all
 * the algorithms on these objects, and we reflect the actions to the user in the UI code.
 */

enum CellType {
  Start, Goal, Intermediate
}

interface Vertex {
  x: number;
  y: number;
  icon?: string;
  cell_type?: CellType;
  ancestor?: Vertex;
}

interface Wall {
  wall: boolean;
  visited: boolean;
  marked: boolean;
}

interface Option<T> {
  ok: boolean;
  value?: T;
  err?: string;
}


// Priority queue implementation for the graph search algorithms
class QElem {
  public element: any;
  public priority: number;
  public cost: number;

  constructor(elem: any, prio: number, cost: number) {
    this.element = elem;
    this.priority = prio;
    this.cost = cost;
  }
}

// We remove lowest priority elements first in this implementation
// We also use a sorted list rather than a heap
class PriorityQueue {
  private queue: QElem[];

  constructor(elements: QElem[] = []) {
    this.queue = [];
    elements.map((e) => this.enqueue(e.element, e.priority, e.cost));
  }

  enqueue(elem: any, prio: number, cost: number): void {
    if (this.queue.length === 0) {
      this.queue.push(new QElem(elem, prio, cost));
      return;
    }

    // Since we are using a sorted list, we can do binary search to maintain the O(log n) runtime
    let left_index: number = 0;
    let right_index: number = this.queue.length - 1;
    let middle: number = Math.floor((right_index - left_index) / 2);

    while (right_index - left_index >= 1) {
      if (prio > this.queue[middle].priority) {
        left_index = middle + 1;
      } else {
        right_index = middle;
      }
      middle = left_index + Math.floor((right_index - left_index) / 2);
    }

    if (prio > this.queue[middle].priority) {
      this.queue.splice(middle + 1, 0, new QElem(elem, prio, cost));
    } else {
      this.queue.splice(middle, 0, new QElem(elem, prio, cost));
    }
  }

  dequeue(): Option<QElem> {
    if (this.queue.length != 0) {
      return { ok: true, value: this.queue.shift() };
    } else {
      return { ok: false, err: "Underflow" };
    }
  }

  is_empty(): boolean {
    return this.queue.length === 0;
  }
}


// Helper functions
function vertices_equal(v1: Vertex, v2: Vertex): boolean {
  return v1.x === v2.x && v1.y === v2.y;
}

// Generates integers in the range [lower, higher), excluding any values in exclude. MDN reference:
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random
function gen_random_int(lower: number, higher: number, exclude: number[] = []): Option<number> {
  const min: number = Math.ceil(lower);
  const max: number = Math.floor(higher);
  const valid_values: number[] = [];
  for (let i = min; i < max; i += 1) {
    if (!exclude.includes(i)) {
      valid_values.push(i);
    }
  }
  
  if (valid_values.length === 0) {
    return { ok: false, err: "All numbers in range are excluded" };
  } else {
    return { ok: true, value: valid_values[Math.floor(Math.random() * valid_values.length)] };
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

class Graph {
  private start: Vertex;
  private goal: Vertex;
  private walls: object;
  private width: number;
  private height: number;


  constructor() {
    this.start = { x : -1, y : -1 };
    this.goal = { x : -1, y : -1 };
    this.walls = {};
    this.width = 0;
    this.height = 0;
  }

  get_width(): number { return this.width; }
  get_height(): number { return this.height; }

  bound_check(v: Vertex): boolean {
    return v.x >= 0 && v.x < this.width && v.y >= 0 && v.y < this.height;
  }

  set_width_and_height(new_width: number, new_height: number): void {
    const out_of_bounds: Vertex[] =
      this
      .get_special_vertices_copy()
      .filter((v) => v.x >= new_width || v.y >= new_height);
    this.width = new_width;
    this.height = new_height;

    // Reposition any special vertices that are no longer within the graph bounds
    for (const v of out_of_bounds) {
      // We will first calculate the closest cell to the out of bounds vertex
      const nearest: Vertex = {
        x: (v.x >= new_width) ? new_width - 1 : v.x,
        y: (v.y >= new_height) ? new_height - 1 : v.y
      };

      // Then, we do breadth first search for the nearest empty cell starting at that cell
      const queue: Vertex[] = [nearest];
      let found: boolean = false;
      let found_backup: boolean = false;
      let found_vertex: Vertex;
      let backup: Vertex;
      while (queue.length > 0) {
        const vertex: Vertex = queue.shift();

        if (!found_backup && !this.is_special_vertex_at(vertex)) {
          backup = vertex;
          found_backup = true;
        }
        if (!this.is_special_vertex_at(vertex) && !this.is_wall(vertex)) {
          found_vertex = vertex;
          found = true;
          break;
        }
        this
        .get_neighbors(vertex)
        .filter((vert) => this.bound_check(vert))
        .map((vert) => queue.push(vert));
      }

      // If there are no free cells, void the first cell that does not have a special vertex at it
      // and put the vertex there.
      if (!found) {
        found_vertex = backup;
        this.set_void(backup);
      }

      this.set_special_vertex(found_vertex, v.cell_type);
    }
  }

  get_neighbors(vertex: Vertex, shuffle: boolean = false): Vertex[] {
    if (this.width <= 1 && this.height <= 1) { return []; }
    let neighbors = [];
    if (vertex.x < this.width - 1)  { neighbors.push({x: vertex.x + 1, y: vertex.y}); }
    if (vertex.x > 0)           { neighbors.push({x: vertex.x - 1, y: vertex.y}); }
    if (vertex.y < this.height - 1) { neighbors.push({x: vertex.x, y: vertex.y + 1}); }
    if (vertex.y > 0)           { neighbors.push({x: vertex.x, y: vertex.y - 1}); }

    if (shuffle) {
      // Shuffle the list of neighbors
      for (let i = 0; i < neighbors.length - 1; i += 1) {
        const k: number = gen_random_int(i, neighbors.length).value;
        const t: Vertex = neighbors[i];
        neighbors[i] = neighbors[k];
        neighbors[k] = t;
      }
    }
    return neighbors;
  }

  // Will return deep copies of the special vertices
  get_special_vertices_copy(): Vertex[] {
    function copy_vertex(v: Vertex) {
      return {
        x: v.x,
        y: v.y,
        icon: v.icon,
        cell_type: v.cell_type,
      };
    }
    const vertices =  [
      this.start,
      this.goal,
    ];
    return vertices.map(copy_vertex)
  }


  get_special_vertex(cell_type: CellType): Vertex {
    switch (cell_type) {
      case CellType.Start: return this.start;
      case CellType.Goal: return this.goal;
    }
  }

  get_special_vertex_at(v: Vertex): Option<Vertex> {
    if (!this.bound_check(v)) {
      return { ok: false, err: "Invalid vertex" };
    }

    const special_vertices = this.get_special_vertices_copy();
    for (const vertex of special_vertices) {
      if (vertices_equal(vertex, v)) {
        return { ok: true, value: vertex };
      }
    }
    return { ok: false, err: "No special vertex at given position" };
  }

  is_special_vertex_at(v: Vertex): boolean {
    // Check if other special vertices are where v is specified
    const special_vertices = this.get_special_vertices_copy();
    for (const vertex of special_vertices) {
      if (vertices_equal(vertex, v)) {
        return true;
      }
    }
    return false;
  }

  set_special_vertex(v: Vertex, cell_type: CellType): boolean {
    if (this.bound_check(v) && (!this.is_special_vertex_at(v) || this.is_special_vertex_at(v) &&
        this.get_special_vertex_at(v).value.cell_type === cell_type)) {
      switch (cell_type) {
        // The unicode values are for font awesome
        case CellType.Start: {
          this.start = v;
          this.start.cell_type = CellType.Start;
          this.start.icon = "\uf0a9";
          break;
        }

        case CellType.Goal: {
          this.goal = v;
          this.goal.cell_type = CellType.Goal;
          this.goal.icon = "\uf140";
          break;
        }

        default: return false;
      }
      return true;
    }
    return false;
  }

  // Here, we just create a key that is unique to the given vertex, then check if the value in
  // the walls object is undefined or not
  flip_wall_status(v: Vertex): void {
    const key: string = v.x.toPrecision(3) + v.y.toPrecision(3);
    if (this.walls[key] === undefined) {
      this.walls[key] = { wall: true, visited: false, marked: false };
    } else {
      this.walls[key].wall = false;
    }
  }

  set_wall(v: Vertex): void {
    if (this.bound_check(v)) {
      const key: string = v.x.toPrecision(3) + v.y.toPrecision(3);
      if (this.walls[key] === undefined) {
        this.walls[key] = { wall: true, visited: false };
      } else {
        this.walls[key].wall = true;
      }
    }
  }

  set_void(v: Vertex): void {
    if (this.bound_check(v)) {
      const key: string = v.x.toPrecision(3) + v.y.toPrecision(3);
      if (this.walls[key] === undefined) {
        this.walls[key] = { wall: false, visited: false };
      } else {
        this.walls[key].wall = false;
      }
    }
  }

  get_walls(): Vertex[] {
    const walls = [];
    for (const key of Object.keys(this.walls)) {
      if (this.walls[key].wall) {
        walls.push({ x: parseInt(key.substr(0, 3)), y : parseInt(key.substr(3, 3)) });
      }
    }
    return walls;
  }

  clear_walls(): void {
    for (const key of Object.keys(this.walls)) {
      if (this.walls[key].wall) {
        this.walls[key].wall = false;
      }
    }
  }

  is_wall(v: Vertex): boolean {
    const key: string = v.x.toPrecision(3) + v.y.toPrecision(3);
    return this.walls[key] !== undefined && this.walls[key].wall;
  }

  set_visited(v: Vertex): void {
    const key: string = v.x.toPrecision(3) + v.y.toPrecision(3);
    if (this.walls[key] !== undefined) {
      this.walls[key].visited = true;
    } else {
      this.walls[key] = { wall: false, visited: true, marked: false };
    }
  }

  was_visited(v: Vertex): boolean {
    const key: string = v.x.toPrecision(3) + v.y.toPrecision(3);
    if (this.walls[key] !== undefined) {
      return this.walls[key].visited;
    } return false;
  }

  clear_visited(): void {
    for (const key of Object.keys(this.walls)) {
      this.walls[key].visited = false;
    }
  }

  is_marked(v: Vertex): boolean {
    const key: string = v.x.toPrecision(3) + v.y.toPrecision(3);
    if (this.walls[key] !== undefined) {
      return this.walls[key].marked;
    } return false;
  }

  set_marked(v: Vertex): void {
    const key: string = v.x.toPrecision(3) + v.y.toPrecision(3);
    if (this.walls[key] === undefined) {
      this.walls[key] = { wall: false, visited: false, marked: true };
    } else {
      this.walls[key].marked = true;
    }
  }

  clear_marked(): void {
    for (const key of Object.keys(this.walls)) {
      this.walls[key].marked = false;
    }
  }
}

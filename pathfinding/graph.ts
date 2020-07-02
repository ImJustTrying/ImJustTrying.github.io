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
  intermediate_index?: number;
}

interface Option<T> {
  ok: boolean;
  value?: T;
  err?: string;
}

function vertices_equal(v1: Vertex, v2: Vertex): boolean {
  return v1.x === v2.x && v1.y === v2.y;
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
  private intermediates: [Vertex, Vertex, Vertex];
  private walls: object;
  private width: number;
  private height: number;


  constructor() {
    const intermediate = { x : -1, y : -1 };
    this.start = intermediate;
    this.goal = intermediate;
    this.intermediates = [intermediate, intermediate, intermediate];
    this.walls = {};
    this.width = 0;
    this.height = 0;
  }

  get_width(): number { return this.width; }
  get_height(): number { return this.height; }

  bound_check(v: Vertex): boolean {
    return v.x >= 0 && v.x < this.width && v.y >= 0 && v.y < this.height;
  }

  remove_intermediate(): void {
    for (let i = 2; i >= 0; i -= 1) {
      if (this.bound_check(this.intermediates[i])) {
        this.intermediates[i].x = -1;
        this.intermediates[i].y = -1;
      }
    }
  }

  add_intermediate(): void {
    // Look for the first intermediate vertex that is not initialized
    for (let i = 0; i < 3; i += 1) {
      if (!this.bound_check(this.intermediates[i])) {
        const queue: Vertex[] = [{x: 0, y: 0}];
        let found_backup: boolean = false;
        let backup_vertex: Vertex;

        // Do breadth first search from the cell at 0,0 for an empty cell. If we can't find one, we
        // just choose the first cell we found with a wall and put it there
        while (queue.length > 0) {
          const v: Vertex = queue.shift();
          if (!this.is_special_vertex_at(v) && !found_backup) {
            found_backup = true;
            backup_vertex = v;
          }

          if (!this.is_special_vertex_at(v) && !this.is_wall(v)) {
            this.set_special_vertex(v, CellType.Intermediate, i);
            return;
          }
          this.get_neighbors(v).filter((v) => this.bound_check(v)).map((v) => queue.push(v));
        }

        if (found_backup) {
          this.set_special_vertex(backup_vertex, CellType.Intermediate, i);
          return;
        }
      }
    }
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

      // Even if the vertex is not an intermediate one, the third parameter won't be used so it's
      // safe to pass it in despite being undefined
      this.set_special_vertex(found_vertex, v.cell_type, v.intermediate_index);
    }
  }


  get_intermediate_index_at(position: Vertex): Option<number> {
    for (let i = 0; i < 3; i += 1) {
      if (vertices_equal(this.intermediates[i], position)) {
        return { ok: true, value: i };
      }
    }
    return { ok: false, err: "No intermediate node at that position" };
  }

  get_neighbors(vertex: Vertex): Vertex[] {
    if (this.width <= 1 && this.height <= 1) { return []; }
    let neighbors = [];
    if (vertex.x < this.width - 1)  { neighbors.push({x: vertex.x + 1, y: vertex.y}); }
    if (vertex.x > 0)           { neighbors.push({x: vertex.x - 1, y: vertex.y}); }
    if (vertex.y < this.height - 1) { neighbors.push({x: vertex.x, y: vertex.y + 1}); }
    if (vertex.y > 0)           { neighbors.push({x: vertex.x, y: vertex.y - 1}); }
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
        intermediate_index: v.intermediate_index
      };
    }
    const vertices =  [
      this.start,
      this.goal,
      this.intermediates[0],
      this.intermediates[1],
      this.intermediates[2]
    ];
    return vertices.map(copy_vertex)
  }


  get_special_vertex(cell_type: CellType, intermediate_index: number = 0): any {
    switch (cell_type) {
      case CellType.Start: return this.start;
      case CellType.Goal: return this.goal;
      case CellType.Intermediate: return this.intermediates[intermediate_index];
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

  set_special_vertex(v: Vertex, cell_type: CellType, intermediate_index: number = 0): boolean {
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

        case CellType.Intermediate: {
          this.intermediates[intermediate_index] = v;
          this.intermediates[intermediate_index].cell_type = CellType.Intermediate;
          this.intermediates[intermediate_index].icon = "\uf054";
          this.intermediates[intermediate_index].intermediate_index = intermediate_index;
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
      this.walls[key] = true;
    } else {
      this.walls[key] = undefined;
    }
  }

  set_wall(v: Vertex): void {
    if (this.bound_check(v)) {
      const key: string = v.x.toPrecision(3) + v.y.toPrecision(3);
      if (this.walls[key] === undefined) {
        this.walls[key] = true;
      }
    }
  }

  set_void(v: Vertex): void {
    if (this.bound_check(v)) {
      const key: string = v.x.toPrecision(3) + v.y.toPrecision(3);
      if (this.walls[key] !== undefined) {
        this.walls[key] = undefined;
      }
    }
  }
 

  get_walls(): Vertex[] {
    const walls = [];
    for (const key of Object.keys(this.walls)) {
      if (this.walls[key] !== undefined) {
        walls.push({ x: parseInt(key.substr(0, 3)), y : parseInt(key.substr(3, 3)) });
      }
    }
    return walls;
  }

  clear_walls(): void {
    for (const key of Object.keys(this.walls)) {
      if (this.walls[key] !== undefined) {
        this.walls[key] = undefined;
      }
    }
  }

  is_wall(v: Vertex): boolean {
    const key: string = v.x.toPrecision(3) + v.y.toPrecision(3);
    return this.walls[key] !== undefined;
  }
}

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
  public width: number;
  public height: number;
  public new_walls: Vertex[] = [];
  public old_walls: Vertex[] = [];


  constructor() {
    const intermediate = { x : -1, y : -1 };
    this.start = intermediate;
    this.goal = intermediate;
    this.intermediates = [intermediate, intermediate, intermediate];
    this.walls = {};
  }

  get_intermediate_at(position: Vertex): Option<Vertex> {
    for (const intermediate of this.intermediates) {
      if (vertices_equal(intermediate, position)) {
        return { ok: true, value: intermediate };
      }
    }
    return { ok: false, err: "No intermediate node at that position" };
  }

  get_neighbors(vertex: Vertex): Vertex[] {
    if (this.width <= 1 && this.height <= 1) { return []; }
    let neighbors = [];
    if (vertex.x > 0)           { neighbors.push({x: vertex.x - 1, y: vertex.y}); }
    if (vertex.x < this.width)  { neighbors.push({x: vertex.x + 1, y: vertex.y}); }
    if (vertex.y > 0)           { neighbors.push({x: vertex.x, y: vertex.y - 1}); }
    if (vertex.y < this.height) { neighbors.push({x: vertex.x, y: vertex.y + 1}); }
    return neighbors;
  }

  // Will return deep copies of the special vertices
  get_special_vertices_copy(): Vertex[] {
    function copy_vertex(v: Vertex) {
      return { x : v.x, y: v.y, icon: v.icon, cell_type: v.cell_type };
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

  bound_check(v: Vertex): boolean {
    if (v.x < 0 || v.x > this.width || v.y < 0 || v.y > this.height) {
      return false;
    }

    // Check if other special vertices are where v is specified
    if (v.x >= 0 && v.x <= this.width && v.y >= 0 && v.y <= this.height) {
      const special_vertices = this.get_special_vertices_copy();
      for (const vertex of special_vertices) {
        if (vertices_equal(vertex, v)) {
          return false;
        }
      }
    }
    return true;
  }

  set_special_vertex(v: Vertex, cell_type: CellType, intermediate_index: number = 0): boolean {
    if (this.bound_check(v)) {
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
    const key: string = v.x.toPrecision(2) + v.y.toPrecision(2);
    const value: any = this.walls[key];
    if (value === undefined) {
      this.walls[key] = true;
      this.new_walls.push(v);
    } else {
      this.walls[key] = undefined;
      this.old_walls.push(v);
    }
  }

  set_wall(v: Vertex): void {
    const key: string = v.x.toPrecision(2) + v.y.toPrecision(2);
    const value: any = this.walls[key];
    if (value === undefined) {
      this.walls[key] = true;
      this.new_walls.push(v);
    }
  }

  set_void(v: Vertex): void {
    const key: string = v.x.toPrecision(2) + v.y.toPrecision(2);
    const value: any = this.walls[key];
    if (value !== undefined) {
      this.walls[key] = undefined;
      this.old_walls.push(v);
    }
  }
 

  get_walls(): Vertex[] {
    const walls = [];
    for (const key of Object.keys(this.walls)) {
      const v = { x: parseInt(key.substr(0, 2)), y : parseInt(key.substr(2, 2)) };
      walls.push(v);
    }
    return walls;
  }
}

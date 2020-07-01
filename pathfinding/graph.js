/*
 * Kevin Vicente
 * June 2020
 *
 * This file contains all the code pertaining to maintaining the state of the pathfinder -- i.e.
 * where special vertices are, what vertices are walled and which are not, etc. We also perform all
 * the algorithms on these objects, and we reflect the actions to the user in the UI code.
 */
var CellType;
(function (CellType) {
    CellType[CellType["Start"] = 0] = "Start";
    CellType[CellType["Goal"] = 1] = "Goal";
    CellType[CellType["Intermediate"] = 2] = "Intermediate";
})(CellType || (CellType = {}));
function vertices_equal(v1, v2) {
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
var Graph = /** @class */ (function () {
    function Graph() {
        var intermediate = { x: -1, y: -1 };
        this.start = intermediate;
        this.goal = intermediate;
        this.intermediates = [intermediate, intermediate, intermediate];
        this.walls = {};
        this.width = 0;
        this.height = 0;
    }
    Graph.prototype.get_width = function () { return this.width; };
    Graph.prototype.get_height = function () { return this.height; };
    Graph.prototype.bound_check = function (v) {
        return v.x >= 0 && v.x < this.width && v.y >= 0 && v.y < this.height;
    };
    Graph.prototype.remove_intermediate = function () {
        for (var i = 2; i >= 0; i -= 1) {
            if (this.bound_check(this.intermediates[i])) {
                this.intermediates[i].x = -1;
                this.intermediates[i].y = -1;
            }
        }
    };
    Graph.prototype.add_intermediate = function () {
        var _this = this;
        var _loop_1 = function (i) {
            if (!this_1.bound_check(this_1.intermediates[i])) {
                var queue_1 = [{ x: 0, y: 0 }];
                var found_backup = false;
                var backup_vertex = void 0;
                // Do breadth first search from the cell at 0,0 for an empty cell. If we can't find one, we
                // just choose the first cell we found with a wall and put it there
                while (queue_1.length > 0) {
                    var v = queue_1.shift();
                    if (!this_1.is_special_vertex_at(v) && !found_backup) {
                        found_backup = true;
                        backup_vertex = v;
                    }
                    if (!this_1.is_special_vertex_at(v) && !this_1.is_wall(v)) {
                        this_1.set_special_vertex(v, CellType.Intermediate, i);
                        return { value: void 0 };
                    }
                    this_1.get_neighbors(v).filter(function (v) { return _this.bound_check(v); }).map(function (v) { return queue_1.push(v); });
                }
                if (found_backup) {
                    this_1.set_special_vertex(backup_vertex, CellType.Intermediate, i);
                    return { value: void 0 };
                }
            }
        };
        var this_1 = this;
        // Look for the first intermediate vertex that is not initialized
        for (var i = 0; i < 3; i += 1) {
            var state_1 = _loop_1(i);
            if (typeof state_1 === "object")
                return state_1.value;
        }
    };
    Graph.prototype.set_width_and_height = function (new_width, new_height) {
        var _this = this;
        var out_of_bounds = this
            .get_special_vertices_copy()
            .filter(function (v) { return v.x >= new_width || v.y >= new_height; });
        this.width = new_width;
        this.height = new_height;
        var _loop_2 = function (v) {
            // We will first calculate the closest cell to the out of bounds vertex
            var nearest = {
                x: (v.x >= new_width) ? new_width - 1 : v.x,
                y: (v.y >= new_height) ? new_height - 1 : v.y
            };
            // Then, we do breadth first search for the nearest empty cell starting at that cell
            var queue = [nearest];
            var found = false;
            var found_vertex = void 0;
            while (queue.length > 0) {
                var vertex = queue.shift();
                this_2.get_neighbors(vertex)
                    .filter(function (vert) { return _this.bound_check(vert); })
                    .map(function (vert) { return queue.push(vert); });
                if (!this_2.is_special_vertex_at(vertex) && !this_2.is_wall(vertex)) {
                    found_vertex = vertex;
                    found = true;
                    break;
                }
            }
            if (!found) {
                this_2.set_void(nearest);
                found_vertex = nearest;
            }
            switch (v.cell_type) {
                case CellType.Start:
                    this_2.start.x = found_vertex.x;
                    this_2.start.y = found_vertex.y;
                    break;
                case CellType.Goal:
                    this_2.goal.x = found_vertex.x;
                    this_2.goal.y = found_vertex.y;
                    break;
                case CellType.Intermediate:
                    var k = this_2.get_intermediate_index_at(found_vertex);
                    if (k.ok) {
                        this_2.intermediates[k.value].x = found_vertex.x;
                        this_2.intermediates[k.value].y = found_vertex.y;
                    }
                    break;
            }
        };
        var this_2 = this;
        // Reposition any special vertices that are no longer within the graph bounds
        for (var _i = 0, out_of_bounds_1 = out_of_bounds; _i < out_of_bounds_1.length; _i++) {
            var v = out_of_bounds_1[_i];
            _loop_2(v);
        }
    };
    Graph.prototype.get_intermediate_index_at = function (position) {
        for (var i = 0; i < 3; i += 1) {
            if (vertices_equal(this.intermediates[i], position)) {
                return { ok: true, value: i };
            }
        }
        return { ok: false, err: "No intermediate node at that position" };
    };
    Graph.prototype.get_neighbors = function (vertex) {
        if (this.width <= 1 && this.height <= 1) {
            return [];
        }
        var neighbors = [];
        if (vertex.x > 0) {
            neighbors.push({ x: vertex.x - 1, y: vertex.y });
        }
        if (vertex.x < this.width - 1) {
            neighbors.push({ x: vertex.x + 1, y: vertex.y });
        }
        if (vertex.y > 0) {
            neighbors.push({ x: vertex.x, y: vertex.y - 1 });
        }
        if (vertex.y < this.height - 1) {
            neighbors.push({ x: vertex.x, y: vertex.y + 1 });
        }
        return neighbors;
    };
    // Will return deep copies of the special vertices
    Graph.prototype.get_special_vertices_copy = function () {
        function copy_vertex(v) {
            return {
                x: v.x,
                y: v.y,
                icon: v.icon,
                cell_type: v.cell_type,
                intermediate_index: v.intermediate_index
            };
        }
        var vertices = [
            this.start,
            this.goal,
            this.intermediates[0],
            this.intermediates[1],
            this.intermediates[2]
        ];
        return vertices.map(copy_vertex);
    };
    Graph.prototype.get_special_vertex = function (cell_type, intermediate_index) {
        if (intermediate_index === void 0) { intermediate_index = 0; }
        switch (cell_type) {
            case CellType.Start: return this.start;
            case CellType.Goal: return this.goal;
            case CellType.Intermediate: return this.intermediates[intermediate_index];
        }
    };
    Graph.prototype.get_special_vertex_at = function (v) {
        if (!this.bound_check(v)) {
            return { ok: false, err: "Invalid vertex" };
        }
        var special_vertices = this.get_special_vertices_copy();
        for (var _i = 0, special_vertices_1 = special_vertices; _i < special_vertices_1.length; _i++) {
            var vertex = special_vertices_1[_i];
            if (vertices_equal(vertex, v)) {
                return { ok: true, value: vertex };
            }
        }
        return { ok: false, err: "No special vertex at given position" };
    };
    Graph.prototype.is_special_vertex_at = function (v) {
        // Check if other special vertices are where v is specified
        var special_vertices = this.get_special_vertices_copy();
        for (var _i = 0, special_vertices_2 = special_vertices; _i < special_vertices_2.length; _i++) {
            var vertex = special_vertices_2[_i];
            if (vertices_equal(vertex, v)) {
                return true;
            }
        }
        return false;
    };
    Graph.prototype.set_special_vertex = function (v, cell_type, intermediate_index) {
        if (intermediate_index === void 0) { intermediate_index = 0; }
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
    };
    // Here, we just create a key that is unique to the given vertex, then check if the value in
    // the walls object is undefined or not
    Graph.prototype.flip_wall_status = function (v) {
        var key = v.x.toPrecision(3) + v.y.toPrecision(3);
        if (this.walls[key] === undefined) {
            this.walls[key] = true;
        }
        else {
            this.walls[key] = undefined;
        }
    };
    Graph.prototype.set_wall = function (v) {
        if (this.bound_check(v)) {
            var key = v.x.toPrecision(3) + v.y.toPrecision(3);
            if (this.walls[key] === undefined) {
                this.walls[key] = true;
            }
        }
    };
    Graph.prototype.set_void = function (v) {
        if (this.bound_check(v)) {
            var key = v.x.toPrecision(3) + v.y.toPrecision(3);
            if (this.walls[key] !== undefined) {
                this.walls[key] = undefined;
            }
        }
    };
    Graph.prototype.get_walls = function () {
        var walls = [];
        for (var _i = 0, _a = Object.keys(this.walls); _i < _a.length; _i++) {
            var key = _a[_i];
            if (this.walls[key] !== undefined) {
                walls.push({ x: parseInt(key.substr(0, 3)), y: parseInt(key.substr(3, 3)) });
            }
        }
        return walls;
    };
    Graph.prototype.clear_walls = function () {
        for (var _i = 0, _a = Object.keys(this.walls); _i < _a.length; _i++) {
            var key = _a[_i];
            if (this.walls[key] !== undefined) {
                this.walls[key] = undefined;
            }
        }
    };
    Graph.prototype.is_wall = function (v) {
        var key = v.x.toPrecision(3) + v.y.toPrecision(3);
        return this.walls[key] !== undefined;
    };
    return Graph;
}());

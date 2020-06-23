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
        this.new_walls = [];
        this.old_walls = [];
        var intermediate = { x: -1, y: -1 };
        this.start = intermediate;
        this.goal = intermediate;
        this.intermediates = [intermediate, intermediate, intermediate];
        this.walls = {};
    }
    Graph.prototype.get_intermediate_at = function (position) {
        for (var _i = 0, _a = this.intermediates; _i < _a.length; _i++) {
            var intermediate = _a[_i];
            if (vertices_equal(intermediate, position)) {
                return { ok: true, value: intermediate };
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
        if (vertex.x < this.width) {
            neighbors.push({ x: vertex.x + 1, y: vertex.y });
        }
        if (vertex.y > 0) {
            neighbors.push({ x: vertex.x, y: vertex.y - 1 });
        }
        if (vertex.y < this.height) {
            neighbors.push({ x: vertex.x, y: vertex.y + 1 });
        }
        return neighbors;
    };
    // Will return deep copies of the special vertices
    Graph.prototype.get_special_vertices_copy = function () {
        function copy_vertex(v) {
            return { x: v.x, y: v.y, icon: v.icon, cell_type: v.cell_type };
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
    Graph.prototype.bound_check = function (v) {
        if (v.x < 0 || v.x > this.width || v.y < 0 || v.y > this.height) {
            return false;
        }
        // Check if other special vertices are where v is specified
        if (v.x >= 0 && v.x <= this.width && v.y >= 0 && v.y <= this.height) {
            var special_vertices = this.get_special_vertices_copy();
            for (var _i = 0, special_vertices_1 = special_vertices; _i < special_vertices_1.length; _i++) {
                var vertex = special_vertices_1[_i];
                if (vertices_equal(vertex, v)) {
                    return false;
                }
            }
        }
        return true;
    };
    Graph.prototype.set_special_vertex = function (v, cell_type, intermediate_index) {
        if (intermediate_index === void 0) { intermediate_index = 0; }
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
    };
    // Here, we just create a key that is unique to the given vertex, then check if the value in
    // the walls object is undefined or not
    Graph.prototype.flip_wall_status = function (v) {
        var key = v.x.toPrecision(2) + v.y.toPrecision(2);
        var value = this.walls[key];
        if (value === undefined) {
            this.walls[key] = true;
            this.new_walls.push(v);
        }
        else {
            this.walls[key] = undefined;
            this.old_walls.push(v);
        }
    };
    Graph.prototype.set_wall = function (v) {
        var key = v.x.toPrecision(2) + v.y.toPrecision(2);
        var value = this.walls[key];
        if (value === undefined) {
            this.walls[key] = true;
            this.new_walls.push(v);
        }
    };
    Graph.prototype.set_void = function (v) {
        var key = v.x.toPrecision(2) + v.y.toPrecision(2);
        var value = this.walls[key];
        if (value !== undefined) {
            this.walls[key] = undefined;
            this.old_walls.push(v);
        }
    };
    Graph.prototype.get_walls = function () {
        var walls = [];
        for (var _i = 0, _a = Object.keys(this.walls); _i < _a.length; _i++) {
            var key = _a[_i];
            var v = { x: parseInt(key.substr(0, 2)), y: parseInt(key.substr(2, 2)) };
            walls.push(v);
        }
        return walls;
    };
    return Graph;
}());

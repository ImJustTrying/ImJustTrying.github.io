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
// Priority queue implementation for the graph search algorithms
var QElem = /** @class */ (function () {
    function QElem(elem, prio, cost) {
        this.element = elem;
        this.priority = prio;
        this.cost = cost;
    }
    return QElem;
}());
// We remove lowest priority elements first in this implementation
// We also use a sorted list rather than a heap
var PriorityQueue = /** @class */ (function () {
    function PriorityQueue(elements) {
        var _this = this;
        if (elements === void 0) { elements = []; }
        this.queue = [];
        elements.map(function (e) { return _this.enqueue(e.element, e.priority, e.cost); });
    }
    PriorityQueue.prototype.enqueue = function (elem, prio, cost) {
        if (this.queue.length === 0) {
            this.queue.push(new QElem(elem, prio, cost));
            return;
        }
        // Since we are using a sorted list, we can do binary search to maintain the O(log n) runtime
        var left_index = 0;
        var right_index = this.queue.length - 1;
        var middle = Math.floor((right_index - left_index) / 2);
        while (right_index - left_index >= 1) {
            if (prio > this.queue[middle].priority) {
                left_index = middle + 1;
            }
            else {
                right_index = middle;
            }
            middle = left_index + Math.floor((right_index - left_index) / 2);
        }
        if (prio > this.queue[middle].priority) {
            this.queue.splice(middle + 1, 0, new QElem(elem, prio, cost));
        }
        else {
            this.queue.splice(middle, 0, new QElem(elem, prio, cost));
        }
    };
    PriorityQueue.prototype.dequeue = function () {
        if (this.queue.length != 0) {
            return { ok: true, value: this.queue.shift() };
        }
        else {
            return { ok: false, err: "Underflow" };
        }
    };
    PriorityQueue.prototype.is_empty = function () {
        return this.queue.length === 0;
    };
    return PriorityQueue;
}());
// Helper functions
function vertices_equal(v1, v2) {
    return v1.x === v2.x && v1.y === v2.y;
}
// Generates integers in the range [lower, higher), excluding any values in exclude. MDN reference:
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random
function gen_random_int(lower, higher, exclude) {
    if (exclude === void 0) { exclude = []; }
    var min = Math.ceil(lower);
    var max = Math.floor(higher);
    var valid_values = [];
    for (var i = min; i < max; i += 1) {
        if (!exclude.includes(i)) {
            valid_values.push(i);
        }
    }
    if (valid_values.length === 0) {
        return { ok: false, err: "All numbers in range are excluded" };
    }
    else {
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
var Graph = /** @class */ (function () {
    function Graph() {
        this.start = { x: -1, y: -1 };
        this.goal = { x: -1, y: -1 };
        this.walls = {};
        this.width = 0;
        this.height = 0;
    }
    Graph.prototype.get_width = function () { return this.width; };
    Graph.prototype.get_height = function () { return this.height; };
    Graph.prototype.bound_check = function (v) {
        return v.x >= 0 && v.x < this.width && v.y >= 0 && v.y < this.height;
    };
    Graph.prototype.set_width_and_height = function (new_width, new_height) {
        var _this = this;
        var out_of_bounds = this
            .get_special_vertices_copy()
            .filter(function (v) { return v.x >= new_width || v.y >= new_height; });
        this.width = new_width;
        this.height = new_height;
        var _loop_1 = function (v) {
            // We will first calculate the closest cell to the out of bounds vertex
            var nearest = {
                x: (v.x >= new_width) ? new_width - 1 : v.x,
                y: (v.y >= new_height) ? new_height - 1 : v.y
            };
            // Then, we do breadth first search for the nearest empty cell starting at that cell
            var queue = [nearest];
            var found = false;
            var found_backup = false;
            var found_vertex = void 0;
            var backup = void 0;
            while (queue.length > 0) {
                var vertex = queue.shift();
                if (!found_backup && !this_1.is_special_vertex_at(vertex)) {
                    backup = vertex;
                    found_backup = true;
                }
                if (!this_1.is_special_vertex_at(vertex) && !this_1.is_wall(vertex)) {
                    found_vertex = vertex;
                    found = true;
                    break;
                }
                this_1.get_neighbors(vertex)
                    .filter(function (vert) { return _this.bound_check(vert); })
                    .map(function (vert) { return queue.push(vert); });
            }
            // If there are no free cells, void the first cell that does not have a special vertex at it
            // and put the vertex there.
            if (!found) {
                found_vertex = backup;
                this_1.set_void(backup);
            }
            this_1.set_special_vertex(found_vertex, v.cell_type);
        };
        var this_1 = this;
        // Reposition any special vertices that are no longer within the graph bounds
        for (var _i = 0, out_of_bounds_1 = out_of_bounds; _i < out_of_bounds_1.length; _i++) {
            var v = out_of_bounds_1[_i];
            _loop_1(v);
        }
    };
    Graph.prototype.get_neighbors = function (vertex, shuffle) {
        if (shuffle === void 0) { shuffle = false; }
        if (this.width <= 1 && this.height <= 1) {
            return [];
        }
        var neighbors = [];
        if (vertex.x < this.width - 1) {
            neighbors.push({ x: vertex.x + 1, y: vertex.y });
        }
        if (vertex.x > 0) {
            neighbors.push({ x: vertex.x - 1, y: vertex.y });
        }
        if (vertex.y < this.height - 1) {
            neighbors.push({ x: vertex.x, y: vertex.y + 1 });
        }
        if (vertex.y > 0) {
            neighbors.push({ x: vertex.x, y: vertex.y - 1 });
        }
        if (shuffle) {
            // Shuffle the list of neighbors
            for (var i = 0; i < neighbors.length - 1; i += 1) {
                var k = gen_random_int(i, neighbors.length).value;
                var t = neighbors[i];
                neighbors[i] = neighbors[k];
                neighbors[k] = t;
            }
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
                cell_type: v.cell_type
            };
        }
        var vertices = [
            this.start,
            this.goal,
        ];
        return vertices.map(copy_vertex);
    };
    Graph.prototype.get_special_vertex = function (cell_type) {
        switch (cell_type) {
            case CellType.Start: return this.start;
            case CellType.Goal: return this.goal;
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
    Graph.prototype.set_special_vertex = function (v, cell_type) {
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
    };
    // Here, we just create a key that is unique to the given vertex, then check if the value in
    // the walls object is undefined or not
    Graph.prototype.flip_wall_status = function (v) {
        var key = v.x.toPrecision(3) + v.y.toPrecision(3);
        if (this.walls[key] === undefined) {
            this.walls[key] = { wall: true, visited: false, marked: false };
        }
        else {
            this.walls[key].wall = false;
        }
    };
    Graph.prototype.set_wall = function (v) {
        if (this.bound_check(v)) {
            var key = v.x.toPrecision(3) + v.y.toPrecision(3);
            if (this.walls[key] === undefined) {
                this.walls[key] = { wall: true, visited: false };
            }
            else {
                this.walls[key].wall = true;
            }
        }
    };
    Graph.prototype.set_void = function (v) {
        if (this.bound_check(v)) {
            var key = v.x.toPrecision(3) + v.y.toPrecision(3);
            if (this.walls[key] === undefined) {
                this.walls[key] = { wall: false, visited: false };
            }
            else {
                this.walls[key].wall = false;
            }
        }
    };
    Graph.prototype.get_walls = function () {
        var walls = [];
        for (var _i = 0, _a = Object.keys(this.walls); _i < _a.length; _i++) {
            var key = _a[_i];
            if (this.walls[key].wall) {
                walls.push({ x: parseInt(key.substr(0, 3)), y: parseInt(key.substr(3, 3)) });
            }
        }
        return walls;
    };
    Graph.prototype.clear_walls = function () {
        for (var _i = 0, _a = Object.keys(this.walls); _i < _a.length; _i++) {
            var key = _a[_i];
            if (this.walls[key].wall) {
                this.walls[key].wall = false;
            }
        }
    };
    Graph.prototype.is_wall = function (v) {
        var key = v.x.toPrecision(3) + v.y.toPrecision(3);
        return this.walls[key] !== undefined && this.walls[key].wall;
    };
    Graph.prototype.set_visited = function (v) {
        var key = v.x.toPrecision(3) + v.y.toPrecision(3);
        if (this.walls[key] !== undefined) {
            this.walls[key].visited = true;
        }
        else {
            this.walls[key] = { wall: false, visited: true, marked: false };
        }
    };
    Graph.prototype.was_visited = function (v) {
        var key = v.x.toPrecision(3) + v.y.toPrecision(3);
        if (this.walls[key] !== undefined) {
            return this.walls[key].visited;
        }
        return false;
    };
    Graph.prototype.clear_visited = function () {
        for (var _i = 0, _a = Object.keys(this.walls); _i < _a.length; _i++) {
            var key = _a[_i];
            this.walls[key].visited = false;
        }
    };
    Graph.prototype.is_marked = function (v) {
        var key = v.x.toPrecision(3) + v.y.toPrecision(3);
        if (this.walls[key] !== undefined) {
            return this.walls[key].marked;
        }
        return false;
    };
    Graph.prototype.set_marked = function (v) {
        var key = v.x.toPrecision(3) + v.y.toPrecision(3);
        if (this.walls[key] === undefined) {
            this.walls[key] = { wall: false, visited: false, marked: true };
        }
        else {
            this.walls[key].marked = true;
        }
    };
    Graph.prototype.clear_marked = function () {
        for (var _i = 0, _a = Object.keys(this.walls); _i < _a.length; _i++) {
            var key = _a[_i];
            this.walls[key].marked = false;
        }
    };
    return Graph;
}());

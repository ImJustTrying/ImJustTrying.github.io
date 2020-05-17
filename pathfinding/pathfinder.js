var ui;
var state;
var UI = /** @class */ (function () {
    function UI(cell_size) {
        this.cell_size = cell_size;
        this.canvas = document.querySelector("#canvas");
        this.ctx = this.canvas.getContext("2d");
        this.resize();
    }
    UI.prototype.get_width_in_cells = function () { return this.graph_width; };
    UI.prototype.get_height_in_cells = function () { return this.graph_width; };
    UI.prototype.resize = function () {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.graph_width = (this.canvas.width - this.canvas.width % this.cell_size) / this.cell_size;
        this.graph_height = (this.canvas.height - this.canvas.height % this.cell_size) / this.cell_size;
    };
    UI.prototype.draw = function (state) {
        // Draw gridlines
        this.ctx.strokeStyle = "#fff";
        this.ctx.lineWidth = 1;
        var graph_width_in_pixels = this.graph_width * this.cell_size;
        var graph_height_in_pixels = this.graph_height * this.cell_size;
        for (var x = 0; x <= this.graph_width; x += 1) {
            for (var y = 0; y <= this.graph_height; y += 1) {
                // The reasoning behind this is explained here:
                // https://stackoverflow.com/questions/7530593/html5-canvas-and-line-width/7531540#7531540
                var x_coord = x * this.cell_size + 0.5;
                var y_coord = y * this.cell_size + 0.5;
                this.ctx.moveTo(x_coord, 0);
                this.ctx.lineTo(x_coord, graph_height_in_pixels);
                this.ctx.moveTo(0, y_coord);
                this.ctx.lineTo(graph_width_in_pixels, y_coord);
            }
        }
        this.ctx.stroke();
        // Draw icons
        var start = state.get_start();
        var goal = state.get_goal();
        this.ctx.font = "600 " + this.cell_size.toString() + "px 'Font Awesome 5 Free'";
        this.ctx.fillStyle = "white";
        this.ctx.textBaseline = "bottom";
        // The unicode values are for font awesome
        this.ctx.fillText("\uf0a9", start.x * this.cell_size, (start.y + 1) * this.cell_size);
        this.ctx.fillText("\uf140", goal.x * this.cell_size, (goal.y + 1) * this.cell_size);
    };
    return UI;
}());
var Graph = /** @class */ (function () {
    function Graph(width, height) {
        this.width = width;
        this.height = height;
    }
    Graph.prototype.get_neighbors = function (vertex) {
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
    Graph.prototype.get_start = function () { return this.start; };
    Graph.prototype.get_goal = function () { return this.goal; };
    Graph.prototype.set_start = function (start) {
        if (start.x >= 0 && start.x <= this.width && start.y >= 0 && start.y <= this.height) {
            this.start = start;
            return true;
        }
        return false;
    };
    Graph.prototype.set_goal = function (goal) {
        if (goal.x >= 0 && goal.x <= this.width && goal.y >= 0 && goal.y <= this.height) {
            this.goal = goal;
            return true;
        }
        return false;
    };
    return Graph;
}());
function init() {
    document.fonts.ready.then(function (_) {
        ui = new UI(40);
        state = new Graph(ui.get_width_in_cells(), ui.get_height_in_cells());
        state.set_start({ x: 0, y: 0 });
        state.set_goal({ x: ui.get_width_in_cells() / 2, y: ui.get_height_in_cells() / 2 });
        ui.draw(state);
    });
}
function resize() {
    ui.resize();
    state.set_start({ x: 0, y: 0 });
    state.set_goal({ x: ui.get_width_in_cells() / 2, y: ui.get_height_in_cells() / 2 });
    ui.draw(state);
}

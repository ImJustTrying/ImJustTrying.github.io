/*
 * Kevin Vicente
 * June 2020
 *
 * Here we implement all of the distinct maze generation and graph search algorithms.
 * This file depends on dom.ts, ui.ts, and graph.ts.
 * An explanation of how this file does what it does:
 * (1) We have a draw queue, which is a queue of vertices to animate on the canvas
 * (2) We have have two drawing procedures -- one for drawing mazes and the other for paths
 * (3) We have a procedure for every maze generation and graph traversal algorithm, which will add
 * vertices to the draw queue, and will also call window.requestAnimationFrame() on the
 * appropriate drawing procedure.
 * (4) We assume that only a single maze generation or graph traversal procedure is running at any
 * given point in time during execution.
 */



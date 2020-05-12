let canvas_width;
let canvas_height;
let block_width = 100;
let block_height = 100;
let blocks_in_row = 0;
let blocks_in_col = 0;

function resize() {
  const canvas = document.getElementById("canvas");
  const window_width = window.innerWidth - 10;
  const window_height = window.innerHeight - 10;

  // We only want to add new blocks when there is enough space for them
  if (Math.floor(window_width / block_width) !== blocks_in_row) {
    blocks_in_row = Math.floor(window_width / block_width);
  }
  if (Math.floor(window_height / block_height) !== blocks_in_col) {
    blocks_in_col = Math.floor(window_height / block_height);
  }

  canvas.width = window_width;
  canvas.height = window_height;
  canvas_width = canvas.width;
  canvas_height = canvas.height;
}

function init() {
  resize();
  window.requestAnimationFrame(draw);
}

// This is a simple animation that has a dot trace a circlular path.
function test_draw() {
  let canvas = document.getElementById("canvas");
  let context = canvas.getContext("2d");
  const time = new Date();
  const radius = 100;
  const Hz = 4;

  // Clear canvas
  context.clearRect(0,0, canvas.width, canvas.height);
  context.strokeStyle = "#FFF";

  // Trace the path the oscillating circle with travel
  context.beginPath();
  context.arc(canvas.width / 2, canvas.height / 2, radius, 0, 2 * Math.PI);
  context.stroke();

  // Save the state of the context object
  context.save();
  // Translate the origin to the center of the canvas
  context.translate(canvas.width / 2, canvas.height / 2);
  {
    const angle = (2 * Math.PI / Hz) * time.getSeconds() +
      (2 * Math.PI / Hz * 0.001) * time.getMilliseconds();
    context.rotate(angle);
  }
  // This will define the radius at which the oscillating circle will move
  context.translate(radius, 0);

  // Draw the oscillating circle
  context.beginPath();
  context.arc(0, 0, 20, 0, 2 * Math.PI);
  context.fill();
  context.stroke();

  // Reset the rotation and translation transforms
  context.restore();

  window.requestAnimationFrame(test_draw);
}

function draw() {
  let ctx  = document.getElementById("canvas").getContext("2d");
  const outline_width = block_width * blocks_in_row;
  const outline_height = block_height * blocks_in_col;

  // First, we draw the outlines of the blocks.
  ctx.beginPath();
  ctx.strokeStyle = "#FFF";
  for (let i = 0; i <= outline_width; i += block_width) {
    ctx.moveTo(i, 0);
    ctx.lineTo(i, outline_height);
  }
  for (let j = 0; j <= outline_height; j += block_height) {
    ctx.moveTo(0, j);
    ctx.lineTo(outline_width, j);
  }
  ctx.stroke();

  window.requestAnimationFrame(draw);
}

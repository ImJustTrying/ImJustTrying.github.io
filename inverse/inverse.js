/*
 * This is the p5 script for the inverse kinematics demo. The manipulator is composed of links
 * (the segments) and joints (the points where the segment rotates). Our goal is to move the
 * end-effector (the end of manipulator) to the point where the user clicks. We do this using
 * Inverse Kinematics, and more specifically we do this via the FABRIK algorithm
 * (www.andreasartistidou.com/publications/papers.FABRIK.pdf).
 */

var base, link1, link2;
let manipulator = null;
let a = true;
let midpoint = null;
const num_links = 5;
const link_len = 50;

class Link {
  constructor(origin, len) {
    this.stroke_weight = 4;
    this.origin = origin;
    this.len = len;
    this.angle = 0;
  }

  // This calculates the point at which the link connects to it's child link
  get_dest_point() {
    return createVector(
      this.origin.x + this.len * cos(this.angle),
      this.origin.y + this.len * sin(this.angle)
    );
  }

  // Make the link point at the given point
  point_at(point) {
    const dx = point.x - this.origin.x;
    const dy = point.y - this.origin.y;
    this.angle = atan2(dy,dx);
  }

  // Make the link point at and follow the given point
  drag(point) {
    this.point_at(point);
    this.origin.x = point.x - this.len * cos(this.angle);
    this.origin.y = point.y - this.len * sin(this.angle);
  }

  show() {
    strokeWeight(this.stroke_weight);
    const dest = this.get_dest_point();
    stroke(128);
    line(this.origin.x, this.origin.y, dest.x, dest.y);
  }
}

class IKManipulator {
  constructor(origin, base_link) {
    this.base_origin = origin;
    this.links = [base_link];
    this.last_link = base_link;
  }

  add_link(link_length) {
    let link = new Link(this.last_link.get_dest_point(), link_length);
    this.last_link = link;
    this.links.push(link);
  }

  // This will make the end effector follow the point, and all of the other links will forllow
  // the link after it.
  drag(point) {
    this.last_link.drag(point);
    for (let i = this.links.length - 2; i >= 0; i -= 1) {
      this.links[i].drag(this.links[i + 1].origin);
    }
  }

  reach(point) {
    this.drag(point);
    // Now that the end effector and the segments have the correct angles, we need to reset the
    // positions of each link to make sure that the manipulator's base remains fixed.
    
  }

  show() {
    for (let i = 0; i < this.links.length; i += 1) {
      this.links[i].show();
    }
  }
}


function setup() {
  createCanvas(640, 480);
  midpoint = createVector(width / 2, height / 2);
  base = new Link(midpoint, link_len);
  manipulator = new IKManipulator(midpoint, base);
  for (let i = 1; i < num_links; i += 1) {
    manipulator.add_link(link_len);
  }
  setInterval(function() { console.log(midpoint); }, 5000);
}

function draw() {
  clear();
  background('#1a1a1a'); 
  stroke(255); 
  circle(width / 2, height / 2, 5);

  manipulator.reach(createVector(mouseX, mouseY));
  manipulator.show();
}

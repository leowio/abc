function setup() {
  let canvas = createCanvas(windowWidth, windowHeight);
  canvas.parent("p5-canvas-container");
  background(90, 200, 190);
}

function draw() {
  fill(0);
}

// P5 touch events: https://p5js.org/reference/#Touch

function touchStarted() {
  for (let i = 0; i < touches.length; i++) {
    let x = touches[i].x;
    let y = touches[i].y;
    circle(x, y, 100);
  }
}

function touchMoved() {}

function touchEnded() {}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

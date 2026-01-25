let ripples = [];

function setup() {
  let canvas = createCanvas(windowWidth, windowHeight);
  canvas.parent("p5-canvas-container");
}

function draw() {
  background(88, 178, 220);

  for (let i = ripples.length - 1; i >= 0; i--) {
    updateRipple(ripples[i]);
    drawRipple(ripples[i]);

    if (ripples[i].radius >= ripples[i].maxRadius) {
      ripples.splice(i, 1);
    }
  }
}

function createRipple(x, y, delay) {
  return {
    x: x,
    y: y,
    radius: 0,
    maxRadius: 200,
    alpha: 255,
    weight: 4,
    speed: 3,
    delay: delay,
  };
}

function updateRipple(ripple) {
  if (ripple.delay > 0) {
    ripple.delay--;
    return;
  }
  ripple.radius += ripple.speed;
  ripple.alpha = map(ripple.radius, 0, ripple.maxRadius, 255, 0);
  ripple.weight = map(ripple.radius, 0, ripple.maxRadius, 4, 0.5);
}

function drawRipple(ripple) {
  if (ripple.delay > 0) return;

  noFill();
  stroke(255, 255, 255, ripple.alpha);
  strokeWeight(ripple.weight);
  circle(ripple.x, ripple.y, ripple.radius * 2);
}

// P5 touch events: https://p5js.org/reference/#Touch

function touchStarted() {
  for (let i = 0; i < touches.length; i++) {
    let x = touches[i].x;
    let y = touches[i].y;
    ripples.push(createRipple(x, y, 0));
    ripples.push(createRipple(x, y, 10));
    ripples.push(createRipple(x, y, 20));
  }
}

function touchMoved() {
  for (let i = 0; i < touches.length; i++) {
    let x = touches[i].x;
    let y = touches[i].y;
    ripples.push(createRipple(x, y, 0));
  }
}

function touchEnded() {}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

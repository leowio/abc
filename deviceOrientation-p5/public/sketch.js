let alpha = 0,
  beta = 0,
  gamma = 0;
let smoothBeta = 0;
let smoothGamma = 0;

let buildings = [];

function setup() {
  let canvas = createCanvas(windowWidth, windowHeight);
  canvas.parent("p5-canvas-container");
  generateCity();
}

function generateCity() {
  buildings = [];
  let gridSize = 50;
  let cols = 8;
  let rows = 8;
  let startX = (-cols * gridSize) / 2;
  let startY = (-rows * gridSize) / 2;

  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      if (random() > 0.3) {
        let x = startX + i * gridSize + gridSize / 2;
        let y = startY + j * gridSize + gridSize / 2;
        let w = random(25, 40);
        let d = random(25, 40);
        let h = random(30, 150);
        let colorType = floor(random(5));
        buildings.push({ x, y, w, d, h, colorType });
      }
    }
  }

  buildings.sort((a, b) => a.y - a.x - (b.y - b.x));
}

function draw() {
  background(25, 30, 45);

  smoothBeta = lerp(smoothBeta, beta, 0.1);
  smoothGamma = lerp(smoothGamma, gamma, 0.1);

  let tiltX = map(smoothGamma, -45, 45, -0.5, 0.5, true);
  let tiltY = map(smoothBeta, -45, 45, -0.5, 0.5, true);

  push();
  translate(width / 2, height / 2);

  drawGround(400, 400);

  for (let b of buildings) {
    drawBuilding(b.x, b.y, b.w, b.d, b.h, tiltX, tiltY, b.colorType);
  }

  pop();

  fill(255);
  noStroke();
  textSize(14);
}

function getColors(colorType) {
  let palettes = [
    { top: [255, 107, 107], front: [200, 80, 80], side: [170, 60, 60] },
    { top: [78, 205, 196], front: [60, 160, 150], side: [45, 130, 120] },
    { top: [255, 230, 109], front: [200, 180, 80], side: [170, 150, 60] },
    { top: [199, 128, 232], front: [160, 100, 190], side: [130, 75, 160] },
    { top: [95, 189, 255], front: [70, 150, 200], side: [50, 120, 170] },
  ];
  return palettes[colorType % palettes.length];
}

function drawGround(w, h) {
  let x1 = -w / 2;
  let y1 = -h / 2;
  let x2 = w / 2;
  let y2 = h / 2;

  noStroke();
  fill(45, 55, 70);
  rect(x1, y1, w, h);

  stroke(60, 75, 95);
  strokeWeight(1);
  let gridStep = 50;
  for (let x = x1; x <= x2; x += gridStep) {
    line(x, y1, x, y2);
  }
  for (let y = y1; y <= y2; y += gridStep) {
    line(x1, y, x2, y);
  }
}

function drawBuilding(bx, by, w, d, h, tiltX, tiltY, colorType) {
  let baseDepth = h * 0.4;
  let depthX = baseDepth + h * 0.5 * tiltX;
  let depthY = -baseDepth + h * 0.5 * -tiltY;

  let offsetX = tiltX * h * 0.2;
  let offsetY = tiltY * h * 0.2;

  let botTL = { x: bx - w / 2, y: by - d / 2 };
  let botTR = { x: bx + w / 2, y: by - d / 2 };
  let botBL = { x: bx - w / 2, y: by + d / 2 };
  let botBR = { x: bx + w / 2, y: by + d / 2 };

  let topTL = {
    x: bx - w / 2 + depthX + offsetX,
    y: by - d / 2 + depthY + offsetY,
  };
  let topTR = {
    x: bx + w / 2 + depthX + offsetX,
    y: by - d / 2 + depthY + offsetY,
  };
  let topBL = {
    x: bx - w / 2 + depthX + offsetX,
    y: by + d / 2 + depthY + offsetY,
  };
  let topBR = {
    x: bx + w / 2 + depthX + offsetX,
    y: by + d / 2 + depthY + offsetY,
  };

  let colors = getColors(colorType);

  noStroke();

  fill(colors.side[0] * 0.7, colors.side[1] * 0.7, colors.side[2] * 0.7);
  quad(botBL.x, botBL.y, botBR.x, botBR.y, topBR.x, topBR.y, topBL.x, topBL.y);

  fill(colors.side[0], colors.side[1], colors.side[2]);
  quad(botTL.x, botTL.y, botBL.x, botBL.y, topBL.x, topBL.y, topTL.x, topTL.y);

  fill(colors.front[0] * 0.8, colors.front[1] * 0.8, colors.front[2] * 0.8);
  quad(botTR.x, botTR.y, botBR.x, botBR.y, topBR.x, topBR.y, topTR.x, topTR.y);

  fill(colors.front[0], colors.front[1], colors.front[2]);
  quad(botTL.x, botTL.y, botTR.x, botTR.y, topTR.x, topTR.y, topTL.x, topTL.y);

  fill(colors.top[0], colors.top[1], colors.top[2]);
  quad(topTL.x, topTL.y, topTR.x, topTR.y, topBR.x, topBR.y, topBL.x, topBL.y);
}

function touchStarted() {
  console.log(touches);
}

function touchMoved() {
  generateCity();
}

function touchEnded() {}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  generateCity();
}

function handleOrientation(eventData) {
  document.querySelector("#requestOrientationButton").style.display = "none";

  console.log(eventData.alpha, eventData.beta, eventData.gamma);

  alpha = eventData.alpha;
  beta = eventData.beta;
  gamma = eventData.gamma;
}

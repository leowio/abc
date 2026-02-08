let socket;
let cityMap = [];
let playerMap = {};
let playerMessages = {};
let myId = null;
let initialized = false;
const MESSAGE_DURATION = 4000;

let alpha = 0,
  beta = 0,
  gamma = 0;
let smoothBeta = 0;
let smoothGamma = 0;
let tiltX = 0.15;
let tiltY = -0.2;

socket = io();

socket.on("init", (data) => {
  cityMap = data.map;
  playerMap = data.players;
  myId = data.yourId;
  initialized = true;
});

socket.on("playerJoined", (player) => {
  playerMap[player.id] = player;
});

socket.on("playerMoved", (data) => {
  if (playerMap[data.id]) {
    playerMap[data.id].buildingIndex = data.buildingIndex;
  }
});

socket.on("playerLeft", (data) => {
  delete playerMap[data.id];
});

function setup() {
  let canvas = createCanvas(windowWidth, windowHeight);
  canvas.parent("p5-canvas-container");
}

function draw() {
  background(25, 30, 45);

  smoothBeta = lerp(smoothBeta, beta, 0.1);
  smoothGamma = lerp(smoothGamma, gamma, 0.1);
  tiltX = map(smoothGamma, -45, 45, -0.5, 0.5, true);
  tiltY = map(smoothBeta, -45, 45, -0.5, 0.5, true);

  if (!initialized) {
    fill(255);
    noStroke();
    textSize(20);
    textAlign(CENTER, CENTER);
    text("Connecting...", width / 2, height / 2);
    return;
  }

  push();
  translate(width / 2, height / 2);

  drawGround(400, 400);

  for (let i = 0; i < cityMap.length; i++) {
    let b = cityMap[i];
    drawBuilding(b.x, b.y, b.w, b.d, b.h, tiltX, tiltY, b.colorType);
    drawPlayersOnBuilding(i, b);
  }

  pop();
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

function getBuildingTopCenter(b) {
  let baseDepth = b.h * 0.4;
  let depthX = baseDepth + b.h * 0.5 * tiltX;
  let depthY = -baseDepth + b.h * 0.5 * -tiltY;
  let offsetX = tiltX * b.h * 0.2;
  let offsetY = tiltY * b.h * 0.2;

  return {
    x: b.x + depthX + offsetX,
    y: b.y + depthY + offsetY,
  };
}

function drawPlayersOnBuilding(index, building) {
  let playersHere = [];
  for (let id in playerMap) {
    if (playerMap[id].buildingIndex === index) {
      playersHere.push(playerMap[id]);
    }
  }
  if (playersHere.length === 0) return;

  let top = getBuildingTopCenter(building);

  for (let i = 0; i < playersHere.length; i++) {
    let p = playersHere[i];
    let px = top.x + (i - (playersHere.length - 1) / 2) * 18;
    let py = top.y;

    drawAvatar(px, py, p.color, p.name, p.id);
  }
}

function drawAvatar(px, py, c, name, playerId) {
  let bw = 12;
  let bd = 8;
  let bh = 18;

  let baseDepth = bh * 0.4;
  let depthX = baseDepth + bh * 0.5 * tiltX;
  let depthY = -baseDepth + bh * 0.5 * -tiltY;
  let offX = tiltX * bh * 0.2;
  let offY = tiltY * bh * 0.2;

  let bBotTL = { x: px - bw / 2, y: py - bd / 2 };
  let bBotTR = { x: px + bw / 2, y: py - bd / 2 };
  let bBotBL = { x: px - bw / 2, y: py + bd / 2 };
  let bBotBR = { x: px + bw / 2, y: py + bd / 2 };

  let bTopTL = {
    x: px - bw / 2 + depthX + offX,
    y: py - bd / 2 + depthY + offY,
  };
  let bTopTR = {
    x: px + bw / 2 + depthX + offX,
    y: py - bd / 2 + depthY + offY,
  };
  let bTopBL = {
    x: px - bw / 2 + depthX + offX,
    y: py + bd / 2 + depthY + offY,
  };
  let bTopBR = {
    x: px + bw / 2 + depthX + offX,
    y: py + bd / 2 + depthY + offY,
  };

  let cTop = c;
  let cFront = [c[0] * 0.75, c[1] * 0.75, c[2] * 0.75];
  let cSide = [c[0] * 0.55, c[1] * 0.55, c[2] * 0.55];

  noStroke();

  fill(cSide[0] * 0.8, cSide[1] * 0.8, cSide[2] * 0.8);
  quad(
    bBotBL.x,
    bBotBL.y,
    bBotBR.x,
    bBotBR.y,
    bTopBR.x,
    bTopBR.y,
    bTopBL.x,
    bTopBL.y,
  );

  fill(cSide[0], cSide[1], cSide[2]);
  quad(
    bBotTL.x,
    bBotTL.y,
    bBotBL.x,
    bBotBL.y,
    bTopBL.x,
    bTopBL.y,
    bTopTL.x,
    bTopTL.y,
  );

  fill(cFront[0] * 0.85, cFront[1] * 0.85, cFront[2] * 0.85);
  quad(
    bBotTR.x,
    bBotTR.y,
    bBotBR.x,
    bBotBR.y,
    bTopBR.x,
    bTopBR.y,
    bTopTR.x,
    bTopTR.y,
  );

  fill(cFront[0], cFront[1], cFront[2]);
  quad(
    bBotTL.x,
    bBotTL.y,
    bBotTR.x,
    bBotTR.y,
    bTopTR.x,
    bTopTR.y,
    bTopTL.x,
    bTopTL.y,
  );

  fill(cTop[0], cTop[1], cTop[2]);
  quad(
    bTopTL.x,
    bTopTL.y,
    bTopTR.x,
    bTopTR.y,
    bTopBR.x,
    bTopBR.y,
    bTopBL.x,
    bTopBL.y,
  );

  let headCx = (bTopTL.x + bTopTR.x + bTopBL.x + bTopBR.x) / 4;
  let headCy = (bTopTL.y + bTopTR.y + bTopBL.y + bTopBR.y) / 4;

  fill(255);
  noStroke();
  textSize(10);
  textAlign(CENTER, BOTTOM);
  text(name, headCx, headCy - 3);

  let msg = playerMessages[playerId];
  if (msg && Date.now() - msg.time < MESSAGE_DURATION) {
    let age = Date.now() - msg.time;
    let a =
      age < MESSAGE_DURATION - 1000
        ? 230
        : map(age, MESSAGE_DURATION - 1000, MESSAGE_DURATION, 230, 0);

    textSize(11);
    let tw = textWidth(msg.text);
    let padX = 8;
    let bubbleW = tw + padX * 2;
    let bubbleH = 20;
    let bubbleX = headCx;
    let bubbleY = headCy - 22;
    let tailH = 5;

    fill(255, 255, 255, a);
    noStroke();
    rectMode(CENTER);
    rect(bubbleX, bubbleY - tailH, bubbleW, bubbleH, 6);

    triangle(
      bubbleX - 4,
      bubbleY - tailH + bubbleH / 2,
      bubbleX + 4,
      bubbleY - tailH + bubbleH / 2,
      bubbleX,
      bubbleY + 2,
    );
    rectMode(CORNER);

    fill(20, 20, 30, a);
    noStroke();
    textAlign(CENTER, CENTER);
    text(msg.text, bubbleX, bubbleY - tailH - 1);
  }
}

let touchStartX = 0;
let touchStartY = 0;
const SWIPE_THRESHOLD = 30;

function touchStarted() {
  if (touches.length > 0) {
    touchStartX = touches[0].x;
    touchStartY = touches[0].y;
  }
}

function touchEnded() {
  if (!initialized) return;

  let form = document.getElementById("chatForm");
  if (touchStartY >= form.getBoundingClientRect().top) return;

  let dx = mouseX - touchStartX;
  let dy = mouseY - touchStartY;
  let dist = sqrt(dx * dx + dy * dy);

  if (dist < SWIPE_THRESHOLD) return;

  let direction;
  if (abs(dx) > abs(dy)) {
    direction = dx > 0 ? "right" : "left";
  } else {
    direction = dy > 0 ? "down" : "up";
  }

  socket.emit("playerMove", { direction: direction });
}

function handleOrientation(eventData) {
  let btn = document.getElementById("requestOrientationButton");
  if (btn) btn.style.display = "none";

  alpha = eventData.alpha;
  beta = eventData.beta;
  gamma = eventData.gamma;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

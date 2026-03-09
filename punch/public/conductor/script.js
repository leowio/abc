let socket;
if (
  location.hostname.toLowerCase().startsWith("browsercircus") ||
  location.hostname.toLowerCase().startsWith("www")
) {
  socket = io({ path: "/leo/port-4210/socket.io" });
} else {
  socket = io();
}

let debugStrip = document.querySelector(".debug-strip");
let playerCount = 0;

let players = {};
let balls = [];

let HIT_RADIUS = 0.08;
let BALL_SIZE = 30;
let BALL_EMOJI = "⚽";
let SWING_FLASH_DURATION = 300;

let COURT_COLOR = [30, 80, 45];
let COURT_LINE_COLOR = [60, 120, 70];
let RING_COLOR = [255, 255, 255, 60];
let RING_STROKE_COLOR = [255, 255, 255, 80];
let HIT_FLASH_COLOR = [255, 255, 100];
let MISS_FLASH_COLOR = [255, 100, 100];
let PLAYER_LABEL_COLOR = [200, 200, 200];

socket.emit("my-role", { role: "conductor" });

socket.on("game-state", function (data) {
  data.players.forEach(function (p) {
    addPlayer(p.id, p.x, p.y, p.emoji);
  });
  balls = data.balls;
});

socket.on("new-player", function (data) {
  addPlayer(data.id, data.x, data.y, data.emoji);
});

socket.on("delete-player", function (data) {
  delete players[data.id];
  let card = document.querySelector("#card-" + data.id);
  if (card) card.remove();
  playerCount--;
});

socket.on("balls-update", function (data) {
  balls = data;
});

socket.on("new-ball", function (data) {
  balls.push(data);
});

socket.on("player-swing", function (data) {
  let p = players[data.id];
  if (!p) return;

  p.flashUntil = millis() + SWING_FLASH_DURATION;
  p.lastHit = data.hit;

  let card = document.querySelector("#card-" + data.id);
  if (card) {
    card.querySelector(".val-force").innerText =
      "force: " + data.force.toFixed(2);
    card.querySelector(".val-hit").innerText = "hit: " + data.hit;
    card.style.backgroundColor = data.hit
      ? "rgb(80, 120, 50)"
      : "rgb(50, 50, 50)";
    setTimeout(function () {
      card.style.backgroundColor = "rgb(50, 50, 50)";
    }, SWING_FLASH_DURATION);
  }
});

function addPlayer(socketID, px, py, emoji) {
  players[socketID] = {
    x: px,
    y: py,
    emoji: emoji || "🏓",
    flashUntil: 0,
    lastHit: false,
  };

  let card = document.createElement("div");
  card.className = "player-card";
  card.id = "card-" + socketID;

  let label = document.createElement("div");
  label.className = "player-label";
  label.innerText = (emoji || "🏓") + " " + socketID.substring(0, 6);

  let valForce = document.createElement("p");
  valForce.className = "val-force";
  valForce.innerText = "force: -";

  let valHit = document.createElement("p");
  valHit.className = "val-hit";
  valHit.innerText = "hit: -";

  card.append(label, valForce, valHit);
  debugStrip.append(card);

  playerCount++;
}

function setup() {
  let canvas = createCanvas(windowWidth, windowHeight - 120);
  canvas.parent("p5-canvas-container");
  textFont("monospace");
}

function keyPressed() {
  if (key === "r" || key === "R") {
    socket.emit("reset-balls");
  }
}

function mousePressed() {
  if (mouseY < 40 && mouseX > width - 120) {
    socket.emit("reset-balls");
  }
}

function fieldSize() {
  return Math.min(width, height);
}

function fieldX(nx) {
  return (width - fieldSize()) / 2 + nx * fieldSize();
}

function fieldY(ny) {
  return (height - fieldSize()) / 2 + ny * fieldSize();
}

function draw() {
  background(COURT_COLOR);
  drawCourt();
  drawPlayers();
  drawBalls();
}

function drawCourt() {
  let fs = fieldSize();
  let fx = (width - fs) / 2;
  let fy = (height - fs) / 2;
  stroke(COURT_LINE_COLOR);
  strokeWeight(2);
  noFill();
  rect(fx, fy, fs, fs);
  line(fx + fs / 2, fy, fx + fs / 2, fy + fs);
  ellipse(fx + fs / 2, fy + fs / 2, 150, 150);
}

function drawBalls() {
  noStroke();
  textAlign(CENTER, CENTER);
  textSize(BALL_SIZE);
  for (let b of balls) {
    text(BALL_EMOJI, fieldX(b.x), fieldY(b.y));
  }
}

function drawPlayers() {
  let now = millis();
  let fs = fieldSize();

  for (let id in players) {
    let p = players[id];
    let px = fieldX(p.x);
    let py = fieldY(p.y);
    let ringR = HIT_RADIUS * fs;

    let flashing = now < p.flashUntil;

    if (flashing) {
      let flashColor = p.lastHit ? HIT_FLASH_COLOR : MISS_FLASH_COLOR;
      let flashAlpha = map(p.flashUntil - now, 0, SWING_FLASH_DURATION, 0, 120);
      fill(flashColor[0], flashColor[1], flashColor[2], flashAlpha);
      noStroke();
      ellipse(px, py, ringR * 2.5, ringR * 2.5);
    }

    stroke(RING_STROKE_COLOR);
    strokeWeight(2);
    ellipse(px, py, ringR * 2, ringR * 2);

    noStroke();
    fill(0, 0, 0);
    textAlign(CENTER, CENTER);
    textSize(50);
    text(p.emoji, px, py);
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight - 120);
}

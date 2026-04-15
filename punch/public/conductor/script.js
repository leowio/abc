let socket;
if (
  location.hostname.toLowerCase().startsWith("browsercircus") ||
  location.hostname.toLowerCase().startsWith("www")
) {
  socket = io({ path: "/leo/port-4210/socket.io" });
} else {
  socket = io();
}

let blueMembers = document.querySelector("#blue-members");
let redMembers = document.querySelector("#red-members");

let players = {};
let balls = [];

let HIT_RADIUS = 0.08;
let BALL_SIZE = 30;
let BALL_EMOJI = "⚽";
let SWING_FLASH_DURATION = 300;
let EXPLOSION_DURATION = 500;

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
    addPlayer(p.id, p.x, p.y, p.emoji, p.team, p.health, p.alive);
  });
  balls = data.balls;
  updateTeamBar();
});

socket.on("new-player", function (data) {
  addPlayer(data.id, data.x, data.y, data.emoji, data.team, data.health, data.alive);
  updateTeamBar();
});

socket.on("delete-player", function (data) {
  delete players[data.id];
  updateTeamBar();
});

socket.on("balls-update", function (data) {
  balls = data;
});

socket.on("new-ball", function (data) {
  balls.push(data);
});

socket.on("player-hit", function (data) {
  let p = players[data.id];
  if (!p) return;
  p.health = data.health;
  p.explosionUntil = millis() + EXPLOSION_DURATION;
});

socket.on("player-died", function (data) {
  let p = players[data.id];
  if (!p) return;
  p.alive = false;
  p.health = 0;
  updateTeamBar();
});

socket.on("player-swing", function (data) {
  let p = players[data.id];
  if (!p) return;

  p.flashUntil = millis() + SWING_FLASH_DURATION;
  p.lastHit = data.hit;
});

function updateTeamBar() {
  let blueEmojis = "";
  let redEmojis = "";
  for (let id in players) {
    let p = players[id];
    let display = p.alive ? p.emoji : "\u{1FAA6}";
    if (p.team === "blue") blueEmojis += display;
    else if (p.team === "red") redEmojis += display;
  }
  blueMembers.innerText = blueEmojis;
  redMembers.innerText = redEmojis;
}

function addPlayer(socketID, px, py, emoji, team, health, alive) {
  players[socketID] = {
    x: px,
    y: py,
    emoji: emoji || "\u{1F3D3}",
    team: team || "blue",
    health: health != null ? health : 3,
    alive: alive != null ? alive : true,
    flashUntil: 0,
    lastHit: false,
    explosionUntil: 0,
  };
}

function setup() {
  let canvas = createCanvas(windowWidth, windowHeight - 50);
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

function fieldW() {
  let fitByWidth = width;
  let fitByHeight = height * (16 / 9);
  let fw = Math.min(fitByWidth, fitByHeight);
  return fw;
}

function fieldH() {
  return (fieldW() * 9) / 16;
}

function fieldX(nx) {
  return (width - fieldW()) / 2 + nx * fieldW();
}

function fieldY(ny) {
  return (height - fieldH()) / 2 + ny * fieldH();
}

function draw() {
  background(COURT_COLOR);
  drawCourt();
  drawPlayers();
  drawBalls();
}

function drawCourt() {
  let fw = fieldW();
  let fh = fieldH();
  let fx = (width - fw) / 2;
  let fy = (height - fh) / 2;
  stroke(COURT_LINE_COLOR);
  strokeWeight(2);
  noFill();
  rect(fx, fy, fw, fh);
  line(fx + fw / 2, fy, fx + fw / 2, fy + fh);
  ellipse(fx + fw / 2, fy + fh / 2, 150, 150);
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
  let fw = fieldW();

  for (let id in players) {
    let p = players[id];
    if (!p.alive) continue;

    let px = fieldX(p.x);
    let py = fieldY(p.y);
    let ringR = HIT_RADIUS * fw;

    // explosion flash when hit
    if (now < p.explosionUntil) {
      let alpha = map(p.explosionUntil - now, 0, EXPLOSION_DURATION, 0, 255);
      noStroke();
      textAlign(CENTER, CENTER);
      textSize(70);
      fill(255, 255, 255, alpha);
      text("\u{1F4A5}", px, py);
    }

    let flashing = now < p.flashUntil;

    if (flashing) {
      let flashColor = p.lastHit ? HIT_FLASH_COLOR : MISS_FLASH_COLOR;
      let flashAlpha = map(p.flashUntil - now, 0, SWING_FLASH_DURATION, 0, 120);
      fill(flashColor[0], flashColor[1], flashColor[2], flashAlpha);
      noStroke();
      ellipse(px, py, ringR * 2.5, ringR * 2.5);
    }

    if (p.team === "red") {
      stroke(255, 74, 74, 180);
      fill(255, 74, 74, 40);
    } else {
      stroke(74, 158, 255, 180);
      fill(74, 158, 255, 40);
    }
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
  resizeCanvas(windowWidth, windowHeight - 50);
}

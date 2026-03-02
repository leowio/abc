let socket;
if (
  location.hostname.toLowerCase().startsWith("browsercircus") ||
  location.hostname.toLowerCase().startsWith("www")
) {
  socket = io({ path: "/YOUR-NAME/YOUR-PORT/socket.io" });
} else {
  socket = io();
}

let stage = document.querySelector(".stage");
let debugStrip = document.querySelector(".debug-strip");
let playerCountEl = document.querySelector("#player-count");
let playerCount = 0;

let playerState = {};

let PUNCH_THRESHOLD = 8;
let HAND_MOVE_DISTANCE = 400;
let HAND_RETURN_SPEED = 0.15;
let INTENSITY_MAX_ACCEL = 30;
let FIST_MIN_SIZE = 30;
let FIST_MAX_GROW = 80;
let BURST_MIN_SIZE = 30;
let BURST_MAX_GROW = 80;
let BURST_SCALE = 2;
let BURST_DURATION = 500;

socket.emit("my-role", { role: "conductor" });

socket.on("all-players", function (data) {
  data.forEach(function (player) {
    addPlayer(player.id);
  });
});

socket.on("new-player", function (data) {
  addPlayer(data.id);
});

socket.on("delete-player", function (data) {
  let card = document.querySelector("#A" + data.id);
  if (card) card.remove();
  let avatar = document.querySelector("#avatar-" + data.id);
  if (avatar) avatar.remove();
  delete playerState[data.id];
  playerCount--;
  playerCountEl.innerText = "Players: " + playerCount;
});

socket.on("player-motion", function (data) {
  let card = document.querySelector("#A" + data.id);
  let avatar = document.querySelector("#avatar-" + data.id);
  if (!card || !avatar) return;

  let state = playerState[data.id];
  if (!state) return;

  let xEl = card.querySelector(".val-x");
  let yEl = card.querySelector(".val-y");
  let zEl = card.querySelector(".val-z");
  let magEl = card.querySelector(".val-mag");

  xEl.innerText = "x: " + data.x.toFixed(2);
  yEl.innerText = "y: " + data.y.toFixed(2);
  zEl.innerText = "z: " + data.z.toFixed(2);

  let mag = Math.sqrt(data.x * data.x + data.y * data.y + data.z * data.z);
  magEl.innerText = "mag: " + mag.toFixed(2);

  let intensity = Math.min(mag / INTENSITY_MAX_ACCEL, 1);
  let r = Math.round(50 + intensity * 205);
  let g = Math.round(50 + (1 - intensity) * 50);
  let b = Math.round(50 + (1 - intensity) * 50);
  let color = "rgb(" + r + "," + g + "," + b + ")";

  card.style.backgroundColor = color;

  let beta = data.beta || 0;
  let gamma = data.gamma || 0;

  if (mag > PUNCH_THRESHOLD) {
    let angle = Math.atan2(-data.y, data.x);
    state.targetX = Math.cos(angle) * HAND_MOVE_DISTANCE;
    state.targetY = -Math.sin(angle) * HAND_MOVE_DISTANCE;
  } else {
    state.targetX = 0;
    state.targetY = 0;
  }

  state.handX += (state.targetX - state.handX) * HAND_RETURN_SPEED;
  state.handY += (state.targetY - state.handY) * HAND_RETURN_SPEED;

  let handEl = avatar.querySelector(".hand-indicator");
  handEl.style.left = "calc(50% + " + state.handX + "px)";
  handEl.style.top = "calc(50% + " + state.handY + "px)";

  let fist = avatar.querySelector(".fist-circle");
  fist.style.left = "calc(50% + " + state.handX + "px)";
  fist.style.top = "calc(50% + " + state.handY + "px)";
  let size = FIST_MIN_SIZE + intensity * FIST_MAX_GROW;
  fist.style.width = size + "px";
  fist.style.height = size + "px";
  fist.style.backgroundColor = color;
  fist.style.opacity = 0.3 + intensity * 0.7;

  let emoji = pickHandEmoji(beta, gamma, mag);
  handEl.innerText = emoji;

  if (mag > PUNCH_THRESHOLD) {
    spawnPunch(avatar, state.handX, state.handY, mag, color);
  }
});

function pickHandEmoji(beta, gamma, mag) {
  if (mag > 20) return "💥";
  if (beta > 150 || beta < -150) return "🫳";
  if (beta < 20) return "🫴";
  if (gamma > 35) return "🤛";
  if (gamma < -35) return "🤜";
  if (beta > 60 && beta < 120) return "✊";
  if (beta > 120) return "✋";
  return "👊";
}

function addPlayer(socketID) {
  playerState[socketID] = { handX: 0, handY: 0, targetX: 0, targetY: 0 };

  let stageRect = stage.getBoundingClientRect();
  let margin = 100;
  let randX = margin + Math.random() * (stageRect.width - margin * 2);
  let randY = margin + Math.random() * (stageRect.height - margin * 2);

  let avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.id = "avatar-" + socketID;
  avatar.style.left = randX + "px";
  avatar.style.top = randY + "px";

  let body = document.createElement("span");
  body.className = "avatar-body";
  body.innerText = "🧍";

  let nameTag = document.createElement("span");
  nameTag.className = "avatar-name";
  nameTag.innerText = socketID.substring(0, 4);

  let fist = document.createElement("div");
  fist.className = "fist-circle";

  let hand = document.createElement("div");
  hand.className = "hand-indicator";
  hand.innerText = "✊";

  avatar.append(fist, hand, body, nameTag);
  stage.append(avatar);

  let card = document.createElement("div");
  card.className = "player-card";
  card.id = "A" + socketID;

  let label = document.createElement("div");
  label.className = "player-label";
  label.innerText = socketID.substring(0, 6);

  let valX = document.createElement("p");
  valX.className = "val-x";
  valX.innerText = "x: 0";

  let valY = document.createElement("p");
  valY.className = "val-y";
  valY.innerText = "y: 0";

  let valZ = document.createElement("p");
  valZ.className = "val-z";
  valZ.innerText = "z: 0";

  let valMag = document.createElement("p");
  valMag.className = "val-mag";
  valMag.innerText = "mag: 0";

  card.append(label, valX, valY, valZ, valMag);
  debugStrip.append(card);

  playerCount++;
  playerCountEl.innerText = "Players: " + playerCount;
}

function spawnPunch(avatar, hx, hy, mag, color) {
  let circle = document.createElement("div");
  circle.className = "punch-burst";

  let size =
    BURST_MIN_SIZE + Math.min(mag / INTENSITY_MAX_ACCEL, 1) * BURST_MAX_GROW;
  circle.style.width = size + "px";
  circle.style.height = size + "px";
  circle.style.backgroundColor = color;

  circle.style.left = "calc(50% + " + hx + "px)";
  circle.style.top = "calc(50% + " + hy + "px)";

  avatar.append(circle);

  requestAnimationFrame(function () {
    circle.style.transform = "translate(-50%, -50%) scale(" + BURST_SCALE + ")";
    circle.style.opacity = "0";
  });

  setTimeout(function () {
    circle.remove();
  }, BURST_DURATION);
}

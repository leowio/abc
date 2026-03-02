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

let ballEl = document.createElement("div");
ballEl.className = "ball";
ballEl.innerText = "🎾";
stage.append(ballEl);

socket.emit("my-role", { role: "conductor" });

socket.on("game-state", function (data) {
  data.players.forEach(function (player) {
    addPlayer(player.id, player.x, player.y);
  });
  updateBall(data.ball);
});

socket.on("new-player", function (data) {
  addPlayer(data.id, data.x, data.y);
});

socket.on("delete-player", function (data) {
  let el = document.querySelector("#player-" + data.id);
  if (el) el.remove();
  let card = document.querySelector("#card-" + data.id);
  if (card) card.remove();
  playerCount--;
  playerCountEl.innerText = "Players: " + playerCount;
});

socket.on("ball-update", function (data) {
  updateBall(data);
});

socket.on("player-swing", function (data) {
  let el = document.querySelector("#player-" + data.id);
  if (!el) return;

  let ring = el.querySelector(".hit-ring");

  if (data.hit) {
    ring.style.borderColor = "rgba(255, 255, 100, 0.9)";
    ring.style.transform = "translate(-50%, -50%) scale(1.3)";
  } else {
    ring.style.borderColor = "rgba(255, 100, 100, 0.7)";
    ring.style.transform = "translate(-50%, -50%) scale(1.1)";
  }

  setTimeout(function () {
    ring.style.borderColor = "rgba(255, 255, 255, 0.3)";
    ring.style.transform = "translate(-50%, -50%) scale(1)";
  }, 300);

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
    }, 300);
  }
});

function updateBall(data) {
  let stageRect = stage.getBoundingClientRect();
  ballEl.style.left = data.x * stageRect.width + "px";
  ballEl.style.top = data.y * stageRect.height + "px";
}

function addPlayer(socketID, px, py) {
  let stageRect = stage.getBoundingClientRect();

  let el = document.createElement("div");
  el.className = "player";
  el.id = "player-" + socketID;
  el.style.left = px * stageRect.width + "px";
  el.style.top = py * stageRect.height + "px";

  let ring = document.createElement("div");
  ring.className = "hit-ring";

  let emoji = document.createElement("span");
  emoji.className = "player-emoji";
  emoji.innerText = "🏓";

  let name = document.createElement("span");
  name.className = "player-name";
  name.innerText = socketID.substring(0, 4);

  el.append(ring, emoji, name);
  stage.append(el);

  let card = document.createElement("div");
  card.className = "player-card";
  card.id = "card-" + socketID;

  let label = document.createElement("div");
  label.className = "player-label";
  label.innerText = socketID.substring(0, 6);

  let valForce = document.createElement("p");
  valForce.className = "val-force";
  valForce.innerText = "force: -";

  let valHit = document.createElement("p");
  valHit.className = "val-hit";
  valHit.innerText = "hit: -";

  card.append(label, valForce, valHit);
  debugStrip.append(card);

  playerCount++;
  playerCountEl.innerText = "Players: " + playerCount;
}

let socket;
if (
  location.hostname.toLowerCase().startsWith("browsercircus") ||
  location.hostname.toLowerCase().startsWith("www")
) {
  socket = io({ path: "/YOUR-NAME/YOUR-PORT/socket.io" });
} else {
  socket = io();
}

let mainWrapper = document.querySelector(".main-wrapper");
let playerCountEl = document.querySelector("#player-count");
let playerCount = 0;

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
  let elm = document.querySelector("#A" + data.id);
  if (elm) elm.remove();
  playerCount--;
  playerCountEl.innerText = "Players: " + playerCount;
});

socket.on("player-motion", function (data) {
  let card = document.querySelector("#A" + data.id);
  if (!card) return;

  let xEl = card.querySelector(".val-x");
  let yEl = card.querySelector(".val-y");
  let zEl = card.querySelector(".val-z");
  let magEl = card.querySelector(".val-mag");

  xEl.innerText = "x: " + data.x.toFixed(2);
  yEl.innerText = "y: " + data.y.toFixed(2);
  zEl.innerText = "z: " + data.z.toFixed(2);

  let mag = Math.sqrt(data.x * data.x + data.y * data.y + data.z * data.z);
  magEl.innerText = "mag: " + mag.toFixed(2);

  let intensity = Math.min(mag / 30, 1);
  let r = Math.round(50 + intensity * 205);
  let g = Math.round(50 + (1 - intensity) * 50);
  let b = Math.round(50 + (1 - intensity) * 50);
  card.style.backgroundColor = "rgb(" + r + "," + g + "," + b + ")";
});

function addPlayer(socketID) {
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
  mainWrapper.append(card);

  playerCount++;
  playerCountEl.innerText = "Players: " + playerCount;
}

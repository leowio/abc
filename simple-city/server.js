const express = require("express");
const https = require("https");
const fs = require("fs");
const { Server } = require("socket.io");

const app = express();
const port = 3000;

app.use(express.static("public"));

const options = {
  key: fs.readFileSync("./keys-for-local-https/localhost-key.pem"),
  cert: fs.readFileSync("./keys-for-local-https/localhost.pem"),
};

const httpServer = https.createServer(options, app);
const io = new Server(httpServer);

function generateCity() {
  let buildings = [];
  let gridSize = 50;
  let cols = 8;
  let rows = 8;
  let startX = (-cols * gridSize) / 2;
  let startY = (-rows * gridSize) / 2;

  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      if (Math.random() > 0.3) {
        let x = startX + i * gridSize + gridSize / 2;
        let y = startY + j * gridSize + gridSize / 2;
        let w = Math.random() * 15 + 25;
        let d = Math.random() * 15 + 25;
        let h = Math.random() * 120 + 30;
        let colorType = Math.floor(Math.random() * 5);
        buildings.push({ x, y, w, d, h, colorType });
      }
    }
  }

  buildings.sort((a, b) => a.y - a.x - (b.y - b.x));
  return buildings;
}

const cityMap = generateCity();

const players = {};

const playerColors = [
  [255, 107, 107],
  [78, 205, 196],
  [255, 230, 109],
  [199, 128, 232],
  [95, 189, 255],
];
let colorIndex = 0;

function getRandomBuildingIndex() {
  return Math.floor(Math.random() * cityMap.length);
}

io.on("connection", (socket) => {
  console.log("New client connected:", socket.id);

  const name = socket.id.substring(0, 5);
  const color = playerColors[colorIndex % playerColors.length];
  colorIndex++;

  const player = {
    id: socket.id,
    name: name,
    buildingIndex: getRandomBuildingIndex(),
    color: color,
  };
  players[socket.id] = player;

  socket.emit("init", {
    map: cityMap,
    players: players,
    yourId: socket.id,
  });

  socket.broadcast.emit("playerJoined", player);

  io.emit("chatMessage", {
    user: "System",
    text: `${name} joined the city`,
    timestamp: new Date(),
  });

  socket.on("playerMove", (data) => {
    let player = players[socket.id];
    if (!player) return;
    let dir = data.direction;
    let cur = cityMap[player.buildingIndex];
    if (!cur) return;

    let best = -1;
    let bestDist = Infinity;

    // Try to find the cloest building
    for (let i = 0; i < cityMap.length; i++) {
      if (i === player.buildingIndex) continue;
      let b = cityMap[i];
      let dx = b.x - cur.x;
      let dy = b.y - cur.y;

      let valid = false;
      if (dir === "right" && dx > 5 && Math.abs(dy) <= Math.abs(dx))
        valid = true;
      if (dir === "left" && dx < -5 && Math.abs(dy) <= Math.abs(dx))
        valid = true;
      if (dir === "down" && dy > 5 && Math.abs(dx) <= Math.abs(dy))
        valid = true;
      if (dir === "up" && dy < -5 && Math.abs(dx) <= Math.abs(dy)) valid = true;

      if (valid) {
        let dist = dx * dx + dy * dy;
        if (dist < bestDist) {
          bestDist = dist;
          best = i;
        }
      }
    }

    if (best >= 0) {
      player.buildingIndex = best;
      io.emit("playerMoved", { id: socket.id, buildingIndex: best });
    }
  });

  socket.on("chatMessage", (data) => {
    io.emit("chatMessage", {
      id: socket.id,
      user: players[socket.id] ? players[socket.id].name : "???",
      text: data.text,
      timestamp: Date.now(),
    });
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
    const leavingName = players[socket.id]
      ? players[socket.id].name
      : socket.id.substring(0, 5);
    delete players[socket.id];
    io.emit("playerLeft", { id: socket.id });
    io.emit("chatMessage", {
      user: "System",
      text: `${leavingName} left the city`,
      timestamp: new Date(),
    });
  });
});

httpServer.listen(port, () => {
  console.log(`Server running at https://localhost:${port}`);
});

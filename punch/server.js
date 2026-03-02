const express = require("express");
const https = require("https");
const fs = require("fs");

const app = express();
const portHTTPS = 4200;

app.use(express.static("public"));

const options = {
  key: fs.readFileSync("localhost-key.pem"),
  cert: fs.readFileSync("localhost.pem"),
};

let HTTPSserver = https.createServer(options, app);

const { Server } = require("socket.io");
const io = new Server(HTTPSserver);

let players = [];
let conductor;

io.on("connection", (socket) => {
  console.log("a user connected", socket.id);

  socket.on("my-role", function (data) {
    if (data.role === "player") {
      players.push({ id: socket.id });
      console.log(players);
      if (conductor) {
        io.to(conductor).emit("new-player", { id: socket.id });
      }
    } else if (data.role === "conductor") {
      conductor = socket.id;
      socket.emit("all-players", players);
    }
  });

  socket.on("motion-data", function (data) {
    if (conductor) {
      io.to(conductor).emit("player-motion", {
        id: socket.id,
        x: data.x,
        y: data.y,
        z: data.z,
        beta: data.beta,
        gamma: data.gamma,
      });
    }
  });

  socket.on("disconnect", function () {
    console.log("someone disconnected", socket.id);

    players = players.filter((p) => p.id !== socket.id);

    if (socket.id === conductor) {
      conductor = null;
    } else if (conductor) {
      io.to(conductor).emit("delete-player", { id: socket.id });
    }
  });
});

HTTPSserver.listen(portHTTPS, function () {
  console.log("HTTPS Server started at port", portHTTPS);
});

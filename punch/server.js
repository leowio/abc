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

let HIT_RADIUS = 0.12;
let BALL_FRICTION = 0.995;
let BALL_BOUNCE_DAMPING = 0.8;
let HIT_FORCE_MULTIPLIER = 3;
let BALL_BASE_SPEED = 0.008;
let TICK_RATE = 33;

let ball = {
  x: 0.5,
  y: 0.5,
  vx: (Math.random() - 0.5) * BALL_BASE_SPEED,
  vy: (Math.random() - 0.5) * BALL_BASE_SPEED,
};

setInterval(function () {
  ball.x += ball.vx;
  ball.y += ball.vy;
  ball.vx *= BALL_FRICTION;
  ball.vy *= BALL_FRICTION;

  if (ball.x <= 0) {
    ball.x = 0;
    ball.vx = Math.abs(ball.vx) * BALL_BOUNCE_DAMPING;
  }
  if (ball.x >= 1) {
    ball.x = 1;
    ball.vx = -Math.abs(ball.vx) * BALL_BOUNCE_DAMPING;
  }
  if (ball.y <= 0) {
    ball.y = 0;
    ball.vy = Math.abs(ball.vy) * BALL_BOUNCE_DAMPING;
  }
  if (ball.y >= 1) {
    ball.y = 1;
    ball.vy = -Math.abs(ball.vy) * BALL_BOUNCE_DAMPING;
  }

  if (conductor) {
    io.to(conductor).emit("ball-update", {
      x: ball.x,
      y: ball.y,
      vx: ball.vx,
      vy: ball.vy,
    });
  }
}, TICK_RATE);

io.on("connection", (socket) => {
  console.log("a user connected", socket.id);

  socket.on("my-role", function (data) {
    if (data.role === "player") {
      let player = {
        id: socket.id,
        x: 0.1 + Math.random() * 0.8,
        y: 0.1 + Math.random() * 0.8,
      };
      players.push(player);
      console.log(players);
      if (conductor) {
        io.to(conductor).emit("new-player", player);
      }
    } else if (data.role === "conductor") {
      conductor = socket.id;
      socket.emit("game-state", { players: players, ball: ball });
    }
  });

  socket.on("swing", function (data) {
    let player = players.find((p) => p.id === socket.id);
    if (!player) return;

    let dx = ball.x - player.x;
    let dy = ball.y - player.y;
    let dist = Math.sqrt(dx * dx + dy * dy);

    let hit = dist < HIT_RADIUS;

    if (hit && dist > 0) {
      let nx = dx / dist;
      let ny = dy / dist;
      ball.vx = nx * data.force * BALL_BASE_SPEED * HIT_FORCE_MULTIPLIER;
      ball.vy = ny * data.force * BALL_BASE_SPEED * HIT_FORCE_MULTIPLIER;
    }

    if (conductor) {
      io.to(conductor).emit("player-swing", {
        id: socket.id,
        force: data.force,
        hit: hit,
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

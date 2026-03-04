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

let ANIMAL_EMOJIS = [
  "🐶", "🐱", "🐻", "🐼", "🐨", "🐯", "🦁", "🐮", "🐷", "🐸",
  "🐵", "🐔", "🐧", "🦊", "🦝", "🦄", "🐴", "🐺", "🐰", "🐙"
];
let takenEmojis = {};

let HIT_RADIUS = 0.08;
let BALL_FRICTION = 0.995;
let BALL_BOUNCE_DAMPING = 0.8;
let HIT_FORCE_MULTIPLIER = 3;
let BALL_BASE_SPEED = 0.08;
let TICK_RATE = 33;

let balls = [];
let nextBallId = 0;

function spawnBallNearPlayer(player) {
  let angle = Math.random() * Math.PI * 2;
  let dist = 0.02 + Math.random() * (HIT_RADIUS - 0.02);
  let bx = Math.max(0, Math.min(1, player.x + Math.cos(angle) * dist));
  let by = Math.max(0, Math.min(1, player.y + Math.sin(angle) * dist));
  let ball = { id: nextBallId++, x: bx, y: by, vx: 0, vy: 0 };
  balls.push(ball);
  if (conductor) {
    io.to(conductor).emit("new-ball", ball);
  }
}

setInterval(function () {
  for (let i = balls.length - 1; i >= 0; i--) {
    let ball = balls[i];
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
  }

  if (conductor) {
    io.to(conductor).emit("balls-update", balls);
  }
}, TICK_RATE);

function getAvailableEmojis() {
  return ANIMAL_EMOJIS.filter(function (e) {
    return !takenEmojis[e];
  });
}

io.on("connection", (socket) => {
  console.log("a user connected", socket.id);

  socket.emit("available-emojis", getAvailableEmojis());

  socket.on("my-role", function (data) {
    if (data.role === "player") {
      let emoji = data.emoji;
      if (!emoji || takenEmojis[emoji]) {
        socket.emit("emoji-rejected");
        return;
      }
      takenEmojis[emoji] = socket.id;
      let player = {
        id: socket.id,
        x: 0.1 + Math.random() * 0.8,
        y: 0.1 + Math.random() * 0.8,
        emoji: emoji,
      };
      players.push(player);
      console.log(players);
      socket.broadcast.emit("emoji-taken", emoji);
      if (conductor) {
        io.to(conductor).emit("new-player", player);
      }
      spawnBallNearPlayer(player);
    } else if (data.role === "conductor") {
      conductor = socket.id;
      socket.emit("game-state", { players: players, balls: balls });
    }
  });

  socket.on("reset-balls", function () {
    balls = [];
    for (let p of players) {
      spawnBallNearPlayer(p);
    }
  });

  socket.on("swing", function (data) {
    let player = players.find((p) => p.id === socket.id);
    if (!player) return;

    let hitAny = false;

    for (let ball of balls) {
      let dx = ball.x - player.x;
      let dy = ball.y - player.y;
      let dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < HIT_RADIUS && dist > 0) {
        let nx = dx / dist;
        let ny = dy / dist;
        ball.vx = nx * data.force * BALL_BASE_SPEED * HIT_FORCE_MULTIPLIER;
        ball.vy = ny * data.force * BALL_BASE_SPEED * HIT_FORCE_MULTIPLIER;
        hitAny = true;
      }
    }

    if (conductor) {
      io.to(conductor).emit("player-swing", {
        id: socket.id,
        force: data.force,
        hit: hitAny,
      });
    }
  });

  socket.on("disconnect", function () {
    console.log("someone disconnected", socket.id);

    let leaving = players.find((p) => p.id === socket.id);
    if (leaving && leaving.emoji) {
      delete takenEmojis[leaving.emoji];
      socket.broadcast.emit("emoji-freed", leaving.emoji);
    }
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

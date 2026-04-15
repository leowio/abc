const express = require("express");
const https = require("https");
const fs = require("fs");

const app = express();
const portHTTPS = 4210;

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

function getTeamCount(team) {
  return players.filter(function (p) {
    return p.team === team;
  }).length;
}

function assignTeam() {
  let blueCount = getTeamCount("blue");
  let redCount = getTeamCount("red");
  return redCount < blueCount ? "red" : "blue";
}

let MIN_PLAYER_DIST = 0.15;

function findSpawnPosition(team) {
  let xMin = team === "blue" ? 0.05 : 0.55;
  let xRange = 0.4;
  let yMin = 0.1;
  let yRange = 0.8;

  for (let attempt = 0; attempt < 50; attempt++) {
    let px = xMin + Math.random() * xRange;
    let py = yMin + Math.random() * yRange;
    let tooClose = false;
    for (let i = 0; i < players.length; i++) {
      let dx = players[i].x - px;
      let dy = players[i].y - py;
      if (Math.sqrt(dx * dx + dy * dy) < MIN_PLAYER_DIST) {
        tooClose = true;
        break;
      }
    }
    if (!tooClose) return { x: px, y: py };
  }
  // fallback: return random position if no gap found
  return { x: xMin + Math.random() * xRange, y: yMin + Math.random() * yRange };
}

let ANIMAL_EMOJIS = [
  "🐶",
  "🐱",
  "🐻",
  "🐼",
  "🐨",
  "🐯",
  "🦁",
  "🐮",
  "🐷",
  "🐸",
  "🐵",
  "🐔",
  "🐧",
  "🦊",
  "🦝",
  "🦄",
  "🐴",
  "🐺",
  "🐰",
  "🐙",
];
let takenEmojis = {};

let HIT_RADIUS = 0.15;
let BALL_FRICTION = 0;
let BALL_BOUNCE_DAMPING = 0.8;
let HIT_FORCE_MULTIPLIER = 1.5;
let BALL_BASE_SPEED = 0.03;
let BALL_SPEED_INCREMENT = 0.15;
let PLAYER_MAX_HEALTH = 10;
let ORBIT_RADIUS = 0.08;
let ORBIT_SPEED = 0.18;
let TICK_RATE = 33;

let balls = [];
let nextBallId = 0;

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function findPlayer(playerId) {
  return players.find(function (p) {
    return p.id === playerId;
  });
}

function findBall(ballId) {
  return balls.find(function (b) {
    return b.id === ballId;
  });
}

function spawnBallNearPlayer(player) {
  let angle = Math.random() * Math.PI * 2;
  let dist = 0.02 + Math.random() * (ORBIT_RADIUS - 0.02);
  let bx = clamp01(player.x + Math.cos(angle) * dist);
  let by = clamp01(player.y + Math.sin(angle) * dist);
  let ball = {
    id: nextBallId++,
    x: bx,
    y: by,
    vx: 0,
    vy: 0,
    holderId: null,
    orbitAngle: angle,
    hitCount: 0,
    nearPlayers: {},
  };
  balls.push(ball);
  if (conductor) {
    io.to(conductor).emit("new-ball", ball);
  }
}

function dropHeldBall(playerId) {
  let player = findPlayer(playerId);
  if (!player || player.heldBallId == null) return null;

  let ball = findBall(player.heldBallId);
  player.heldBallId = null;

  if (!ball) return null;

  ball.holderId = null;
  ball.vx = 0;
  ball.vy = 0;
  return ball;
}

setInterval(function () {
  for (let i = balls.length - 1; i >= 0; i--) {
    let ball = balls[i];

    if (ball.holderId) {
      let holder = findPlayer(ball.holderId);
      if (!holder) {
        ball.holderId = null;
      } else {
        ball.orbitAngle += ORBIT_SPEED;
        ball.x = holder.x + Math.cos(ball.orbitAngle) * ORBIT_RADIUS;
        ball.y = holder.y + Math.sin(ball.orbitAngle) * ORBIT_RADIUS;
        ball.vx = 0;
        ball.vy = 0;
        continue;
      }
    }

    ball.x += ball.vx;
    ball.y += ball.vy;
    ball.vx *= 1 - BALL_FRICTION;
    ball.vy *= 1 - BALL_FRICTION;

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

  // hit detection: ball passes through player radius uncaught
  for (let ball of balls) {
    if (ball.holderId) continue;
    let speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
    if (speed < 0.001) {
      ball.nearPlayers = {};
      continue;
    }

    for (let player of players) {
      if (!player.alive) continue;
      let dx = ball.x - player.x;
      let dy = ball.y - player.y;
      let dist = Math.sqrt(dx * dx + dy * dy);
      let inside = dist < ORBIT_RADIUS - 0.01;

      if (inside && !ball.nearPlayers[player.id]) {
        ball.nearPlayers[player.id] = true;
      } else if (!inside && ball.nearPlayers[player.id]) {
        delete ball.nearPlayers[player.id];
        // ball passed through without being caught
        player.health--;
        io.to(player.id).emit("health-update", { health: player.health });
        if (conductor) {
          io.to(conductor).emit("player-hit", { id: player.id, health: player.health });
        }
        if (player.health <= 0) {
          player.alive = false;
          dropHeldBall(player.id);
          io.to(player.id).emit("player-died");
          if (conductor) {
            io.to(conductor).emit("player-died", { id: player.id });
          }
        }
      }
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
      let team = assignTeam();
      let spawn = findSpawnPosition(team);
      let px = spawn.x;
      let py = spawn.y;
      let player = {
        id: socket.id,
        x: px,
        y: py,
        emoji: emoji,
        team: team,
        health: PLAYER_MAX_HEALTH,
        alive: true,
        heldBallId: null,
      };
      players.push(player);
      console.log(players);
      socket.emit("team-assigned", { team: team });
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
    for (let p of players) {
      p.heldBallId = null;
    }
    balls = [];
    for (let p of players) {
      spawnBallNearPlayer(p);
    }
  });

  socket.on("swing", function (data) {
    let player = findPlayer(socket.id);
    if (!player || !player.alive) return;

    let swingForce = Math.max(0, Math.min(Number(data.force) || 0, 1));
    let hitAny = false;

    if (player.heldBallId != null) {
      let heldBall = findBall(player.heldBallId);
      if (heldBall) {
        let launchAngle = heldBall.orbitAngle;
        heldBall.holderId = null;
        player.heldBallId = null;
        let speedMult = 1 + heldBall.hitCount * BALL_SPEED_INCREMENT;
        heldBall.vx =
          Math.cos(launchAngle) * swingForce * BALL_BASE_SPEED * HIT_FORCE_MULTIPLIER * speedMult;
        heldBall.vy =
          Math.sin(launchAngle) * swingForce * BALL_BASE_SPEED * HIT_FORCE_MULTIPLIER * speedMult;
        hitAny = true;
      } else {
        player.heldBallId = null;
      }
    }

    if (!hitAny && player.heldBallId == null) {
      let closestBall = null;
      let closestDist = Infinity;

      for (let ball of balls) {
        if (ball.holderId) continue;

        let dx = ball.x - player.x;
        let dy = ball.y - player.y;
        let dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < HIT_RADIUS && dist < closestDist) {
          closestBall = ball;
          closestDist = dist;
        }
      }

      if (closestBall) {
        let catchAngle =
          closestDist > 0
            ? Math.atan2(closestBall.y - player.y, closestBall.x - player.x)
            : Math.random() * Math.PI * 2;
        closestBall.hitCount++;
        delete closestBall.nearPlayers[player.id];
        closestBall.holderId = player.id;
        closestBall.orbitAngle = catchAngle;
        closestBall.vx = 0;
        closestBall.vy = 0;
        closestBall.x = clamp01(player.x + Math.cos(catchAngle) * ORBIT_RADIUS);
        closestBall.y = clamp01(player.y + Math.sin(catchAngle) * ORBIT_RADIUS);
        player.heldBallId = closestBall.id;
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
    if (leaving) {
      dropHeldBall(leaving.id);
    }
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

const express = require("express");

const https = require("https");
// to read certificates from the filesystem (fs)
const fs = require("fs");
const path = require("path");

const app = express(); // the server "app", the server behaviour
const portHTTPS = 3010; // port for https

// returning to the client anything that is
// inside the public folder
app.use(express.static("public"));

// Creating object of key and certificate
// for SSL
const options = {
  key: fs.readFileSync("localhost-key.pem"),
  cert: fs.readFileSync("localhost.pem"),
};

let HTTPSserver = https.createServer(options, app);

const { Server } = require("socket.io"); // include library
const io = new Server(HTTPSserver); // start socket io

const locationsFilePath = path.join(__dirname, "locations.json");

function loadLocations() {
  if (!fs.existsSync(locationsFilePath)) {
    fs.writeFileSync(locationsFilePath, "[]\n");
    return [];
  }

  try {
    const raw = fs.readFileSync(locationsFilePath, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Failed to load locations.json:", error);
    return [];
  }
}

function saveLocations() {
  try {
    fs.writeFileSync(locationsFilePath, JSON.stringify(locations, null, 2));
  } catch (error) {
    console.error("Failed to save locations.json:", error);
  }
}

// socket.id -> { userId, username }
let sockets = {};

let locations = loadLocations();
console.log("loaded saved locations:", locations.length);

io.on("connection", (socket) => {
  // we manage the connection inside here
  console.log("a user connected", socket.id);

  socket.on("identify", function (data) {
    // connect username and user id to socket ids
    sockets[socket.id] = data;
    console.log("identify from client:", socket.id, data);
    console.log(sockets);

    // send all locations to user
    socket.emit("all-locations-from-server", locations);
  });

  socket.on("location-from-client", function (data) {
    console.log("location-from-client:", socket.id, data);

    // get userID and name hue
    if (typeof data?.lat !== "number" || typeof data?.lng !== "number") {
      return;
    }

    const sender = sockets[socket.id] || {};
    const newLocation = {
      lat: data.lat,
      lng: data.lng,
      userId: sender.userId || data.userId,
      username: sender.username || data.username,
      userHue: sender.userHue || data.userHue,
    };

    // store location along with userdata to json file and location array
    locations.push(newLocation);
    saveLocations();

    // send new location to everybody
    io.emit("location-from-server", newLocation);
  });

  socket.on("disconnect", function () {
    console.log("someone disconnected", socket.id);

    // delete user from our records
    delete sockets[socket.id];
    console.log(sockets);

    console.log("online socket", sockets);
  });
});

// Creating servers and make them listen at their ports:

HTTPSserver.listen(portHTTPS, function (req, res) {
  console.log("HTTPS Server started at port", portHTTPS);
});

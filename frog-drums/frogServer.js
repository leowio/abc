const express = require("express");

const https = require("https");
// to read certificates from the filesystem (fs)
const fs = require("fs");

const app = express(); // the server "app", the server behaviour
const portHTTPS = 4101; // port for https

// returning to the client anything that is
// inside the public folder
app.use(express.static("public"));

// Creating object of key and certificate
// for SSL
const options = {
  key: fs.readFileSync("keys-for-local-https/localhost-key.pem"),
  cert: fs.readFileSync("keys-for-local-https/localhost.pem"),
};

let HTTPSserver = https.createServer(options, app);

const { Server } = require("socket.io"); // include library
const io = new Server(HTTPSserver);

let frogs = [];
let conductor;

io.on("connection", (socket) => {
  // we manage the connection inside here
  console.log("a user connected", socket.id);

  // LISTEN TO
  socket.on("my-role", function (data) {
    // if frog:
    //     add object with socket id to frog array
    //     inform conductor of new frog
    // if conductor:
    //     store conductor socket id to conductor global variable
    if (data.role === "frog") {
      frogs.push({
        id: socket.id,
        frogIdx: data.frogIdx,
      });
      console.log(frogs);
      if (conductor) {
        io.to(conductor).emit("new-frog", { id: socket.id, frogIdx: data.frogIdx });
      }
    } else if (data.role === "conductor") {
      conductor = socket.id;
      socket.emit("all-frogs", frogs);
    }
  });

  socket.on("trigger-frog", function (data) {
    io.to(data.id).emit("play");
  });

  socket.on("disconnect", function () {
    console.log("someone disconnected", socket.id);

    frogs = frogs.filter((data) => data.id !== socket.id);

    if (socket.id === conductor) {
      conductor = null;
    } else if (conductor) {
      io.to(conductor).emit("delete-frog", { id: socket.id });
    }
  });
});

// Creating servers and make them listen at their ports:

HTTPSserver.listen(portHTTPS, function (req, res) {
  console.log("HTTPS Server started at port", portHTTPS);
});

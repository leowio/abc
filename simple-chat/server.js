const express = require("express");
// const http = require("http"); // we try to make HTTPS work

const https = require("https");
// to read certificates from the filesystem (fs)
const fs = require("fs");
const { Server } = require("socket.io");

const app = express(); // the server "app", the server behaviour

const portHTTPS = 3000; // port for https
// const portHTTP = 3001; // port for http

// returning to the client anything that is
// inside the public folder
app.use(express.static("public"));

// Creating object of key and certificate
// for SSL
const options = {
  key: fs.readFileSync("./keys-for-local-https/localhost-key.pem"),
  cert: fs.readFileSync("./keys-for-local-https/localhost.pem"),
};

// Creating servers and make them listen at their ports:
const httpServer = https.createServer(options, app);
const io = new Server(httpServer);

io.on("connection", (socket) => {
  console.log("New client connected:", socket.id);

  socket.emit("message", {
    user: "System",
    text: "Welcome to the chat!",
    timestamp: new Date(),
  });

  socket.on("message", (data) => {
    console.log("Message from", socket.id, ":", data);

    // Broadcast message to all connected clients
    io.emit("message", {
      user: socket.id.substring(0, 5),
      text: data.text || data,
      timestamp: new Date(),
    });
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);

    io.emit("message", {
      user: "System",
      text: `User ${socket.id.substring(0, 5)} left the chat`,
      timestamp: new Date(),
    });
  });
});

httpServer.listen(portHTTPS, function (req, res) {
  console.log("HTTPS Server started at port", portHTTPS);
});

// if we ALSO serve on http we can incommend this, but right now we don't
// http.createServer(app).listen(portHTTP, function (req, res) {
//     console.log("HTTP Server started at port", portHTTP);
// });

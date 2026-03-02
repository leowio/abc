let socket;
if (
  location.hostname.toLowerCase().startsWith("browsercircus") ||
  location.hostname.toLowerCase().startsWith("www")
) {
  socket = io({ path: "/YOUR-NAME/YOUR-PORT/socket.io" });
} else {
  socket = io();
}

let startButton = document.querySelector("#start");
let latestX = 0;
let latestY = 0;
let latestZ = 0;
let latestBeta = 0;
let latestGamma = 0;
let sendTimer = null;
let SEND_INTERVAL = 50;

function sendData() {
  document.querySelector("#ax").innerText = "x: " + latestX.toFixed(2);
  document.querySelector("#ay").innerText = "y: " + latestY.toFixed(2);
  document.querySelector("#az").innerText = "z: " + latestZ.toFixed(2);

  socket.emit("motion-data", {
    x: latestX,
    y: latestY,
    z: latestZ,
    beta: latestBeta,
    gamma: latestGamma,
  });
}

function scheduleSend() {
  if (sendTimer) return;
  sendTimer = setTimeout(function () {
    sendTimer = null;
    sendData();
  }, SEND_INTERVAL);
}

startButton.addEventListener("click", function () {
  if (typeof DeviceMotionEvent.requestPermission === "function") {
    DeviceMotionEvent.requestPermission()
      .then(function (state) {
        if (state === "granted") {
          return DeviceOrientationEvent.requestPermission();
        }
      })
      .then(function (state) {
        if (state === "granted") {
          startMotion();
        }
      })
      .catch(console.error);
  } else {
    startMotion();
  }
});

function startMotion() {
  startButton.style.display = "none";
  socket.emit("my-role", { role: "player" });

  window.addEventListener("deviceorientation", function (event) {
    latestBeta = event.beta || 0;
    latestGamma = event.gamma || 0;
    scheduleSend();
  });

  window.addEventListener("devicemotion", function (event) {
    let acc = event.acceleration;
    if (!acc) return;
    latestX = acc.x || 0;
    latestY = acc.y || 0;
    latestZ = acc.z || 0;
    scheduleSend();
  });
}

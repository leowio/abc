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

let SWING_THRESHOLD = 15;
let FORCE_MAX = 40;
let SWING_COOLDOWN = 400;
let canSwing = true;

startButton.addEventListener("click", function () {
  if (typeof DeviceMotionEvent.requestPermission === "function") {
    DeviceMotionEvent.requestPermission()
      .then(function (state) {
        if (state === "granted") {
          startGame();
        }
      })
      .catch(console.error);
  } else {
    startGame();
  }
});

function startGame() {
  startButton.style.display = "none";
  socket.emit("my-role", { role: "player" });

  window.addEventListener("devicemotion", function (event) {
    let acc = event.acceleration;
    if (!acc) return;

    let x = acc.x || 0;
    let y = acc.y || 0;
    let z = acc.z || 0;
    let mag = Math.sqrt(x * x + y * y + z * z);

    if (mag > SWING_THRESHOLD && canSwing) {
      canSwing = false;

      let force = Math.min(mag / FORCE_MAX, 1);

      socket.emit("swing", { force: force });

      document.querySelector("#ax").innerText = "force: " + force.toFixed(2);
      document.querySelector("#ay").innerText = "mag: " + mag.toFixed(1);
      document.querySelector("#az").innerText = "";

      setTimeout(function () {
        canSwing = true;
      }, SWING_COOLDOWN);
    }
  });
}

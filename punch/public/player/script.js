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

startButton.addEventListener("click", function () {
  if (typeof DeviceMotionEvent.requestPermission === "function") {
    DeviceMotionEvent.requestPermission()
      .then((permissionState) => {
        if (permissionState === "granted") {
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

  window.addEventListener("devicemotion", function (event) {
    let acc = event.acceleration;
    if (!acc) return;

    let x = acc.x || 0;
    let y = acc.y || 0;
    let z = acc.z || 0;

    document.querySelector("#ax").innerText = "x: " + x.toFixed(2);
    document.querySelector("#ay").innerText = "y: " + y.toFixed(2);
    document.querySelector("#az").innerText = "z: " + z.toFixed(2);

    socket.emit("motion-data", { x: x, y: y, z: z });
  });
}

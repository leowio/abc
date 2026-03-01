let socket;
if (
  location.hostname.toLowerCase().startsWith("browsercircus") ||
  location.hostname.toLowerCase().startsWith("www")
) {
  socket = io({ path: "/YOUR-NAME/YOUR-PORT/socket.io" }); // e.g. '/leon/port-4100/socket.io' or '/socket.io'
} else {
  socket = io();
}

// let readyButton = document.querySelector("#ready");
let mainWrapper = document.querySelector(".main-wrapper");
let w = window.innerWidth;
let h = window.innerHeight;
let frogs = [];

socket.emit("my-role", { role: "conductor" });

socket.on("all-frogs", function (data) {
  data.forEach(function (frog) {
    addFrog(frog.id, frog.frogIdx);
  });
});

socket.on("new-frog", function (data) {
  addFrog(data.id, data.frogIdx);
});

socket.on("delete-frog", function (data) {
  let elm = document.querySelector("#A" + data.id);
  if (elm) elm.remove();
});

function addFrog(socketID, frogIdx) {
  let imgWrapper = document.createElement("div");
  imgWrapper.className = "img-wrap";
  imgWrapper.id = "A" + socketID; // THIS IS IMPORTANT. EVERY FROG's HTML ID is the same as their socket Id
  imgWrapper.style.opacity = 0.3;
  imgElm = document.createElement("img");
  imgElm.src = "../imgs/frog" + frogIdx + ".png";
  imgWrapper.append(imgElm);
  mainWrapper.append(imgWrapper);

  // button socket communication:
  imgElm.addEventListener("click", function () {
    // handle opacity of frog button
    if (document.querySelector("#A" + socketID).style.opacity == 0.3) {
      document.querySelector("#A" + socketID).style.opacity = 1;
    } else {
      document.querySelector("#A" + socketID).style.opacity = 0.3;
    }

    socket.emit("trigger-frog", { id: socketID });
  });
}

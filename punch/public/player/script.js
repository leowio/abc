let socket;
if (
  location.hostname.toLowerCase().startsWith("browsercircus") ||
  location.hostname.toLowerCase().startsWith("www")
) {
  socket = io({ path: "/leo/port-4210/socket.io" });
} else {
  socket = io();
}

let startButton = document.querySelector("#start");
let emojiPicker = document.querySelector("#emoji-picker");
let chosenEmojiEl = document.querySelector("#chosen-emoji");

let SWING_THRESHOLD = 15;
let FORCE_MAX = 40;
let SWING_COOLDOWN = 400;
let canSwing = true;
let availableEmojis = [];

socket.on("available-emojis", function (data) {
  availableEmojis = data;
  renderEmojis();
});

socket.on("emoji-taken", function (emoji) {
  availableEmojis = availableEmojis.filter(function (e) {
    return e !== emoji;
  });
  renderEmojis();
});

socket.on("emoji-freed", function (emoji) {
  if (availableEmojis.indexOf(emoji) === -1) {
    availableEmojis.push(emoji);
  }
  renderEmojis();
});

socket.on("emoji-rejected", function () {
  emojiPicker.style.display = "grid";
  chosenEmojiEl.style.display = "none";
});

socket.on("team-assigned", function (data) {
  let wrapper = document.querySelector(".main-wrapper");
  if (data.team === "blue") {
    wrapper.style.backgroundColor = "#1a3a5c";
  } else {
    wrapper.style.backgroundColor = "#5c1a1a";
  }
});

socket.on("health-update", function (data) {
  let healthEl = document.querySelector("#health");
  let hearts = "";
  for (let i = 0; i < data.health; i++) hearts += "\u2764\uFE0F";
  healthEl.innerText = hearts;
});

socket.on("player-died", function () {
  chosenEmojiEl.innerText = "\u{1F47B}";
  let wrapper = document.querySelector(".main-wrapper");
  wrapper.style.backgroundColor = "#222";
});

startButton.addEventListener("click", function () {
  if (typeof DeviceMotionEvent.requestPermission === "function") {
    DeviceMotionEvent.requestPermission()
      .then(function (state) {
        if (state === "granted") {
          showEmojiPicker();
        }
      })
      .catch(console.error);
  } else {
    showEmojiPicker();
  }
});

function showEmojiPicker() {
  startButton.style.display = "none";
  emojiPicker.style.display = "grid";
  renderEmojis();
}

function renderEmojis() {
  if (emojiPicker.style.display === "none") return;
  emojiPicker.innerHTML = "";
  for (let i = 0; i < availableEmojis.length; i++) {
    let emoji = availableEmojis[i];
    let btn = document.createElement("button");
    btn.className = "emoji-btn";
    btn.innerText = emoji;
    btn.addEventListener("click", function () {
      pickEmoji(emoji);
    });
    emojiPicker.appendChild(btn);
  }
}

function pickEmoji(emoji) {
  emojiPicker.style.display = "none";
  chosenEmojiEl.innerText = emoji;
  chosenEmojiEl.style.display = "block";
  let healthEl = document.querySelector("#health");
  healthEl.style.display = "block";
  healthEl.innerText = "\u2764\uFE0F".repeat(10);
  socket.emit("my-role", { role: "player", emoji: emoji });
  startMotionListener();
}

function startMotionListener() {
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

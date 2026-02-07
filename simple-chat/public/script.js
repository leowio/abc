let socket = io();

const nameInput = document.querySelector("#nameWrapper input");
const chatForm = document.getElementById("chatForm");
const newMessageInput = document.getElementById("newMessage");
const threadWrapper = document.querySelector("#threadWrapper ul");

socket.on("message", (data) => {
  displayMessage(data.user, data.text);
});

chatForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const messageText = newMessageInput.value.trim();
  if (messageText) {
    socket.emit("message", {
      text: messageText,
    });
    newMessageInput.value = "";
  }
});

function displayMessage(user, text) {
  const li = document.createElement("li");

  const whoSpan = document.createElement("span");
  whoSpan.className = "who";
  whoSpan.textContent = user + ":";

  const wordsSpan = document.createElement("span");
  wordsSpan.className = "words";
  wordsSpan.textContent = text;

  li.appendChild(whoSpan);
  li.appendChild(wordsSpan);
  threadWrapper.appendChild(li);

  // Auto-scroll to bottom
  threadWrapper.parentElement.scrollTop =
    threadWrapper.parentElement.scrollHeight;
}

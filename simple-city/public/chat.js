const chatForm = document.getElementById("chatForm");
const newMessageInput = document.getElementById("newMessage");

socket.on("chatMessage", (data) => {
  if (data.id) {
    playerMessages[data.id] = { text: data.text, time: Date.now() };
  }
});

chatForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const messageText = newMessageInput.value.trim();
  if (messageText) {
    socket.emit("chatMessage", { text: messageText });
    newMessageInput.value = "";
  }
});

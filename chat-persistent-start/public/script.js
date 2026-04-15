function getOrCreateUserId() {
    const storageKey = "chat-user-id";
    const savedUserId = window.localStorage.getItem(storageKey);

    if (savedUserId) {
        return savedUserId;
    }

    // Prefer the browser's UUID generator when available.
    const newUserId =
        window.crypto && typeof window.crypto.randomUUID === "function"
            ? window.crypto.randomUUID()
            : `user-${Date.now()}-${Math.random().toString(16).slice(2)}`;

    window.localStorage.setItem(storageKey, newUserId);

    return newUserId;
}

function getSavedUsername() {
    const storageKey = "chat-username";
    return window.localStorage.getItem(storageKey) || "";
}

let nameInput = document.querySelector("#nameInput");


const myUserId = getOrCreateUserId();
console.log('My userId:', myUserId);


//check if we have a username already
let myUsername = getSavedUsername();
nameInput.value = myUsername;

// start socket
if(location.hostname.toLowerCase().startsWith('browsercircus') || location.hostname.toLowerCase().startsWith('www')){
  socket = io({path: "/YOURPATH-and-PORT/socket.io"});  // yields '/leon/port-4100/socket.io' or '/socket.io'
}else{
  socket = io(); 
}

let myInfo = {
    userId: myUserId,
    username: myUsername
}
// "login" to server, sending out "identify"
socket.on("connect", function () {
    socket.emit("identify", myInfo);
});


//handle username change 
nameInput.addEventListener("change", function(){
    const newUsername = nameInput.value.trim();
    const storageKey = "chat-username";

    console.log("changed name", newUsername)

    myUsername = newUsername;
    myInfo.username = newUsername;
    nameInput.value = newUsername;

    if (newUsername) {
        window.localStorage.setItem(storageKey, newUsername);
    } else {
        window.localStorage.removeItem(storageKey);
    }

    socket.emit("name-change", {
        userId: myUserId,
        username: newUsername
    });
})



let formeElm = document.querySelector("#chatForm");
console.log(formeElm);
let msgInput = document.querySelector("#newMessage");
console.log(msgInput)


// LISTEN FOR NEWLY TYPED MESSAGES, 
// SEND THEM TO THE SERVER
formeElm.addEventListener("submit", newMessagesSubmitted);

function newMessagesSubmitted(event){
    console.log(event);
    //stop form element from refreshing the page
    event.preventDefault();

    let newMsg = msgInput.value.trim()
    console.log(newMsg);

    if (!newMsg) {
        return;
    }

    // appendMessage(newMsg); // just for fun,
    // actuaally we need to
    // send the new message to 
    // the server first:
    socket.emit("message-from-client", {
        message: newMsg
    } );


    // clear out input:
    msgInput.value = "";

}


socket.on("message-from-server", function(data){
    // waht do to with the messaeg from server
    console.log("got message", data)
    appendMessage(data)
})




socket.on("chat-history", function(data){
    // deal with chat history
    let chatThreadList = document.querySelector("#threadWrapper ul");
    chatThreadList.innerHTML = "";

    data.forEach(function (message) {
        appendMessage(message);
    });
})

// APPEND MESSAGES TO BOX
function appendMessage(data){
    // console.log(data)
    // select list (ul) first
    let chatThreadList = document.querySelector("#threadWrapper ul");
    // console.log(chatThreadList)

    // create new list item (li)
    let newListItem = document.createElement("li");
    // class name if message is out own message
    newListItem.className = data.userId === myUserId ? "fromMe" : "fromOthers";

    //sender
    let who = document.createElement("span");
    who.className = "who";
    who.innerText = data.username || "Anonymous";

    newListItem.append(who);

    //messsage
    let words = document.createElement("span");
    words.className = "words";
    words.innerText = data.message || "";

    newListItem.append(words);



    // append new li to the list 
    chatThreadList.append(newListItem);

    // scroll to bottom of textbox:
    chatThreadList.scrollTop = chatThreadList.scrollHeight;
}

window.addEventListener("deviceorientation", handleOrientation, true); // can be deleted later

function handleOrientation(eventData) {
  console.log(eventData.alpha);

  document.querySelector("#alpha").innerText =
    "alpha: " + Math.round(eventData.alpha);
  document.querySelector("#beta").innerText =
    "beta: " + Math.round(eventData.beta);
  document.querySelector("#gamma").innerText =
    "gamma: " + Math.round(eventData.gamma);

  document.querySelector("h1").style.fontSize = `${eventData.beta}px`;
  document.querySelector("#requestOrientationButton").style.display = "none";
}

let keys = [], keyDowns = [], keyUps = [];
let mouseX, mouseY;
let mouseScroll = 0;
let mouseDowns = [], mouseUps = [], mousePresseds = [], doubleClicks = [];
let mouseClickedX, mouseClickedY;

function isPressed(key) {
  return keys.indexOf(key) !== -1;
}

function isDown(key) {
  return keyDowns.indexOf(key) !== -1;
}

function isUp(key) {
  return keyUps.indexOf(key) !== -1;
}

function isClicked(button) {
  return mousePresseds.indexOf(button) !== -1;
}

function isMouseDown(button) {
  return mouseDowns.indexOf(button) !== -1;
}

function isMouseUp(button) {
  return mouseUps.indexOf(button) !== -1;
}

function tickInput() {
  keyDowns = [];
  keyUps = [];
  mouseDowns = [];
  mouseUps = [];
  doubleClicks = [];
}

function keyDown(event) {
  if (keys.indexOf(event.key) === -1) {
    keyDowns.push(event.key);
  }

  keys.push(event.key);
}
window.addEventListener("keydown", keyDown);

function keyUp(event) {
  keyUps.push(event.key);
  keys = keys.filter(key => key !== event.key);
}
window.addEventListener("keyup", keyUp);

function mouseMove(event) {
  mouseX = event.clientX - canvas.offsetLeft;
  mouseY = event.clientY - canvas.offsetTop;
}
window.addEventListener("mousemove", mouseMove);

function mouseDown(event) {
  if (event.clientX < menubarWidth) return;

  mouseDowns.push(event.button);
  mousePresseds.push(event.button);
  mouseClickedX = mouseX;
  mouseClickedY = mouseY;
}
window.addEventListener("mousedown", mouseDown)

function doubleClick(event) {
  doubleClicks.push(event.button);
}
window.addEventListener('dblclick', doubleClick)

function mouseUp(event) {
  mouseUps.push(event.button);
  mousePresseds = mousePresseds.filter(button => button !== event.button);
}
window.addEventListener("mouseup", mouseUp);

function wheel(event) {
  mouseScroll = event.deltaY;
}
window.addEventListener("wheel", wheel);
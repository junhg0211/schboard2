const FPS = 60;

const BACKGROUND_COLOR = "#163b2d";

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

let keys = [];
let mouseX, mouseY;
let mouseScroll = 0;

function isPressed(key) {
  return keys.indexOf(key) !== -1;
}

let camera = new Camera(0, 0, 10);
let centerIndicator = new PositionIndicator(0, 0, 'white', 1, camera);

let socket1 = new Socket(0, 0, camera);
let socket2 = new Socket(0, 0, camera);
let socket3 = new Socket(0, 0, camera);

let gameObjects = [
  new Component(0, 0, "TEST", camera, [socket1, socket2], [socket3]),
  new Wire(socket3, socket2, camera)
];

const WM_ARRANGE = 'arrange';
const WM_WIRE = 'wire';
const WM_WIRE_ARRANGE = 'wire_arrange';

function getWorkMode() {
  return document.querySelector("input[name='work_mode']:checked").value;
}

function setWorkMode(workMode) {
  document.querySelector(`input[name='work_mode'][value='${workMode}']`).checked = true;
}

/*
 * work mode keyboard shortcuts
 */
function tickWorkMode() {
  if (isPressed('v')) {
    setWorkMode(WM_ARRANGE);
  } else if (isPressed('e')) {
    setWorkMode(WM_WIRE);
  } else if (isPressed('q')) {
    setWorkMode(WM_WIRE_ARRANGE);
  }
}

function tick() {
  camera.tick();

  centerIndicator.render();
  gameObjects.forEach(object => {
    object.tick();
  });

  tickWorkMode();
}

function render() {
  ctx.fillStyle = BACKGROUND_COLOR;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  centerIndicator.render();
  gameObjects.forEach(object => {
    object.render();
  });
}

function init() {
  resize();
}

function resize() {
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;
}

function keyDown(event) {
  keys.push(event.key);
}

function keyUp(event) {
  keys = keys.filter(key => key !== event.key);
}

function mouseMove(event) {
  mouseX = event.clientX - canvas.offsetLeft;
  mouseY = event.clientY - canvas.offsetTop;
}

function wheel(event) {
  mouseScroll = event.wheelDelta;
}

window.addEventListener("resize", resize);
window.addEventListener("keydown", keyDown);
window.addEventListener("keyup", keyUp);
window.addEventListener("mousemove", mouseMove);
window.addEventListener("wheel", wheel);

init();
setInterval(() => {
  tick();
  render();
}, 1000 / FPS)
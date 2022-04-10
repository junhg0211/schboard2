const FPS = 60;

const BACKGROUND_COLOR = "#163b2d";

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

let keys = [];
let mouseX, mouseY;
let mouseScroll = 0;

let camera = new Camera(0, 0, 10);
let gameObjects = [
  new Component(0, 0, "TEST", camera, [
    new Socket(0, 0, camera),
    new Socket(0, 0, camera),
  ], [
    new Socket(0, 0, camera)
  ]),
  new PositionIndicator(0, 0, 'white', 1, camera),
];

function getWorkMode() {
  return document.querySelector("input[name='work_mode']:checked").value;
}

function tick() {
  camera.tick();
  gameObjects.forEach(object => {
    object.tick();
  });
}

function render() {
  ctx.fillStyle = BACKGROUND_COLOR;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

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
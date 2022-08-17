/*
 * `index.js` is for the main game loop and event handlers.
 */

const menubarWidth = document.querySelector(".operation").clientWidth;

const FPS = 60;

const BACKGROUND_COLOR = "#163b2d";

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

// input
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

function isClicked(button) {
  return mousePresseds.indexOf(button) !== -1;
}

function isMouseDown(button) {
  return mouseDowns.indexOf(button) !== -1;
}

function isMouseUp(button) {
  return mouseUps.indexOf(button) !== -1;
}

function isDoubleClicked(button) {
  return doubleClicks.indexOf(button) !== -1;
}

function tickInput() {
  keyDowns = [];
  keyUps = [];
  mouseDowns = [];
  mouseUps = [];
  doubleClicks = [];
}

// objects
let camera = new Camera(0, 0, 10);
let centerIndicator = new PositionIndicator(0, 0, 'white', 1, camera);
let grid = new Grid(camera);

// components
let gameObjects = [];

let calculationLimit = 2;
let nextGameObjectId = 0;
let lastDirection = 0;

// work mode
const WM_ARRANGE = 'arrange';
const WM_WIRE = 'wire';
const WM_WIRE_ARRANGE = 'wire_arrange';

function getWorkMode() {
  return document.querySelector("input[name='work_mode']:checked").value;
}

function setWorkMode(workMode) {
  document.querySelector(`input[name='work_mode'][value='${workMode}']`).checked = true;
}

let floatingObject = null;
let floatingObjectOriginalX = 0;
let floatingObjectOriginalY = 0;
let startingCameraX, startingCameraY;
function tickArrangeMode() {
  let inGameX = camera.getBoardX(mouseX), inGameY = camera.getBoardY(mouseY);
  if (isMouseDown(0)) {
    // get a floating object
    floatingObject = null;
    for (let i = gameObjects.length - 1; i >= 0; i--) {
      let object = gameObjects[i];
      if (object.x <= inGameX && inGameX <= object.x + object.size
          && object.y <= inGameY && inGameY <= object.y + object.size) {
        floatingObject = object;
        floatingObjectOriginalX = object.x;
        floatingObjectOriginalY = object.y;
        break;
      }
    }
    // record the camera position at the mousedown
    startingCameraX = camera.x;
    startingCameraY = camera.y;
    // get the floatingObject at the front glancing position
    if (floatingObject) {
      gameObjects.splice(gameObjects.indexOf(floatingObject), 1);
      gameObjects.push(floatingObject);
    }
  } else if (isMouseUp(0)) {
    if (floatingObject !== null && floatingObject !== undefined) {
      let x = Math.round(floatingObject.x);
      let y = Math.round(floatingObject.y);
      floatingObject.setPos(x, y);
      floatingObject = null;
    }
  }
  if (floatingObject !== null && floatingObject !== undefined && isClicked(0)) {
    let x = Math.round(floatingObjectOriginalX + inGameX - camera.getBoardX(mouseClickedX) - startingCameraX + camera.x);
    let y = Math.round(floatingObjectOriginalY + inGameY - camera.getBoardY(mouseClickedY) - startingCameraY + camera.y);
    floatingObject.setPos(x, y);
  }
}

function getClosestSocket(boardX, boardY) {
  let closestDistance = Infinity;
  let closestSocket = null;
  function updateClosest(socket) {
    let distance = Math.sqrt(Math.pow(socket.x - boardX, 2) + Math.pow(socket.y - boardY, 2));
    if (distance < closestDistance) {
      closestDistance = distance;
      closestSocket = socket;
    }
  }

  gameObjects.forEach(object => {
    if (object instanceof Component) {
      object.inSockets.forEach(updateClosest);
      object.outSockets.forEach(updateClosest);
    }
  });

  return closestSocket;
}

let highlightedSocket = null;
let startSocket = null;
function tickWireMode() {
  // if mouseUp
  if (highlightedSocket !== null && isMouseUp(0) && startSocket !== highlightedSocket) {
    // swap INPUT -> OUTPUT to OUTPUT -> INPUT
    if (startSocket.role === Socket.INPUT && highlightedSocket.role === Socket.OUTPUT) {
      let temp = startSocket;
      startSocket = highlightedSocket;
      highlightedSocket = temp;
    }

    if (startSocket.role === Socket.OUTPUT && highlightedSocket.role === Socket.INPUT) {
      let wire = new Wire(startSocket, highlightedSocket, camera);

      // check if wire is already existing,
      // if so, delete it
      let add = true;
      gameObjects.forEach(object => {
        if (object instanceof Wire && object.isSameWith(wire)) {
          gameObjects.splice(gameObjects.indexOf(object), 1);
          wire.toSocket.available = true;
          wire.toSocket.changeState(false);
          add = false;
        }
      });
      // otherwise, add it
      if (add) {
        if (wire.toSocket.available) {
          wire.toSocket.available = false;
        } else {
          // find a socket that already is connected to the toSocket
          // and delete it
          gameObjects.forEach(object => {
            if (object instanceof Wire && object.toSocket === wire.toSocket) {
              gameObjects.splice(gameObjects.indexOf(object), 1);
            }
          });
        }

        // noinspection JSCheckFunctionSignatures
        gameObjects.push(wire);
        wire.calculate();
      }
    }
  }

  // click socket highlighting
  if (isClicked(0)) {
    highlightedSocket = getClosestSocket(camera.getBoardX(mouseX), camera.getBoardY(mouseY));
    if (isMouseDown(0)) {
      startSocket = highlightedSocket;
    }
  } else if (isMouseUp(0)) {
    highlightedSocket = null;
    startSocket = null;
  }
}

/*
 * work mode keyboard shortcuts
 */
function tickWorkMode() {
  let workMode = getWorkMode();

  if (workMode === WM_ARRANGE) {
    tickArrangeMode();
  } else if (workMode === WM_WIRE) {
    tickWireMode();
  } else if (workMode === WM_WIRE_ARRANGE) {
  }

  if (isPressed('v')) {
    setWorkMode(WM_ARRANGE);
  } else if (isPressed('e')) {
    setWorkMode(WM_WIRE);
  } else if (isPressed('q')) {
    setWorkMode(WM_WIRE_ARRANGE);
  }
}

function getClosestComponent(x, y) {
  let closestDistance = Infinity;
  let closestComponent = null;
  function updateClosest(component) {
    let dx = component.x + component.size / 2 - x;
    let dy = component.y + component.size / 2 - y;
    let distance = Math.sqrt(Math.pow(dx, 2) + Math.pow(dy, 2));
    if (distance < closestDistance) {
      closestDistance = distance;
      closestComponent = component;
    }
  }
  gameObjects.forEach(object => {
    if (object instanceof Component) {
      updateClosest(object);
    }
  });
  return closestComponent;
}

function tickComponentRotation() {
  if (isDown('r')) {
    let component = getClosestComponent(camera.getBoardX(mouseX), camera.getBoardY(mouseY));
    lastDirection = (component.direction + 1) % 4;
    component.setDirection(lastDirection);
  }
}

/*
 * ticks the deletion and creation of components
 * like backspace to delete and o to OrComponent etc
 */
function tickComponentMakeDelete() {
  if (isDown('Backspace') || isDown('Delete')) {
    let component = getClosestComponent(camera.getBoardX(mouseX), camera.getBoardY(mouseY));
    if (component !== null) {
      component.delete();
    }
  } else if (isDown('o')) {
    let size = getComponentSizeBySocketCount(2);
    let x = Math.round(camera.getBoardX(mouseX) - size/2);
    let y = Math.round(camera.getBoardY(mouseY) - size/2);
    gameObjects.push(new OrComponent(x, y, camera));
  } else if (isDown('n')) {
    let size = getComponentSizeBySocketCount(1);
    let x = Math.round(camera.getBoardX(mouseX) - size/2);
    let y = Math.round(camera.getBoardY(mouseY) - size/2);
    gameObjects.push(new NotComponent(x, y, camera));
  } else if (isDown('1')) {
    let size = getComponentSizeBySocketCount(1);
    let x = Math.round(camera.getBoardX(mouseX) - size/2);
    let y = Math.round(camera.getBoardY(mouseY) - size/2);
    gameObjects.push(new TrueComponent(x, y, camera));
  }
}

// game logic
function tick() {
  camera.tick();

  centerIndicator.render();

  tickWorkMode();
  tickComponentRotation();
  tickComponentMakeDelete();

  gameObjects.forEach(object => {
    object.tick();
  });
  for (let i = 0; i < calculationLimit && componentCalculationQueue; i++) {
    let component = componentCalculationQueue.shift();
    if (component) {
      component.calculate();
    }
  }

  tickInput();
}

function render() {
  ctx.fillStyle = BACKGROUND_COLOR;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  grid.render();

  centerIndicator.render();
  gameObjects.forEach(object => {
    object.render();
  });
}

/*
 * called when program starts
 */
function init() {
  resize();
}

// event handlers
function resize() {
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;
}
window.addEventListener("resize", resize);

function keyDown(event) {
  keys.push(event.key);
  keyDowns.push(event.key);
}
window.addEventListener("keydown", keyDown);

function keyUp(event) {
  keys = keys.filter(key => key !== event.key);
  keyUps.push(event.key);
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

// main loop
window.addEventListener("load", () => {
  init();
  setInterval(() => {
    tick();
    render();
  }, 1000 / FPS);
});
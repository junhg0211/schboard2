/*
 * `index.js` is for the main game loop and event handlers.
 */

// util functions

function limit(t, a, b) {
  return Math.min(Math.max(t, a), b);
}

function getClosestPointToSegment(x0, y0, x1, y1, x2, y2) {
  if (x1 === x2) {
    if (y2 < y1) [y1, y2] = [y2, y1];
    return [x1, limit(y0, y1, y2)];
  }
  if (y1 === y2) {
    if (x2 < x1) [x1, x2] = [x2, x1];
    return [limit(x0, x1, x2), y1];
  }

  if (x2 < x1) {
    [x1, x2] = [x2, x1];
    [y1, y2] = [y2, y1];
  }
  let tanL = (y2 - y1) / (x2 - x1);
  let tanM = -1 / tanL;
  let x = (x0 * tanM - y0 - x1 * tanL + y1) / (tanM - tanL);
  let y = tanL * (x - x1) + y1;
  if (x < x1) {
    return [x1, y1];
  } else if (x > x2) {
    return [x2, y2];
  } else {
    return [x, y];
  }
}

function getDistanceToSegment(x0, y0, x1, y1, x2, y2) {
  let [x, y] = getClosestPointToSegment(x0, y0, x1, y1, x2, y2);
  return Math.sqrt(Math.pow(x - x0, 2) + Math.pow(y - y0, 2));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function rectangleCollision(x1, y1, w1, h1, x2, y2, w2, h2) {
  return x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2;
}

function center(a, b) {
  return (a - b) / 2;
}

// general variable
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

// objects
let camera = new Camera(0, 0, 20);
let centerIndicator = new PositionIndicator(0, 0, 'white', 1, camera);
let grid = new Grid(camera);
let selectingBox = new RectangleWithLine(0, 0, 0, 0, '#fff2', '#fffa', 1);

let cameraLeft = 0;
let cameraRight = 0;
let cameraTop = 0;
let cameraBottom = 0;

// tabs
let tabs = [], nowTab = "Untitled";
let components = null, wires = null;

let tabList = document.querySelector("#tab-list");

function newTab(title) {
  return {
    name: title,
    components: [],
    wires: [],
    componentCalculationQueue: [],
  };
}

function getTab(name) {
  return tabs.find(tab => tab.name === name);
}

function createTab(name) {
  let tab = newTab(name);
  tabs.push(tab);
  let li = document.createElement("li");
  li.innerText = name;
  li.onclick = () => changeTab(name);
  tabList.appendChild(li);
  return tab;
}

const pathDiv = document.querySelector(".path");

/*
 * switch current tab
 */
function changeTab(name) {
  nowTab = name;

  let tab = getTab(name);
  components = tab.components;
  wires = tab.wires;
  componentCalculationQueue = tab.componentCalculationQueue;

  pathDiv.innerText = name;
}

function stringifyTab(tab, abstractComponentIds) {
  let result = {
    name: tab.name,
    components: [],
    wireIndexes: [],
    queuedComponentIndexes: []
  };
  // result.wireIndexes will contain the socket addresses of components.
  // for example, if enabled (state = true) wire A is originally connected from result.components[1]'s 1st outSockets
  // to result.components[0]'s 2nd inSockets, wire A will be represented as [1, 0, 0, 1, true].
  //
  // result.queuedComponentIndexes will contain the index of components in result.components
  // which must be also contained on componentCalculationQueue when this stringified tab is structured.

  tab.components.forEach(component => {
    if (component instanceof IntegratedComponent && abstractComponentIds.indexOf(component.integrationId) !== -1) {
      result.components.push(makeBlueprintString(component, component.getSignal()));
    } else {
      result.components.push(component.flatten())
    }
  });

  tab.wires.forEach(wire => {
    let fromSocket = wire.fromSocket;
    let toSocket = wire.toSocket;

    let fromSocketComponent = getConnectedComponent(fromSocket, tab.components);
    let toSocketComponent = getConnectedComponent(toSocket, tab.components);

    result.wireIndexes.push([
      tab.components.indexOf(fromSocketComponent),
      fromSocketComponent.outSockets.indexOf(fromSocket),
      tab.components.indexOf(toSocketComponent),
      toSocketComponent.inSockets.indexOf(toSocket),
      wire.on
    ]);
  });

  tab.componentCalculationQueue.forEach(component => {
    if (tab.componentCalculationQueue.indexOf(component) !== -1)
      result.queuedComponentIndexes.push(tab.components.indexOf(component));
  });

  return result;
}

createTab(nowTab);
changeTab(nowTab);

// packs
/*
 * creating the packed project
 */
function pack() {
  let result = {
    nextIntegrationId: nextIntegrationId,
    nowTab: nowTab,
    tabs: [],
    abstractedComponents: [],
    camera: {
      x: camera.x,
      y: camera.y,
      zoom: camera.zoom,
    }
  };

  let workMode = getWorkMode();

  for (let i = 0; i < abstractComponentList.children.length; i++) {
    abstractComponentList.children[i].children[1].children[0].onclick();

    // component = selectedObjects[0]
    // flattenedComponent = preconfiguredStructure
    // signal = clonedString[0][2]
    result.abstractedComponents.push([preconfiguredStructure, clonedStrings[0][2]]);
  }

  setWorkMode(workMode);

  tabs.forEach(tab => {
    result.tabs.push(stringifyTab(tab, result.abstractedComponents.map(structure => structure[0][2])));
    // structure[0] is flattened integrated component
    // and structure[0][2] is its integration id
  });

  return result;
}

/*
 * make a download link for packed project and invoke the download
 */
function save() {
  let content = JSON.stringify(pack());

  let filename = "components.json";
  let file = new File([content], filename);
  let a = document.createElement("a"),
      url = URL.createObjectURL(file);
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(function () {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
  }, 0);
}

// settings
let calculationLimit = 2;
let nextGameObjectId = 0;
let nextIntegrationId = 0;
let lastDirection = 0;
let minimalSatisfaction = 1, maximalSatisfaction = 2;

// work mode
const WM_ARRANGE = 'arrange';
const WM_WIRE = 'wire';
const WM_WIRE_ARRANGE = 'wire_arrange';
const WM_DRAG = 'drag';
const WM_ZOOM = 'zoom';
const WM_UNABSTRACTION = 'unabstraction';
const WM_INTERACTION = 'interaction';
const WM_CLONE = 'clone';

function getWorkMode() {
  return document.querySelector("input[name='work_mode']:checked").value;
}

function setWorkMode(workMode) {
  if (workMode === WM_CLONE) {
    firstTickCloneMode = true;
    lastWorkMode = getWorkMode();
  }

  document.querySelector(`input[name='work_mode'][value='${workMode}']`).checked = true;
}

function getFloatingObject(inGameX, inGameY) {
  for (let i = components.length - 1; i >= 0; i--) {
    let object = components[i];
    if (object.x <= inGameX && inGameX <= object.x + object.size
      && object.y <= inGameY && inGameY <= object.y + object.size) {
      return object;
    }
  }
}

let floatingObject = null;
let startingCameraX, startingCameraY;  // camera position when mouse down in camera world
let mouseAnchorX, mouseAnchorY;  // mouse position when mouse down in screen world
let selectedObjects = [];
let selectedObjectPositions = [];
function tickArrangeMode() {
  let inGameX = camera.getBoardX(mouseX), inGameY = camera.getBoardY(mouseY);
  if (isMouseDown(0)) {
    floatingObject = getFloatingObject(inGameX, inGameY);

    if (floatingObject !== null && floatingObject !== undefined) {
      // if the floatingObject is not in selectedObjects,
      // remove all the other selectedObjects from list and add the floatingObject to list
      if (selectedObjects.indexOf(floatingObject) === -1) {
        selectedObjects.forEach(object => {
          object.selected = false;
        });
        selectedObjects.length = 0;

        selectedObjects.push(floatingObject);
        floatingObject.selected = true;
      }

      selectedObjectPositions.length = 0;
      selectedObjects.forEach(object => {
        selectedObjectPositions[object.id] = [object.x, object.y];
      });
    }

    // record the camera position at the mousedown
    startingCameraX = camera.x;
    startingCameraY = camera.y;
    if (floatingObject) {
      // get the floatingObject at the front glancing position
      if (floatingObject) {
        components.splice(components.indexOf(floatingObject), 1);
        components.push(floatingObject);
      }
    } else {
      // get the mouse anchor position in screen world
      mouseAnchorX = inGameX;
      mouseAnchorY = inGameY;
    }
  } else if (isMouseUp(0)) {
    selectingBox.width = 0;
    selectingBox.height = 0;

    if (floatingObject) {
      let x, y;
      selectedObjects.forEach(object => {
        x = Math.round(object.x);
        y = Math.round(object.y);
        object.setPos(x, y);
      });
    }
  }

  if (isClicked(0)) {
    if (floatingObject) {
      let cameraClickedX = camera.getBoardX(mouseClickedX), cameraClickedY = camera.getBoardY(mouseClickedY);
      selectedObjects.forEach(object => {
        object.setPos(
          Math.round(selectedObjectPositions[object.id][0] + inGameX - cameraClickedX - startingCameraX + camera.x),
          Math.round(selectedObjectPositions[object.id][1] + inGameY - cameraClickedY - startingCameraY + camera.y)
        );
      });
    } else {
      selectingBox.x = Math.min(camera.getScreenX(mouseAnchorX), mouseX);
      selectingBox.y = Math.min(camera.getScreenY(mouseAnchorY), mouseY);

      selectingBox.width = Math.abs(camera.getScreenX(mouseAnchorX) - mouseX);
      selectingBox.height = Math.abs(camera.getScreenY(mouseAnchorY) - mouseY);

      let selectingBoxCameraX = camera.getBoardX(selectingBox.x);
      let selectingBoxCameraY = camera.getBoardY(selectingBox.y);
      let selectingBoxCameraWidth = selectingBox.width / camera.zoom;
      let selectingBoxCameraHeight = selectingBox.height / camera.zoom;

      selectedObjects.length = 0;
      components.forEach(component => {
        component.selected = rectangleCollision(
          component.x, component.y, component.size, component.size,
          selectingBoxCameraX, selectingBoxCameraY, selectingBoxCameraWidth, selectingBoxCameraHeight);
        if (component.selected) {
          selectedObjects.push(component);
        }
      });

      selectingBox.tick();
    }
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

  components.forEach(object => {
    object.inSockets.forEach(updateClosest);
    object.outSockets.forEach(updateClosest);
  });

  return closestSocket;
}

let highlightedSocket = null;
let startSocket = null;
function tickWireMode() {
  // if mouseUp
  if (startSocket !== null && highlightedSocket !== null && isMouseUp(0) && startSocket !== highlightedSocket) {
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
      wires.forEach(object => {
        if (object.isSameWith(wire)) {
          wires.splice(wires.indexOf(object), 1);
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
          wires.forEach(object => {
            if (object.toSocket === wire.toSocket) {
              wires.splice(wires.indexOf(object), 1);
            }
          });
        }

        // noinspection JSCheckFunctionSignatures
        wires.push(wire);
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

let wireHighlight = new CameraCircle(NaN, NaN, 0.5, "lime", camera);
function tickWireArrangeMode() {
  let boardX = camera.getBoardX(mouseX), boardY = camera.getBoardY(mouseY);

  let closestWire = null, closestDistance = Infinity;
  for (let i = 0; i < wires.length; i++) {
    let wire = wires[i];
    let distance = getDistanceToSegment(
      boardX, boardY, wire.fromSocket.x, wire.fromSocket.y, wire.toSocket.x, wire.toSocket.y);
    if (distance < closestDistance) {
      closestDistance = distance;
      closestWire = wire;
    }
  }

  if (wires.length > 0) {
    let [closestWireX, closestWireY] = getClosestPointToSegment(
      boardX, boardY,
      closestWire.fromSocket.x, closestWire.fromSocket.y,
      closestWire.toSocket.x, closestWire.toSocket.y
    );
    wireHighlight.setPos(closestWireX, closestWireY);
  }
}

function tickDragMode() {
  if (isMouseDown(0)) {
    mouseAnchorX = mouseX;
    mouseAnchorY = mouseY;
  }

  if (isClicked(0)) {
    camera.targetX -= (mouseX - mouseAnchorX) / camera.zoom;
    camera.targetY -= (mouseY - mouseAnchorY) / camera.zoom;
    mouseAnchorX = mouseX;
    mouseAnchorY = mouseY;
  }
}

function tickZoomMode() {
  if (isMouseDown(0)) {
    mouseAnchorX = mouseX;
    mouseAnchorY = mouseY;
  }

  if (isClicked(0)) {
    let dx = mouseX - mouseAnchorX;
    let dy = mouseY - mouseAnchorY;

    camera.targetZoom *= Math.exp((dx + dy) / 500);

    mouseAnchorX = mouseX;
    mouseAnchorY = mouseY;
  }
}

let unabstractionBorder = new CameraRectangleWithLine(0, 0, 0, 0, "#00f2", "#00f", 1, camera)
function tickUnabstractionMode() {
  let inGameX = camera.getBoardX(mouseX), inGameY = camera.getBoardY(mouseY);
  let floatingComponent = getFloatingObject(inGameX, inGameY);
  if (floatingComponent && floatingComponent instanceof IntegratedComponent) {
    let [x1, y1, x2, y2] = getComponentsBorder(floatingComponent.components);
    unabstractionBorder.realWidth = x2 - x1;
    unabstractionBorder.realHeight = y2 - y1;
    unabstractionBorder.realX = Math.round(floatingComponent.x - center(x2 - x1, floatingComponent.size));
    unabstractionBorder.realY = Math.round(floatingComponent.y - center(y2 - y1, floatingComponent.size));
    unabstractionBorder.tick();

    if (isMouseDown(0)) {
      components.splice(components.indexOf(floatingComponent), 1);

      let deltaX = 0, deltaY = 0;
      floatingComponent.components.forEach(component => {
        components.push(component);

        deltaX += component.x;
        deltaY += component.y;
      });
      wires.push(...floatingComponent.wires);

      deltaX = floatingComponent.x - Math.round(deltaX / floatingComponent.components.length);
      deltaY = floatingComponent.y - Math.round(deltaY / floatingComponent.components.length);

      floatingComponent.components.forEach(component => {
        component.x += deltaX;
        component.y += deltaY;
        component.reposition();
      });
    }
  } else {
    unabstractionBorder.width = 0;
    unabstractionBorder.height = 0;
  }
}

let interactiveIndicator = new CameraRectangleWithLine(0, 0, 0, 0, '#ff02', '#ff0a', 1, camera);
function tickInteractionMode() {
  let closestInteraction;
  let closestDistance = Infinity;

  let inGameX = camera.getBoardX(mouseX), inGameY = camera.getBoardY(mouseY);
  components.forEach(component => {
    if (component instanceof SwitchComponent || component instanceof PushbuttonComponent) {
      let distanceSquared = Math.pow(component.x + component.size / 2 - inGameX, 2)
        + Math.pow(component.y + component.size / 2 - inGameY, 2);
      if (distanceSquared < closestDistance) {
        closestDistance = distanceSquared;
        closestInteraction = component;
      }
    }
  });

  if (closestInteraction) {
    interactiveIndicator.realX = closestInteraction.x;
    interactiveIndicator.realY = closestInteraction.y;
    interactiveIndicator.realWidth = closestInteraction.size;
    interactiveIndicator.realHeight = closestInteraction.size;

    if (
      closestInteraction.x < inGameX && inGameX < closestInteraction.x + closestInteraction.size
      && closestInteraction.y < inGameY && inGameY < closestInteraction.y + closestInteraction.size
    ) {
      if (isMouseDown(0)) {
        if (closestInteraction instanceof PushbuttonComponent) {
          closestInteraction.outSockets[0].changeState(true);
        }
      } else if (isMouseUp(0)) {
        if (closestInteraction instanceof SwitchComponent) {
          closestInteraction.outSockets[0].changeState(!closestInteraction.outSockets[0].on);
        } else {
          closestInteraction.outSockets[0].changeState(false);
        }
      }
    }
  } else {
    interactiveIndicator.realWidth = interactiveIndicator.realHeight = 0;
  }

  interactiveIndicator.tick();
}

let lastWorkMode = null;
let clonedStrings = [];
let firstTickCloneMode = false, clonedStringNotResetting = false;
let x1, x2, y1, y2, width, height;
let wireConnections = [];
let preconfiguredStructure = null;
function tickCloneMode() {
  if (firstTickCloneMode && !clonedStringNotResetting) {
    clonedStrings = [];
    firstTickCloneMode = false;
  }
  if (clonedStringNotResetting) {
    clonedStringNotResetting = false;
    firstTickCloneMode = false;
    [x1, y1, x2, y2] = getComponentsBorder(selectedObjects);
    width = x2 - x1;
    height = y2 - y1;
  }

  if (clonedStrings.length === 0) {
    if (selectedObjects.length > 0) {
      selectedObjects.forEach(component => {
        clonedStrings.push(component.flatten());
      });

      wireConnections = [];
      getIntersectWires(wires, selectedObjects).forEach(wire => {
        let fromSocketPath, toSocketPath, index, component;
        for (let i = 0; i < selectedObjects.length; i++) {
          component = selectedObjects[i];

          index = component.outSockets.indexOf(wire.fromSocket);
          if (index !== -1) fromSocketPath = [i, index];

          index = component.inSockets.indexOf(wire.toSocket);
          if (index !== -1) toSocketPath = [i, index];
        }
        wireConnections.push([fromSocketPath, toSocketPath]);
      });

      [x1, y1, x2, y2] = getComponentsBorder(selectedObjects);
      width = x2 - x1;
      height = y2 - y1;
    } else {
      setWorkMode(lastWorkMode);
    }
  } else {
    if (isMouseDown(0)) {
      let inGameX = Math.round(camera.getBoardX(mouseX)), inGameY = Math.round(camera.getBoardY(mouseY));
      let halfWidth = Math.round(width / 2), halfHeight = Math.round(height / 2);
      let clonedComponents = [];
      clonedStrings.forEach(strings => {
        let component = structify(strings, camera);
        component.x = component.x - x1 - halfWidth + inGameX;
        component.y = component.y - y1 - halfHeight + inGameY;
        component.reposition();
        component.calculate();
        clonedComponents.push(component);
        components.push(component);

        wireUpdates.forEach(wire => {
          wire.calculate()
        });
      });

      wireConnections.forEach(connection => {
        let wire = new Wire(
          clonedComponents[connection[0][0]].outSockets[connection[0][1]],
          clonedComponents[connection[1][0]].inSockets[connection[1][1]],
          camera
        );
        wires.push(wire);
        if (wire.toSocket.on !== wire.on) {
          wire.calculate();
        }
      });
    }
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
    tickWireArrangeMode();
  } else if (workMode === WM_DRAG) {
    tickDragMode();
  } else if (workMode === WM_ZOOM) {
    tickZoomMode();
  } else if (workMode === WM_UNABSTRACTION) {
    tickUnabstractionMode();
  } else if (workMode === WM_INTERACTION) {
    tickInteractionMode();
  } else if (workMode === WM_CLONE) {
    tickCloneMode();
  }

  if (isPressed('v')) {
    setWorkMode(WM_ARRANGE);
  } else if (isPressed('e')) {
    setWorkMode(WM_WIRE);
  } else if (isPressed('q')) {
    setWorkMode(WM_WIRE_ARRANGE);
  } else if (isPressed('h')) {
    setWorkMode(WM_DRAG);
  } else if (isPressed('z')) {
    setWorkMode(WM_ZOOM);
  } else if (isPressed('l')) {
    setWorkMode(WM_UNABSTRACTION);
  } else if (isPressed("i")) {
    setWorkMode(WM_INTERACTION);
  } else if (isPressed("f")) {
    setWorkMode(WM_CLONE);
  }
}

function getClosestComponent(x, y) {
  let closestDistance = Infinity;
  let closestComponent = null;
  function updateClosest(component) {
    let dx = component.x + component.size / 2 - x;
    let dy = component.y + component.size / 2 - y;
    let distance = Math.sqrt(Math.pow(dx, 2) + Math.pow(dy, 2));
    if (distance <= closestDistance) {
      closestDistance = distance;
      closestComponent = component;
    }
  }
  components.forEach(object => {
    updateClosest(object);
  });
  return closestComponent;
}

function tickComponentRotation() {
  if (isDown('r')) {
    if (selectedObjects.length === 0) {
      let component = getClosestComponent(camera.getBoardX(mouseX), camera.getBoardY(mouseY));
      if (component !== null) {
        component.rotateOnce();
      }
    } else {
      selectedObjects.forEach(object => {
        object.rotateOnce();
      });
    }
  }
}

function getXYBySize(size) {
  return [
    Math.round(camera.getBoardX(mouseX) - size/2),
    Math.round(camera.getBoardY(mouseY) - size/2)
  ];
}
/*
 * ticks the deletion and creation of components
 * like backspace to delete and o to OrComponent etc
 */
function tickComponentMakeDelete() {
  if (mouseX >= 0) {
    if (isDown('Delete')) {
      if (selectedObjects.length === 0) {
        let component = getClosestComponent(camera.getBoardX(mouseX), camera.getBoardY(mouseY));
        if (component !== null) {
          component.delete();
        }
      } else {
        selectedObjects.forEach(object => {
          object.delete();
        });
        selectedObjects.length = 0;
      }
    } else if (isDown('o')) {
      let [x, y] = getXYBySize(getComponentSizeBySocketCount(2));
      components.push(new OrComponent(x, y, camera));
    } else if (isDown('t')) {
      let [x, y] = getXYBySize(getComponentSizeBySocketCount(1));
      components.push(new NotComponent(x, y, camera));
    } else if (isDown('1')) {
      let [x, y] = getXYBySize(getComponentSizeBySocketCount(1));
      components.push(new TrueComponent(x, y, camera));
    } else if (isDown('y')) {
      let [x, y] = getXYBySize(getComponentSizeBySocketCount(1));
      components.push(new SwitchComponent(x, y, camera));
    } else if (isDown('b')) {
      let [x, y] = getXYBySize(getComponentSizeBySocketCount(1));
      components.push(new PushbuttonComponent(x, y, camera));
    }
  }
}

function tickSpaceDrag() {
  if (isDown(" ")) {
    lastWorkMode = getWorkMode();
    setWorkMode(WM_DRAG);
  } else if (isUp(" ")) {
    setWorkMode(lastWorkMode);
  }
  if (isDown('/')) {
    let [x1, y1, x2, y2] = getComponentsBorder(components);
    if (x1 !== Infinity) {
      camera.targetX = (x2 + x1) / 2;
      camera.targetY = (y2 + y1) / 2;
      camera.targetZoom = 0.75 * Math.min(canvas.width / (x2 - x1), canvas.height / (y2 - y1));
    } else {
      camera.targetX = 0;
      camera.targetY = 0;
      camera.targetZoom = 20;
    }
  }
}

const infoCameraX = document.querySelector("#info-camera-x");
const infoCameraY = document.querySelector("#info-camera-y");
const infoCameraZoom = document.querySelector("#info-camera-zoom");
const infoCalculationQueueLength = document.querySelector("#info-calculation-queue-length");
const infoCpf = document.querySelector("#info-cpf");
const infoCcc = document.querySelector("#info-ccc");
const infoSatisfactionRate = document.querySelector("#info-satisfaction-rate");
const infoComponents = document.querySelector("#info-components");
const infoWires = document.querySelector("#info-wires");
const infoSelectedComponents = document.querySelector("#info-selected-components");
function tickInfoTable() {
  infoCameraX.innerText = Math.round(camera.x * 1000) / 1000;
  infoCameraY.innerText = Math.round(camera.y * 1000) / 1000;
  infoCameraZoom.innerText = Math.round(camera.zoom * 1000) / 1000;
  infoCalculationQueueLength.innerText = componentCalculationQueue.length;
  infoCpf.innerText = cpf;
  infoCcc.innerText = ccList.length;
  infoSatisfactionRate.innerText = cpf === 0 ? 1 : Math.round(cpf / ccList.length * 1000) / 1000;
  infoComponents.innerText = components.length;
  infoWires.innerText = wires.length;
  infoSelectedComponents.innerText = selectedObjects.length;
}

function makeBlueprintString(integratedComponent, signal) {
  return ["integrated_blueprint", [integratedComponent.x, integratedComponent.y], signal, integratedComponent.integrationId];
}

const abstractComponentList = document.querySelector(".abstract-component");
function abstract() {
  if (selectedObjects.length > 1) {
    prepareNotificationAbstraction();
    notificationPrompt().then(name => {
      if (!name) return;

      let abstractionComponents = [...selectedObjects];
      let abstractionWires = getIntersectWires(wires, abstractionComponents);

      let avgX = 0, avgY = 0;

      abstractionComponents.forEach(component => {
        components.splice(components.indexOf(component), 1)
        avgX += component.x;
        avgY += component.y;
      });
      avgX = Math.round(avgX / abstractionComponents.length);
      avgY = Math.round(avgY / abstractionComponents.length);

      abstractionWires.forEach(wire => wires.splice(wires.indexOf(wire), 1));
      // remove selected wires from the tab

      let [inSockets, outSockets] = getInOutSockets(abstractionComponents, abstractionWires);
      let integratedComponent = new IntegratedComponent(
        avgX, avgY, name, camera, inSockets, outSockets, abstractionComponents, abstractionWires);
      components.push(integratedComponent);

      let notificationCheckbox1 = document.querySelector("#notification-checkbox-1");

      if (!notificationCheckbox1.checked) return;

      let tr = document.createElement("tr");

      let td;

      td = document.createElement("td");
      td.innerHTML = `<p>${name}</p>`;
      tr.appendChild(td)

      let button;

      button = document.createElement("button");
      let signal = integratedComponent.getSignal();
      button.onclick = () => {
        selectedObjects = [integratedComponent];
        wireConnections = [];
        clonedStrings = [makeBlueprintString(integratedComponent, signal)];
        clonedStringNotResetting = true;
        preconfiguredStructure = integratedComponent.flatten();
        setWorkMode(WM_CLONE);
      }
      button.innerText = "사용하기";

      td = document.createElement("td");
      td.appendChild(button);
      tr.appendChild(td);
      button = document.createElement("button");
      button.onclick = () => {
        prepareNotificationAbstractDelete(name);
        notificationPrompt().then(answer => {
          if (answer === name) {
            abstractComponentList.removeChild(tr);
          }
        });
      }
      button.innerText = "삭제하기";

      td = document.createElement("td");
      td.appendChild(button);
      tr.appendChild(td);

      abstractComponentList.appendChild(tr);
    });
  }
}

function tickAbstraction() {
  if (isDown('c')) {
    abstract();
  }
}

let cpf = 0;  // calculations per frame
let ccList = [];  // calculation components count
let cccDelta = 0;
function tickCalculateComponents() {
  cpf = 0;
  if (cccDelta > FPS * 5) {
    ccList.length = 0;
    cccDelta -= FPS * 5;
  }
  for (let i = 0; i < calculationLimit && componentCalculationQueue.length > 0; i++) {
    let component = componentCalculationQueue.shift();
    if (component) {
      component.calculate();
      if (ccList.indexOf(component.id) === -1) {
        ccList.push(component.id);
      }
    }
    cpf++;
  }
  cccDelta++;

  // minimal and maximal satisfaction
  let idealMinimalCalculationLimit = ccList.length * minimalSatisfaction;
  if (calculationLimit < idealMinimalCalculationLimit) {
    calculationLimit = idealMinimalCalculationLimit;
    calculationLimitInput.value = calculationLimit;
  }
  if (ccList.length > 0) {
    let idealMaximalCalculationLimit = ccList.length * maximalSatisfaction;
    if (calculationLimit > idealMaximalCalculationLimit) {
      calculationLimit = idealMaximalCalculationLimit;
      calculationLimitInput.value = calculationLimit;
    }
  }
}

// game logic
function tick() {
  tickCalculateComponents();

  if (!notificationOpen) {
    camera.tick();

    tickWorkMode();
    tickSpaceDrag();
    tickComponentRotation();
    tickComponentMakeDelete();
    tickInfoTable();
    tickAbstraction();

    // camera world screen left, right, top and bottom for optimizing component and wire render
    cameraLeft = camera.getBoardX(0);
    cameraRight = camera.getBoardX(canvas.width);
    cameraTop = camera.getBoardY(0);
    cameraBottom = camera.getBoardY(canvas.height);
  }

  components.forEach(object => object.tick());
  wires.forEach(wires => wires.tick());

  tickInput();
}

function render() {
  ctx.fillStyle = BACKGROUND_COLOR;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  grid.render();

  centerIndicator.render();
  components.forEach(component => component.render());
  wires.forEach(wire => wire.render());

  if (selectingBox.width !== 0 && selectingBox.height !== 0) {
    selectingBox.render();
  }

  let workMode = getWorkMode()
  if (workMode === WM_WIRE_ARRANGE) {
    wireHighlight.render();
  } else if (workMode === WM_UNABSTRACTION) {
    if (unabstractionBorder.width > 0) {
      unabstractionBorder.render();
    }
  } else if (workMode === WM_INTERACTION) {
    if (interactiveIndicator.width > 0) {
      interactiveIndicator.render();
    }
  }
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

const calculationLimitInput = document.querySelector("#calculation-limit");
calculationLimitInput.addEventListener("change", (event) => {
  calculationLimit = event.target.value;
});
calculationLimitInput.value = calculationLimit;

const frictionInterpolationRange = document.querySelector("#friction-interpolation");
frictionInterpolationRange.addEventListener("change", (event) => {
  Camera.movingInterpolation = event.target.value / 100;
});
frictionInterpolationRange.value = Camera.movingInterpolation * 100;

const minimalSatisfactionInput = document.querySelector("#minimal-satisfaction");
minimalSatisfactionInput.addEventListener("change", (event) => {
  minimalSatisfaction = event.target.value;
});
minimalSatisfactionInput.value = minimalSatisfaction;

const maximalSatisfactionInput = document.querySelector("#maximal-satisfaction");
maximalSatisfactionInput.addEventListener("change", event => {
  maximalSatisfaction = event.target.value;
})
maximalSatisfactionInput.value = maximalSatisfaction

// main loop
window.addEventListener("load", () => {
  init();
  setInterval(() => {
    tick();
    render();
  }, 1000 / FPS);
});
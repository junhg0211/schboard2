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

let floatingObject = null;
let startingCameraX, startingCameraY;  // camera position when mouse down in camera world
let mouseAnchorX, mouseAnchorY;  // mouse position when mouse down in screen world
let selectedObjects = [];
let selectedObjectPositions = [];
let shiftSelecting = false;  // whether the selecting session is envoked with shift key
let selectedUpdates = [];  // list of components which are updated in shift-selecting mode
function tickArrangeMode() {
  let inGameX = camera.getBoardX(mouseX), inGameY = camera.getBoardY(mouseY);
  if (isMouseDown(0)) {
    shiftSelecting = isPressed('Shift');

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
        x = Math.round(object.targetX);
        y = Math.round(object.targetY);
        object.setPos(x, y);
      });
    }

    selectedUpdates.length = 0;
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

      function checkSelectingBox(component) {
        return rectangleCollision(
              component.x, component.y, component.size, component.size,
              selectingBoxCameraX, selectingBoxCameraY, selectingBoxCameraWidth, selectingBoxCameraHeight);
      }

      selectedObjects.length = 0;
      components.forEach(component => {
        if (shiftSelecting) {
          // check if rectangle is in the selecting box
          if (checkSelectingBox(component) && selectedUpdates.indexOf(component) === -1) {
            component.selected = !component.selected;
            selectedUpdates.push(component);
          }
        } else {
          component.selected = checkSelectingBox(component);
        }
        if (component.selected) selectedObjects.push(component);
      });

      if (shiftSelecting) {
        selectedUpdates.forEach(component => {
          if (!checkSelectingBox(component)) {
            selectedUpdates.splice(selectedUpdates.indexOf(component), 1);
            component.selected = !component.selected;
          }
        });
      }

      selectingBox.tick();
    }
  }
}

function needSwap() {
  return highlightedSockets[0].role === Socket.INPUT && highlightedSockets[1].role === Socket.OUTPUT;
}

function packetProcess() {
  highlightedSockets.length = 2;
  let outSocket = highlightedSockets[0];
  let inSocket = highlightedSockets[1];
  if (needSwap()) {
    let tmp = outSocket;
    outSocket = inSocket;
    inSocket = tmp;
  }

  if (inSocket.role !== Socket.INPUT) return;

  let outSockets = getConnectedComponent(outSocket, components, true).outSockets,
      outSocketIndex = outSockets.indexOf(outSocket);
  let inSockets = getConnectedComponent(inSocket, components, true).inSockets,
      inSocketIndex = inSockets.indexOf(inSocket);
  let maxI = Math.min(wirePacket, outSockets.length - outSocketIndex, inSockets.length - inSocketIndex);

  return [outSockets, outSocketIndex, inSockets, inSocketIndex, maxI];
}

function packetConnect() {
  let [outSockets, outSocketIndex, inSockets, inSocketIndex, maxI] = packetProcess();
  for (let i = 0; i < maxI; i++) {
    connectWire(outSockets[outSocketIndex + i], inSockets[inSocketIndex + i], camera);
  }
}

function packetHighlight() {
  let packetProcessed = packetProcess();

  if (packetProcessed === undefined) return;

  let [outSockets, outSocketIndex, inSockets, inSocketIndex, maxI] = packetProcessed;
  for (let i = 0; i < maxI; i++) {
    highlightedSockets.push(outSockets[outSocketIndex + i]);
    highlightedSockets.push(inSockets[inSocketIndex + i]);
  }
}

let wirePacket = 1;  // count of wires that will made by a single connection. default 1
let highlightedSockets = [null, null];
function tickWireMode() {
  // if mouseUp, connection
  if (highlightedSockets[0] !== null && highlightedSockets[1] !== null
      && isMouseUp(0) && highlightedSockets[0] !== highlightedSockets[1]) {
    // swap INPUT -> OUTPUT to OUTPUT -> INPUT
    if (needSwap()) {
      [highlightedSockets[0], highlightedSockets[1]] = [highlightedSockets[1], highlightedSockets[0]];
    }

    if (highlightedSockets[0].role === Socket.OUTPUT && highlightedSockets[1].role === Socket.INPUT) {
      packetConnect();
    }
  }

  // click socket highlighting
  if (isClicked(0)) {
    highlightedSockets[1] = getClosestSocket(camera.getBoardX(mouseX), camera.getBoardY(mouseY));
    if (isMouseDown(0)) {
      highlightedSockets[0] = highlightedSockets[1];
      wirePacket = 1;
    }

    packetHighlight();
  } else if (isMouseUp(0)) {
    highlightedSockets = [null, null];
  }

  if (isDown('S')) {
    wirePacket++;
  } else if (isDown('W')) {
    wirePacket = Math.max(wirePacket - 1, 1);
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

        deltaX += component.targetX;
        deltaY += component.targetY;
      });
      wires.push(...floatingComponent.wires);

      deltaX = floatingComponent.targetX - Math.round(deltaX / floatingComponent.components.length);
      deltaY = floatingComponent.targetY - Math.round(deltaY / floatingComponent.components.length);

      floatingComponent.components.forEach(component => {
        component.x = floatingComponent.x + floatingComponent.size / 2;
        component.y = floatingComponent.y + floatingComponent.size / 2;
        component.targetX += deltaX;
        component.targetY += deltaY;
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
let preconfiguredStructures = null;
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
        component.setPos(component.targetX - x1 - halfWidth + inGameX, component.targetY - y1 - halfHeight + inGameY);
        component.x = component.targetX;
        component.y = component.targetY;
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
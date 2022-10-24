/*
 * `index.js` is for the main game loop and event handlers.
 */

// settings
let calculationLimit = 2;
let nextGameObjectId = 0;
let nextIntegrationId = 0;
let lastDirection = 0;
let minimalSatisfaction = 1, maximalSatisfaction = 2;
let maximalCallim = 1000;

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

/*
 * ticks the deletion and creation of components
 * like backspace to delete and o to OrComponent etc
 */
function tickComponentMakeDelete() {
  if (mouseX >= 0) {
    if (isDown('Delete') || isDown('Backspace')) {
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
    } else if (isDown('p')) {
      let [x, y] = getXYBySize(getComponentSizeBySocketCount(1));
      components.push(new LEDComponent(x, y, camera));
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

function appendIntegratedComponentOnList(name, integratedComponent, flattenedComponent, signal) {
  let tr = document.createElement("tr");

  let td;

  td = document.createElement("td");
  td.innerHTML = `<p>${name}</p>`;
  tr.appendChild(td)

  let button;

  button = document.createElement("button");
  button.onclick = () => {
    selectedObjects = [integratedComponent];
    wireConnections = [];
    clonedStrings = [makeBlueprintString(integratedComponent, signal)];
    clonedStringNotResetting = true;
    if (flattenedComponent[0] instanceof Array)
      preconfiguredStructures = [...flattenedComponent];
    else
      preconfiguredStructures = [flattenedComponent];
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
        avgX, avgY, name, camera, inSockets, outSockets, lastDirection, abstractionComponents, abstractionWires);
      components.push(integratedComponent);

      let notificationCheckbox1 = document.querySelector("#notification-checkbox-1");

      if (!notificationCheckbox1.checked) return;

      appendIntegratedComponentOnList(name, integratedComponent, integratedComponent.flatten(), integratedComponent.getSignal());
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
let forceCalculationQueue = [];
function tickCalculateComponents() {
  cpf = 0;
  if (cccDelta > FPS * 5) {
    ccList.length = 0;
    cccDelta -= FPS * 5;
  }
  for (let i = 0; i < calculationLimit && componentCalculationQueue.length > 0; i++) {
    let component = componentCalculationQueue.shift(0);
    if (component) {
      let forceIndex = forceCalculationQueue.indexOf(component);
      let forceCalculate = forceIndex !== -1;
      component.calculate(forceCalculate);
      if (forceCalculate) {
        forceCalculationQueue.splice(forceIndex, 1);
      }
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
  if (calculationLimit > maximalCallim) {
    calculationLimit = maximalCallim;
    calculationLimitInput.value = maximalCallim;
  }
}

let hideMode = false;
function tickHide() {
  if (isDown('g')) {
    hideMode = !hideMode;
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
    tickHide();

    // camera world screen left, right, top and bottom for optimizing component.js and wire render
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

const maximalCallimInput = document.querySelector("#maximal-callim");
maximalCallimInput.addEventListener("change", event => {
  maximalCallim = event.target.value;
})
maximalCallimInput.value = maximalCallim;

// main loop
window.addEventListener("load", () => {
  init();
  setInterval(() => {
    tick();
    render();
  }, 1000 / FPS);
});
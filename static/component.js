/*
 * Socket attached to `Components`.
 * `Wire` will be connected to the sockets, and communicate with other `Components`.
 */
class Socket {
  static ON_COLOR = [255, 0, 0];
  static OFF_COLOR = [0, 0, 0];
  static RADIUS = 0.3;
  static OUTPUT = 'output';
  static INPUT = 'input';

  constructor(role, camera) {
    this.x = 0;
    this.y = 0;
    this.camera = camera;
    this.role = role;

    // noinspection JSUnusedGlobalSymbols
    this.available = true;
    this.on = false;

    this.surface = new CameraCircle(this.x, this.y, Socket.RADIUS, Socket.OFF_COLOR, this.camera);

    this.tickCount = 0;
    this.onCount = 0;

    this.changeStateEvents = [];
  }

  setPos(x, y) {
    this.setX(x);
    this.setY(y);
  }

  setX(x) {
    this.x = x;
    this.surface.realX = x;
  }

  setY(y) {
    this.y = y;
    this.surface.realY = y;
  }

  setHighlight(highlight) {
    this.surface.realRadius = highlight ? Socket.RADIUS * 2 : Socket.RADIUS;
  }

  tick() {
    this.setHighlight(this === highlightedSocket || this === startSocket);
    this.surface.tick();

    this.tickCount++;
    if (this.on) this.onCount++;
  }

  render() {
    let cameraRadius = Socket.RADIUS * this.camera.zoom;
    if (
      this.x - cameraRadius > cameraRight
      || this.x + cameraRadius < cameraLeft
      || this.y  - cameraRadius > cameraBottom
      || this.y + cameraRadius < cameraTop
    ) return;

    let r = Math.round(lerp(Socket.OFF_COLOR[0], Socket.ON_COLOR[0], this.onCount / this.tickCount))
      .toString(16).padStart(2, '0');
    let g = Math.round(lerp(Socket.OFF_COLOR[1], Socket.ON_COLOR[1], this.onCount / this.tickCount))
      .toString(16).padStart(2, '0');
    let b = Math.round(lerp(Socket.OFF_COLOR[2], Socket.ON_COLOR[2], this.onCount / this.tickCount))
      .toString(16).padStart(2, '0');
    this.surface.color = `#${r}${g}${b}`;

    this.surface.render();

    this.tickCount = 0;
    this.onCount = 0;
  }

  changeState(state, forceCalculate) {
    if (state === this.on && !forceCalculate) return;

    this.on = state;
    this.surface.color = state ? Socket.ON_COLOR : Socket.OFF_COLOR;

    if (this.role === Socket.OUTPUT) {
      getConnectedWires(this).forEach(wire => wire.calculate());
    } else {
      let connectedComponent = getConnectedComponent(this);
      componentCalculationQueue.push(connectedComponent);
    }

    this.changeStateEvents.forEach(event => event(this.on));

    this.tickCount++;
    if (this.on) this.onCount++;
  }
}

const DIRECTION_UP = 0;
const DIRECTION_RIGHT = 1;
const DIRECTION_DOWN = 2;
const DIRECTION_LEFT = 3;

function getComponentSizeBySocketCount(count) {
  return count + 2 * Component.SIDE_PADDING;
}

/*
 * Basic `Component` object.
 *
 * `Component`s are units of a logic in the circuit.
 * They can be connected to other `Component`s to form a circuit.
 */
class Component {
  static SIDE_PADDING = 2;
  static PADDING = 1;
  static BACKGROUND_COLOR = 'white';
  static BORDER_COLOR = 'black';
  static SELECTED_BORDER_COLOR = 'red';
  static DIRECTION_INDICATOR_COLOR = 'darkgrey';
  static TEXT_COLOR = 'black';

  constructor(x, y, name, camera, inSockets, outSockets, direction) {
    this.x = x;
    this.y = y;
    this.name = name;
    this.camera = camera;

    this.targetX = x;
    this.targetY = y;

    this.inSockets = inSockets;
    this.outSockets = outSockets;

    this.direction = direction === undefined ? lastDirection : direction;
    this.size = Component.SIDE_PADDING * 2;

    this.id = nextGameObjectId++;
    this.surfaces = [];
    this.texts = [];

    this.selected = false;
    this.delay = 1;
  }

  setPos(x, y) {
    this.targetX = x;
    this.targetY = y;
  }

  rotateOnce() {
    this.direction = (this.direction + 1) % 4;
    lastDirection = this.direction;
    this.reposition();
  }

  replaceSockets() {
    for (let i = 0; i < this.inSockets.length; i++) {
      let socket = this.inSockets[i];
      if (this.direction === DIRECTION_UP) {
        socket.setPos(
          this.x + Component.SIDE_PADDING + i,
          this.y + this.size - Component.PADDING
        );
      } else if (this.direction === DIRECTION_LEFT) {
        socket.setPos(
          this.x + this.size - Component.PADDING,
          this.y + Component.SIDE_PADDING + i
        );
      } else if (this.direction === DIRECTION_DOWN) {
        socket.setPos(
          this.x + Component.SIDE_PADDING + i,
          this.y + Component.PADDING
        );
      } else if (this.direction === DIRECTION_RIGHT) {
        socket.setPos(
          this.x + Component.PADDING,
          this.y + Component.SIDE_PADDING + i
        );
      }
    }

    for (let i = 0; i < this.outSockets.length; i++) {
      let socket = this.outSockets[i];
      if (this.direction === DIRECTION_UP) {
        socket.setPos(
          this.x + Component.SIDE_PADDING + i,
          this.y + Component.PADDING
        );
      } else if (this.direction === DIRECTION_LEFT) {
        socket.setPos(
          this.x + Component.PADDING,
          this.y + Component.SIDE_PADDING + i
        );
      } else if (this.direction === DIRECTION_DOWN) {
        socket.setPos(
          this.x + Component.SIDE_PADDING + i,
          this.y + this.size - Component.PADDING
        );
      } else if (this.direction === DIRECTION_RIGHT) {
        socket.setPos(
          this.x + this.size - Component.PADDING,
          this.y + Component.SIDE_PADDING + i
        );
      }
    }
  }

  reposition() {
    // calculate size according to the count of the sockets
    this.size = getComponentSizeBySocketCount(Math.max(this.inSockets.length, this.outSockets.length));

    // these surfaces are used to draw the background of the component
    this.surfaces = [
      new CameraRectangle(this.x, this.y, this.size, this.size, Component.BACKGROUND_COLOR, this.camera),
      new CameraRectangle(this.x, this.y, this.size, this.size, Component.DIRECTION_INDICATOR_COLOR, this.camera),
      new CameraRectangleLine(this.x, this.y, this.size, this.size, Component.BORDER_COLOR, 0.3, this.camera)
    ];
    this.texts = [
      new CameraText(this.x + this.size / 2, this.y + this.size / 2, this.name, Component.TEXT_COLOR, "Pretendard", 1, this.camera),
      new CameraText(this.x + 1, this.y + 1, this.id, Component.TEXT_COLOR, "Pretendard", 1, this.camera, "left", "top"),
      new CameraText(this.x + 1, this.y + this.size - 1, this.delay, Component.TEXT_COLOR, "Pretendard", 1, this.camera, "left", "bottom"),
    ];

    if (this.direction === DIRECTION_UP) {
      this.surfaces[1].realX = this.x;
      this.surfaces[1].realY = this.y;
      this.surfaces[1].realHeight = Component.PADDING;
    } else if (this.direction === DIRECTION_LEFT) {
      this.surfaces[1].realX = this.x;
      this.surfaces[1].realY = this.y;
      this.surfaces[1].realWidth = Component.PADDING;
    } else if (this.direction === DIRECTION_DOWN) {
      this.surfaces[1].realX = this.x;
      this.surfaces[1].realY = this.y + this.size - Component.PADDING;
      this.surfaces[1].realHeight = Component.PADDING;
    } else if (this.direction === DIRECTION_RIGHT) {
      this.surfaces[1].realX = this.x + this.size - Component.PADDING;
      this.surfaces[1].realY = this.y;
      this.surfaces[1].realWidth = Component.PADDING;
    }

    this.replaceSockets();

    this.surfaces.forEach(surface => surface.tick());
  }

  tick() {
    if (this.x !== this.targetX && this.y !== this.targetY) {
      if (Math.abs(this.x - this.targetX) < 0.1 && Math.abs(this.y - this.targetY) < 0.1) {
        this.x = this.targetX;
        this.y = this.targetY;
      } else {
        this.x = lerp(this.x, this.targetX, Camera.movingInterpolation);
        this.y = lerp(this.y, this.targetY, Camera.movingInterpolation);
        this.reposition();
      }
    }

    this.surfaces.forEach(surface => surface.tick());
    this.inSockets.forEach(socket => socket.tick());
    this.outSockets.forEach(socket => socket.tick());
    this.texts.forEach(surface => surface.tick());

    if (this.selected) {
      this.surfaces[2].color = Component.SELECTED_BORDER_COLOR;
    } else {
      this.surfaces[2].color = Component.BORDER_COLOR;
    }
  }

  isInScreen() {
    let size = this.surfaces[2].width * this.camera.zoom;
    return this.x + this.size + size >= cameraLeft
      && this.x - size <= cameraRight
      && this.y + this.size + size >= cameraTop
      && this.y - size <= cameraBottom;
  }

  render() {
    if (!this.isInScreen()) return;

    this.surfaces.forEach(surface => surface.render());
    this.inSockets.forEach(socket => socket.render());
    this.outSockets.forEach(socket => socket.render());
    this.texts.forEach(surface => surface.render());
  }

  calculate(forceCalculate) {}

  delete() {
    this.inSockets.forEach(socket => getConnectedWires(socket).forEach(wire => wire.delete()));
    this.outSockets.forEach(socket => {
      socket.changeState(false);
      getConnectedWires(socket).forEach(wire => wire.delete());
    });
    components.splice(components.indexOf(this), 1);
  }

  getSignal() {
    return [];
  }

  flatten() {}
}

let componentCalculationQueue = null;

/*
 * `Wire` is a connection between two `Socket`s.
 */
class Wire {
  static ON_COLOR_RGB = [0, 255, 0];
  static OFF_COLOR_RGB = [127, 127, 127];
  static WIDTH = 0.3;

  constructor(fromSocket, toSocket, camera) {
    this.fromSocket = fromSocket;
    this.toSocket = toSocket;
    this.camera = camera;

    this.on = this.fromSocket.on;

    this.surface = new CameraLine(0, 0, 0, 10, Wire.OFF_COLOR_RGB, Wire.WIDTH, this.camera);

    this.tickCount = 0;
    this.onCount = 0;
  }

  setColorByFromSocket() {
    this.surface.color = this.fromSocket.on ? Wire.ON_COLOR_RGB : Wire.OFF_COLOR_RGB;
  }

  isSameWith(another) {
    return this.fromSocket === another.fromSocket && this.toSocket === another.toSocket;
  }

  tick() {
    this.surface.realX = this.fromSocket.x;
    this.surface.realY = this.fromSocket.y;
    this.surface.realX2 = this.toSocket.x;
    this.surface.realY2 = this.toSocket.y;
    this.surface.tick();

    this.tickCount++;
    if (this.on) this.onCount++;
  }

  render() {
    let radius = this.camera.zoom * Wire.WIDTH ;
    let lefterX = this.surface.realX, righterX = this.surface.realX2;
    let higherY = this.surface.realY, lowerY = this.surface.realY2;
    if (lefterX > righterX) [lefterX, righterX] = [righterX, lefterX];
    if (higherY > lowerY) [higherY, lowerY] = [lowerY, higherY]
    if (
      lefterX - radius > cameraRight
      || righterX + radius < cameraLeft
      || higherY + radius < cameraTop
      || lowerY - radius > cameraBottom
    ) return;

    let r = Math.round(lerp(Wire.OFF_COLOR_RGB[0], Wire.ON_COLOR_RGB[0], this.onCount / this.tickCount))
      .toString(16).padStart(2, '0');
    let g = Math.round(lerp(Wire.OFF_COLOR_RGB[1], Wire.ON_COLOR_RGB[1], this.onCount / this.tickCount))
      .toString(16).padStart(2, '0')
    let b = Math.round(lerp(Wire.OFF_COLOR_RGB[2], Wire.ON_COLOR_RGB[2], this.onCount / this.tickCount))
      .toString(16).padStart(2, '0');
    this.surface.color = `#${r}${g}${b}`;
    this.surface.render();

    this.tickCount = 0;
    this.onCount = 0;
  }

  calculate() {
    this.on = this.fromSocket.on;
    this.setColorByFromSocket();

    this.toSocket.changeState(this.on);

    this.tickCount++;
    if (this.on) this.onCount++;
  }

  delete() {
    this.toSocket.changeState(false);
    wires.splice(wires.indexOf(this), 1);
  }
}

function getConnectedWires(socket, componentList, wireList) {
  // return wires
  //     .filter(wire => wire.fromSocket === socket || wire.toSocket === socket);
  if (componentList === undefined) componentList = components;
  if (wireList === undefined) wireList = wires;

  let result = [];

  let wire;
  for (let i = 0; i < wireList.length; i++) {
    wire = wireList[i];
    if (wire.fromSocket === socket || wire.toSocket === socket) {
      result.push(wire);
    }
  }

  let component;
  for (let i = 0; i < componentList.length; i++) {
    component = componentList[i];
    if (component instanceof IntegratedComponent) {
      let wires = getConnectedWires(socket, component.components, component.wires);
      result.push(...wires);
    }
  }

  return result;
}

function getConnectedComponent(socket, componentList, getShallow, recursion) {
  if (recursion === undefined) recursion = 0;
  if (getShallow === undefined) getShallow = false;

  if (componentList === undefined) componentList = components;

  let component;
  for (let i = 0; i < componentList.length; i++) {
    component = componentList[i];
    if (component instanceof IntegratedComponent) {
      let result = getConnectedComponent(socket, component.components, false, recursion+1);
      if (result) {
        return getShallow ? component : result;
      }
    } else {
      if (component.inSockets.includes(socket) || component.outSockets.includes(socket)) {
        return component;
      }
    }
  }
}

class TrueComponent extends Component {
  constructor(x, y, camera, direction) {
    super(x, y, "TRUE", camera, [], [new Socket(Socket.OUTPUT, camera)], direction);

    this.reposition();
    this.calculate();
  }

  calculate(forceCalculate) {
    this.outSockets[0].changeState(true, forceCalculate);
  }

  flatten() {
    return ['true', [this.targetX, this.targetY], this.direction];
  }
}

class NotComponent extends Component {
  constructor(x, y, camera, direction) {
    super(x, y, "NOT", camera, [new Socket(Socket.INPUT, camera)], [new Socket(Socket.OUTPUT, camera)], direction);

    this.reposition();
    this.calculate();
  }

  calculate(forceCalculate) {
    this.outSockets[0].changeState(!this.inSockets[0].on, forceCalculate);
  }

  getSignal() {
    // noinspection JSValidateTypes
    return this.inSockets[0].on ? 1 : 0;
  }

  flatten() {
    return ['not', [this.targetX, this.targetY], this.getSignal(), this.direction];
  }
}

class OrComponent extends Component {
  constructor(x, y, camera, direction) {
    super(
      x, y, "OR", camera,
      [new Socket(Socket.INPUT, camera), new Socket(Socket.INPUT, camera)],
      [new Socket(Socket.OUTPUT, camera)],
      direction
    );

    this.reposition();
    this.calculate();
  }

  calculate(forceCalculate) {
    this.outSockets[0].changeState(this.inSockets[0].on || this.inSockets[1].on, forceCalculate);
  }

  getSignal() {
    return [this.inSockets[0].on ? 1 : 0, this.inSockets[1].on ? 1 : 0];
  }

  flatten() {
    return ['or', [this.targetX, this.targetY], this.getSignal(), this.direction];
  }
}

class IntegratedComponent extends Component {
  static LED_PADDING = 1;

  constructor(x, y, name, camera, inSockets, outSockets, direction, components, wires) {
    super(x, y, name, camera, inSockets, outSockets, direction)
    this.components = components;
    this.wires = wires;
    this.delay = 0;
    this.components.forEach(component => this.delay += component.delay);

    let socket, component;
    this.inComponents = []; // components which have inSockets in it
    for (let i = 0; i < this.inSockets.length; i++) {
      socket = this.inSockets[i];
      for (let j = 0; j < this.components.length; j++) {
        component = this.components[j];
        if (component.inSockets.indexOf(socket) !== -1) {
          this.inComponents.push(component);
          break;
        }
      }
    }

    this.ledComponents = this.components.filter(component => component instanceof LEDComponent);
    this.ledSurfaces = [];

    this.integrationId = nextIntegrationId++;

    this.reposition();
    this.calculate();
  }

  reposition() {
    super.reposition();

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    this.ledComponents.forEach(component => {
      minX = Math.min(component.x, minX);
      maxX = Math.max(component.x + component.size, maxX);
      minY = Math.min(component.y, minY);
      maxY = Math.max(component.y + component.size, maxY);
    });
    let width = maxX - minX, height = maxY - minY;
    let ratio = (this.size - 2*IntegratedComponent.PADDING) / Math.max(width, height);
    let realWidth = width*ratio, realHeight = height*ratio;
    let startX = this.targetX + (this.size - realWidth) / 2, startY = this.targetY + (this.size - realHeight) / 2;

    this.ledSurfaces.length = 0;
    this.ledComponents.forEach(component => {
      component.surfaces[0].realX = startX + (component.targetX - minX) * ratio;
      component.surfaces[0].realY = startY + (component.targetY - minY) * ratio;
      component.surfaces[0].realWidth = component.size * ratio;
      component.surfaces[0].realHeight = component.size * ratio;
      this.ledSurfaces.push(component.surfaces[0]);
    });
  }

  tick() {
    super.tick();

    this.components.forEach(component => component.tick());
  }

  render() {
    if (!this.isInScreen()) return;

    this.surfaces.forEach(surface => surface.render());
    this.ledSurfaces.forEach(surface => surface.render());
    this.inSockets.forEach(socket => socket.render());
    this.outSockets.forEach(socket => socket.render());
    this.texts.forEach(surface => surface.render());
  }

  calculate(forceCalculate) {
    this.inComponents.forEach(component => component.calculate(forceCalculate));
  }

  getSignal() {
    let result = [];
    this.components.forEach(component => result.push(component.getSignal()));
    return result;
  }

  flatten() {
    let usedComponents = [], structures = [];
    this.components.forEach(component => {
      if (!(component instanceof IntegratedComponent)) {
        usedComponents.push(component.flatten());
      } else {
        let states = [];
        let flatten = component.flatten();
        flatten[3].forEach(usedComponent => {
          if (
            usedComponent[0] === "not"
            || usedComponent[0] === "or"
            || usedComponent[0] === "true"
            || usedComponent[0] === "integrated_blueprint"
          ) {
            states.push(usedComponent[2]);
          }
        });

        usedComponents.push(makeBlueprintString(component, states));

        structures.push(...flatten[8]);
        flatten[8].length = 0;

        // upload structure
        for (let i = 0; i < structures.length; i++)
          if (component.integrationId === structures[i][2]) return;

        structures.push(flatten);
      }
    });

    let wires = [];
    this.wires.forEach(wire => {
      let fromSocket, toSocket;
      for (let i = 0; i < this.components.length; i++) {
        if (fromSocket === undefined) {
          let fromSocketIndex = this.components[i].outSockets.indexOf(wire.fromSocket);
          if (fromSocketIndex !== -1) fromSocket = [i, fromSocketIndex];
        }
        if (toSocket === undefined) {
          let toSocketIndex = this.components[i].inSockets.indexOf(wire.toSocket);
          if (toSocketIndex !== -1) toSocket = [i, toSocketIndex];
        }
      }
      wires.push([fromSocket, toSocket]);
    });

    let inSockets = [], outSockets = [];
    this.inSockets.forEach(socket => {
      for (let i = 0; i < this.components.length; i++) {
        let socketIndex = this.components[i].inSockets.indexOf(socket);
        if (socketIndex !== -1) {
          inSockets.push([i, socketIndex]);
          break;
        }
      }
    });
    this.outSockets.forEach(socket => {
      for (let i = 0; i < this.components.length; i++) {
        let socketIndex = this.components[i].outSockets.indexOf(socket);
        if (socketIndex !== -1) {
          outSockets.push([i, socketIndex]);
          break;
        }
      }
    });

    return [
      "integrated", [this.targetX, this.targetY], this.integrationId, usedComponents, wires, this.name,
      inSockets, outSockets, structures, this.direction
    ];
  }
}

let wireUpdates = [];
function structify(flattened, camera, structures, recursion) {
  if (recursion === undefined) {
    recursion = 0;
    wireUpdates = [];
    structures = preconfiguredStructures;
  }

  if (structures === undefined || structures === null) structures = [];
  if (flattened[0] === "true") {
    return new TrueComponent(flattened[1][0], flattened[1][1], camera, flattened[2]);
  } else if (flattened[0] === "not") {
    let result = new NotComponent(flattened[1][0], flattened[1][1], camera, flattened[3]);
    result.inSockets[0].on = flattened[2];
    result.calculate();
    return result;
  } else if (flattened[0] === "or") {
    let result = new OrComponent(flattened[1][0], flattened[1][1], camera, flattened[3]);
    result.inSockets[0].on = flattened[2][0];
    result.inSockets[1].on = flattened[2][1];
    result.calculate();
    return result;
  } else if (flattened[0] === 'switch') {
    let result = new SwitchComponent(flattened[1][0], flattened[1][1], camera, flattened[3]);
    result.outSockets[0].on = flattened[2];
    result.calculate();
    return result;
  } else if (flattened[0] === 'pushbutton') {
    return new PushbuttonComponent(flattened[1][0], flattened[1][1], camera, flattened[2]);
  } else if (flattened[0] === 'led') {
    return new LEDComponent(flattened[1][0], flattened[1][1], camera, flattened[2]);
  } else if (flattened[0] === "integrated") {
    let usedComponents = [];
    flattened[3].forEach(subcomponent => {
      usedComponents.push(structify(subcomponent, camera, structures.concat(flattened[8]), recursion+1));
    });

    let inSockets = [], outSockets = [];
    flattened[6].forEach(path => inSockets.push(usedComponents[path[0]].inSockets[path[1]]));
    flattened[7].forEach(path => outSockets.push(usedComponents[path[0]].outSockets[path[1]]));

    let usedWires = [];
    flattened[4].forEach(connection => {
      let wire = new Wire(
        usedComponents[connection[0][0]].outSockets[connection[0][1]],
        usedComponents[connection[1][0]].inSockets[connection[1][1]],
        camera
      );
      usedWires.push(wire);
      if (wire.toSocket.on !== wire.on) {
        wireUpdates.push(wire);
      }
    });

    let result = new IntegratedComponent(
      flattened[1][0], flattened[1][1], flattened[5], camera, inSockets, outSockets, flattened[9], usedComponents, usedWires);

    result.integrationId = flattened[2];
    nextIntegrationId--;

    return result;
  } else if (flattened[0] === "integrated_blueprint") {
    let structure = structures.find(index => index[2] === flattened[3]);
    for (let i = 0; i < flattened[2].length; i++) {
      structure[3][i][2] = flattened[2][i];
    }
    structure[1] = flattened[1];
    structure[9] = flattened[4];
    return structify(structure, camera, structures, recursion+1);
  }
}

function getIntersectWires(wireList, ofComponents) {
  let sockets = [];
  ofComponents.forEach(component => sockets.push(...component.inSockets, ...component.outSockets));

  return wireList
    .filter(wire => sockets.includes(wire.fromSocket) && sockets.includes(wire.toSocket));
}

function getInOutSockets(componentList, wireList) {
  let sockets = [];
  componentList.forEach(component => sockets.push(...component.inSockets, ...component.outSockets));

  wireList.forEach(wire => {
    let fromSocketIndex = sockets.indexOf(wire.fromSocket);
    if (fromSocketIndex !== -1) {
      sockets.splice(fromSocketIndex, 1);
    }

    let toSocketIndex = sockets.indexOf(wire.toSocket);
    if (toSocketIndex !== -1) {
      sockets.splice(toSocketIndex, 1);
    }
  });

  return [
    sockets.filter(socket => socket.role === Socket.INPUT),
    sockets.filter(socket => socket.role === Socket.OUTPUT),
  ];
}

function getComponentsBorder(componentList) {
  let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
  componentList.forEach(component => {
    x1 = Math.min(component.x, x1);
    y1 = Math.min(component.y, y1);
    x2 = Math.max(component.x + component.size, x2);
    y2 = Math.max(component.y + component.size, y2);
  })

  return [x1, y1, x2, y2];
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

function connectWire(fromSocket, toSocket, camera, calculateFlag) {
  let wire = new Wire(fromSocket, toSocket, camera);

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
  if (!add) return;

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
  wires.push(wire);
  if (calculateFlag === undefined || calculateFlag === true)
    wire.calculate();
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

function getXYBySize(size) {
  return [
    Math.round(camera.getBoardX(mouseX) - size/2),
    Math.round(camera.getBoardY(mouseY) - size/2)
  ];
}

function makeBlueprintString(component, signal) {
  return ["integrated_blueprint", [component.x, component.y], signal, component.integrationId, component.direction];
}

class SwitchComponent extends Component {
  constructor(x, y, camera, direction) {
    super(x, y, "Switch", camera, [], [new Socket(Socket.OUTPUT, camera)], direction);

    this.reposition();
    this.calculate();
  }

  flatten() {
    return ['switch', [this.targetX, this.targetY], this.outSockets[0].on, this.direction];
  }
}

class PushbuttonComponent extends Component {
  constructor(x, y, camera, direction) {
    super(x, y, "Pushbutton", camera, [], [new Socket(Socket.OUTPUT, camera)], direction)

    this.reposition();
    this.calculate();
  }

  tick() {
    super.tick();

    if (this.outSockets[0].on) {
      let inGameX = this.camera.getBoardX(mouseX), inGameY = this.camera.getBoardY(mouseY);
      if (
        inGameX < this.x || this.x + this.size < inGameX
        || inGameY < this.y || this.y + this.size < inGameY
      ) this.outSockets[0].changeState(false);
    }
  }

  flatten() {
    return ['pushbutton', [this.targetX, this.targetY], this.direction];
  }
}

class LEDComponent extends Component {
  static OFF_COLOR = Component.BACKGROUND_COLOR;
  static ON_COLOR = '#444';

  constructor(x, y, camera, direction) {
    super(x, y, 'LED', camera, [new Socket(Socket.INPUT, camera)], [], direction);

    this.inSockets[0].changeStateEvents.push(state => this.surfaces[0].color = state ? LEDComponent.ON_COLOR : LEDComponent.OFF_COLOR);

    this.reposition();
  }

  reposition() {
    super.reposition();
    this.surfaces[0].color = this.inSockets[0].on ? LEDComponent.ON_COLOR : LEDComponent.OFF_COLOR;
  }

  flatten() {
    return ['led', [this.targetX, this.targetY], this.direction];
  }
}
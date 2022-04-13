class Socket {
  static ON_COLOR = 'red';
  static OFF_COLOR = 'black';
  static RADIUS = 0.3;

  constructor(x, y, camera) {
    this.x = x;
    this.y = y;
    this.camera = camera;

    this.on = false;

    this.surface = new CameraCircle(this.x, this.y, Socket.RADIUS, Socket.OFF_COLOR, this.camera);
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

  tick() {
    this.surface.tick();
  }

  render() {
    this.surface.render();
  }
}

const DIRECTION_UP = 0;
const DIRECTION_LEFT = 1;
const DIRECTION_DOWN = 2;
const DIRECTION_RIGHT = 3;

class Component {
  static SIDE_PADDING = 2;
  static PADDING = 1;
  static BACKGROUND_COLOR = 'white';
  static BORDER_COLOR = 'black';
  static DIRECTION_INDICATOR_COLOR = 'grey';
  static TEXT_COLOR = 'black';

  constructor(x, y, name, camera, inSockets, outSockets) {
    this.x = x;
    this.y = y;
    this.name = name;
    this.camera = camera;

    this.inSockets = inSockets;
    this.outSockets = outSockets;

    this.direction = DIRECTION_UP;
    this.size = Component.SIDE_PADDING * 2;

    this.surfaces = [];

    this.reposition();
  }

  setDirection(direction) {
    this.direction = direction;
    this.reposition();
  }

  reposition() {
    this.size = Math.max(this.inSockets.length, this.outSockets.length) + 2 * Component.SIDE_PADDING;

    this.surfaces = [
      new CameraRectangle(this.x, this.y, this.size, this.size, Component.BACKGROUND_COLOR, this.camera),
      new CameraRectangle(this.x, this.y, this.size, this.size, Component.DIRECTION_INDICATOR_COLOR, this.camera),
      new CameraRectangleLine(this.x, this.y, this.size, this.size, Component.BORDER_COLOR, 0.3, this.camera),
      new CameraText(this.x + this.size / 2, this.y + this.size / 2, this.name, Component.TEXT_COLOR, "Pretendard", 2, this.camera),
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

  tick() {
    this.surfaces.forEach(surface => surface.tick());
    this.inSockets.forEach(socket => socket.tick());
    this.outSockets.forEach(socket => socket.tick());
  }

  render() {
    this.surfaces.forEach(surface => surface.render());
    this.inSockets.forEach(socket => socket.render());
    this.outSockets.forEach(socket => socket.render());
  }
}
class Object {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }

  tick() {}

  render() {}
}

class Rectangle extends Object {
  constructor(x, y, width, height, color) {
    super(x, y);
    this.width = width;
    this.height = height;
    this.color = color;
  }

  render() {
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x, this.y, this.width, this.height);
  }
}

class RectangleLine extends Rectangle {
  constructor(x, y, width, height, color, lineWidth) {
    super(x, y, width, height, color);
    this.lineWidth = lineWidth;
  }

  render() {
    ctx.lineWidth = this.lineWidth;
    ctx.strokeStyle = this.color;
    ctx.strokeRect(this.x, this.y, this.width, this.height);
  }
}

class Circle extends Object {
  constructor(x, y, radius, color) {
    super(x, y);
    this.radius = radius;
    this.color = color;
  }

  render() {
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

class Line extends Object {
  constructor(x, y, x2, y2, color, lineWidth) {
    super(x, y);
    this.x2 = x2;
    this.y2 = y2;
    this.color = color;
    this.lineWidth = lineWidth;
  }

  render() {
    ctx.strokeStyle = this.color;
    ctx.lineWidth = this.lineWidth;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x2, this.y2);
    ctx.stroke();
  }
}

class Text extends Object {
  constructor(x, y, text, color, font, size) {
    super(x, y);
    this.text = text;
    this.color = color;
    this.font = font;
    this.size = size;
  }

  render() {
    ctx.fillStyle = this.color;
    ctx.font = this.size + "px " + this.font;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(this.text, this.x, this.y);
  }
}

class Camera {
  static UP_KEY = 'w';
  static DOWN_KEY = 's';
  static LEFT_KEY = 'a';
  static RIGHT_KEY = 'd';

  constructor(x, y, zoom) {
    this.x = x;
    this.y = y;
    this.zoom = zoom;
  }

  tick() {
    let positionOffset = 50 / this.zoom;
    if (isPressed(Camera.UP_KEY)) {
      this.y -= positionOffset;
    }
    if (isPressed(Camera.DOWN_KEY)) {
      this.y += positionOffset;
    }
    if (isPressed(Camera.LEFT_KEY)) {
      this.x -= positionOffset;
    }
    if (isPressed(Camera.RIGHT_KEY)) {
      this.x += positionOffset;
    }

    if (0 <= this.x && this.x <= canvas.width
        && 0 <= this.y && this.y <= canvas.height) {
      if (mouseScroll) {
        this.zoom *= Math.exp(mouseScroll / 500);
        mouseScroll = 0;
      }
      if (this.zoom < 1) {
        this.zoom = 1;
      } else if (this.zoom > 200) {
        this.zoom = 200;
      }
    }
  }

  getScreenX(x) {
    return canvas.width / 2 + (x - this.x) * this.zoom;
  }

  getScreenY(y) {
    return canvas.height / 2 + (y - this.y) * this.zoom;
  }

  getBoardX(x) {
    return (x - canvas.width / 2) / this.zoom + this.x;
  }

  getBoardY(y) {
    return (y - canvas.height / 2) / this.zoom + this.y;
  }
}

class CameraLine extends Line {
  constructor(x, y, x2, y2, color, lineWidth, camera) {
    super(x, y, x2, y2, color, lineWidth);
    this.camera = camera;

    this.realX = x;
    this.realY = y;
    this.realX2 = x2;
    this.realY2 = y2;
    this.realWidth = lineWidth;
  }

  tick() {
    this.x = this.camera.getScreenX(this.realX);
    this.y = this.camera.getScreenY(this.realY);
    this.x2 = this.camera.getScreenX(this.realX2);
    this.y2 = this.camera.getScreenY(this.realY2);
    this.lineWidth = this.realWidth * this.camera.zoom;
  }
}

// noinspection DuplicatedCode
class CameraRectangle extends Rectangle {
  constructor(x, y, width, height, color, camera) {
    super(x, y, width, height, color);
    this.camera = camera;

    this.realX = x;
    this.realY = y;
    this.realWidth = width;
    this.realHeight = height;
  }

  tick() {
    this.x = this.camera.getScreenX(this.realX);
    this.y = this.camera.getScreenY(this.realY);
    this.width = this.realWidth * this.camera.zoom;
    this.height = this.realHeight * this.camera.zoom;
  }
}

// noinspection DuplicatedCode
class CameraRectangleLine extends RectangleLine {
  constructor(x, y, width, height, color, lineWidth, camera) {
    super(x, y, width, height, color, lineWidth);
    this.camera = camera;

    this.realX = x;
    this.realY = y;
    this.realWidth = width;
    this.realHeight = height;
    this.realLineWidth = lineWidth;
  }

  tick() {
    this.x = this.camera.getScreenX(this.realX);
    this.y = this.camera.getScreenY(this.realY);
    this.width = this.realWidth * this.camera.zoom;
    this.height = this.realHeight * this.camera.zoom;
    this.lineWidth = this.realLineWidth * this.camera.zoom;
  }
}

class CameraCircle extends Circle {
  constructor(x, y, radius, color, camera) {
    super(x, y, radius, color);
    this.camera = camera;

    this.realX = x;
    this.realY = y;
    this.realRadius = radius;
  }

  tick() {
    this.x = this.camera.getScreenX(this.realX);
    this.y = this.camera.getScreenY(this.realY);
    this.radius = this.realRadius * this.camera.zoom;
  }
}

class PositionIndicator extends Object {
  constructor (x, y, color, length, camera) {
    super(x, y);
    this.color = color;
    this.length = length;
    this.camera = camera;

    this.realX = x;
    this.realY = y;
  }

  render() {
    let length = this.length * this.camera.zoom;
    let x = this.camera.getScreenX(this.realX);
    let y = this.camera.getScreenY(this.realY);

    ctx.strokeStyle = this.color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x - length, y);
    ctx.lineTo(x + length, y);
    ctx.moveTo(x, y - length);
    ctx.lineTo(x, y + length);
    ctx.stroke();
  }
}

class Grid {
  static COLOR = "#264b3d";
  static LINE_WIDTH = 0.1;  // units

  constructor(camera) {
    this.camera = camera;
  }

  render() {
    let startX = this.camera.getScreenX(Math.ceil(this.camera.getBoardX(0)));
    let startY = this.camera.getScreenY(Math.ceil(this.camera.getBoardY(0)));
    let width = this.camera.zoom * Grid.LINE_WIDTH;

    for (let x = startX; x < canvas.width; x += this.camera.zoom) {
      ctx.beginPath();
      ctx.strokeStyle = Grid.COLOR;
      ctx.lineWidth = width;
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = startY; y < canvas.height; y += this.camera.zoom) {
      ctx.beginPath();
      ctx.strokeStyle = Grid.COLOR;
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }
  }
}

class CameraText extends Text {
  constructor(x, y, text, color, font, size, camera) {
    super(x, y, text, color, font, size);
    this.camera = camera;

    this.realX = x;
    this.realY = y;
    this.realSize = size;
  }

  tick() {
    this.x = this.camera.getScreenX(this.realX);
    this.y = this.camera.getScreenY(this.realY);
    this.size = this.realSize * this.camera.zoom;
  }
}
/*
 * `objects.js` is for the basic objects that will be shown on the screen.
 */

/*
 * A basic Object class.
 * Every object in the game inherits from this class.
 */
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

/*
 * `Rectangle`, but just its outline.
 */
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

class RectangleWithLine extends Rectangle {
  constructor(x, y, width, height, color, lineColor, lineWidth) {
    super(x, y, width, height, color);
    this.line = new RectangleLine(x, y, width, height, lineColor, lineWidth);
  }

  tick() {
    this.line.x = this.x;
    this.line.y = this.y;
    this.line.width = this.width;
    this.line.height = this.height;
  }

  render() {
    super.render();
    this.line.render();
  }
}
/*
 * `Line` object that connects two points.
 */
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
    ctx.lineCap = "round";
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
  static movingInterpolation = 0.15;

  constructor(x, y, zoom) {
    this.x = x;
    this.y = y;
    this.zoom = zoom;

    this.targetX = x;
    this.targetY = y;
    this.targetZoom = zoom;
  }

  tick() {
    let positionOffset = 10 / this.zoom;
    if (isPressed(Camera.UP_KEY)) {
      this.targetY -= positionOffset;
    }
    if (isPressed(Camera.DOWN_KEY)) {
      this.targetY += positionOffset;
    }
    if (isPressed(Camera.LEFT_KEY)) {
      this.targetX -= positionOffset;
    }
    if (isPressed(Camera.RIGHT_KEY)) {
      this.targetX += positionOffset;
    }

    if (mouseScroll) {
      this.targetZoom *= Math.exp(-mouseScroll / 500);
      mouseScroll = 0;
    }

    this.targetZoom = limit(this.targetZoom, 1, 200)

    this.x = lerp(this.x, this.targetX, Camera.movingInterpolation);
    this.y = lerp(this.y, this.targetY, Camera.movingInterpolation);
    this.zoom = lerp(this.zoom, this.targetZoom, Camera.movingInterpolation);
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

/*
 * A `Line` object that works on the Camera world.
 */
class CameraLine extends Line {
  constructor(x, y, x2, y2, color, lineWidth, camera) {
    super(x, y, x2, y2, color, lineWidth);
    this.camera = camera;

    this.realX = x;  // x coordinate in the camera world.
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

/*
 * Calculates x, y, width, height of a rectangle that contains all the given points
 * according to the `Camera`.
 */
function adaptCameraPosition(object, camera) {
  object.x = object.camera.getScreenX(object.realX);
  object.y = object.camera.getScreenY(object.realY);
  object.width = object.realWidth * camera.zoom;
  object.height = object.realHeight * camera.zoom;
}

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
    adaptCameraPosition(this, this.camera);
  }
}

/*
 * A `RectangleLine` object that works on the Camera world.
 */
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
    adaptCameraPosition(this, this.camera);
    this.lineWidth = this.realLineWidth * this.camera.zoom;
  }
}

class CameraRectangleWithLine extends RectangleWithLine {
  constructor(x, y, width, height, color, lineColor, lineWidth, camera) {
    super(x, y, width, height, color, lineColor, lineWidth, camera)
    this.camera = camera;

    this.realX = x;
    this.realY = y;
    this.realWidth = width;
    this.realHeight = height;
    this.realLineWidth = lineWidth;
  }

  tick() {
    adaptCameraPosition(this, this.camera)
    this.lineWidth = this.realLineWidth * this.camera.zoom;
  }
}

/*
 * A `Circle` object that works on the Camera world.
 */
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

  setPos(x, y) {
    this.realX = x;
    this.realY = y;
    this.tick();
  }
}

/*
 * Camera world position indicator.
 */
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

/*
 * Grid for the Camera world.
 */
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

    if (this.camera.zoom < 5) return;

    ctx.strokeStyle = Grid.COLOR
      + lerp(0, 255, Math.round(limit(this.camera.zoom, 5, 20) - 5) / 15).toString(16).padStart(2, '0');
    ctx.lineWidth = width;
    for (let x = startX; x < canvas.width; x += this.camera.zoom) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = startY; y < canvas.height; y += this.camera.zoom) {
      ctx.beginPath();
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }
  }
}

/*
 * A `Text` object that works on the Camera world.
 */
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
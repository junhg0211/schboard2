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

function rgb2hex([r, g, b]) {
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}
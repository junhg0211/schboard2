// general variable
const menubarWidth = document.querySelector(".operation").clientWidth;

const FPS = 60;

const BACKGROUND_COLOR = "#163b2d";

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

// objects
let camera = new Camera(0, 0, 20);
let centerIndicator = new PositionIndicator(0, 0, 'white', 1, camera);
let grid = new Grid(camera);
let selectingBox = new RectangleWithLine(0, 0, 0, 0, '#fff2', '#fffa', 1);

let cameraLeft = 0;
let cameraRight = 0;
let cameraTop = 0;
let cameraBottom = 0;


/*
 * `notification.js` is for the notification popup that appears at the center of the screen.
 */

const notification = document.getElementsByClassName("notification")[0];
const title = document.getElementsByClassName("notification--title")[0];
const content = document.getElementsByClassName("notification--content")[0];
const buttonDiv = document.getElementsByClassName("notification--button")[0];

let notificationOpen = false;

function openNotification() {
  notification.style.display = "block";
  notificationOpen = true;
}

function closeNotification() {
  notification.style.display = "none";
  notificationOpen = false;
}

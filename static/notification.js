/*
 * `notification.js` is for the notification popup that appears at the center of the screen.
 */

const notification = document.getElementsByClassName("notification")[0];
const title = document.querySelector(".notification-title");
const content = document.querySelector(".notification-content");
const textInput = document.querySelector("#notification-text-input");

let notificationOpen = false;
let closeSignal = false;

const SIGNAL_OK = "ok";
const SIGNAL_CANCEL = "cancel";

function openNotification() {
  textInput.value = "";

  notification.style.display = "block";
  notificationOpen = true;

  textInput.focus();
}

function closeNotification() {
  notification.style.display = "none";
  notificationOpen = false;

  tickInput();
  keys = [];
}

function okButton() {
  closeSignal = SIGNAL_OK;
  closeNotification();
}

function cancelButton() {
  closeSignal = SIGNAL_CANCEL;
  closeNotification();
}

textInput.addEventListener("keypress", event => {
  if (event.key === "Enter") {
    okButton();
  }
});

function notificationPrompt(titleText, question) {
  title.innerHTML = `<h1>${titleText}</h1>`;
  content.innerHTML = `<p>${question}</p>
                       <p><label><input type="checkbox" id="notification-checkbox-1"> 추상화 컴포넌트 목록에 저장</label></p>`
  openNotification();

  return new Promise(resolve => {
    (function waitFor() {
      if (notificationOpen) setTimeout(waitFor, 100);
      else if (closeSignal === SIGNAL_OK) resolve(textInput.value);
      else resolve(null);
    })()
  });
}

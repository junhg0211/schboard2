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

function prepareNotificationAbstraction() {
  title.innerHTML = "<h1>통합 컴포넌트 이름 입력</h1>"
  content.innerHTML = `<p>추상화된 컴포넌트에 이름을 지어주세요.</p>`;
  content.innerHTML += `<p><label><input type="checkbox" id="notification-checkbox-1"> 추상화 컴포넌트 목록에 저장</label></p>`;
}

function prepareNotificationAbstractDelete(name) {
  title.innerHTML = "<h1>추상화 컴포넌트 삭제</h1>"
  content.innerHTML = `<p>추상화 컴포넌트를 삭제하라면 컴포넌트의 이름(<code>${name}</code>)을 입력하세요.</p>`
}

function notificationPrompt() {
  openNotification();

  return new Promise(resolve => {
    (function waitFor() {
      if (notificationOpen) setTimeout(waitFor, 100);
      else if (closeSignal === SIGNAL_OK) resolve(textInput.value);
      else resolve(null);
    })()
  });
}

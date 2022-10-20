// tabs
let tabs = [], nowTab = "Untitled";
let components = null, wires = null;

let tabList = document.querySelector("#tab-list");

function newTab(title) {
  return {
    name: title,
    components: [],
    wires: [],
    componentCalculationQueue: [],
  };
}

function getTab(name) {
  return tabs.find(tab => tab.name === name);
}

function createTab(name) {
  if (getTab(name)) return;

  let tab = newTab(name);
  tabs.push(tab);
  let li = document.createElement("li");
  li.innerText = name;
  li.onclick = () => changeTab(name);
  tabList.appendChild(li);
  return tab;
}

const pathDiv = document.querySelector(".path");

/*
 * switch current tab
 */
function changeTab(name) {
  nowTab = name;

  let tab = getTab(name);
  components = tab.components;
  wires = tab.wires;
  componentCalculationQueue = tab.componentCalculationQueue;

  pathDiv.innerText = name;
}

createTab(nowTab);
changeTab(nowTab);
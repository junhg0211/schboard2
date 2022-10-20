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

function stringifyTab(tab, abstractComponentIds) {
  let result = {
    name: tab.name,
    components: [],
    wireIndexes: [],
    queuedComponentIndexes: []
  };
  // result.wireIndexes will contain the socket addresses of components.
  // for example, if enabled (state = true) wire A is originally connected from result.components[1]'s 1st outSockets
  // to result.components[0]'s 2nd inSockets, wire A will be represented as [1, 0, 0, 1, true].
  //
  // result.queuedComponentIndexes will contain the index of components in result.components
  // which must be also contained on componentCalculationQueue when this stringified tab is structured.

  tab.components.forEach(component => {
    if (component instanceof IntegratedComponent && abstractComponentIds.indexOf(component.integrationId) !== -1) {
      result.components.push(makeBlueprintString(component, component.getSignal()));
    } else {
      result.components.push(component.flatten())
    }
  });

  tab.wires.forEach(wire => {
    let fromSocket = wire.fromSocket;
    let toSocket = wire.toSocket;

    let fromSocketComponent = getConnectedComponent(fromSocket, tab.components, true);
    let toSocketComponent = getConnectedComponent(toSocket, tab.components, true);

    result.wireIndexes.push([
      tab.components.indexOf(fromSocketComponent),
      fromSocketComponent.outSockets.indexOf(fromSocket),
      tab.components.indexOf(toSocketComponent),
      toSocketComponent.inSockets.indexOf(toSocket),
      wire.on
    ]);
  });

  tab.componentCalculationQueue.forEach(component => {
    if (tab.componentCalculationQueue.indexOf(component) !== -1)
      result.queuedComponentIndexes.push(tab.components.indexOf(component));
  });

  return result;
}

createTab(nowTab);
changeTab(nowTab);
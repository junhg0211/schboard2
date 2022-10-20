/*
 * creating the packed project
 */
function pack() {
  let result = {
    nextIntegrationId: nextIntegrationId,
    nowTab: nowTab,
    tabs: [],
    abstractedComponents: [],
    camera: {
      x: camera.targetX,
      y: camera.targetY,
      zoom: camera.targetZoom,
    }
  };

  let workMode = getWorkMode();

  for (let i = 0; i < abstractComponentList.children.length; i++) {
    abstractComponentList.children[i].children[1].children[0].onclick();

    // component.js = selectedObjects[0]
    // flattenedComponent = preconfiguredStructure
    // signal = clonedString[0][2]
    let flattened = selectedObjects[0].flatten();
    flattened[8] = [];
    result.abstractedComponents.push([flattened, clonedStrings[0][2]]);
  }

  setWorkMode(workMode);

  tabs.forEach(tab => {
    result.tabs.push(stringifyTab(tab, result.abstractedComponents.map(structure => structure[0][2])));
    // structure[0] is flattened integrated component.js
    // and structure[0][2] is its integration id
  });

  return result;
}

/*
 * make a download link for packed project and invoke the download
 */
function save() {
  let content = JSON.stringify(pack());

  let filename = "components.json";
  let file = new File([content], filename);
  let a = document.createElement("a"),
    url = URL.createObjectURL(file);
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(function () {
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }, 0);
}

function load(projectJSON) {
  camera.targetX = projectJSON.camera.x;
  camera.targetY = projectJSON.camera.y;
  camera.targetZoom = projectJSON.camera.zoom;

  nextIntegrationId = projectJSON.nextIntegrationId;

  let structures = [];
  projectJSON.abstractedComponents.forEach(data => {
    let [component, signal] = data;
    preconfiguredStructure = component;
    let componentStructured = structify(component, camera, structures, 0);
    structures.push(component);
    appendIntegratedComponentOnList(component[5], componentStructured, component, signal);
  });

  projectJSON.tabs.forEach(tab => {
    createTab(tab.name);
    changeTab(tab.name);

    components.length = 0;
    tab.components.forEach(component => {
      let structified;
      if (component[0] === "integrated_blueprint") {
        structified = structify(component, camera, structures, 0);
      } else {
        structified = structify(component, camera);
      }
      components.push(structified);
    });

    tab.wireIndexes.forEach(indexes => {
      let [fromCI, fromSI, toCI, toSI] = indexes;
      // CI = component.js index
      // SI = socket index
      let fromComponent = components[fromCI], toComponent = components[toCI];
      let fromSocket = fromComponent.outSockets[fromSI], toSocket = toComponent.inSockets[toSI];
      connectWire(fromSocket, toSocket, camera);
    });

    tab.queuedComponentIndexes.forEach(index => componentCalculationQueue.push(components[index]));
  });

  changeTab(projectJSON.nowTab);
}

document.getElementById("component-file").addEventListener("change", (e) => {
  // noinspection JSCheckFunctionSignatures
  e.target.files[0].text().then(content => JSON.parse(content)).then(content => load(content));
});


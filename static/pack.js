function getIndexRecursively(component, components) {
  let index = components.indexOf(component);
  if (index !== -1) return [index];

  let result;
  components.filter(c => c instanceof IntegratedComponent).forEach((ic, i) => {
    let index = getIndexRecursively(component, ic.components);
    if (index === undefined) result = [i];
    else if (index.length > 0) result = [i, ...index];
  });

  return result;
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
    result.queuedComponentIndexes.push(getIndexRecursively(component, tab.components));
  });

  return result;
}

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
    flattened[8] = flattened[8].filter(
      structure => result.abstractedComponents.map(abstracted => abstracted[0][2]).indexOf(structure[2]) === -1
    );
    console.log(flattened[8], result.abstractedComponents);
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
    preconfiguredStructures = [component];
    let componentStructured = structify(component, camera, structures, 0);
    structures.push(component);
    appendIntegratedComponentOnList(component[5], componentStructured, structures, signal);
  });

  projectJSON.tabs.forEach(tab => {
    createTab(tab.name);
    changeTab(tab.name);

    components.length = 0;
    tab.components.forEach(component => components.push(structify(component, camera, structures, 0)));

    tab.wireIndexes.forEach(indexes => {
      let [fromCI, fromSI, toCI, toSI] = indexes;
      // CI = component.js index
      // SI = socket index
      let fromComponent = components[fromCI], toComponent = components[toCI];
      let fromSocket = fromComponent.outSockets[fromSI], toSocket = toComponent.inSockets[toSI];
      connectWire(fromSocket, toSocket, camera, false);
    });

    // tab.queuedComponentIndexes.forEach(index => componentCalculationQueue.push(components[index]));
    tab.queuedComponentIndexes.forEach(indexList => {
      let item = components;
      while (indexList.length > 0) {
        item = item[indexList.shift(0)];
        if (item instanceof IntegratedComponent)
          item = item.components;
      }
      componentCalculationQueue.push(item);
      forceCalculationQueue.push(item);
    });
  });

  changeTab(projectJSON.nowTab);
}

document.getElementById("component-file").addEventListener("change", (e) => {
  // noinspection JSCheckFunctionSignatures
  e.target.files[0].text().then(content => JSON.parse(content)).then(content => load(content));
});


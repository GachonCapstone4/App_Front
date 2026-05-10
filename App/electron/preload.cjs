const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("mailyUpdater", {
  getState: () => ipcRenderer.invoke("updater:get-state"),
  check: () => ipcRenderer.invoke("updater:check"),
  download: () => ipcRenderer.invoke("updater:download"),
  install: () => ipcRenderer.invoke("updater:install"),
  onStatus: (callback) => {
    const listener = (_event, state) => {
      callback(state);
    };

    ipcRenderer.on("updater:status", listener);

    return () => {
      ipcRenderer.removeListener("updater:status", listener);
    };
  },
});

contextBridge.exposeInMainWorld("mailyShell", {
  openExternal: (url) => ipcRenderer.invoke("shell:open-external", url),
});

const { app, BrowserWindow, ipcMain, net, protocol, shell } = require("electron");
const { autoUpdater } = require("electron-updater");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const isDev = Boolean(process.env.ELECTRON_RENDERER_URL);
const rendererRoot = path.join(__dirname, "../dist");
const preloadPath = path.join(__dirname, "preload.cjs");
let updateState = {
  status: "idle",
  version: null,
  releaseDate: null,
  percent: null,
  error: null,
};

protocol.registerSchemesAsPrivileged([
  {
    scheme: "emailassist",
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
    },
  },
]);

function registerRendererProtocol() {
  protocol.handle("emailassist", (request) => {
    const requestUrl = new URL(request.url);
    const requestedPath =
      requestUrl.pathname === "/"
        ? "index.html"
        : decodeURIComponent(requestUrl.pathname.slice(1));
    let resolvedPath = path.normalize(path.join(rendererRoot, requestedPath));

    if (
      resolvedPath !== rendererRoot &&
      !resolvedPath.startsWith(`${rendererRoot}${path.sep}`)
    ) {
      return new Response("Forbidden", { status: 403 });
    }

    if (!fs.existsSync(resolvedPath) && !path.extname(resolvedPath)) {
      resolvedPath = path.join(rendererRoot, "index.html");
    }

    return net.fetch(pathToFileURL(resolvedPath).toString());
  });
}

function publishUpdateState(nextState) {
  updateState = {
    ...updateState,
    ...nextState,
  };

  BrowserWindow.getAllWindows().forEach((window) => {
    window.webContents.send("updater:status", updateState);
  });

  return updateState;
}

function registerAutoUpdater() {
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = false;

  autoUpdater.on("checking-for-update", () => {
    publishUpdateState({
      status: "checking",
      error: null,
      percent: null,
    });
  });

  autoUpdater.on("update-available", (info) => {
    publishUpdateState({
      status: "available",
      version: info.version,
      releaseDate: info.releaseDate || null,
      error: null,
      percent: null,
    });
  });

  autoUpdater.on("update-not-available", (info) => {
    publishUpdateState({
      status: "latest",
      version: info.version || app.getVersion(),
      releaseDate: info.releaseDate || null,
      error: null,
      percent: null,
    });
  });

  autoUpdater.on("download-progress", (progress) => {
    publishUpdateState({
      status: "downloading",
      percent: Math.round(progress.percent),
      error: null,
    });
  });

  autoUpdater.on("update-downloaded", (info) => {
    publishUpdateState({
      status: "downloaded",
      version: info.version,
      releaseDate: info.releaseDate || null,
      percent: 100,
      error: null,
    });
  });

  autoUpdater.on("error", (error) => {
    publishUpdateState({
      status: "error",
      error: error instanceof Error ? error.message : String(error),
    });
  });

  ipcMain.handle("updater:get-state", () => updateState);

  ipcMain.handle("updater:check", async () => {
    if (!app.isPackaged) {
      return publishUpdateState({
        status: "unsupported",
        error: "업데이트 확인은 패키징된 앱에서만 사용할 수 있습니다.",
      });
    }

    await autoUpdater.checkForUpdates();
    return updateState;
  });

  ipcMain.handle("updater:download", async () => {
    if (!app.isPackaged) {
      return publishUpdateState({
        status: "unsupported",
        error: "업데이트 다운로드는 패키징된 앱에서만 사용할 수 있습니다.",
      });
    }

    publishUpdateState({
      status: "downloading",
      percent: 0,
      error: null,
    });
    await autoUpdater.downloadUpdate();
    return updateState;
  });

  ipcMain.handle("updater:install", () => {
    if (updateState.status === "downloaded") {
      autoUpdater.quitAndInstall(false, true);
    }

    return updateState;
  });
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 1080,
    minHeight: 720,
    title: "EmailAssist",
    backgroundColor: "#f5f5f7",
    autoHideMenuBar: true,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: "deny" };
  });

  if (isDev) {
    void mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    void mainWindow.loadURL("emailassist://app/");
  }

  mainWindow.webContents.once("did-finish-load", () => {
    if (app.isPackaged) {
      setTimeout(() => {
        void autoUpdater.checkForUpdates();
      }, 2200);
    }
  });
}

app.whenReady().then(() => {
  registerRendererProtocol();
  registerAutoUpdater();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

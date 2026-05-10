const { app, BrowserWindow, ipcMain, net, protocol, shell } = require("electron");
const { autoUpdater } = require("electron-updater");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const isDev = Boolean(process.env.ELECTRON_RENDERER_URL);
const rendererRoot = path.join(__dirname, "../dist");
const preloadPath = path.join(__dirname, "preload.cjs");
const appApiBaseUrl = "https://capstone.studylink.click";
const adminApiBaseUrl = "https://admin.studylink.click";
const appProtocol = "maily";
const appProtocolHost = "app";
let mainWindow = null;
let pendingDeepLinkUrl = null;
let updateState = {
  status: "idle",
  version: null,
  releaseDate: null,
  percent: null,
  error: null,
};

protocol.registerSchemesAsPrivileged([
  {
    scheme: appProtocol,
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
    },
  },
]);

function registerDeepLinkProtocolClient() {
  if (app.isPackaged) {
    app.setAsDefaultProtocolClient(appProtocol);
    return;
  }

  if (process.defaultApp && process.argv.length >= 2) {
    app.setAsDefaultProtocolClient(appProtocol, process.execPath, [
      path.resolve(process.argv[1]),
    ]);
    return;
  }

  app.setAsDefaultProtocolClient(appProtocol);
}

function resolveUpstreamBaseUrl(pathname) {
  if (pathname === "/sse" || pathname.startsWith("/sse/")) {
    return appApiBaseUrl;
  }

  if (pathname === "/api/admin" || pathname.startsWith("/api/admin/")) {
    return adminApiBaseUrl;
  }

  if (pathname === "/api" || pathname.startsWith("/api/")) {
    return appApiBaseUrl;
  }

  return null;
}

async function proxyApiRequest(request, upstreamBaseUrl) {
  const requestUrl = new URL(request.url);
  const upstreamUrl = new URL(`${requestUrl.pathname}${requestUrl.search}`, upstreamBaseUrl);
  const headers = new Headers(request.headers);
  const method = request.method.toUpperCase();
  let body;

  for (const headerName of ["content-length", "host", "origin", "referer"]) {
    headers.delete(headerName);
  }

  if (method !== "GET" && method !== "HEAD") {
    body = Buffer.from(await request.arrayBuffer());
  }

  try {
    return await net.fetch(upstreamUrl.toString(), {
      method,
      headers,
      body,
    });
  } catch (error) {
    console.error("API proxy request failed", error);
    return new Response("Upstream request failed", { status: 502 });
  }
}

function normalizeDeepLinkUrl(url) {
  try {
    const parsedUrl = new URL(url);

    if (parsedUrl.protocol !== `${appProtocol}:` || parsedUrl.hostname !== appProtocolHost) {
      return null;
    }

    return `${appProtocol}://${appProtocolHost}${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`;
  } catch {
    return null;
  }
}

function handleDeepLink(url) {
  const normalizedUrl = normalizeDeepLinkUrl(url);

  if (!normalizedUrl) {
    return;
  }

  if (!mainWindow) {
    pendingDeepLinkUrl = normalizedUrl;
    return;
  }

  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }

  mainWindow.show();
  mainWindow.focus();
  void mainWindow.loadURL(normalizedUrl);
}

function registerRendererProtocol() {
  protocol.handle("maily", (request) => {
    const requestUrl = new URL(request.url);
    const upstreamBaseUrl = resolveUpstreamBaseUrl(requestUrl.pathname);

    if (upstreamBaseUrl) {
      return proxyApiRequest(request, upstreamBaseUrl);
    }

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

  ipcMain.handle("shell:open-external", async (_event, url) => {
    const parsedUrl = new URL(url);

    if (parsedUrl.protocol !== "https:") {
      throw new Error("Only HTTPS URLs can be opened externally.");
    }

    await shell.openExternal(parsedUrl.toString());
    return true;
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 1080,
    minHeight: 720,
    title: "Maily",
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
    void mainWindow.loadURL("maily://app/");
  }

  mainWindow.webContents.once("did-finish-load", () => {
    if (app.isPackaged) {
      setTimeout(() => {
        void autoUpdater.checkForUpdates();
      }, 2200);
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  if (pendingDeepLinkUrl) {
    const url = pendingDeepLinkUrl;
    pendingDeepLinkUrl = null;
    void mainWindow.loadURL(url);
  }
}

const gotSingleInstanceLock = app.requestSingleInstanceLock();

if (!gotSingleInstanceLock) {
  app.quit();
} else {
  registerDeepLinkProtocolClient();

  app.on("second-instance", (_event, commandLine) => {
    const deepLinkUrl = commandLine.find((value) =>
      value.startsWith(`${appProtocol}://`),
    );

    if (deepLinkUrl) {
      handleDeepLink(deepLinkUrl);
    }
  });

  app.on("open-url", (event, url) => {
    event.preventDefault();
    handleDeepLink(url);
  });

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
}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

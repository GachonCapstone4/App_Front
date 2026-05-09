const { app, BrowserWindow, net, protocol, shell } = require("electron");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const isDev = Boolean(process.env.ELECTRON_RENDERER_URL);
const rendererRoot = path.join(__dirname, "../dist");

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
    return;
  }

  void mainWindow.loadURL("emailassist://app/");
}

app.whenReady().then(() => {
  registerRendererProtocol();
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

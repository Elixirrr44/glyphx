/**
 * GlyphX desktop shell (Electron main process).
 *
 * Serves the static Next.js export in ../out over a private, secure `app://glyphx`
 * protocol, so the app works fully offline and keeps its own localStorage.
 * The renderer runs sandboxed with no Node.js access.
 *
 * Self-test: set GLYPHX_SELFTEST=<folder> to load every page, check copy and
 * client-side navigation, save screenshots + results.json there, then quit.
 */
const { app, BrowserWindow, Menu, clipboard, ipcMain, protocol, session, shell } = require("electron");
const fs = require("node:fs");
const path = require("node:path");

const SCHEME = "app";
const HOST = "glyphx";
const ORIGIN = `${SCHEME}://${HOST}`;
const WEB_ROOT = path.join(__dirname, "..", "out");
const SELFTEST_DIR = process.env.GLYPHX_SELFTEST || "";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".map": "application/json; charset=utf-8",
};

// Next's runtime needs inline scripts/styles; everything else is restricted to the app itself.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
  "frame-ancestors 'none'",
].join("; ");

protocol.registerSchemesAsPrivileged([
  {
    scheme: SCHEME,
    privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true, codeCache: true },
  },
]);

if (SELFTEST_DIR) {
  // Keep test runs away from the user's real favorites/history.
  app.setPath("userData", path.join(SELFTEST_DIR, "user-data"));
}

const isFile = (p) => {
  try {
    return fs.statSync(p).isFile();
  } catch {
    return false;
  }
};

/** Map a URL path to a file inside WEB_ROOT, or null. Blocks path traversal. */
function resolveFile(urlPath) {
  let rel;
  try {
    rel = decodeURIComponent(urlPath);
  } catch {
    return null;
  }
  if (rel.endsWith("/")) rel += "index.html";
  const file = path.normalize(path.join(WEB_ROOT, rel));
  if (file !== WEB_ROOT && !file.startsWith(WEB_ROOT + path.sep)) return null;
  const candidates = path.extname(file) ? [file] : [file, path.join(file, "index.html"), `${file}.html`];
  return candidates.find(isFile) ?? null;
}

async function serve(request) {
  const url = new URL(request.url);
  if (url.host !== HOST) return new Response("Not found", { status: 404 });
  const file = resolveFile(url.pathname);
  const headers = { "x-content-type-options": "nosniff" };
  if (!file) {
    const notFound = path.join(WEB_ROOT, "404.html");
    const body = isFile(notFound) ? await fs.promises.readFile(notFound) : "Not found";
    return new Response(body, { status: 404, headers: { ...headers, "content-type": MIME[".html"], "content-security-policy": CSP } });
  }
  const ext = path.extname(file).toLowerCase();
  const type = MIME[ext] ?? "application/octet-stream";
  if (ext === ".html") headers["content-security-policy"] = CSP;
  return new Response(await fs.promises.readFile(file), { headers: { ...headers, "content-type": type } });
}

// ---------------------------------------------------------------------------
// Window state (size, position, maximized) persisted between launches
// ---------------------------------------------------------------------------

const stateFile = () => path.join(app.getPath("userData"), "window-state.json");

function loadWindowState() {
  try {
    const s = JSON.parse(fs.readFileSync(stateFile(), "utf8"));
    if (typeof s.width === "number" && typeof s.height === "number") return s;
  } catch {
    // first launch
  }
  return { width: 1280, height: 860, maximized: false };
}

function saveWindowState(win) {
  try {
    const maximized = win.isMaximized();
    const b = maximized ? win.getNormalBounds() : win.getBounds();
    fs.writeFileSync(stateFile(), JSON.stringify({ ...b, maximized }));
  } catch {
    // not fatal
  }
}

// ---------------------------------------------------------------------------
// Window
// ---------------------------------------------------------------------------

let mainWindow = null;

function isAppUrl(url) {
  return url === ORIGIN || url.startsWith(`${ORIGIN}/`);
}

function createWindow() {
  const state = SELFTEST_DIR ? { width: 1280, height: 860 } : loadWindowState();
  const win = new BrowserWindow({
    width: state.width,
    height: state.height,
    x: state.x,
    y: state.y,
    minWidth: 380,
    minHeight: 560,
    title: "GlyphX",
    backgroundColor: "#0d0b14",
    icon: path.join(__dirname, "assets", process.platform === "win32" ? "icon.ico" : "icon.png"),
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
      devTools: !app.isPackaged,
      preload: path.join(__dirname, "preload.cjs"),
    },
  });

  win.once("ready-to-show", () => {
    if (state.maximized) win.maximize();
    if (!SELFTEST_DIR) win.show();
  });
  win.on("close", () => saveWindowState(win));

  // Links to the web open in the user's browser; the app never navigates away from itself.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    return { action: "deny" };
  });
  win.webContents.on("will-navigate", (event, url) => {
    if (isAppUrl(url)) return;
    event.preventDefault();
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
  });

  // Zoom and full-screen shortcuts (there is no menu bar on Windows/Linux).
  win.webContents.on("before-input-event", (event, input) => {
    if (input.type !== "keyDown") return;
    const wc = win.webContents;
    if (input.key === "F11") {
      win.setFullScreen(!win.isFullScreen());
      event.preventDefault();
      return;
    }
    if (!(input.control || input.meta) || input.alt) return;
    if (input.key === "=" || input.key === "+") wc.setZoomLevel(Math.min(wc.getZoomLevel() + 0.5, 4));
    else if (input.key === "-") wc.setZoomLevel(Math.max(wc.getZoomLevel() - 0.5, -3));
    else if (input.key === "0") wc.setZoomLevel(0);
    else return;
    event.preventDefault();
  });

  win.loadURL(`${ORIGIN}/`);
  return win;
}

function buildMenu() {
  if (process.platform !== "darwin") {
    Menu.setApplicationMenu(null);
    return;
  }
  // macOS needs an Edit menu for copy/paste shortcuts to work.
  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      { role: "appMenu" },
      { role: "editMenu" },
      {
        label: "View",
        submenu: [{ role: "resetZoom" }, { role: "zoomIn" }, { role: "zoomOut" }, { type: "separator" }, { role: "togglefullscreen" }],
      },
      { role: "windowMenu" },
    ]),
  );
}

function lockDownPermissions() {
  // Only the clipboard is needed (copy buttons and the Paste button).
  const allowed = new Set(["clipboard-read", "clipboard-sanitized-write"]);
  session.defaultSession.setPermissionRequestHandler((_wc, permission, callback) => callback(allowed.has(permission)));
  session.defaultSession.setPermissionCheckHandler((_wc, permission) => allowed.has(permission));
}

/** Native clipboard access for the page (works even when the window isn't focused). */
function registerIpc() {
  const MAX = 2_000_000;
  const fromApp = (event) => isAppUrl(event.senderFrame?.url ?? "");
  ipcMain.handle("glyphx:copy-text", async (event, text) => {
    if (!fromApp(event) || typeof text !== "string" || text.length > MAX) return false;
    await clipboard.writeText(text);
    return true;
  });
  ipcMain.handle("glyphx:read-text", async (event) => {
    if (!fromApp(event)) return "";
    const text = await clipboard.readText();
    return text.length > MAX ? text.slice(0, MAX) : text;
  });
}

// ---------------------------------------------------------------------------
// Self-test (used to verify packaged builds)
// ---------------------------------------------------------------------------

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

async function loadAndWait(win, url, settle = 2500) {
  await win.loadURL(url);
  await delay(settle);
}

async function runSelfTest(win) {
  fs.mkdirSync(SELFTEST_DIR, { recursive: true });
  const errors = [];
  win.webContents.on("console-message", (event) => {
    if (event.level === "error") errors.push(String(event.message).slice(0, 300));
  });
  win.webContents.on("did-fail-load", (_e, code, desc, url) => errors.push(`did-fail-load ${code} ${desc} ${url}`));

  const pages = ["/", "/generator/", "/emoji-lab/", "/triangle-studio/", "/glitch-studio/", "/designer/?preset=tri-circle", "/presets/", "/favorites/", "/settings/"];
  const results = { pages: {}, errors };
  const probe = `({
    h1: document.querySelector("h1")?.textContent ?? null,
    cards: document.querySelectorAll("article").length,
    glyphs: document.querySelectorAll(".glyph").length,
    stylesheets: document.styleSheets.length,
    bodyBg: getComputedStyle(document.body).backgroundColor,
    fontsLoaded: document.fonts.status,
  })`;
  for (const p of pages) {
    await loadAndWait(win, `${ORIGIN}${p}`);
    results.pages[p] = await win.webContents.executeJavaScript(probe);
    if (p === "/" || p === "/triangle-studio/") {
      const img = await win.webContents.capturePage();
      fs.writeFileSync(path.join(SELFTEST_DIR, p === "/" ? "dashboard.png" : "triangle-studio.png"), img.toPNG());
    }
  }

  // Copy: click a preview card and read the system clipboard back (then restore it).
  await loadAndWait(win, `${ORIGIN}/`);
  const before = await clipboard.readText();
  await win.webContents.executeJavaScript(`document.querySelector('[aria-label="Copy Triangle Overlay output"]')?.click(); true`);
  await delay(800);
  const copied = await clipboard.readText();
  if (before) await clipboard.writeText(before);
  results.copy = {
    copied,
    hasTriangle: copied.includes(String.fromCharCode(0x20e4)),
    bridge: await win.webContents.executeJavaScript(`!!window.glyphxDesktop?.isDesktop`), history: await win.webContents.executeJavaScript(`localStorage.getItem("glyphx:v1:history")`) };

  // Client-side navigation through the router (exercises the RSC payload files).
  await win.webContents.executeJavaScript(`document.querySelector('nav a[href^="/generator"]')?.click(); true`);
  await delay(2500);
  results.clientNav = await win.webContents.executeJavaScript(`({ path: location.pathname, h1: document.querySelector("h1")?.textContent, cards: document.querySelectorAll("article").length })`);

  // Unknown routes fall back to the 404 page.
  await loadAndWait(win, `${ORIGIN}/does-not-exist`, 1000);
  results.notFound = await win.webContents.executeJavaScript(`document.title`);

  fs.writeFileSync(path.join(SELFTEST_DIR, "results.json"), JSON.stringify(results, null, 2));
}

// ---------------------------------------------------------------------------
// App lifecycle
// ---------------------------------------------------------------------------

if (!SELFTEST_DIR && !app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  });

  app.whenReady().then(async () => {
    protocol.handle(SCHEME, serve);
    lockDownPermissions();
    registerIpc();
    buildMenu();
    mainWindow = createWindow();
    mainWindow.on("closed", () => {
      mainWindow = null;
    });

    if (SELFTEST_DIR) {
      try {
        await runSelfTest(mainWindow);
      } catch (err) {
        fs.writeFileSync(path.join(SELFTEST_DIR, "results.json"), JSON.stringify({ fatal: String(err && err.stack ? err.stack : err) }));
      }
      app.exit(0);
    }

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) mainWindow = createWindow();
    });
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
  });
}

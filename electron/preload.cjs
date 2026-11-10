/**
 * Minimal, sandboxed bridge exposed to the GlyphX page as `window.glyphxDesktop`.
 * Only clipboard text access is offered; the page gets no Node.js or file access.
 */
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("glyphxDesktop", {
  isDesktop: true,
  copyText: (text) => ipcRenderer.invoke("glyphx:copy-text", String(text)),
  readText: () => ipcRenderer.invoke("glyphx:read-text"),
});

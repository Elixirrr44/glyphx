import type { NextConfig } from "next";

/**
 * Build targets (GLYPHX_TARGET):
 *   (unset)   regular Next.js web build (Vercel / `next start`)
 *   desktop   static export in ./out, served from disk by the Electron shell (electron/main.cjs)
 *   pages     static export in ./out-pages for GitHub Pages at https://<user>.github.io/glyphx/,
 *             with a home-screen manifest and an offline service worker (scripts/pages.mjs)
 */
const target = process.env.GLYPHX_TARGET;

/** GitHub Pages serves a project site from /<repository name>. */
const PAGES_BASE_PATH = "/glyphx";

const turbopack: NextConfig["turbopack"] = {
  rules: {
    "*.css": {
      loaders: ["@tailwindcss/turbopack"],
      as: "*.css",
    },
  },
};

const webConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  turbopack,
};

// Static export can't use Partial Prerendering (part of Cache Components). GlyphX
// doesn't rely on either: every page is client-rendered from local data.
const desktopConfig: NextConfig = {
  output: "export",
  // /generator -> out/generator/index.html, which maps cleanly onto the app:// protocol.
  trailingSlash: true,
  // With a custom distDir, Next writes the export straight into it; "out" is where
  // electron/main.cjs and electron-builder expect the files. Using a separate
  // folder also keeps the web build's .next cache untouched.
  distDir: "out",
  turbopack,
};

const pagesConfig: NextConfig = {
  output: "export",
  // GitHub Pages serves /glyphx/generator/ from generator/index.html.
  trailingSlash: true,
  basePath: PAGES_BASE_PATH,
  distDir: "out-pages",
  env: {
    NEXT_PUBLIC_BASE_PATH: PAGES_BASE_PATH,
    NEXT_PUBLIC_ENABLE_SW: "1",
  },
  turbopack,
};

export default target === "desktop" ? desktopConfig : target === "pages" ? pagesConfig : webConfig;

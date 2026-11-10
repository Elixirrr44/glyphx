import type { NextConfig } from "next";

/**
 * GLYPHX_TARGET=desktop produces a fully static export in ./out that the
 * Electron shell (electron/main.cjs) serves from disk. The web build is unchanged.
 */
const desktop = process.env.GLYPHX_TARGET === "desktop";

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

export default desktop ? desktopConfig : webConfig;

# GlyphX — Unicode Text & Emoji Designer

GlyphX turns anything you type into real, copy-pasteable Unicode effects: combining
triangle overlays (`G⃤A⃤N⃤G⃤`), strikes (`H̷E̷L̷L̷O̷`), enclosing circles and squares
(`T⃝E⃝X⃝T⃝`, `T⃞E⃞X⃞T⃞`), zalgo, mathematical fonts, emoji frames, Discord markdown
and ANSI colour blocks. Everything is generated locally on your device — no API keys,
no backend, no images.

## Download (Windows)

**[⬇ Download the latest GlyphX for Windows](https://github.com/Elixirrr44/glyphx/releases/latest)**

- **`GlyphX-Setup-x.y.z.exe`** — installer. Adds GlyphX to the Start menu and desktop; uninstall from Settings → Apps.
- **`GlyphX-x.y.z-Portable.exe`** — single file that runs without installing.

Works on 64-bit Windows 10 and 11, fully offline. The app isn't code-signed yet, so on first launch Windows
shows *"Windows protected your PC"*: click **More info → Run anyway**. Your browser may also say the file
"isn't commonly downloaded" — choose **Keep**.

## Features

| Area | What it does |
| --- | --- |
| **Dashboard** | Text box, 24 featured live previews with one-click copy, recently used styles, smart generators, category shortcuts. |
| **Text Generator** | All 137 presets generated live, search, category/favorites/"mine" filters, sorting, multi-select **batch copy**. |
| **Emoji Lab** | Emoji picker (≈1,050 emoji, name search, skin tones), emoji combination generator, combining overlays on emoji, skin-tone sequences. |
| **Triangle Studio** | U+20E4 overlay builder (add circle/square/strike/… to the triangle), text/emoji/all scopes, 8 variants, side-by-side font previews, compatibility report, explanation of how the combining mark works. |
| **Glitch Studio** | Zalgo up/through/below sliders, randomness, noise characters, base font, random case, re-roll, safety caps, and a "clean up zalgo" tool. |
| **Custom Designer** | Ordered layer stack (15 layer types), prefix/suffix, between-character decorations, stacked marks with overlap warnings, glitch intensity, random style, **undo/redo** (Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z, Ctrl+Y), Unicode character picker that inserts into the focused field, save/update presets. |
| **Presets** | Library grouped by category with the exact layer recipe of each preset; rename/delete/import/export your own presets. |
| **Favorites** | Favorite styles, saved texts, recently used styles and copy history. |
| **Settings** | Accent colour, preview font & size, reduced motion, compatibility indicators, mark cap, input/output normalization, batch separator, history size, backup export/import, reset. |
| **Inspector** | For any output: graphemes, code points, official Unicode names (Unicode 16 data), general category, block, UTF-16/UTF-8 encodings, NFC/NFKC stability, a "plain text" version, compatibility report and font previews. |

### The 10 preset categories (137 presets)

Triangle Effects · Emoji Effects · Glitch / Zalgo · Gothic & Dark · Gaming Nicknames ·
Aesthetic Text · Symbol Decorations · Enclosed Characters · Discord Text · Custom Effects.
A test asserts that **every preset produces a unique output** — there are no renamed duplicates.

## Getting started

Requirements: **Node.js 20.9+** (developed on Node 26) and npm. The build downloads Google Fonts
(Inter, Space Grotesk, JetBrains Mono, Noto Sans Math, Noto Sans Symbols 2), so it needs network access.

```bash
npm install
```

```bash
npm run dev
```

Open http://localhost:3000.

### Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Development server (Turbopack). |
| `npm run build` | Production build. All routes are prerendered as static content. |
| `npm start` | Serve the production build. |
| `npm run check` | Type-check, lint and run all tests. |
| `npm test` / `npm run test:watch` | Vitest test suite (127 tests). |
| `npm run typecheck` / `npm run lint` | TypeScript and ESLint on their own. |
| `npm run unicode:names` | Regenerate `src/lib/unicode/names.generated.ts` from Python's `unicodedata` (needs Python 3). |
| `npm run desktop` | Build the static export and open it in the desktop shell (no installer). |
| `npm run desktop:dist` | Build the Windows installer and portable exe into `release/`. |
| `npm run desktop:selftest` | Launch the packaged `release/win-unpacked/GlyphX.exe` invisibly, check every page, copy and navigation, and print the results. |
| `npm run icons` | Regenerate the app icon (`electron/assets/`) and the web favicon. |

## Desktop app (Windows .exe)

`npm run desktop:dist` produces two files in `release/`:

| File | Use it when |
| --- | --- |
| `GlyphX-Setup-0.1.0.exe` | You want a normal install: the installer adds GlyphX to the Start menu and the desktop, and it can be removed from **Settings → Apps**. |
| `GlyphX-0.1.0-Portable.exe` | You want one file that runs without installing (it unpacks itself on each launch, so it starts a little slower). |

Either file can be shared with anyone on 64-bit Windows 10 or 11 — upload it to GitHub Releases, Google Drive,
Dropbox or similar. The app works fully offline and needs no Node.js or browser.

**Windows SmartScreen.** The exe isn't code-signed, so the first time someone runs it Windows shows
"Windows protected your PC". They click **More info → Run anyway**. To remove the warning you need a
code-signing certificate; electron-builder signs automatically when `CSC_LINK` (path or URL of the `.pfx`)
and `CSC_KEY_PASSWORD` are set before running `npm run desktop:dist`.

**How it works.** `GLYPHX_TARGET=desktop` switches Next.js to a static export in `out/` (Cache Components is
web-only, because static export can't use it). `electron/main.cjs` serves those files over a private
`app://glyphx` protocol and runs the page sandboxed with no Node.js access. `electron/preload.cjs` exposes only
clipboard read/write, so copying works even when the window isn't focused. Links to websites open in the
user's normal browser. Each user's favorites, presets and history are stored in their Windows profile
(`%APPDATA%\GlyphX`) and survive updates. The window remembers its size and position. Shortcuts:
Ctrl + `=` / `-` / `0` zoom in, out and reset; F11 toggles full screen.

**New versions.** Bump `version` in `package.json` and run `npm run desktop:dist` again; the installer
upgrades an existing install in place. macOS (`.dmg`) and Linux (`.AppImage`) targets are configured too,
but they must be built on those systems and haven't been tested.

## Deployment

GlyphX has no server-side state, so any Next.js host works.

- **Vercel**: import the repository; the defaults (`npm run build`) are correct. No environment variables are needed.
- **Node server / container**: `npm ci && npm run build && npm start` (set `PORT` to change the port).

User data (favorites, presets, history, settings) lives in the visitor's `localStorage`, so deployments never need a database.

## Architecture

```
electron/
  main.cjs                Desktop shell: app:// file protocol, window, permissions, self-test
  preload.cjs             Clipboard-only bridge exposed as window.glyphxDesktop
  assets/                 App icon (.ico / .png), generated by scripts/make-icon.mjs
scripts/
  desktop.mjs             Desktop export / run / package / self-test helper
src/
  app/                    Next.js App Router pages (one per nav item) + layout, theme CSS
  components/
    glyph/                App shell, result cards/grid, text composer, pickers, inspector,
                          compatibility panel, smart tools, shared primitives
    designer/             Layer editors and the picker's "insert into focused field" registry
    views/                Client views for each page
    ui/                   shadcn/ui components (Radix)
  hooks/                  Persistent-store hooks, copy, undo/redo history, hotkeys, font detection
  lib/
    unicode/
      segment.ts          Grapheme segmentation (Intl.Segmenter + rule-based fallback)
      engine.ts           Deterministic layer pipeline with safety caps
      alphabets.ts        31 Unicode "fonts" (Mathematical Alphanumerics, enclosed, small caps…)
      marks.ts            55 catalogued combining marks + zalgo pools
      compat.ts           Cross-platform compatibility heuristics and length checks
      inspect.ts          Code point names, categories, blocks, encodings, text stats
      names.generated.ts  Unicode 16 name table (lazy-loaded only when names are needed)
    presets.ts            The preset library and categories
    generators.ts         Random styles, mixed effects, nicknames, emoji combos, triangle variants
    storage.ts            localStorage stores (useSyncExternalStore), validation, import/export
    clipboard.ts          Clipboard API with execCommand fallback
```

### How the engine works

1. **Input** is repaired (lone surrogates → U+FFFD) and normalized (NFC by default; configurable).
2. It is split into **grapheme clusters** with `Intl.Segmenter`, so `👨‍👩‍👧`, `👍🏽`, `🇺🇸`, `1️⃣` and
   `🏴󠁧󠁢󠁳󠁣󠁴󠁿` are single units. A rule-based fallback covers older browsers.
3. Each **layer** (font, case, marks, zalgo, wraps, separators, emoji, flip, reverse, ANSI…) is a
   pure function over those units. Combining marks are always appended after a *whole* cluster;
   decorations are tracked separately so later marks never land on them.
4. **Safety caps** bound marks per grapheme (default 24, hard max 100), input length (1,000 graphemes)
   and output length, so pathological input can't freeze the page.
5. Output is optionally NFC-normalized. NFKC is never applied because it would turn `𝐀` back into `A`.

Randomness (zalgo, glitch characters, random case) uses a seeded PRNG per character, so results
are reproducible and earlier characters don't change while you type.

### Rendering caveats

Combining marks and styled letters are real characters, but how they *look* depends on the reader's
fonts. Enclosing marks (⃤ ⃝ ⃞ ⃟) are drawn offset or not at all by many fonts, and colour emoji fonts
usually ignore them. GlyphX shows a compatibility dot on every result, a detailed report and
side-by-side previews across common fonts (detecting which are installed) so you can check before
posting. Platform character limits shown in the report are approximate.

## Testing

`npm test` covers:

- grapheme segmentation (native and fallback) for ZWJ sequences, skin tones, flags, keycaps, tag sequences, Hangul and zalgo;
- every engine layer, emoji-safe mark placement, determinism, caps, malformed input and normalization;
- preset generation (≥100 presets, 10 categories, unique outputs and recipes, hostile inputs, serialization);
- clipboard copy (Clipboard API, `execCommand` fallback, failure) and a rendered `CopyButton` component test;
- storage (persistence, corrupted data, quota errors, cross-tab sync, import/export, settings validation);
- compatibility analysis, the inspector, generators and the undo/redo reducer.

## License

[MIT](LICENSE) © 2026 Elixirrr44

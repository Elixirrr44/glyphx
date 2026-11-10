/**
 * Desktop build helper.
 *
 *   node scripts/desktop.mjs web       static export into ./out
 *   node scripts/desktop.mjs start     export, then open the app in Electron
 *   node scripts/desktop.mjs dist      export, then build the Windows installer + portable exe into ./release
 *   node scripts/desktop.mjs selftest  run the packaged app's self-test (after dist)
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const mode = process.argv[2] ?? "start";
const isWin = process.platform === "win32";

function run(cmd, args, env = {}) {
  // Arguments are fixed strings, so joining them for the Windows shell (needed for npx.cmd) is safe.
  const res = isWin
    ? spawnSync([cmd, ...args].join(" "), { stdio: "inherit", shell: true, env: { ...process.env, ...env } })
    : spawnSync(cmd, args, { stdio: "inherit", env: { ...process.env, ...env } });
  if (res.status !== 0) process.exit(res.status ?? 1);
}

function exportWeb() {
  run("npx", ["next", "build"], { GLYPHX_TARGET: "desktop" });
  if (!existsSync(join("out", "index.html"))) {
    console.error("Static export failed: out/index.html is missing.");
    process.exit(1);
  }
}

switch (mode) {
  case "web":
    exportWeb();
    break;
  case "start":
    exportWeb();
    run("npx", ["electron", "."]);
    break;
  case "dist": {
    exportWeb();
    const target = isWin ? "--win" : process.platform === "darwin" ? "--mac" : "--linux";
    run("npx", ["electron-builder", target, "--publish", "never"]);
    break;
  }
  case "selftest": {
    const exe = join("release", "win-unpacked", "GlyphX.exe");
    if (!existsSync(exe)) {
      console.error(`Build the app first (npm run desktop:dist); ${exe} not found.`);
      process.exit(1);
    }
    const dir = mkdtempSync(join(tmpdir(), "glyphx-selftest-"));
    spawnSync(exe, [], { stdio: "inherit", env: { ...process.env, GLYPHX_SELFTEST: dir } });
    console.log(readFileSync(join(dir, "results.json"), "utf8"));
    console.log(`Screenshots saved in ${dir}`);
    break;
  }
  default:
    console.error(`Unknown mode "${mode}". Use web, start, dist or selftest.`);
    process.exit(1);
}

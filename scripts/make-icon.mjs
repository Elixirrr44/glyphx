/**
 * Renders the GlyphX app icon without any image libraries:
 * a neon violet→blue rounded square with a white enclosing-triangle outline
 * and a sparkle, anti-aliased by supersampling.
 *
 * Writes:
 *   electron/assets/icon.png   (512×512, used by the window and Linux/macOS builds)
 *   electron/assets/icon.ico   (16–256 px, used by the Windows exe and installer)
 *   src/app/favicon.ico        (16–48 px, browser tab icon for the web build)
 *
 * Usage: node scripts/make-icon.mjs
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// ---------------------------------------------------------------------------
// Geometry (normalised 0..1 coordinates)
// ---------------------------------------------------------------------------

const RADIUS = 0.22; // rounded-square corner radius
const TRI_CX = 0.5;
const TRI_CY = 0.56;
const TRI_R = 0.3; // circumradius
const STROKE = 0.062;
const SPARK = 0.095;

const tri = [
  [TRI_CX, TRI_CY - TRI_R],
  [TRI_CX + TRI_R * Math.sin(Math.PI / 3), TRI_CY + TRI_R / 2],
  [TRI_CX - TRI_R * Math.sin(Math.PI / 3), TRI_CY + TRI_R / 2],
];

function insideRoundedSquare(x, y) {
  const r = RADIUS;
  const qx = Math.max(Math.abs(x - 0.5) - (0.5 - r), 0);
  const qy = Math.max(Math.abs(y - 0.5) - (0.5 - r), 0);
  return qx * qx + qy * qy <= r * r;
}

function distToSegment(px, py, [ax, ay], [bx, by]) {
  const dx = bx - ax;
  const dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function onTriangleStroke(x, y) {
  const d = Math.min(distToSegment(x, y, tri[0], tri[1]), distToSegment(x, y, tri[1], tri[2]), distToSegment(x, y, tri[2], tri[0]));
  return d <= STROKE / 2;
}

function inSparkle(x, y) {
  // Four-pointed star: |dx|^0.5 + |dy|^0.5 <= s^0.5
  const dx = Math.abs(x - TRI_CX) / SPARK;
  const dy = Math.abs(y - (TRI_CY + 0.012)) / SPARK;
  return Math.sqrt(dx) + Math.sqrt(dy) <= 1;
}

const lerp = (a, b, t) => a + (b - a) * t;
const VIOLET = [176, 108, 255];
const BLUE = [61, 139, 255];
const DEEP = [36, 18, 72];

function background(x, y) {
  const t = Math.min(1, Math.max(0, (x * 0.55 + y * 0.45)));
  let c = VIOLET.map((v, i) => lerp(v, BLUE[i], t));
  // soft highlight top-left, deeper bottom edge
  const hl = Math.max(0, 1 - Math.hypot(x - 0.2, y - 0.15) / 0.7) * 0.22;
  c = c.map((v) => lerp(v, 255, hl));
  const shade = Math.max(0, y - 0.6) * 0.45;
  return c.map((v, i) => lerp(v, DEEP[i], shade));
}

/** Render an RGBA buffer of `size`×`size` with `ss`×`ss` supersampling. */
function render(size, ss = 4) {
  const px = Buffer.alloc(size * size * 4);
  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size; i++) {
      let cover = 0;
      let white = 0;
      let r = 0;
      let g = 0;
      let b = 0;
      for (let sy = 0; sy < ss; sy++) {
        for (let sx = 0; sx < ss; sx++) {
          const x = (i + (sx + 0.5) / ss) / size;
          const y = (j + (sy + 0.5) / ss) / size;
          if (!insideRoundedSquare(x, y)) continue;
          cover++;
          const isWhite = onTriangleStroke(x, y) || inSparkle(x, y);
          const [br, bg, bb] = isWhite ? [255, 255, 255] : background(x, y);
          if (isWhite) white++;
          r += br;
          g += bg;
          b += bb;
        }
      }
      const o = (j * size + i) * 4;
      if (cover > 0) {
        px[o] = Math.round(r / cover);
        px[o + 1] = Math.round(g / cover);
        px[o + 2] = Math.round(b / cover);
      }
      px[o + 3] = Math.round((cover / (ss * ss)) * 255);
      void white;
    }
  }
  return px;
}

// ---------------------------------------------------------------------------
// PNG + ICO encoding
// ---------------------------------------------------------------------------

const CRC_TABLE = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

function encodePng(size, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0; // filter: none
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/** ICO container holding PNG-compressed images (supported since Windows Vista). */
function encodeIco(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  const entries = [];
  let offset = 6 + 16 * images.length;
  for (const { size, png } of images) {
    const e = Buffer.alloc(16);
    e[0] = size >= 256 ? 0 : size;
    e[1] = size >= 256 ? 0 : size;
    e[2] = 0;
    e[3] = 0;
    e.writeUInt16LE(1, 4);
    e.writeUInt16LE(32, 6);
    e.writeUInt32LE(png.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += png.length;
    entries.push(e);
  }
  return Buffer.concat([header, ...entries, ...images.map((i) => i.png)]);
}

const pngFor = (size) => ({ size, png: encodePng(size, render(size, size <= 48 ? 8 : 4)) });

const assets = join(root, "electron", "assets");
mkdirSync(assets, { recursive: true });
writeFileSync(join(assets, "icon.png"), encodePng(512, render(512, 3)));
writeFileSync(join(assets, "icon.ico"), encodeIco([256, 128, 64, 48, 32, 24, 16].map(pngFor)));
writeFileSync(join(root, "src", "app", "favicon.ico"), encodeIco([48, 32, 16].map(pngFor)));
console.log("Icons written to electron/assets and src/app/favicon.ico");

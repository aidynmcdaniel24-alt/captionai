// Generates PNG icons for the PWA manifest from the brand SVG.
// Run with: node scripts/generate-pwa-icons.mjs

import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const outDir = resolve(__dirname, "..", "public", "icons");

// Brand SVG (square 512 viewBox) — uses the CaptionAI gradient bubble +
// sparkle on a rounded dark background that works well as a home screen
// icon on iOS and Android.
const BASE_SVG = ({ withBackground = true, padding = 0 } = {}) => `<?xml version="1.0" encoding="UTF-8"?>
<svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="512" y2="512" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#7c3aed"/>
      <stop offset="55%" stop-color="#8b5cf6"/>
      <stop offset="100%" stop-color="#d946ef"/>
    </linearGradient>
    <linearGradient id="spark" x1="120" y1="120" x2="392" y2="392" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="100%" stop-color="#fdf4ff"/>
    </linearGradient>
  </defs>
  ${
    withBackground
      ? `<rect width="512" height="512" rx="96" fill="#09090b"/>`
      : ""
  }
  <g transform="translate(${padding},${padding}) scale(${(512 - padding * 2) / 512})">
    <g transform="translate(64,64) scale(8)">
      <path d="M11 6h26a5 5 0 0 1 5 5v18a5 5 0 0 1-5 5H22.7l-7.3 7a1.5 1.5 0 0 1-2.55-1.07V34H11a5 5 0 0 1-5-5V11a5 5 0 0 1 5-5Z" fill="url(#bg)"/>
      <path d="M24 13.2l2.06 5.78a3.4 3.4 0 0 0 2.07 2.07L33.9 23.1l-5.78 2.06a3.4 3.4 0 0 0-2.07 2.07L24 32.99l-2.06-5.77a3.4 3.4 0 0 0-2.07-2.07L14.1 23.1l5.78-2.06a3.4 3.4 0 0 0 2.07-2.07L24 13.2Z" fill="url(#spark)"/>
    </g>
  </g>
</svg>`;

async function ensureDir(d) {
  if (!existsSync(d)) await mkdir(d, { recursive: true });
}

async function renderPng(svg, size, outFile) {
  const buf = await sharp(Buffer.from(svg)).resize(size, size).png({ compressionLevel: 9 }).toBuffer();
  await writeFile(outFile, buf);
  console.log(`✓ ${outFile} (${size}x${size})`);
}

async function main() {
  await ensureDir(outDir);

  const standard = BASE_SVG({ withBackground: true, padding: 0 });
  const maskable = BASE_SVG({ withBackground: true, padding: 64 });

  await Promise.all([
    renderPng(standard, 192, resolve(outDir, "icon-192.png")),
    renderPng(standard, 512, resolve(outDir, "icon-512.png")),
    renderPng(maskable, 192, resolve(outDir, "icon-192-maskable.png")),
    renderPng(maskable, 512, resolve(outDir, "icon-512-maskable.png")),
    renderPng(standard, 180, resolve(outDir, "apple-touch-icon.png")),
  ]);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

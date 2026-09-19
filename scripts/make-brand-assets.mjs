// scripts/make-brand-assets.mjs
// Regenerates the brand assets that SEO depends on, in the site's paper theme:
//
//   static/favicon-16x16.png          static/android-chrome-192x192.png
//   static/favicon-32x32.png          static/android-chrome-512x512.png
//   static/apple-touch-icon.png       static/favicon.ico (16/32/48)
//   static/images/share.png           default Open Graph card (1200x630)
//
// Run after any change to the palette (assets/css/schemes/paper.css), the mark,
// or the name/title:
//
//   node scripts/make-brand-assets.mjs
//
// Notes:
//   - Renders SVG -> PNG with @resvg/resvg-js (prebuilt binary, no build tools).
//     Install it with  npm i -D @resvg/resvg-js  , or point RESVG_MODULE at an
//     existing install (a package specifier or a file URL).
//   - Windows needs explicit font files; Georgia for the mark and wordmark,
//     Consolas for the small mono captions.
//   - The ICO is written by hand (PNG entries in an ICO container), because
//     resvg only emits PNG.

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

let Resvg
try {
  ;({ Resvg } = await import(process.env.RESVG_MODULE ?? '@resvg/resvg-js'))
} catch {
  console.error(
    'error: @resvg/resvg-js not found. Install it (npm i -D @resvg/resvg-js) or set RESVG_MODULE.',
  )
  process.exit(1)
}

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(scriptDir, '..')
const OUT = path.join(root, 'static')

const FONT_DIR = process.env.FONT_DIR ?? 'C:/Windows/Fonts'
const FONTS = ['georgia.ttf', 'georgiab.ttf', 'consola.ttf', 'consolab.ttf'].map((f) =>
  path.join(FONT_DIR, f),
)
const fontOpts = { fontFiles: FONTS, loadSystemFonts: false, defaultFontFamily: 'Georgia' }

// Paper theme palette (kept in step with assets/css/schemes/paper.css).
const PAPER = '#faf8f3'
const INK = '#1b1a17'
const INK_SOFT = '#44403a'
const CLAY = '#c1603c'
const HAIRLINE = '#dfdbd0'
const MOSS = '#78876a'

function render(svg, width) {
  return new Resvg(svg, { fitTo: { mode: 'width', value: width }, font: fontOpts })
    .render()
    .asPng()
}

/* ---------- mark: clay tile with a paper serif A ---------- */

// One corner radius for every size: 16% of the tile, the same rounding the
// Tetris rain blocks use, expressed in the 512 viewBox so it scales exactly.
const RADIUS = Math.round(512 * 0.16)

function mark() {
  return `<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" rx="${RADIUS}" fill="${CLAY}"/>
  <text x="256" y="${256 + 330 * 0.78 * 0.36}" text-anchor="middle" font-family="Georgia" font-weight="700"
    font-size="${330 * 0.78}" fill="${PAPER}">A</text>
</svg>`
}

/* ---------- default social card ---------- */

function shareCard() {
  return `<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="warm" cx="6%" cy="-12%" r="72%">
      <stop offset="0%" stop-color="${CLAY}" stop-opacity="0.12"/>
      <stop offset="100%" stop-color="${CLAY}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="cool" cx="94%" cy="-6%" r="62%">
      <stop offset="0%" stop-color="${MOSS}" stop-opacity="0.10"/>
      <stop offset="100%" stop-color="${MOSS}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="630" fill="${PAPER}"/>
  <rect width="1200" height="630" fill="url(#warm)"/>
  <rect width="1200" height="630" fill="url(#cool)"/>
  <rect x="0.5" y="0.5" width="1199" height="629" fill="none" stroke="${HAIRLINE}"/>

  <text x="96" y="122" font-family="Consolas" font-size="24" letter-spacing="6" fill="${INK_SOFT}" opacity="0.75">ANJULA.DEV</text>

  <text x="96" y="252" font-family="Georgia" font-weight="700" font-size="86" fill="${INK}">Anjula Karunarathne</text>
  <text x="96" y="316" font-family="Georgia" font-size="34" fill="${INK_SOFT}">Associate Tech Lead · Microsoft Certified Azure AI Developer</text>

  <rect x="96" y="368" width="120" height="4" rx="2" fill="${CLAY}"/>

  <text x="96" y="452" font-family="Georgia" font-size="32" fill="${INK_SOFT}">Notes on C#, .NET, Azure and AI-driven workflows,</text>
  <text x="96" y="496" font-family="Georgia" font-size="32" fill="${INK_SOFT}">with projects and photography.</text>

  <text x="1104" y="566" text-anchor="end" font-family="Consolas" font-size="24" fill="${INK_SOFT}" opacity="0.7">anjula.dev</text>
</svg>`
}

/* ---------- ICO container with PNG entries ---------- */

function ico(entries) {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0) // reserved
  header.writeUInt16LE(1, 2) // type: icon
  header.writeUInt16LE(entries.length, 4)

  let offset = 6 + entries.length * 16
  const directory = []
  const payload = []
  for (const { size, png } of entries) {
    const e = Buffer.alloc(16)
    e.writeUInt8(size >= 256 ? 0 : size, 0) // width
    e.writeUInt8(size >= 256 ? 0 : size, 1) // height
    e.writeUInt8(0, 2) // palette
    e.writeUInt8(0, 3) // reserved
    e.writeUInt16LE(1, 4) // planes
    e.writeUInt16LE(32, 6) // bpp
    e.writeUInt32LE(png.length, 8)
    e.writeUInt32LE(offset, 12)
    directory.push(e)
    payload.push(png)
    offset += png.length
  }
  return Buffer.concat([header, ...directory, ...payload])
}

/* ---------- run ---------- */

const web = [
  { file: 'favicon-16x16.png', size: 16 },
  { file: 'favicon-32x32.png', size: 32 },
  { file: 'android-chrome-192x192.png', size: 192 },
  { file: 'android-chrome-512x512.png', size: 512 },
  { file: 'apple-touch-icon.png', size: 180 },
]

for (const { file, size } of web) {
  const png = render(mark(), size)
  await fs.writeFile(path.join(OUT, file), png)
  console.log(`wrote static/${file} (${size}px, ${png.length} bytes)`)
}

const icoSizes = [16, 32, 48]
const icoEntries = icoSizes.map((size) => ({ size, png: render(mark(), size) }))
const icoBuf = ico(icoEntries)
await fs.writeFile(path.join(OUT, 'favicon.ico'), icoBuf)
console.log(`wrote static/favicon.ico (${icoSizes.join('/')}, ${icoBuf.length} bytes)`)

const share = render(shareCard(), 1200)
await fs.writeFile(path.join(OUT, 'images', 'share.png'), share)
console.log(`wrote static/images/share.png (1200x630, ${share.length} bytes)`)

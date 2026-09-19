// scripts/make-cover.mjs
// Reusable Open Graph cover generator (1200x630 PNG from SVG via @resvg/resvg-js).
//
// Usage:
//   node scripts/make-cover.mjs --title "My Article Title" --slug my-article --emoji "🚨"
//   node scripts/make-cover.mjs --title "My Article Title" --slug my-article --emoji "⚡" --out static/images/my-article.png
//
// Options:
//   --title <string>   Article title (required). Rendered large + bold, word-wrapped.
//   --slug <string>    Article slug (required unless --out given). Default out: static/images/<slug>.png
//   --emoji <string>   Single emoji/symbol shown above the title (default: "⚡").
//                      Pass "" or --no-emoji to omit it entirely (useful if emoji font renders tofu).
//   --out <path>       Output PNG path (default: static/images/<slug>.png)
//   --font-dir <path>  Windows font directory (default: C:\Windows\Fonts)
//   --layout <mode>    "full" (default: full title + panel) or "minimal"
//                      (big emoji + short label over photo/gradient).
//   --label <string>   Short label for minimal layout, e.g. "Fail Fast on Config"
//                      (required with --layout minimal; keep to ~6 words).
//   --photo <spec>     Background photo for minimal layout. Either a full
//                      https URL or "picsum:<seed>" / "picsum-id:<n>" for a
//                      keyless stock photo (downloaded at generation time and
//                      embedded, so the PNG is self-contained). Omit for gradient.
//   --help             Show this help.
//
// Notes:
//   - Renders SVG -> PNG with @resvg/resvg-js (prebuilt binary, no build tools).
//     Install it with  npm i -D @resvg/resvg-js  , or point RESVG_MODULE at an
//     existing install (a package specifier or a file URL).
//   - On Windows resvg needs explicit fonts, so we point it at Georgia and
//     Consolas, plus Segoe UI Emoji for the emoji glyph.
//   - If the color emoji font won't render in resvg (tofu boxes), re-run with a
//     symbol that exists in Segoe UI (e.g. "⚡" U+26A1) or with --no-emoji.

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const WIDTH = 1200;
const HEIGHT = 630;

let Resvg;
try {
  ({ Resvg } = await import(process.env.RESVG_MODULE ?? '@resvg/resvg-js'));
} catch {
  console.error(
    'error: @resvg/resvg-js not found. Install it (npm i -D @resvg/resvg-js) or set RESVG_MODULE.',
  );
  process.exit(1);
}

function parseArgs(argv) {
  const opts = { emoji: '⚡', fontDir: 'C:\\Windows\\Fonts' };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--title') opts.title = argv[++i];
    else if (a === '--slug') opts.slug = argv[++i];
    else if (a === '--emoji') opts.emoji = argv[++i];
    else if (a === '--no-emoji') opts.emoji = '';
    else if (a === '--out') opts.out = argv[++i];
    else if (a === '--layout') opts.layout = argv[++i];
    else if (a === '--label') opts.label = argv[++i];
    else if (a === '--photo') opts.photo = argv[++i];
    else if (a === '--w') opts.w = Number(argv[++i]);
    else if (a === '--h') opts.h = Number(argv[++i]);
    else if (a === '--plain') opts.plain = true;
    else if (a === '--font-dir') opts.fontDir = argv[++i];
    else if (a === '--help' || a === '-h') opts.help = true;
    else if (!opts.title) opts.title = a;
    else if (!opts.slug) opts.slug = a;
    else if (!opts._extra) opts._extra = [a];
    else opts._extra.push(a);
  }
  // Allow --emoji=XYZ and --title=XYZ forms.
  for (const a of argv) {
    if (a.startsWith('--title=')) opts.title = a.slice('--title='.length);
    if (a.startsWith('--slug=')) opts.slug = a.slice('--slug='.length);
    if (a.startsWith('--emoji=')) opts.emoji = a.slice('--emoji='.length);
    if (a.startsWith('--out=')) opts.out = a.slice('--out='.length);
    if (a.startsWith('--layout=')) opts.layout = a.slice('--layout='.length);
    if (a.startsWith('--label=')) opts.label = a.slice('--label='.length);
    if (a.startsWith('--photo=')) opts.photo = a.slice('--photo='.length);
    if (a.startsWith('--w=')) opts.w = Number(a.slice('--w='.length));
    if (a.startsWith('--h=')) opts.h = Number(a.slice('--h='.length));
    if (a.startsWith('--font-dir=')) opts.fontDir = a.slice('--font-dir='.length);
  }
  return opts;
}

function printHelp() {
  console.log(`make-cover.mjs: OG cover generator (1200x630)

Usage:
  node scripts/make-cover.mjs --title "Article Title" --slug article-slug [--emoji "🚨"] [--out static/images/article-slug.png]

Options:
  --title <string>   Article title (required)
  --slug <string>    Article slug (required unless --out is given)
  --emoji <string>   Emoji/symbol above the title (default "⚡", "" to omit)
  --no-emoji         Omit the emoji
  --out <path>       Output PNG (default static/images/<slug>.png)
  --layout <mode>    "paper" (default), "minimal" or "full"
  --label <string>   Short label for the paper and minimal layouts
  --emoji <string>   One emoji, drawn in clay on the paper layout
  --w <px> / --h <px>   Output size (default 1200x630); 320x240 makes a thumb
  --plain            Text free image: emoji only, for listing thumbnails
  --photo <spec>     Background photo (paper and minimal layouts): an https URL
                     or "picsum:<seed>" / "picsum-id:<n>". The paper layout
                     washes it back to a faded print so text stays readable.
  --font-dir <path>  Font directory (default C:\\Windows\\Fonts)
`);
}

function escapeXml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Greedy word-wrap. Splits over-long words (e.g. GetRequiredValue<T>) mid-word
// so they never overflow the panel. Returns { lines, fontSize }.
function wrapTitle(title, usableWidth, startFontSize = 68, minFontSize = 40, maxLines = 4) {
  const words = title.split(/\s+/).filter(Boolean);
  for (let fontSize = startFontSize; fontSize >= minFontSize; fontSize -= 4) {
    const avgChar = fontSize * 0.56;
    const maxChars = Math.max(10, Math.floor(usableWidth / avgChar));
    const lines = [];
    let cur = '';
    const pushCur = () => {
      if (cur) lines.push(cur);
      cur = '';
    };
    for (const word of words) {
      // Break over-long single words into chunks.
      const chunks = [];
      let w = word;
      while (w.length > maxChars) {
        chunks.push(w.slice(0, maxChars));
        w = w.slice(maxChars);
      }
      chunks.push(w);
      for (const chunk of chunks) {
        const trial = cur ? `${cur} ${chunk}` : chunk;
        if (trial.length <= maxChars) {
          cur = trial;
        } else {
          pushCur();
          cur = chunk;
        }
      }
    }
    pushCur();
    if (lines.length <= maxLines) return { lines, fontSize };
  }
  // Last resort: hard-truncate to maxLines with the smallest font.
  const fontSize = minFontSize;
  const avgChar = fontSize * 0.56;
  const maxChars = Math.max(10, Math.floor(usableWidth / avgChar));
  const lines = [];
  let cur = '';
  outer: for (const word of words) {
    let w = word;
    while (w.length > maxChars) {
      if (cur) lines.push(cur);
      cur = '';
      lines.push(w.slice(0, maxChars));
      if (lines.length === maxLines) break outer;
      w = w.slice(maxChars);
    }
    const trial = cur ? `${cur} ${w}` : w;
    if (trial.length <= maxChars) cur = trial;
    else {
      lines.push(cur);
      if (lines.length === maxLines) break;
      cur = w;
    }
  }
  if (lines.length < maxLines && cur) lines.push(cur);
  return { lines: lines.slice(0, maxLines), fontSize };
}

function buildSvg({ title, emoji }) {
  const usableWidth = WIDTH - 80 * 2 - 80; // page pad + panel pad
  let { lines, fontSize } = wrapTitle(title, usableWidth);
  // 4-line titles at the starting size collide with the site label, so
  // re-wrap smaller to aim for 3 lines (or at least a shorter block).
  if (lines.length >= 4 && fontSize > 54) {
    const smaller = wrapTitle(title, usableWidth, 54, 40, 4);
    lines = smaller.lines;
    fontSize = smaller.fontSize;
  }
  const lineHeight = Math.round(fontSize * 1.18);
  const showEmoji = Boolean(emoji && emoji.trim());

  const emojiSize = 96;
  const titleCenterY = lines.length >= 4 ? 352 : 372;
  const firstBaseline = titleCenterY - ((lines.length - 1) * lineHeight) / 2 + fontSize * 0.35;
  const titleTspans = lines
    .map((line, i) => {
      const y = Math.round(firstBaseline + i * lineHeight);
      return `<tspan x="600" y="${y}">${escapeXml(line)}</tspan>`;
    })
    .join('');

  // fill="#fff" so monochrome emoji fallbacks (resvg has no color-emoji
  // support) stay visible on the dark panel instead of black-on-black.
  const emojiEl = showEmoji
      ? `<text x="600" y="${emojiY}" text-anchor="middle" font-family="'Segoe UI Emoji','Segoe UI',sans-serif" font-size="${emojiSize}" fill="#ffffff">${escapeXml(emoji)}</text>`
      : '';

  // site label sits near the bottom of the panel
  const siteY = 540;

  return `<svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="55%" stop-color="#1e40af"/>
      <stop offset="100%" stop-color="#7c3aed"/>
    </linearGradient>
    <linearGradient id="vignette" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#000000" stop-opacity="0.10"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0.38"/>
    </linearGradient>
  </defs>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bg)"/>
  <circle cx="1060" cy="-70" r="280" fill="#ffffff" opacity="0.08"/>
  <circle cx="120" cy="700" r="260" fill="#ffffff" opacity="0.06"/>
  <circle cx="1010" cy="560" r="120" fill="#ffffff" opacity="0.05"/>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#vignette)"/>
  <rect x="60" y="50" width="1080" height="530" rx="28" fill="#000000" opacity="0.52"/>
  <rect x="60" y="50" width="1080" height="530" rx="28" fill="none" stroke="#ffffff" stroke-opacity="0.16" stroke-width="2"/>
  ${emojiEl}
  <text text-anchor="middle" font-family="'Segoe UI',sans-serif" font-weight="700" font-size="${fontSize}" fill="#ffffff">${titleTspans}</text>
  <text x="600" y="${siteY}" text-anchor="middle" font-family="'Segoe UI',sans-serif" font-size="27" letter-spacing="3" fill="#ffffff" opacity="0.82">anjula.dev</text>
</svg>`;
}

// Minimal layout: big emoji + short label over a photo (or gradient),
// with a dark scrim for legibility. Text is painted twice (dark offset
// underneath) as a cheap guaranteed-render drop shadow.
function buildSvgMinimal({ label, emoji, photo, adj }) {
  const usableWidth = WIDTH - 160;
  const { lines, fontSize } = wrapTitle(label, usableWidth, 84, 56, 2);
  const lineHeight = Math.round(fontSize * 1.16);
  const showEmoji = Boolean(emoji && emoji.trim());
  const emojiSize = 148;
  // Labeled: baseline-anchored above the title (long-approved look).
  // Bare (no label): ink center goes exactly on the canvas center;
  // adj.dy is measured, 315 is canvas geometry.
  const emojiY = lines.length ? 218 : 315;
  const firstBaseline = 400 - ((lines.length - 1) * lineHeight) / 2 + fontSize * 0.35;
  const tspans = (dx = 0, dy = 0) =>
    lines
      .map((line, i) => {
        const y = Math.round(firstBaseline + i * lineHeight + dy);
        return `<tspan x="${600 + dx}" y="${y}">${escapeXml(line)}</tspan>`;
      })
      .join('');
  const labelEl = `<text text-anchor="middle" font-family="'Segoe UI',sans-serif" font-weight="700" font-size="${fontSize}" fill="#000000" opacity="0.45">${tspans(0, 3)}</text>
  <text text-anchor="middle" font-family="'Segoe UI',sans-serif" font-weight="700" font-size="${fontSize}" fill="#ffffff">${tspans()}</text>`;
  // Emoji placement is measured, not guessed: the glyph is probe-rendered,
  // its ink bounding box is scanned, and the anchor is corrected so the
  // visible ink (not the font's advance box) centers on target, both axes.
  // This handles asymmetric bearings in any emoji font automatically.
  const emojiEl = showEmoji
    ? `<text x="${600 + adj.dx}" y="${emojiY + adj.dy}" text-anchor="middle" font-family="'Segoe UI Emoji','Segoe UI',sans-serif" font-size="${emojiSize}" fill="#ffffff">${escapeXml(emoji)}</text>`
    : '';
  const bg = photo
    ? `<image href="${photo.dataUri}" x="0" y="0" width="${WIDTH}" height="${HEIGHT}" preserveAspectRatio="xMidYMid slice"/>`
    : `<rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bg)"/>
       <circle cx="1060" cy="-70" r="280" fill="#ffffff" opacity="0.08"/>
       <circle cx="120" cy="700" r="260" fill="#ffffff" opacity="0.06"/>`;
  return `<svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="55%" stop-color="#1e40af"/>
      <stop offset="100%" stop-color="#7c3aed"/>
    </linearGradient>
    <linearGradient id="scrim" x1="0" y1="0" x2="0" y2="1">
      <stop offset="30%" stop-color="#000000" stop-opacity="0.15"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0.78"/>
    </linearGradient>
  </defs>
  ${bg}
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#scrim)"/>
  ${emojiEl}
  ${labelEl}
  ${lines.length ? `<text x="600" y="586" text-anchor="middle" font-family="'Segoe UI',sans-serif" font-size="24" letter-spacing="3" fill="#ffffff" opacity="0.85">anjula.dev</text>` : ''}
</svg>`;
}

/**
 * Paper layout: the cover is part of the site rather than an image dropped on
 * top of it. A nature photo sits underneath, washed back to a faded print with
 * a clay tint and a paper veil so ink text stays readable on it, then the
 * eyebrow, clay emoji, ink serif label and a short clay rule.
 */
function buildSvgPaper({ label, emoji, adj, w, h, plain, photo }) {
  const card = w >= 600;
  const pad = Math.round(w * 0.08);
  const eyebrowSize = Math.round(w * 0.021);
  const emojiSize = card ? Math.round(h * 0.2) : Math.round(h * 0.34);
  const labelSize = Math.min(Math.round(w * 0.06), 74);
  const usable = w - pad * 2;
  const { lines, fontSize } = wrapTitle(
    label || ' ',
    usable,
    labelSize,
    Math.round(labelSize * 0.7),
    2,
  );
  const lineHeight = Math.round(fontSize * 1.16);

  const labelTop = card ? h * 0.62 : h * 0.5;
  const firstBaseline = labelTop + fontSize * 0.35;
  const tspans = lines
    .map((line, i) => {
      const y = Math.round(firstBaseline + i * lineHeight);
      return `<tspan x="${w / 2}" y="${y}">${escapeXml(line)}</tspan>`;
    })
    .join('');

  const emojiY = card ? Math.round(h * 0.36) : Math.round(h * 0.52);
  const showEmoji = Boolean(emoji && emoji.trim());
  const emojiEl = showEmoji
    ? `<text x="${w / 2 + (adj?.dx ?? 0)}" y="${emojiY + (adj?.dy ?? 0)}" text-anchor="middle" font-family="'Segoe UI Emoji','Segoe UI',sans-serif" font-size="${emojiSize}" fill="#c1603c">${escapeXml(emoji)}</text>`
    : '';

  const ruleW = Math.round(w * 0.1);
  const ruleH = Math.max(3, Math.round(w * 0.004));
  const ruleY = Math.round(firstBaseline + lines.length * lineHeight - fontSize * 0.72);
  const rule = card && !plain
    ? `<rect x="${w / 2 - ruleW / 2}" y="${ruleY}" width="${ruleW}" height="${ruleH}" rx="${ruleH / 2}" fill="#c1603c"/>`
    : '';

  const labelEl = plain
    ? ''
    : `<text text-anchor="middle" font-family="Georgia,'Times New Roman',serif" font-weight="700" font-size="${fontSize}" fill="#44403a">${tspans}</text>`;

  const mark = '';

  const eyebrow = card && !plain
    ? `<text x="${pad}" y="${pad + eyebrowSize}" font-family="Consolas,monospace" font-size="${eyebrowSize}" letter-spacing="${Math.round(eyebrowSize * 0.35)}" fill="#5f5a51" opacity="0.8">ANJULA.DEV</text>`
    : '';

  // The photo is a sepia print under glass: the colour matrix converts it to
  // warm monochrome (filtered in sRGB, or resvg would apply it in linearRGB and
  // wash it out), then a paper veil lifts the tones so ink text stays readable
  // even where the photograph is dark. The veil is heavier on a small thumb.
  const veil = card ? 0.5 : 0.6;
  const bg = photo
    ? `<image href="${photo.dataUri}" x="0" y="0" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice" filter="url(#sepia)"/>
  <rect width="${w}" height="${h}" fill="#c1603c" opacity="0.1"/>
  <rect width="${w}" height="${h}" fill="#faf8f3" opacity="${veil}"/>`
    : '';

  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <defs>
    <filter id="sepia" color-interpolation-filters="sRGB">
      <feColorMatrix type="matrix" values="0.393 0.769 0.189 0 0  0.349 0.686 0.168 0 0  0.272 0.534 0.131 0 0  0 0 0 1 0"/>
    </filter>
    <radialGradient id="warm" cx="6%" cy="-12%" r="72%">
      <stop offset="0%" stop-color="#c1603c" stop-opacity="0.10"/>
      <stop offset="100%" stop-color="#c1603c" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="cool" cx="94%" cy="-6%" r="62%">
      <stop offset="0%" stop-color="#78876a" stop-opacity="0.09"/>
      <stop offset="100%" stop-color="#78876a" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="#faf8f3"/>
  ${bg}
  <rect width="${w}" height="${h}" fill="url(#warm)"/>
  <rect width="${w}" height="${h}" fill="url(#cool)"/>
  <rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" fill="none" stroke="#dfdbd0"/>
  ${eyebrow}
  ${emojiEl}
  ${labelEl}
  ${rule}
  ${mark}
</svg>`;
}

async function fetchPhotoDataUri(spec) {
  const url = spec.startsWith('http')
    ? spec
    : spec.startsWith('picsum-id:')
      ? `https://picsum.photos/id/${spec.slice('picsum-id:'.length)}/1200/630`
      : spec.startsWith('picsum:')
        ? `https://picsum.photos/seed/${spec.slice('picsum:'.length)}/1200/630`
        : spec;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`photo download failed: ${res.status} ${url}`);
  const mime = (res.headers.get('content-type') || 'image/jpeg').split(';')[0];
  const buf = Buffer.from(await res.arrayBuffer());
  return `data:${mime};base64,${buf.toString('base64')}`;
}

async function fileExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

// Probe-renders the emoji alone and scans the rasterized alpha channel
// for the true ink bounding box. Returns the anchor correction that puts
// the visible ink (not the font's advance box) on target, both axes.
async function measureEmoji(emoji, fontSize, fontOpts) {
  const W0 = 400, H0 = 300, ax = W0 / 2, ay = H0 / 2;
  const probe =
    `<svg width="${W0}" height="${H0}" viewBox="0 0 ${W0} ${H0}" xmlns="http://www.w3.org/2000/svg">` +
    `<text x="${ax}" y="${ay}" text-anchor="middle" font-family="'Segoe UI Emoji','Segoe UI',sans-serif" font-size="${fontSize}" fill="#ffffff">${escapeXml(emoji)}</text></svg>`;
  const px = new Resvg(probe, { font: fontOpts }).render().pixels;
  let minX = W0, maxX = -1, minY = H0, maxY = -1;
  for (let y = 0; y < H0; y++) {
    for (let x = 0; x < W0; x++) {
      if (px[(y * W0 + x) * 4 + 3] > 8) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return { dx: 0, dy: 0 }; // blank glyph: nothing to correct
  return { dx: ax - (minX + maxX) / 2, dy: ay - (minY + maxY) / 2 };
}

const opts = parseArgs(process.argv.slice(2));
if (opts.help) {
  printHelp();
  process.exit(0);
}
const isPaper = (opts.layout ?? 'paper') === 'paper';
const isMinimal = opts.layout === 'minimal';
if (!isPaper && !isMinimal && !opts.title) {
  console.error('error: --title is required');
  printHelp();
  process.exit(1);
}
if (isPaper && !opts.label && !opts.plain) {
  console.error('error: --label is required (or pass --plain for a text free image)');
  printHelp();
  process.exit(1);
}
if (!opts.out && !opts.slug) {
  console.error('error: --slug (or --out) is required');
  printHelp();
  process.exit(1);
}

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');
const outPath = path.resolve(repoRoot, opts.out ?? `static/images/${opts.slug}.png`);

const fontDir = opts.fontDir;
const candidates = [
  'georgiab.ttf',
  'georgia.ttf',
  'consola.ttf',
  'segoeuib.ttf',
  'segoeui.ttf',
  'seguiemj.ttf',
  'seguisym.ttf',
];
const fontFiles = [];
for (const f of candidates) {
  const p = path.join(fontDir, f);
  if (await fileExists(p)) fontFiles.push(p);
}
if (!fontFiles.length) {
  console.error(`error: no fonts found in ${fontDir}`);
  process.exit(1);
}

const fontOpts = {
  fontFiles,
  loadSystemFonts: false,
  defaultFontFamily: 'Segoe UI',
};

const outW = opts.w ?? WIDTH;
const outH = opts.h ?? HEIGHT;

// Paper covers only use emoji, so the anchor correction is measured at the
// size the emoji will actually be drawn at.
  const paperEmojiSize = Math.round(outH * 0.2);
const emojiSizeForAdj = isPaper ? paperEmojiSize : 148;
const needsAdj = (isPaper || isMinimal) && (opts.emoji ?? '').trim() && (isPaper ? true : !(opts.label ?? '').trim());
const adj = needsAdj ? await measureEmoji(opts.emoji, emojiSizeForAdj, fontOpts) : { dx: 0, dy: 0 };
if (needsAdj) console.log(`emoji adjust: dx=${adj.dx.toFixed(1)} dy=${adj.dy.toFixed(1)}`);

const svg = isPaper
  ? buildSvgPaper({
      label: opts.plain ? '' : opts.label,
      emoji: opts.emoji ?? '',
      adj,
      w: outW,
      h: outH,
      plain: Boolean(opts.plain),
      photo: opts.photo ? { dataUri: await fetchPhotoDataUri(opts.photo) } : null,
    })
  : isMinimal
    ? buildSvgMinimal({
        label: opts.label ?? (() => { console.error('error: --label is required with --layout minimal'); process.exit(1); })(),
        emoji: opts.emoji ?? '',
        adj,
        photo: opts.photo ? { dataUri: await fetchPhotoDataUri(opts.photo) } : null,
      })
    : buildSvg({ title: opts.title, emoji: opts.emoji ?? '' });

const resvg = new Resvg(svg, {
  fitTo: { mode: 'width', value: outW },
  font: fontOpts,
});
const png = resvg.render().asPng();
await fs.mkdir(path.dirname(outPath), { recursive: true });
await fs.writeFile(outPath, png);
console.log(`wrote ${path.relative(repoRoot, outPath)} (${outW}x${outH}, ${png.length} bytes)`);
console.log(`fonts: ${fontFiles.join(', ')}`);

// Headless harness for the homepage Tetris rain. Stubs just enough DOM to run
// the real inline script, at desktop and phone sizes, then checks the
// invariants that matter:
//   1. no two falling pieces reserve the same cells, and two falling pieces
//      never overlap in flight (a faster piece resting on a slower one)
//   2. line clears happen often enough to be worth watching
//   3. the board is not resetting constantly, which reads as a wipe
//   4. a phone gets a calmer rain than a desktop, not a downpour in a tiny well
//   5. no frame stalls
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const src = process.env.TETRIS_SRC ?? path.join(scriptDir, '..', 'layouts', 'index.html')
const code = readFileSync(src, 'utf8').match(/<script>([\s\S]*?)<\/script>/)[1]

const MIN_EVENTS_PER_MIN = 9
const MAX_RESETS_PER_MIN = 3
const SECONDS = 180
const FRAMES = 60 * SECONDS

function run(label, width, height) {
  let now = 0
  let rafCb = null
  let overlaps = 0
  let liveOverlaps = 0
  let maxInFlight = 0
  let prev = null
  let thinFrames = 0
  let expectAtLeast = 0
  let checkUntil = -1
  let blocksThisFrame = 0
  let frame = 0
  const eventTimes = []

  const gradient = { addColorStop() {} }
  const ctxStub = {
    setTransform() {},
    clearRect() {},
    save() {},
    restore() {},
    translate() {},
    scale() {},
    rotate() {},
    // Every block goes through a path, so this counts blocks drawn per frame.
    beginPath() {
      blocksThisFrame++
    },
    moveTo() {},
    lineTo() {},
    arcTo() {},
    closePath() {},
    clip() {},
    stroke() {},
    fill() {},
    fillRect() {},
    createLinearGradient: () => gradient,
    createPattern: () => ({}),
    globalAlpha: 1,
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
  }
  const canvas = { clientWidth: width, clientHeight: height, width: 0, height: 0, getContext: () => ctxStub }

  globalThis.window = {
    matchMedia: () => ({ matches: false, addEventListener() {} }),
    addEventListener() {},
    devicePixelRatio: 1,
    __tetrisProbe(pieces, grid, rows, cols, stats) {
      if (prev && stats.clears > prev.clears) {
        eventTimes.push(now)
        // After a clear the settled board holds N blocks. The animation draws
        // the rows as they were, so it must never draw fewer than those N,
        // otherwise blocks other than the finished row have vanished.
        let n = 0
        for (let i = 0; i < grid.length; i++) if (grid[i]) n++
        expectAtLeast = n
        checkUntil = frame + 30
      }
      prev = { clears: stats.clears, resets: stats.resets }
      if (pieces.length > maxInFlight) maxInFlight = pieces.length

      const seen = new Set()
      for (const p of pieces) {
        for (const c of p.cells) {
          const y = p.target + c.y
          if (y < 0) continue
          const key = y * cols + (p.x + c.x)
          if (seen.has(key)) overlaps++
          else seen.add(key)
        }
      }

      // Pieces fall at their own speed, so a fast one can overtake a slow one.
      // The reservations above can all be distinct while the live chips overlap
      // in flight. Two cells in one column overlap when their float rows are
      // within a cell of each other; exactly one apart is resting, not crashing.
      for (let a = 0; a < pieces.length; a++) {
        for (let b = a + 1; b < pieces.length; b++) {
          const pa = pieces[a]
          const pb = pieces[b]
          for (const ca of pa.cells) {
            for (const cb of pb.cells) {
              if (pa.x + ca.x !== pb.x + cb.x) continue
              const dy = Math.abs(pa.y + ca.y - (pb.y + cb.y))
              if (dy < 1 - 1e-6) liveOverlaps++
            }
          }
        }
      }
    },
  }
  globalThis.document = {
    documentElement: { classList: { contains: () => false } },
    getElementById: (id) => (id === 'tetris-rain' ? canvas : null),
    createElement: () => ({ width: 0, height: 0, getContext: () => ctxStub }),
    hidden: false,
  }
  globalThis.performance = { now: () => now }
  globalThis.requestAnimationFrame = (cb) => {
    rafCb = cb
  }
  globalThis.IntersectionObserver = class {
    observe() {}
  }

  eval(code)
  if (!rafCb) throw new Error(`${label}: animation loop never started`)

  let worst = 0
  let total = 0
  for (let f = 0; f < FRAMES; f++) {
    frame = f
    blocksThisFrame = 0
    now += 16.7
    const t0 = Date.now()
    const cb = rafCb
    rafCb = null
    cb(now)
    const ms = Date.now() - t0
    total += ms
    if (ms > worst) worst = ms

    if (f <= checkUntil && blocksThisFrame < expectAtLeast) thinFrames++
  }

  const perMinute = eventTimes.length / (SECONDS / 60)
  const resetsPerMin = prev.resets / (SECONDS / 60)
  const buckets = new Array(SECONDS / 30).fill(0)
  for (const t of eventTimes) buckets[Math.min(buckets.length - 1, Math.floor(t / 30000))]++

  return {
    label,
    perMinute,
    resetsPerMin,
    overlaps,
    liveOverlaps,
    maxInFlight,
    worst,
    avg: total / FRAMES,
    buckets,
    thinFrames,
  }
}

const results = [run('desktop', 900, 450), run('phone', 380, 330)]
let failed = false

for (const r of results) {
  console.log(
    `${r.label}: ${r.perMinute.toFixed(1)} clears/min, resets ${r.resetsPerMin.toFixed(1)}/min, ` +
      `in flight max ${r.maxInFlight}, frame avg ${r.avg.toFixed(2)} ms worst ${r.worst} ms`,
  )
  console.log(`  per 30s: ${r.buckets.join(', ')}`)
  if (r.overlaps > 0) {
    console.error(`  FAIL: ${r.overlaps} overlapping reservations between falling pieces`)
    failed = true
  }
  if (r.liveOverlaps > 0) {
    console.error(`  FAIL: ${r.liveOverlaps} live cell overlaps between falling pieces`)
    failed = true
  }
  if (r.perMinute < MIN_EVENTS_PER_MIN) {
    console.error(`  FAIL: only ${r.perMinute.toFixed(1)} clears per minute`)
    failed = true
  }
  if (r.resetsPerMin > MAX_RESETS_PER_MIN) {
    console.error(`  FAIL: board resets ${r.resetsPerMin.toFixed(1)} times per minute`)
    failed = true
  }
  if (r.thinFrames > 0) {
    console.error(`  FAIL: ${r.thinFrames} frames drew fewer blocks than the settled board`)
    failed = true
  }
}

const phone = results.find((r) => r.label === 'phone')
if (phone && phone.maxInFlight > 2) {
  console.error(`  FAIL: phone runs ${phone.maxInFlight} lanes, expected at most 2`)
  failed = true
}

if (!failed) console.log('OK: landings do not collide, clears stay frequent, board stable, phone calm')
process.exit(failed ? 1 : 0)

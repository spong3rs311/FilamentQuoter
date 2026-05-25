# Filament Quoter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Vite-bundled IIFE JavaScript wizard that loads via `<script>` tag in Squarespace, parses STL/3MF files client-side, calculates a 3D print quote from a GitHub-hosted config.json, and pre-fills a Squarespace form on acceptance.

**Architecture:** Single `quoter.js` IIFE bundle + `config.json` deployed to GitHub Pages via GitHub Actions. Squarespace Code Block mounts the 4-step card wizard. On acceptance, hidden Squarespace form fields are populated and the form block is revealed via CSS ID toggle.

**Tech Stack:** Vite 5, Vitest + jsdom, JSZip 3, vite-plugin-static-copy, vanilla JS (no framework), GitHub Actions + peaceiris/actions-gh-pages

---

## File Map

| File | Purpose |
|------|---------|
| `src/main.js` | IIFE entry — fetches config, mounts wizard, handles config load error |
| `src/calculator.js` | Pure function: volume + filament + pricing → quote breakdown object |
| `src/parser.js` | `parseFile(file)` → Promise\<cm³\> — handles STL binary/ASCII and 3MF |
| `src/ui.js` | `createWizard(config)` → DOM element; all 4 step renderers |
| `public/config.json` | Filament catalog + pricing (owner edits this to change prices) |
| `tests/calculator.test.js` | Unit tests for quote math |
| `tests/parser.test.js` | Unit tests for STL + 3MF parsing |
| `tests/config.test.js` | Schema validation for config.json |
| `vite.config.js` | IIFE build config + Vitest config |
| `.github/workflows/deploy.yml` | Build + test + deploy to gh-pages on push to main |

---

## Task 1: Initialize Git repo and push to GitHub

**Files:** `.gitignore`, `README.md`

- [ ] Initialize git
```bash
git init
```

- [ ] Create `.gitignore`
```
node_modules/
dist/
.DS_Store
*.local
.superpowers/
```

- [ ] Create `README.md`
```markdown
# FilamentQuoter
A 3D print quoting tool for Squarespace. See `docs/superpowers/specs/` for design spec.
```

- [ ] Create GitHub repo and push (run `gh auth login` first if needed)
```bash
gh repo create FilamentQuoter --public --source=. --remote=origin --push
```
Expected: `✓ Created repository USERNAME/FilamentQuoter on GitHub`

---

## Task 2: Scaffold Vite project

**Files:** `package.json`, `vite.config.js`, `index.html`, `src/main.js` (stub)

- [ ] Create `package.json`
```json
{
  "name": "filament-quoter",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

- [ ] Install dependencies
```bash
npm install --save-dev vite vitest jsdom @vitest/coverage-v8
npm install jszip vite-plugin-static-copy
```

- [ ] Create `vite.config.js`
```js
import { defineConfig } from 'vite'
import { viteStaticCopy } from 'vite-plugin-static-copy'

export default defineConfig({
  plugins: [
    viteStaticCopy({
      targets: [{ src: 'public/config.json', dest: '.' }]
    })
  ],
  build: {
    lib: {
      entry: 'src/main.js',
      name: 'FilamentQuoter',
      formats: ['iife']
    },
    rollupOptions: {
      output: {
        entryFileNames: 'quoter.js'
      }
    }
  },
  test: {
    environment: 'jsdom',
    globals: true
  }
})
```

- [ ] Create `index.html` (dev entry only — not deployed)
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Filament Quoter Dev</title>
</head>
<body>
  <div id="filament-quoter"></div>
  <div id="quote-form-block" style="padding:20px;border:1px solid #ccc;margin-top:20px;">
    <strong>Squarespace Form (dev placeholder)</strong>
    <input name="quote_filament" placeholder="quote_filament"><br>
    <input name="quote_volume_cm3" placeholder="quote_volume_cm3"><br>
    <textarea name="quote_breakdown" placeholder="quote_breakdown"></textarea><br>
    <input name="quote_total" placeholder="quote_total">
  </div>
  <script type="module" src="/src/main.js"></script>
</body>
</html>
```

- [ ] Create stub `src/main.js`
```js
console.log('FilamentQuoter loading...')
```

- [ ] Verify dev server starts
```bash
npm run dev
```
Expected: Server at http://localhost:5173. Console shows `FilamentQuoter loading...`

- [ ] Commit
```bash
git add .
git commit -m "chore: scaffold Vite project with IIFE build config"
git push
```

---

## Task 3: Create config.json with tests

**Files:** `public/config.json`, `tests/config.test.js`

- [ ] Write failing test
```js
// tests/config.test.js
import { describe, it, expect } from 'vitest'
import config from '../public/config.json'

describe('config.json', () => {
  it('has all required pricing fields', () => {
    const p = config.pricing
    expect(p.machine_hourly_rate).toBeGreaterThan(0)
    expect(p.labor_fee).toBeGreaterThan(0)
    expect(p.markup_percent).toBeGreaterThan(0)
    expect(p.waste_factor).toBeGreaterThan(0)
    expect(p.minimum_order_total).toBe(19.00)
  })

  it('has 6 filaments', () => {
    expect(config.filaments).toHaveLength(6)
  })

  it('each filament has all required fields with positive values', () => {
    for (const f of config.filaments) {
      expect(f.id).toBeTruthy()
      expect(f.name).toBeTruthy()
      expect(f.description).toBeTruthy()
      expect(f.density_g_per_cm3).toBeGreaterThan(0)
      expect(f.cost_per_gram).toBeGreaterThan(0)
      expect(f.print_speed_cm3_per_hr).toBeGreaterThan(0)
    }
  })
})
```

- [ ] Run to confirm fail
```bash
npm test -- tests/config.test.js
```
Expected: FAIL — `Cannot find module '../public/config.json'`

- [ ] Create `public/config.json`
```json
{
  "pricing": {
    "machine_hourly_rate": 2.50,
    "labor_fee": 15.00,
    "markup_percent": 30,
    "waste_factor": 0.15,
    "minimum_order_total": 19.00
  },
  "filaments": [
    {
      "id": "pla",
      "name": "PLA",
      "density_g_per_cm3": 1.24,
      "cost_per_gram": 0.02,
      "print_speed_cm3_per_hr": 10.0,
      "description": "Great for general-purpose prints. Rigid, easy to post-process."
    },
    {
      "id": "petg",
      "name": "PETG",
      "density_g_per_cm3": 1.27,
      "cost_per_gram": 0.03,
      "print_speed_cm3_per_hr": 8.5,
      "description": "Tough and slightly flexible. Good chemical resistance."
    },
    {
      "id": "abs",
      "name": "ABS",
      "density_g_per_cm3": 1.05,
      "cost_per_gram": 0.025,
      "print_speed_cm3_per_hr": 7.5,
      "description": "Heat-resistant, machinable. Requires enclosure."
    },
    {
      "id": "asa",
      "name": "ASA",
      "density_g_per_cm3": 1.07,
      "cost_per_gram": 0.04,
      "print_speed_cm3_per_hr": 7.0,
      "description": "UV and weather resistant. Ideal for outdoor parts."
    },
    {
      "id": "nylon",
      "name": "Nylon",
      "density_g_per_cm3": 1.10,
      "cost_per_gram": 0.06,
      "print_speed_cm3_per_hr": 6.0,
      "description": "High strength and flexibility. Requires dry storage."
    },
    {
      "id": "pc",
      "name": "PC",
      "density_g_per_cm3": 1.20,
      "cost_per_gram": 0.07,
      "print_speed_cm3_per_hr": 5.0,
      "description": "Extremely strong and heat-resistant. High-temp printer required."
    }
  ]
}
```

- [ ] Run to confirm pass
```bash
npm test -- tests/config.test.js
```
Expected: PASS — 3 tests

- [ ] Commit
```bash
git add public/config.json tests/config.test.js
git commit -m "feat: add filament catalog config and schema tests"
git push
```

---

## Task 4: Quote calculator (TDD)

**Files:** `src/calculator.js`, `tests/calculator.test.js`

- [ ] Write failing tests
```js
// tests/calculator.test.js
import { describe, it, expect } from 'vitest'
import { calculateQuote } from '../src/calculator.js'

const pricing = {
  machine_hourly_rate: 2.50,
  labor_fee: 15.00,
  markup_percent: 30,
  waste_factor: 0.15,
  minimum_order_total: 19.00
}

const pla = {
  density_g_per_cm3: 1.24,
  cost_per_gram: 0.02,
  print_speed_cm3_per_hr: 10.0
}

describe('calculateQuote', () => {
  it('calculates weight with waste factor', () => {
    // 10 cm³ × 1.24 × 1.15 = 14.26 g
    expect(calculateQuote(10, pla, pricing).weight_g).toBeCloseTo(14.26, 2)
  })

  it('calculates material cost', () => {
    // 14.26 g × $0.02 = $0.2852
    expect(calculateQuote(10, pla, pricing).material_cost).toBeCloseTo(0.2852, 4)
  })

  it('calculates print hours', () => {
    // 10 cm³ / 10 cm³/hr = 1.0 hr
    expect(calculateQuote(10, pla, pricing).print_hours).toBeCloseTo(1.0, 4)
  })

  it('calculates machine cost', () => {
    // 1.0 hr × $2.50 = $2.50
    expect(calculateQuote(10, pla, pricing).machine_cost).toBeCloseTo(2.50, 4)
  })

  it('applies markup to subtotal', () => {
    // subtotal = 0.2852 + 2.50 + 15.00 = 17.7852
    // total = 17.7852 × 1.30 = 23.12
    expect(calculateQuote(10, pla, pricing).computed_total).toBeCloseTo(23.12, 1)
  })

  it('enforces minimum order', () => {
    const r = calculateQuote(0.01, pla, pricing)
    expect(r.final_total).toBe(19.00)
    expect(r.minimum_applied).toBe(true)
  })

  it('does not enforce minimum when total exceeds it', () => {
    const r = calculateQuote(10, pla, pricing)
    expect(r.final_total).toBeCloseTo(23.12, 1)
    expect(r.minimum_applied).toBe(false)
  })

  it('returns all expected fields', () => {
    const r = calculateQuote(10, pla, pricing)
    for (const key of ['weight_g','material_cost','print_hours','machine_cost',
                        'labor_fee','markup_amount','subtotal','computed_total',
                        'final_total','minimum_applied']) {
      expect(r).toHaveProperty(key)
    }
  })
})
```

- [ ] Run to confirm fail
```bash
npm test -- tests/calculator.test.js
```
Expected: FAIL — `Cannot find module '../src/calculator.js'`

- [ ] Implement `src/calculator.js`
```js
// src/calculator.js
export function calculateQuote(volumeCm3, filament, pricing) {
  const weight_g = volumeCm3 * filament.density_g_per_cm3 * (1 + pricing.waste_factor)
  const material_cost = weight_g * filament.cost_per_gram
  const print_hours = volumeCm3 / filament.print_speed_cm3_per_hr
  const machine_cost = print_hours * pricing.machine_hourly_rate
  const labor_fee = pricing.labor_fee
  const subtotal = material_cost + machine_cost + labor_fee
  const computed_total = subtotal * (1 + pricing.markup_percent / 100)
  const markup_amount = computed_total - subtotal
  const minimum_applied = computed_total < pricing.minimum_order_total
  const final_total = minimum_applied ? pricing.minimum_order_total : computed_total
  return { weight_g, material_cost, print_hours, machine_cost, labor_fee,
           markup_amount, subtotal, computed_total, final_total, minimum_applied }
}
```

- [ ] Run to confirm pass
```bash
npm test -- tests/calculator.test.js
```
Expected: PASS — 8 tests

- [ ] Commit
```bash
git add src/calculator.js tests/calculator.test.js
git commit -m "feat: implement quote calculator with TDD"
git push
```

---

## Task 5: STL parser (TDD)

**Files:** `src/parser.js`, `tests/parser.test.js`

- [ ] Write failing STL tests
```js
// tests/parser.test.js
import { describe, it, expect } from 'vitest'
import { parseFile } from '../src/parser.js'

// Build a binary STL buffer from an array of triangles [[v1,v2,v3], ...]
function makeBinaryStl(triangles) {
  const buf = new ArrayBuffer(84 + triangles.length * 50)
  const view = new DataView(buf)
  view.setUint32(80, triangles.length, true)
  let offset = 84
  for (const [v1, v2, v3] of triangles) {
    view.setFloat32(offset, 0, true); offset += 4   // normal x
    view.setFloat32(offset, 0, true); offset += 4   // normal y
    view.setFloat32(offset, 0, true); offset += 4   // normal z
    for (const v of [v1, v2, v3]) {
      view.setFloat32(offset, v[0], true); offset += 4
      view.setFloat32(offset, v[1], true); offset += 4
      view.setFloat32(offset, v[2], true); offset += 4
    }
    view.setUint16(offset, 0, true); offset += 2    // attribute byte count
  }
  return buf
}

// Tetrahedron: (0,0,0),(10,0,0),(0,10,0),(0,0,10) mm → volume = 1000/6 mm³ = 0.16667 cm³
const TETRA = [
  [[0,0,0],[0,10,0],[10,0,0]],
  [[0,0,0],[10,0,0],[0,0,10]],
  [[0,0,0],[0,0,10],[0,10,0]],
  [[10,0,0],[0,10,0],[0,0,10]],
]

describe('parseFile - binary STL', () => {
  it('returns volume in cm³', async () => {
    const file = new File([makeBinaryStl(TETRA)], 'test.stl')
    expect(await parseFile(file)).toBeCloseTo(0.16667, 3)
  })
})

describe('parseFile - ASCII STL', () => {
  it('returns volume in cm³', async () => {
    const ascii = `solid tetrahedron
  facet normal 0 0 -1
    outer loop
      vertex 0 0 0
      vertex 10 0 0
      vertex 0 10 0
    endloop
  endfacet
  facet normal 0 -1 0
    outer loop
      vertex 0 0 0
      vertex 0 0 10
      vertex 10 0 0
    endloop
  endfacet
  facet normal -1 0 0
    outer loop
      vertex 0 0 0
      vertex 0 10 0
      vertex 0 0 10
    endloop
  endfacet
  facet normal 0.577 0.577 0.577
    outer loop
      vertex 10 0 0
      vertex 0 10 0
      vertex 0 0 10
    endloop
  endfacet
endsolid tetrahedron`
    const file = new File([ascii], 'test.stl')
    expect(await parseFile(file)).toBeCloseTo(0.16667, 3)
  })
})

describe('parseFile - errors', () => {
  it('rejects unsupported file extensions', async () => {
    const file = new File(['data'], 'model.obj')
    await expect(parseFile(file)).rejects.toThrow('Unsupported file type')
  })
})
```

- [ ] Run to confirm fail
```bash
npm test -- tests/parser.test.js
```
Expected: FAIL — `Cannot find module '../src/parser.js'`

- [ ] Implement `src/parser.js` (STL only; 3MF stub)
```js
// src/parser.js
import JSZip from 'jszip'

export async function parseFile(file) {
  const name = file.name.toLowerCase()
  if (name.endsWith('.stl')) return parseStl(file)
  if (name.endsWith('.3mf')) return parse3mf(file)
  throw new Error('Unsupported file type: ' + file.name)
}

async function parseStl(file) {
  const buffer = await file.arrayBuffer()
  const triangles = isBinaryStl(buffer) ? parseBinaryStl(buffer) : parseAsciiStl(buffer)
  return Math.abs(signedVolumeMm3(triangles)) / 1000
}

function isBinaryStl(buffer) {
  const view = new DataView(buffer)
  const count = view.getUint32(80, true)
  return buffer.byteLength === 84 + count * 50 && count > 0
}

function parseBinaryStl(buffer) {
  const view = new DataView(buffer)
  const count = view.getUint32(80, true)
  const triangles = []
  let o = 84
  for (let i = 0; i < count; i++) {
    o += 12 // skip normal
    const v1 = [view.getFloat32(o,true), view.getFloat32(o+4,true), view.getFloat32(o+8,true)]; o += 12
    const v2 = [view.getFloat32(o,true), view.getFloat32(o+4,true), view.getFloat32(o+8,true)]; o += 12
    const v3 = [view.getFloat32(o,true), view.getFloat32(o+4,true), view.getFloat32(o+8,true)]; o += 12
    o += 2 // attribute byte count
    triangles.push([v1, v2, v3])
  }
  return triangles
}

function parseAsciiStl(buffer) {
  const text = new TextDecoder().decode(buffer)
  const re = /vertex\s+([\d.eE+-]+)\s+([\d.eE+-]+)\s+([\d.eE+-]+)/g
  const triangles = []
  const verts = []
  let m
  while ((m = re.exec(text)) !== null) {
    verts.push([parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3])])
    if (verts.length === 3) { triangles.push([...verts]); verts.length = 0 }
  }
  return triangles
}

function signedVolumeMm3(triangles) {
  let v = 0
  for (const [v1, v2, v3] of triangles) {
    v += (v1[0]*(v2[1]*v3[2]-v2[2]*v3[1])
        + v1[1]*(v2[2]*v3[0]-v2[0]*v3[2])
        + v1[2]*(v2[0]*v3[1]-v2[1]*v3[0])) / 6
  }
  return v
}

async function parse3mf(file) {
  throw new Error('3MF parsing not yet implemented')
}
```

- [ ] Run to confirm STL tests pass
```bash
npm test -- tests/parser.test.js
```
Expected: PASS — 3 tests (3MF will be added in Task 6)

- [ ] Commit
```bash
git add src/parser.js tests/parser.test.js
git commit -m "feat: implement STL parser (binary + ASCII) with TDD"
git push
```

---

## Task 6: 3MF parser (TDD)

**Files:** `src/parser.js` (replace stub), `tests/parser.test.js` (add block)

- [ ] Add 3MF test block to `tests/parser.test.js`
```js
import JSZip from 'jszip'

async function make3mfFile() {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<model xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">
  <resources>
    <object id="1" type="model">
      <mesh>
        <vertices>
          <vertex x="0" y="0" z="0"/>
          <vertex x="10" y="0" z="0"/>
          <vertex x="0" y="10" z="0"/>
          <vertex x="0" y="0" z="10"/>
        </vertices>
        <triangles>
          <triangle v1="0" v2="2" v3="1"/>
          <triangle v1="0" v2="1" v3="3"/>
          <triangle v1="0" v2="3" v3="2"/>
          <triangle v1="1" v2="2" v3="3"/>
        </triangles>
      </mesh>
    </object>
  </resources>
  <build><item objectid="1"/></build>
</model>`
  const zip = new JSZip()
  zip.file('3D/3dmodel.model', xml)
  const blob = await zip.generateAsync({ type: 'blob' })
  return new File([blob], 'test.3mf')
}

describe('parseFile - 3MF', () => {
  it('returns volume in cm³', async () => {
    const file = await make3mfFile()
    expect(await parseFile(file)).toBeCloseTo(0.16667, 3)
  })
})
```

- [ ] Run to confirm 3MF test fails
```bash
npm test -- tests/parser.test.js
```
Expected: FAIL — `3MF parsing not yet implemented`

- [ ] Replace `parse3mf` stub in `src/parser.js`
```js
async function parse3mf(file) {
  const buffer = await file.arrayBuffer()
  const zip = await JSZip.loadAsync(buffer)
  const modelFile = zip.file('3D/3dmodel.model')
  if (!modelFile) throw new Error('Invalid 3MF: missing 3D/3dmodel.model')
  const xml = await modelFile.async('string')
  const doc = new DOMParser().parseFromString(xml, 'application/xml')

  const vertices = Array.from(doc.querySelectorAll('vertices vertex')).map(el => [
    parseFloat(el.getAttribute('x')),
    parseFloat(el.getAttribute('y')),
    parseFloat(el.getAttribute('z'))
  ])

  const triangles = Array.from(doc.querySelectorAll('triangles triangle')).map(el => [
    vertices[parseInt(el.getAttribute('v1'))],
    vertices[parseInt(el.getAttribute('v2'))],
    vertices[parseInt(el.getAttribute('v3'))]
  ])

  return Math.abs(signedVolumeMm3(triangles)) / 1000
}
```

- [ ] Run all tests
```bash
npm test
```
Expected: PASS — all tests (config + calculator + parser)

- [ ] Commit
```bash
git add src/parser.js tests/parser.test.js
git commit -m "feat: implement 3MF parser using JSZip + DOMParser"
git push
```

---

## Task 7: UI scaffold — wizard container, config loading, step management

**Files:** `src/main.js`, `src/ui.js`

- [ ] Implement `src/main.js`
```js
// src/main.js
import { createWizard } from './ui.js'

// Capture script URL synchronously before any async (currentScript is null in async context)
const _scriptSrc = (typeof document !== 'undefined' && document.currentScript)
  ? document.currentScript.src
  : ''

;(async function () {
  const container = document.getElementById('filament-quoter')
  if (!container) return

  const configUrl = _scriptSrc
    ? new URL('config.json', _scriptSrc).href
    : '/public/config.json'

  let config
  try {
    const res = await fetch(configUrl)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    config = await res.json()
  } catch {
    container.innerHTML = `<div style="font-family:sans-serif;color:#c00;padding:16px;
      border:1px solid #c00;border-radius:6px;">
      Unable to load pricing data. Please refresh the page or contact us directly.
    </div>`
    return
  }

  container.appendChild(createWizard(config))
})()
```

- [ ] Implement `src/ui.js` — styles, wizard container, step header, goTo, and render skeleton
```js
// src/ui.js
import { parseFile } from './parser.js'
import { calculateQuote } from './calculator.js'

const CSS = `
#fq-wizard{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
  max-width:480px;margin:0 auto;border:1px solid #e0e0e0;border-radius:12px;
  overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08);}
#fq-wizard .fq-header{background:#f7f7f7;padding:14px 20px;border-bottom:1px solid #e0e0e0;
  font-size:13px;color:#888;display:flex;gap:8px;align-items:center;}
#fq-wizard .fq-dot{width:8px;height:8px;border-radius:50%;background:#ddd;display:inline-block;}
#fq-wizard .fq-dot.active{background:#333;}
#fq-wizard .fq-dot.done{background:#4caf50;}
#fq-wizard .fq-body{padding:24px 20px;min-height:200px;}
#fq-wizard .fq-title{font-size:18px;font-weight:600;margin:0 0 16px;}
#fq-wizard .fq-footer{padding:12px 20px;border-top:1px solid #e0e0e0;
  display:flex;justify-content:flex-end;gap:10px;}
#fq-wizard .fq-btn{padding:8px 18px;border-radius:6px;border:none;cursor:pointer;
  font-size:14px;font-weight:500;}
#fq-wizard .fq-btn-primary{background:#222;color:#fff;}
#fq-wizard .fq-btn-primary:disabled{background:#aaa;cursor:default;}
#fq-wizard .fq-btn-secondary{background:transparent;color:#555;border:1px solid #ccc;}
#fq-wizard .fq-drop{border:2px dashed #ccc;border-radius:8px;padding:32px 20px;
  text-align:center;cursor:pointer;transition:border-color .2s;}
#fq-wizard .fq-drop:hover,#fq-wizard .fq-drop.over{border-color:#444;}
#fq-wizard .fq-pills{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px;}
#fq-wizard .fq-pill{padding:6px 14px;border-radius:20px;border:1.5px solid #ddd;
  cursor:pointer;font-size:13px;transition:all .15s;}
#fq-wizard .fq-pill.sel{border-color:#222;background:#222;color:#fff;}
#fq-wizard .fq-row{display:flex;justify-content:space-between;font-size:14px;
  margin-bottom:8px;color:#555;}
#fq-wizard .fq-total{display:flex;justify-content:space-between;font-size:16px;
  font-weight:700;padding-top:10px;border-top:1px solid #e0e0e0;}
#fq-wizard .fq-note{font-size:12px;color:#888;margin-top:8px;}
#fq-wizard .fq-banner{background:#e8f5e9;color:#2e7d32;padding:12px 16px;
  border-radius:6px;font-size:14px;margin-bottom:16px;}
`

export function createWizard(config) {
  if (!document.getElementById('fq-css')) {
    const s = document.createElement('style')
    s.id = 'fq-css'
    s.textContent = CSS
    document.head.appendChild(s)
  }
  const state = { step: 1, file: null, volumeCm3: null, filament: null, quote: null }
  const el = document.createElement('div')
  el.id = 'fq-wizard'
  render(el, state, config)
  return el
}

function render(el, state, config) {
  el.innerHTML = ''
  const body = document.createElement('div')
  body.className = 'fq-body'
  const footer = document.createElement('div')
  footer.className = 'fq-footer'

  el.appendChild(makeHeader(state.step))
  el.appendChild(body)

  if (state.step === 1) renderStep1(el, body, footer, state, config)
  else if (state.step === 2) renderStep2(el, body, footer, state, config)
  else if (state.step === 3) renderStep3(el, body, footer, state, config)
  else if (state.step === 4) renderStep4(body, state, config)

  if (state.step < 4) el.appendChild(footer)
}

function makeHeader(step) {
  const h = document.createElement('div')
  h.className = 'fq-header'
  h.appendChild(Object.assign(document.createElement('span'), { textContent: `Step ${step} of 4` }))
  for (let i = 1; i <= 4; i++) {
    const d = document.createElement('span')
    d.className = 'fq-dot' + (i < step ? ' done' : i === step ? ' active' : '')
    h.appendChild(d)
  }
  return h
}

function goTo(step, el, state, config) {
  state.step = step
  render(el, state, config)
}
```

- [ ] Verify in browser — wizard card with header renders, no JS errors
```bash
npm run dev
```
Open http://localhost:5173. Should see the step header card. Steps render nothing yet (body is empty).

- [ ] Commit
```bash
git add src/main.js src/ui.js
git commit -m "feat: add wizard scaffold, config loader, and step header"
git push
```

---

## Task 8: Step 1 — file upload

**Files:** `src/ui.js` (add `renderStep1`)

- [ ] Add `renderStep1` to `src/ui.js`
```js
function renderStep1(el, body, footer, state, config) {
  body.appendChild(Object.assign(document.createElement('h2'), { className: 'fq-title', textContent: 'Upload Your Model' }))

  const drop = document.createElement('div')
  drop.className = 'fq-drop'
  drop.innerHTML = state.file
    ? `<strong>${state.file.name}</strong><br><small style="color:#4caf50">✓ ${state.volumeCm3.toFixed(3)} cm³</small>`
    : `<div style="font-size:32px;margin-bottom:8px">📁</div>
       <div>Drag & drop <strong>.STL</strong> or <strong>.3MF</strong> here</div>
       <div style="color:#aaa;font-size:13px;margin-top:4px">or click to browse</div>`

  const input = document.createElement('input')
  input.type = 'file'; input.accept = '.stl,.3mf'; input.style.display = 'none'

  const err = document.createElement('div')
  err.style.cssText = 'color:#c00;font-size:13px;margin-top:8px;'

  async function handle(file) {
    err.textContent = ''
    drop.innerHTML = 'Parsing...'
    try {
      state.volumeCm3 = await parseFile(file)
      state.file = file
    } catch {
      state.file = null; state.volumeCm3 = null
    }
    render(el, state, config)
    if (!state.file) err.textContent = 'Could not parse file. Please use a valid STL or 3MF.'
  }

  drop.addEventListener('click', () => input.click())
  input.addEventListener('change', () => input.files[0] && handle(input.files[0]))
  drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('over') })
  drop.addEventListener('dragleave', () => drop.classList.remove('over'))
  drop.addEventListener('drop', e => { e.preventDefault(); drop.classList.remove('over'); e.dataTransfer.files[0] && handle(e.dataTransfer.files[0]) })

  body.appendChild(drop); body.appendChild(input); body.appendChild(err)

  const btn = document.createElement('button')
  btn.className = 'fq-btn fq-btn-primary'; btn.textContent = 'Next →'
  btn.disabled = !state.file
  btn.addEventListener('click', () => goTo(2, el, state, config))
  footer.appendChild(btn)
}
```

- [ ] Test in browser: upload an STL, verify filename + cm³ shown, Next → enabled
```bash
npm run dev
```

- [ ] Commit
```bash
git add src/ui.js
git commit -m "feat: implement step 1 — file upload with drag-and-drop"
git push
```

---

## Task 9: Step 2 — filament selection

**Files:** `src/ui.js` (add `renderStep2`)

- [ ] Add `renderStep2` to `src/ui.js`
```js
function renderStep2(el, body, footer, state, config) {
  body.appendChild(Object.assign(document.createElement('h2'), { className: 'fq-title', textContent: 'Select Filament' }))

  const grid = document.createElement('div')
  grid.className = 'fq-pills'

  for (const f of config.filaments) {
    const pill = document.createElement('div')
    pill.className = 'fq-pill' + (state.filament?.id === f.id ? ' sel' : '')
    pill.textContent = f.name
    pill.title = f.description
    pill.addEventListener('click', () => { state.filament = f; render(el, state, config) })
    grid.appendChild(pill)
  }

  const desc = document.createElement('div')
  desc.style.cssText = 'font-size:13px;color:#666;margin-top:14px;min-height:36px;'
  desc.textContent = state.filament ? state.filament.description : 'Select a filament to see details.'

  body.appendChild(grid); body.appendChild(desc)

  const back = document.createElement('button')
  back.className = 'fq-btn fq-btn-secondary'; back.textContent = '← Back'
  back.addEventListener('click', () => goTo(1, el, state, config))

  const next = document.createElement('button')
  next.className = 'fq-btn fq-btn-primary'; next.textContent = 'Next →'
  next.disabled = !state.filament
  next.addEventListener('click', () => {
    state.quote = calculateQuote(state.volumeCm3, state.filament, config.pricing)
    goTo(3, el, state, config)
  })

  footer.appendChild(back); footer.appendChild(next)
}
```

- [ ] Test in browser: select filament → pill highlights, description shows, Next → enabled
```bash
npm run dev
```

- [ ] Commit
```bash
git add src/ui.js
git commit -m "feat: implement step 2 — filament selection"
git push
```

---

## Task 10: Step 3 — quote review

**Files:** `src/ui.js` (add `renderStep3`)

- [ ] Add `renderStep3` to `src/ui.js`
```js
function renderStep3(el, body, footer, state, config) {
  const q = state.quote
  const fmt = n => '$' + n.toFixed(2)

  body.appendChild(Object.assign(document.createElement('h2'), { className: 'fq-title', textContent: 'Your Quote' }))

  const rows = [
    [`Material (${q.weight_g.toFixed(1)}g × $${state.filament.cost_per_gram}/g)`, fmt(q.material_cost)],
    [`Machine time (${q.print_hours.toFixed(2)}h × $${config.pricing.machine_hourly_rate}/hr)`, fmt(q.machine_cost)],
    [`Labor / setup`, fmt(q.labor_fee)],
    [`Markup (${config.pricing.markup_percent}%)`, fmt(q.markup_amount)],
  ]
  for (const [label, val] of rows) {
    const row = document.createElement('div')
    row.className = 'fq-row'
    row.innerHTML = `<span>${label}</span><span>${val}</span>`
    body.appendChild(row)
  }

  const total = document.createElement('div')
  total.className = 'fq-total'
  total.innerHTML = `<span>Total</span><span>${fmt(q.final_total)}</span>`
  body.appendChild(total)

  if (q.minimum_applied) {
    const note = document.createElement('div')
    note.className = 'fq-note'
    note.textContent = `Minimum order of $${config.pricing.minimum_order_total.toFixed(2)} applied.`
    body.appendChild(note)
  }

  const back = document.createElement('button')
  back.className = 'fq-btn fq-btn-secondary'; back.textContent = '← Back'
  back.addEventListener('click', () => goTo(2, el, state, config))

  const decline = document.createElement('button')
  decline.className = 'fq-btn fq-btn-secondary'; decline.textContent = 'Decline'
  decline.addEventListener('click', () => {
    Object.assign(state, { file: null, volumeCm3: null, filament: null, quote: null })
    goTo(1, el, state, config)
  })

  const accept = document.createElement('button')
  accept.className = 'fq-btn fq-btn-primary'; accept.textContent = 'Accept Quote'
  accept.addEventListener('click', () => {
    prefillSquarespaceForm(state, config)
    goTo(4, el, state, config)
  })

  footer.appendChild(back); footer.appendChild(decline); footer.appendChild(accept)
}
```

- [ ] Test: verify all line items are correct, minimum order note appears for tiny model
```bash
npm run dev
```

- [ ] Commit
```bash
git add src/ui.js
git commit -m "feat: implement step 3 — quote review with accept/decline"
git push
```

---

## Task 11: Step 4 — form integration

**Files:** `src/ui.js` (add `renderStep4` + `prefillSquarespaceForm`)

- [ ] Add both functions to `src/ui.js`
```js
function prefillSquarespaceForm(state, config) {
  const q = state.quote
  const breakdown = [
    `Filament: ${state.filament.name}`,
    `Volume: ${state.volumeCm3.toFixed(3)} cm³`,
    `Weight: ${q.weight_g.toFixed(1)}g`,
    `Material: $${q.material_cost.toFixed(2)}`,
    `Machine time: ${q.print_hours.toFixed(2)}h ($${q.machine_cost.toFixed(2)})`,
    `Labor: $${q.labor_fee.toFixed(2)}`,
    `Markup (${config.pricing.markup_percent}%): $${q.markup_amount.toFixed(2)}`,
    `Total: $${q.final_total.toFixed(2)}`,
  ].join('\n')

  const set = (name, val) => {
    const el = document.querySelector(`[name="${name}"]`)
    if (el) el.value = val
  }
  set('quote_filament', state.filament.name)
  set('quote_volume_cm3', state.volumeCm3.toFixed(3))
  set('quote_breakdown', breakdown)
  set('quote_total', q.final_total.toFixed(2))

  const formBlock = document.getElementById('quote-form-block')
  if (formBlock) {
    formBlock.style.display = 'block'
    setTimeout(() => formBlock.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
  }
}

function renderStep4(body, state) {
  const banner = document.createElement('div')
  banner.className = 'fq-banner'
  banner.textContent = 'Your quote has been saved. Complete the form below to submit your job.'

  const summary = document.createElement('div')
  summary.style.cssText = 'font-size:13px;color:#666;margin-top:12px;'
  summary.textContent = `${state.filament.name} — $${state.quote.final_total.toFixed(2)}`

  const reupload = document.createElement('div')
  reupload.className = 'fq-note'
  reupload.style.marginTop = '12px'
  reupload.textContent = 'Please re-upload your file in the form below so we have it on record.'

  body.appendChild(banner); body.appendChild(summary); body.appendChild(reupload)
}
```

- [ ] Test end-to-end in browser using the dev placeholder form in index.html
```bash
npm run dev
```
Accept a quote → verify step 4 banner appears → verify hidden input fields are populated in the dev form → verify form scrolls into view.

- [ ] Build and verify output files
```bash
npm run build && ls dist/
```
Expected: `quoter.js` and `config.json` both present in `dist/`

- [ ] Commit
```bash
git add src/ui.js
git commit -m "feat: implement step 4 — Squarespace form prefill and reveal"
git push
```

---

## Task 12: GitHub Actions deploy workflow

**Files:** `.github/workflows/deploy.yml`

- [ ] Create `.github/workflows/deploy.yml`
```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

permissions:
  contents: write

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci

      - run: npm test

      - run: npm run build

      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

- [ ] Commit and push to trigger deployment
```bash
git add .github/workflows/deploy.yml
git commit -m "ci: deploy to GitHub Pages via GitHub Actions"
git push
```

- [ ] Enable GitHub Pages in repo settings
  - Go to `https://github.com/USERNAME/FilamentQuoter/settings/pages`
  - Source: **Deploy from a branch** → Branch: `gh-pages` → `/ (root)` → Save

- [ ] Monitor Actions run at `https://github.com/USERNAME/FilamentQuoter/actions` — wait for green checkmark

- [ ] Verify live URLs respond:
  - `https://USERNAME.github.io/FilamentQuoter/quoter.js` → JS content
  - `https://USERNAME.github.io/FilamentQuoter/config.json` → JSON

---

## Task 13: Squarespace setup (manual steps in Squarespace admin)

- [ ] Add **Code Block** to your Squarespace quoter page:
```html
<div id="filament-quoter"></div>
<script src="https://USERNAME.github.io/FilamentQuoter/quoter.js"></script>
```
Replace `USERNAME` with your GitHub username.

- [ ] Add **Form Block** below the Code Block with these fields:
  - Short Answer: **Name** (required)
  - Email: **Email Address** (required)
  - File Upload: **Upload your STL or 3MF file** (required)
  - Long Answer: **Additional notes** (optional)
  - Short Answer field named exactly `quote_filament` (can mark hidden)
  - Short Answer field named exactly `quote_volume_cm3` (can mark hidden)
  - Long Answer field named exactly `quote_breakdown` (can mark hidden)
  - Short Answer field named exactly `quote_total` (can mark hidden)

- [ ] Assign CSS ID to the Form Block:
  - Form Block settings → Advanced → CSS ID: `quote-form-block`

- [ ] Hide form block until quote is accepted — add to Page Settings → Advanced → Page Header Code Injection:
```html
<style>#quote-form-block { display: none; }</style>
```

- [ ] Set up form email notification:
  - Form Block settings → Storage → Email → add your email address

- [ ] End-to-end test:
  1. Upload test STL → select filament → accept quote
  2. Verify step 4 banner and form scroll into view
  3. Verify hidden fields are populated
  4. Fill name/email, re-upload file, submit
  5. Verify notification email arrives with all quote fields

---

## Task 14: Tag v1.0.0

- [ ] Run full test suite one final time
```bash
npm test
```
Expected: all tests pass

- [ ] Tag release
```bash
git tag v1.0.0
git push origin v1.0.0
```

---

## Verification Checklist

1. `npm test` — all tests pass (config schema, calculator math, STL binary, STL ASCII, 3MF)
2. `npm run dev` — wizard loads, all 4 steps work, quote math matches hand calculation for a test model
3. `npm run build` — produces `dist/quoter.js` + `dist/config.json` without errors
4. GitHub Actions workflow runs green on every push to main
5. `https://USERNAME.github.io/FilamentQuoter/quoter.js` serves the JS bundle
6. Squarespace page loads the wizard, end-to-end form submission delivers email notification with all quote details and attached file

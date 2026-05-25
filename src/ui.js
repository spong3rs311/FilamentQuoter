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
  const state = { step: 1, file: null, volumeCm3: null, filament: null, quote: null, parseError: null }
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
  if (step < 1 || step > 4) return
  state.step = step
  render(el, state, config)
}

function renderStep1(el, body, footer, state, config) {
  body.appendChild(Object.assign(document.createElement('h2'), { className: 'fq-title', textContent: 'Upload Your Model' }))

  const drop = document.createElement('div')
  drop.className = 'fq-drop'
  if (state.file) {
    const strong = document.createElement('strong')
    strong.textContent = state.file.name
    drop.appendChild(strong)
    drop.appendChild(document.createElement('br'))
    const small = document.createElement('small')
    small.style.color = '#4caf50'
    small.textContent = `✓ ${state.volumeCm3.toFixed(3)} cm³`
    drop.appendChild(small)
  } else {
    drop.innerHTML = `<div style="font-size:32px;margin-bottom:8px">📁</div>
       <div>Drag &amp; drop <strong>.STL</strong> or <strong>.3MF</strong> here</div>
       <div style="color:#aaa;font-size:13px;margin-top:4px">or click to browse</div>`
  }

  const input = document.createElement('input')
  input.type = 'file'; input.accept = '.stl,.3mf'; input.style.display = 'none'

  const err = document.createElement('div')
  err.style.cssText = 'color:#c00;font-size:13px;margin-top:8px;'
  if (state.parseError) err.textContent = state.parseError

  async function handle(file) {
    state.parseError = null
    drop.innerHTML = 'Parsing...'
    try {
      state.volumeCm3 = await parseFile(file)
      state.file = file
    } catch {
      state.file = null; state.volumeCm3 = null
      state.parseError = 'Could not parse file. Please use a valid STL or 3MF.'
    }
    render(el, state, config)
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

function renderStep3(el, body, footer, state, config) {
  body.appendChild(Object.assign(document.createElement('h2'), { className: 'fq-title', textContent: 'Your Quote' }))
}

function renderStep4(body, state, config) {
  body.appendChild(Object.assign(document.createElement('h2'), { className: 'fq-title', textContent: 'Submit Your Job' }))
}

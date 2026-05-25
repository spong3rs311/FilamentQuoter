import { createWizard } from './ui.js'

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

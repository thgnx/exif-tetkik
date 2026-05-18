/**
 * ui.js — DOM helpers ve toast sistemi
 */

export const qs  = (sel, root = document) => root.querySelector(sel)
export const qsa = (sel, root = document) => [...root.querySelectorAll(sel)]

/** Tek seferlik element oluşturucu */
export function createEl(tag, attrs = {}, ...children) {
  const el = document.createElement(tag)
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') el.className = v
    else if (k.startsWith('data-')) el.dataset[k.slice(5)] = v
    else el.setAttribute(k, v)
  }
  for (const child of children) {
    if (typeof child === 'string') el.appendChild(document.createTextNode(child))
    else if (child) el.appendChild(child)
  }
  return el
}

/** Toast — type: 'default' | 'success' | 'error' | 'warning' */
export function toast(message, type = 'default', duration = 3500) {
  const container = qs('#toast-container')
  const el = createEl('div', { class: `toast toast--${type}` }, message)
  container.appendChild(el)
  setTimeout(() => {
    el.classList.add('toast--out')
    el.addEventListener('animationend', () => el.remove(), { once: true })
  }, duration)
}

/** Loading overlay — messages dizisi veya tek string kabul eder */
let _loadingTimer = null

export function showLoading(messages = 'Reading metadata...') {
  const overlay = qs('#loading-overlay')
  const label   = qs('#loading-text')
  overlay.hidden = false

  if (_loadingTimer !== null) {
    clearInterval(_loadingTimer)
    _loadingTimer = null
  }

  if (Array.isArray(messages)) {
    let i = 0
    label.textContent = messages[0]
    _loadingTimer = setInterval(() => {
      i++
      if (i < messages.length) {
        label.textContent = messages[i]
      } else {
        clearInterval(_loadingTimer)
        _loadingTimer = null
      }
    }, 600)
  } else {
    label.textContent = messages
  }
}

export function hideLoading() {
  if (_loadingTimer !== null) {
    clearInterval(_loadingTimer)
    _loadingTimer = null
  }
  qs('#loading-overlay').hidden = true
}

// ── formatValue lookup tables ─────────────────────────────

const FLASH_LABELS = {
  0: 'No flash', 1: 'Flash fired',
  5: 'Flash fired, no strobe return', 7: 'Flash fired, strobe return',
  8: 'On, did not fire', 9: 'Flash fired, compulsory',
  11: 'Flash fired, compulsory, strobe return',
  16: 'Off, did not fire', 24: 'Off, did not fire, return not detected',
  25: 'On, fired', 29: 'On, fired, return detected',
  31: 'On, fired, strobe return', 32: 'Off, did not fire (forced)',
  48: 'Auto, did not fire', 49: 'Auto, fired', 55: 'Auto, fired, strobe return',
  65: 'No flash function', 79: 'On, red-eye reduction', 93: 'Auto, red-eye reduction',
}

const ORIENTATION_LABELS = {
  1: 'Horizontal (normal)', 2: 'Mirror horizontal',
  3: 'Rotate 180',          4: 'Mirror vertical',
  5: 'Mirror horizontal, rotate 270 CW', 6: 'Rotate 90 CW',
  7: 'Mirror horizontal, rotate 90 CW', 8: 'Rotate 270 CW',
}

const METERING_LABELS = {
  0: 'Unknown', 1: 'Average', 2: 'Center-weighted',
  3: 'Spot',    4: 'Multi-spot', 5: 'Multi-segment',
  6: 'Partial', 255: 'Other',
}

/** EXIF değerini okunabilir stringe çevirir */
export function formatValue(key, value) {
  if (value === null || value === undefined) return '—'

  if (key === 'ExposureTime' && typeof value === 'number') {
    if (value < 1) return `1/${Math.round(1 / value)}s`
    return `${value}s`
  }

  if (key === 'FNumber' && typeof value === 'number') return `f/${value}`

  if (key === 'FocalLength' && typeof value === 'number') return `${value}mm`
  if (key === 'FocalLengthIn35mmFormat' && typeof value === 'number') return `${value}mm (35mm equiv)`

  if ((key === 'ISO' || key === 'ISOSpeedRatings') && typeof value === 'number') return `ISO ${value}`

  if (key === 'latitude' || key === 'longitude') return value.toFixed(6)

  if (key === 'altitude' || key === 'GPSAltitude') return `${Number(value).toFixed(1)}m`

  if (key === 'Flash' && typeof value === 'number') {
    return FLASH_LABELS[value] ?? `Flash mode ${value}`
  }

  if (key === 'Orientation' && typeof value === 'number') {
    return ORIENTATION_LABELS[value] ?? `Orientation ${value}`
  }

  if (key === 'ColorSpace' && typeof value === 'number') {
    if (value === 1) return 'sRGB'
    if (value === 65535) return 'Uncalibrated'
    return `ColorSpace ${value}`
  }

  if (key === 'ExposureMode' && typeof value === 'number') {
    return (['Auto', 'Manual', 'Auto bracket'])[value] ?? `Mode ${value}`
  }

  if (key === 'MeteringMode' && typeof value === 'number') {
    return METERING_LABELS[value] ?? `Metering ${value}`
  }

  if (key === 'WhiteBalance' && typeof value === 'number') {
    return value === 0 ? 'Auto' : value === 1 ? 'Manual' : `WhiteBalance ${value}`
  }

  if (key === 'ResolutionUnit' && typeof value === 'number') {
    const units = { 1: 'No unit', 2: 'inch', 3: 'cm' }
    return units[value] ?? `Unit ${value}`
  }

  if (value instanceof Date) return value.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'medium' })

  if (Array.isArray(value)) return value.join(', ')

  return String(value)
}

/** Bir section body'sine kategorize EXIF satırları render eder */
export function renderDataRows(containerEl, data, flaggedKeys = new Set()) {
  containerEl.innerHTML = ''

  // _megapixels önce, vurgulu olarak
  if (data._megapixels) {
    const row = createEl('div', { class: 'data-row' })
    row.appendChild(createEl('span', { class: 'data-key' }, 'Megapixels'))
    row.appendChild(createEl('span', { class: 'data-val data-val--highlight' }, `${data._megapixels} MP`))
    containerEl.appendChild(row)
  }

  const entries = Object.entries(data).filter(([k]) => !k.startsWith('_'))

  if (entries.length === 0) {
    if (!data._megapixels) {
      containerEl.appendChild(createEl('p', { class: 'no-data' }, 'no data'))
    }
    return
  }

  for (const [key, value] of entries) {
    const row   = createEl('div', { class: 'data-row' })
    const keyEl = createEl('span', { class: 'data-key' }, key)
    const valEl = createEl('span', {
      class: flaggedKeys.has(key) ? 'data-val data-val--flagged' : 'data-val',
    }, formatValue(key, value))
    row.appendChild(keyEl)
    row.appendChild(valEl)
    containerEl.appendChild(row)
  }
}

/**
 * JSON string'i syntax-highlighted HTML'e çevirir.
 * &, <, > önce escape edilir; ardından regex token'ları span'a alır.
 */
export function highlightJson(jsonString) {
  const safe = jsonString
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  return safe.replace(
    /("(?:\\u[0-9a-fA-F]{4}|\\[^u]|[^\\"])*"(?:\s*:)?|\b(?:true|false|null)\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|[{}[\]:,])/g,
    (match) => {
      if (match.startsWith('"')) {
        if (match[match.length - 1] === ':') {
          return `<span class="json-key">${match}</span>`
        }
        return `<span class="json-str">${match}</span>`
      }
      if (match === 'true' || match === 'false' || match === 'null') {
        return `<span class="json-bool">${match}</span>`
      }
      if (match[0] === '-' || (match[0] >= '0' && match[0] <= '9')) {
        return `<span class="json-num">${match}</span>`
      }
      return `<span class="json-punct">${match}</span>`
    }
  )
}

/** Formatlanmış dosya boyutu */
export function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

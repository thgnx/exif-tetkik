/**
 * main.js — Uygulama giriş noktası
 * Modülleri koordine eder, global state tutar.
 */

import { initDropzone }                        from './modules/dropzone.js'
import { parseFile, getGPS }                   from './modules/parser.js'
import { initMap, destroyMap }                 from './modules/map.js'
import { computePrivacyFlags, getSensitiveKeys } from './modules/privacy.js'
import { stripExif }                           from './modules/stripper.js'
import {
  qs, createEl, toast,
  showLoading, hideLoading,
  renderDataRows, formatBytes,
  formatValue, highlightJson,
} from './modules/ui.js'

// ── Uygulama state'i ─────────────────────────────────────────
const state = {
  files: [],       // { file, parsed, objectUrl }[]
  activeIdx: 0,
  caseNum: 1,
}

// ── Başlangıç ────────────────────────────────────────────────
initDropzone(onFiles, (msg) => toast(msg, 'error'))
initKeyboardShortcuts()
initPrivacyTooltips()
setCaseBadge()

// ── Dosya kabul callback ──────────────────────────────────────
async function onFiles(newFiles) {
  for (const file of newFiles) {
    await addFile(file)
  }
}

async function addFile(file) {
  const openCount = state.files.filter(Boolean).length
  if (openCount >= 5) {
    toast('Maximum 5 files open. Close one first.', 'error')
    return
  }

  showLoading(['Opening the file...', 'Reading metadata...', 'Categorizing...'])

  try {
    const objectUrl = URL.createObjectURL(file)
    let parsed = null
    let parseError = false

    try {
      parsed = await parseFile(file)
    } catch (err) {
      parseError = true
      toast('Could not parse metadata. File may be corrupted or use an unsupported variant.', 'error')
      console.error(err)
    }

    const entry = { file, parsed, objectUrl }
    state.files.push(entry)
    const idx = state.files.length - 1

    addTab(file.name, idx)
    activateTab(idx)
    renderInvestigation(idx)
    qs('#dropzone-section').hidden = true

    if (!parseError) {
      if (!parsed) {
        toast('No metadata found. This image is clean — or was already stripped.')
      } else if (parsed.fieldCount === 0) {
        toast('File opened but no readable metadata fields were found.', 'warning')
      } else {
        toast(`Investigation open. ${parsed.fieldCount} metadata fields found.`, 'success')
      }
    }

  } catch (err) {
    toast(`Failed to load ${file.name}.`, 'error')
    console.error(err)
  } finally {
    hideLoading()
  }
}

// ── Tab yönetimi ─────────────────────────────────────────────
function addTab(filename, idx) {
  const tabsEl = qs('#file-tabs')
  tabsEl.hidden = false

  const ext   = filename.split('.').pop()?.toUpperCase() ?? ''
  const short = filename.length > 24 ? filename.slice(0, 22) + '…' : filename

  const tab = createEl('button', {
    class: 'file-tab',
    role: 'tab',
    'aria-selected': 'false',
    'data-idx': String(idx),
  }, short)

  if (ext) {
    tab.appendChild(createEl('span', { class: 'tab-ext-badge' }, ext))
  }

  const closeBtn = createEl('span', {
    class: 'file-tab-close',
    role: 'button',
    tabindex: '0',
    'aria-label': `Close ${filename}`,
  }, '×')

  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation()
    closeFile(idx)
  })
  closeBtn.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); closeFile(idx) }
  })

  tab.appendChild(closeBtn)
  tab.addEventListener('click', () => activateTab(idx))
  tabsEl.appendChild(tab)
}

function activateTab(idx) {
  state.activeIdx = idx

  qsa('.file-tab').forEach((tab) => {
    const isActive = Number(tab.dataset.idx) === idx
    tab.setAttribute('aria-selected', isActive ? 'true' : 'false')
  })

  renderInvestigation(idx)
}

function closeFile(idx) {
  const entry = state.files[idx]
  if (!entry) return

  URL.revokeObjectURL(entry.objectUrl)
  state.files[idx] = null

  const tabEl = qs(`[data-idx="${idx}"]`)
  tabEl?.remove()

  const remaining = state.files.map((f, i) => f ? i : -1).filter(i => i >= 0)

  if (remaining.length === 0) {
    destroyMap()
    qs('#file-tabs').hidden = true
    qs('#investigation').hidden = true
    qs('#dropzone-section').hidden = false
    state.files = []
    state.activeIdx = 0
  } else {
    activateTab(remaining[remaining.length - 1])
  }
}

// ── Investigation render ──────────────────────────────────────
function renderInvestigation(idx) {
  const entry = state.files[idx]
  if (!entry) return

  const { file, parsed, objectUrl } = entry
  const inv = qs('#investigation')
  inv.hidden = false

  renderPreview(file, objectUrl)

  if (!parsed) {
    renderEmptyReport()
    return
  }

  renderDataRows(qs('#body-camera'),   parsed.camera,   getSensitiveKeys(parsed))
  updateSectionBadge('label-camera',   fieldCount(parsed.camera))

  renderDataRows(qs('#body-exposure'),  parsed.exposure)
  updateSectionBadge('label-exposure', fieldCount(parsed.exposure))

  renderDataRows(qs('#body-datetime'), parsed.datetime, getSensitiveKeys(parsed))
  updateSectionBadge('label-datetime', fieldCount(parsed.datetime))

  renderDataRows(qs('#body-location'), parsed.location, getSensitiveKeys(parsed))
  updateSectionBadge('label-location', fieldCount(parsed.location))
  if (fieldCount(parsed.location) === 0) {
    const bodyLoc = qs('#body-location')
    bodyLoc.innerHTML = ''
    bodyLoc.appendChild(createEl('p', { class: 'no-data' }, 'No location data embedded in this image.'))
  }

  renderDataRows(qs('#body-image'),    parsed.image)
  updateSectionBadge('label-image',   fieldCount(parsed.image))

  renderDataRows(qs('#body-software'), parsed.software)
  updateSectionBadge('label-software', fieldCount(parsed.software))

  renderDataRows(qs('#body-author'),   parsed.author)
  updateSectionBadge('label-author',  fieldCount(parsed.author))

  // Raw dump — syntax highlighted
  qs('#raw-json').innerHTML = highlightJson(JSON.stringify(parsed.raw, null, 2))

  const rawToggle = qs('#raw-toggle')
  rawToggle.onclick = () => {
    const expanded = rawToggle.getAttribute('aria-expanded') === 'true'
    rawToggle.setAttribute('aria-expanded', !expanded)
    qs('#body-raw').hidden = expanded
  }

  const gps = getGPS(parsed)
  renderGPSPanel(gps, parsed)
  renderPrivacy(parsed)
  initExportButtons(parsed, file)
  setCaseBadge(file.name, parsed.fieldCount)
}

function renderPreview(file, objectUrl) {
  const img    = qs('#preview-img')
  const notice = qs('#preview-heic-notice')
  const meta   = qs('#preview-meta')

  const isHeic = /\.heic$/i.test(file.name) || file.type === 'image/heic' || file.type === 'image/heif'

  if (isHeic) {
    img.src = ''
    img.hidden = true
    notice.hidden = false
  } else {
    img.src = objectUrl
    img.alt = file.name
    img.hidden = false
    notice.hidden = true
  }

  meta.innerHTML = ''
  const ext = file.name.split('.').pop()?.toUpperCase() ?? 'IMAGE'
  ;[file.name, formatBytes(file.size), ext].forEach(text => {
    meta.appendChild(createEl('span', { class: 'preview-meta-item' }, text))
  })
}

function renderEmptyReport() {
  const sections = ['camera', 'exposure', 'datetime', 'location', 'image', 'software', 'author']
  sections.forEach(id => {
    const el = qs(`#body-${id}`)
    el.innerHTML = ''
    el.appendChild(createEl('p', { class: 'no-data' }, 'no data'))
    qs(`#label-${id}`)?.querySelector('.section-count-badge')?.remove()
  })
  qs('#raw-json').innerHTML = highlightJson('{}')
  qs('#privacy-flags').innerHTML = ''
  qs('#map-placeholder').hidden = false
  qs('#map-actions').hidden = true
}

function renderGPSPanel(gps, parsed) {
  const placeholder = qs('#map-placeholder')
  const mapActions  = qs('#map-actions')

  if (!gps) {
    placeholder.hidden = false
    mapActions.hidden = true
    return
  }

  placeholder.hidden = true
  mapActions.hidden = false

  const { lat, lng, altitude } = gps

  qs('#gmaps-link').href = `https://www.google.com/maps?q=${lat},${lng}`
  qs('#amaps-link').href = `https://maps.apple.com/?q=${lat},${lng}`

  const copyBtn = qs('#copy-coords-btn')
  copyBtn.onclick = () => {
    navigator.clipboard.writeText(`${lat.toFixed(6)}, ${lng.toFixed(6)}`)
      .then(() => toast('Coordinates copied!', 'success'))
      .catch(() => toast('Copy failed.', 'error'))
  }

  // Koordinat gösterimi
  mapActions.querySelector('.coords-display')?.remove()
  const latDir = lat >= 0 ? 'N' : 'S'
  const lngDir = lng >= 0 ? 'E' : 'W'
  const coordLine = `${Math.abs(lat).toFixed(4)}° ${latDir}, ${Math.abs(lng).toFixed(4)}° ${lngDir}`
  const altLine   = altitude !== null ? `<br>altitude: ${Number(altitude).toFixed(1)}m` : ''
  const coordsDisplay = createEl('div', { class: 'coords-display' })
  coordsDisplay.innerHTML = `${coordLine}${altLine}`
  mapActions.appendChild(coordsDisplay)

  // Fire-and-forget — görsel; await gerekmez
  initMap(lat, lng)
}

// ── Privacy ───────────────────────────────────────────────────
function renderPrivacy(parsed) {
  const container = qs('#privacy-flags')
  container.innerHTML = ''
  computePrivacyFlags(parsed).forEach(({ label, type, detail }) => {
    container.appendChild(createPrivacyFlag(label, type, detail))
  })
}

function createPrivacyFlag(label, type, detail) {
  const flag    = createEl('button', {
    class: `privacy-flag privacy-flag--${type}`,
    type: 'button',
    tabindex: '0',
  }, label)
  const tooltip = createEl('span', { class: 'flag-tooltip', role: 'tooltip' }, detail)
  flag.appendChild(tooltip)

  flag.addEventListener('click', (e) => {
    e.stopPropagation()
    const isVisible = tooltip.classList.contains('flag-tooltip--visible')
    document.querySelectorAll('.flag-tooltip--visible').forEach(t => t.classList.remove('flag-tooltip--visible'))
    if (!isVisible) tooltip.classList.add('flag-tooltip--visible')
  })

  return flag
}

// ── Export butonları ──────────────────────────────────────────
function initExportButtons(parsed, file) {
  qs('#copy-json-btn').onclick = () => {
    navigator.clipboard.writeText(JSON.stringify(parsed.raw, null, 2))
      .then(() => toast('JSON copied to clipboard!', 'success'))
      .catch(() => toast('Copy failed.', 'error'))
  }

  qs('#download-txt-btn').onclick = () => {
    const lines = [
      `EXIF TETKIK — INVESTIGATION REPORT`,
      `File: ${file.name} | ${formatBytes(file.size)}`,
      `Generated: ${new Date().toLocaleString()}`,
      `Fields: ${parsed.fieldCount}`,
      '',
      '── CAMERA & LENS ──',
      ...Object.entries(parsed.camera).map(([k, v]) => `  ${k}: ${formatValue(k, v)}`),
      '',
      '── EXPOSURE ──',
      ...Object.entries(parsed.exposure).map(([k, v]) => `  ${k}: ${formatValue(k, v)}`),
      '',
      '── DATE & TIME ──',
      ...Object.entries(parsed.datetime).map(([k, v]) => `  ${k}: ${formatValue(k, v)}`),
      '',
      '── LOCATION ──',
      ...Object.entries(parsed.location).map(([k, v]) => `  ${k}: ${formatValue(k, v)}`),
      '',
      '── IMAGE ──',
      ...Object.entries(parsed.image).filter(([k]) => !k.startsWith('_')).map(([k, v]) => `  ${k}: ${formatValue(k, v)}`),
    ]
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' })
    const a = createEl('a', { href: URL.createObjectURL(blob), download: `${file.name}_exif-report.txt` })
    a.click()
    URL.revokeObjectURL(a.href)
    toast('Report downloaded.', 'success')
  }

  qs('#share-card-btn').onclick = () => {
    toast('Share card coming in Day 5.', 'default')
  }

  const stripBtn = qs('#strip-btn')
  stripBtn.onclick = async () => {
    stripBtn.disabled = true
    showLoading('Stripping metadata...')
    try {
      const { blob, originalFieldCount, outputFilename } = await stripExif(file)
      const url = URL.createObjectURL(blob)
      const a = createEl('a', { href: url, download: outputFilename })
      a.click()
      URL.revokeObjectURL(url)
      toast(`Cleaned. ${originalFieldCount} metadata fields removed.`, 'success')
    } catch (err) {
      toast('Strip failed. Try downloading and re-uploading the image.', 'error')
      console.error(err)
    } finally {
      hideLoading()
      stripBtn.disabled = false
    }
  }
}

// ── Case badge ────────────────────────────────────────────────
let caseCounter = 1
function setCaseBadge(filename = null, count = null) {
  const badge = qs('#case-badge')
  if (!filename) {
    badge.textContent = ''
    return
  }
  badge.textContent = `CASE #${String(caseCounter++).padStart(3, '0')} · ${count} FIELDS`
}

// ── Section badge helpers ─────────────────────────────────────
function fieldCount(data) {
  return Object.keys(data).filter(k => !k.startsWith('_')).length
}

function updateSectionBadge(labelId, count) {
  const labelEl = qs(`#${labelId}`)
  if (!labelEl) return
  labelEl.querySelector('.section-count-badge')?.remove()
  if (count > 0) {
    labelEl.appendChild(createEl('span', { class: 'section-count-badge' }, `(${count})`))
  }
}

// ── Keyboard shortcuts ─────────────────────────────────────────
function initKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !qs('#dropzone-section:not([hidden])')) {
      resetToDropzone()
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'j') {
      e.preventDefault()
      qs('#copy-json-btn')?.click()
    }
  })
}

// Privacy tooltip dışına tıklanınca tüm tooltip'leri kapat
function initPrivacyTooltips() {
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.privacy-flag')) {
      document.querySelectorAll('.flag-tooltip--visible').forEach(t => {
        t.classList.remove('flag-tooltip--visible')
      })
    }
  })
}

function resetToDropzone() {
  state.files.forEach(f => f && URL.revokeObjectURL(f.objectUrl))
  state.files = []
  state.activeIdx = 0
  destroyMap()
  qs('#file-tabs').hidden = true
  qs('#file-tabs').innerHTML = ''
  qs('#investigation').hidden = true
  qs('#dropzone-section').hidden = false
  setCaseBadge()
}

function qsa(sel) { return [...document.querySelectorAll(sel)] }

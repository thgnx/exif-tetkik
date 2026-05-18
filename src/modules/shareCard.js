/**
 * shareCard.js — Canvas API ile 1200×630 investigation özet kartı üretir
 * Çıktı: PNG Blob
 */

import { computePrivacyFlags } from './privacy.js'
import { formatValue }         from './ui.js'

const W     = 1200
const H     = 630
const SPLIT = 540

const C = {
  bgPrimary:    '#0e0d0b',
  bgSecondary:  '#15130f',
  textPrimary:  '#e6e1d4',
  textTertiary: '#5a5346',
  border:       '#29251f',
  accent:       '#b8975f',
  danger:       '#c47864',
  warning:      '#d4b06b',
  success:      '#7a9472',
}

export async function generateShareCard(parsed, file, previewObjectUrl) {
  await document.fonts.ready

  const canvas = document.createElement('canvas')
  canvas.width  = W
  canvas.height = H
  const ctx = canvas.getContext('2d')

  ctx.fillStyle = C.bgPrimary
  ctx.fillRect(0, 0, W, H)

  await drawPreview(ctx, previewObjectUrl)

  ctx.beginPath()
  ctx.strokeStyle = C.border
  ctx.lineWidth = 1
  ctx.moveTo(SPLIT, 0)
  ctx.lineTo(SPLIT, H)
  ctx.stroke()

  drawRightPanel(ctx, parsed)

  return canvasToBlob(canvas)
}

async function drawPreview(ctx, previewObjectUrl) {
  let img = null
  try {
    img = await loadImage(previewObjectUrl)
  } catch {
    // fall through to solid fill
  }

  if (img) {
    const imgAspect = img.naturalWidth / img.naturalHeight
    const boxAspect = SPLIT / H
    let sw, sh, sx, sy
    if (imgAspect > boxAspect) {
      sh = img.naturalHeight
      sw = sh * boxAspect
      sy = 0
      sx = (img.naturalWidth - sw) / 2
    } else {
      sw = img.naturalWidth
      sh = sw / boxAspect
      sx = 0
      sy = (img.naturalHeight - sh) / 2
    }
    ctx.save()
    ctx.beginPath()
    ctx.rect(0, 0, SPLIT, H)
    ctx.clip()
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, SPLIT, H)
    ctx.restore()

    ctx.fillStyle = 'rgba(14,13,11,0.5)'
    ctx.fillRect(0, 0, SPLIT, H)
  } else {
    ctx.fillStyle = C.bgSecondary
    ctx.fillRect(0, 0, SPLIT, H)
    ctx.fillStyle = C.textTertiary
    ctx.font = '14px "Geist Mono"'
    ctx.textAlign = 'center'
    ctx.fillText('Preview unavailable', SPLIT / 2, H / 2)
    ctx.textAlign = 'left'
  }
}

function drawRightPanel(ctx, parsed) {
  const x = 580

  // Header
  ctx.fillStyle = C.textTertiary
  ctx.font = '12px "Geist Mono"'
  ctx.letterSpacing = '3px'
  ctx.fillText('EXIF TETKIK', x, 55)
  ctx.letterSpacing = '0px'

  ctx.fillStyle = C.textPrimary
  ctx.font = 'italic 24px "Fraunces"'
  ctx.fillText('Investigation Report', x, 85)

  // Divider
  ctx.beginPath()
  ctx.strokeStyle = C.border
  ctx.lineWidth = 1
  ctx.moveTo(x, 100)
  ctx.lineTo(1180, 100)
  ctx.stroke()

  // Stats
  drawStat(ctx, x, 130, 'CAMERA',   buildCamera(parsed))
  drawStat(ctx, x, 210, 'EXPOSURE', buildExposure(parsed))
  drawLocationStat(ctx, x, 290, parsed)
  drawStat(ctx, x, 370, 'METADATA', `${parsed.fieldCount} fields`)

  // Privacy flags
  drawPrivacyFlags(ctx, x, 450, parsed)

  // Branding
  ctx.fillStyle = C.textTertiary
  ctx.font = '11px "Geist Mono"'
  ctx.letterSpacing = '0px'
  ctx.fillText('exif.tahagenc.com', x, 590)

  // Stamp
  drawStamp(ctx)
}

function drawStat(ctx, x, y, label, value, color) {
  ctx.fillStyle = C.textTertiary
  ctx.font = '11px "Geist Mono"'
  ctx.letterSpacing = '0px'
  ctx.fillText(label, x, y)

  ctx.fillStyle = color ?? C.textPrimary
  ctx.font = '16px "Geist Mono"'
  // Truncate long values so they don't overflow into stamp area
  const maxWidth = 580
  ctx.fillText(value || 'Unknown', x, y + 24, maxWidth)
}

function drawLocationStat(ctx, x, y, parsed) {
  ctx.fillStyle = C.textTertiary
  ctx.font = '11px "Geist Mono"'
  ctx.letterSpacing = '0px'
  ctx.fillText('LOCATION', x, y)

  const hasGPS = parsed.location?.latitude !== undefined
  ctx.fillStyle = hasGPS ? C.danger : C.success
  ctx.font = '16px "Geist Mono"'
  ctx.fillText(hasGPS ? 'GPS Embedded' : 'No GPS', x, y + 24)
}

function drawPrivacyFlags(ctx, x, y, parsed) {
  computePrivacyFlags(parsed).slice(0, 3).forEach((flag, i) => {
    const fx = x + i * 185
    const color = flag.type === 'danger'  ? C.danger
                : flag.type === 'warning' ? C.warning
                : C.success

    ctx.beginPath()
    ctx.fillStyle = color
    ctx.arc(fx + 6, y + 1, 5, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = color
    ctx.font = '10px "Geist Mono"'
    ctx.letterSpacing = '0px'
    ctx.fillText(flag.label.replace(/^[⚠•✓]\s*/, ''), fx + 16, y + 5)
  })
}

function drawStamp(ctx) {
  const SW = 155
  const SH = 40
  // Center of stamp position
  const cx = 1020 + SW / 2
  const cy = 555  + SH / 2

  ctx.save()
  ctx.globalAlpha = 0.5
  ctx.translate(cx, cy)
  ctx.rotate(-15 * Math.PI / 180)

  ctx.strokeStyle = C.accent
  ctx.lineWidth = 2
  ctx.strokeRect(-SW / 2, -SH / 2, SW, SH)

  ctx.fillStyle = C.accent
  ctx.font = '12px "Geist Mono"'
  ctx.letterSpacing = '2px'
  ctx.textAlign = 'center'
  ctx.fillText('CASE CLOSED', 0, 5)
  ctx.textAlign = 'left'
  ctx.letterSpacing = '0px'

  ctx.restore()
}

function buildCamera(parsed) {
  const make  = parsed.camera?.Make  ?? ''
  const model = parsed.camera?.Model ?? ''
  return (make + ' ' + model).trim() || 'Unknown'
}

function buildExposure(parsed) {
  const exp = parsed.exposure ?? {}
  const parts = []
  if (exp.FNumber      !== undefined) parts.push(formatValue('FNumber', exp.FNumber))
  if (exp.ExposureTime !== undefined) parts.push(formatValue('ExposureTime', exp.ExposureTime))
  if (exp.ISO          !== undefined) parts.push(formatValue('ISO', exp.ISO))
  else if (exp.ISOSpeedRatings !== undefined) parts.push(formatValue('ISO', exp.ISOSpeedRatings))
  return parts.join('  ') || 'Unknown'
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    if (!url) return reject(new Error('No URL'))
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload  = () => resolve(img)
    img.onerror = () => reject(new Error('Image load failed'))
    img.src = url
  })
}

function canvasToBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Canvas encoding failed'))),
      'image/png'
    )
  })
}

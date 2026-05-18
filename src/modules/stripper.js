/**
 * stripper.js — Canvas API ile EXIF strip
 * Görüntüyü offscreen canvas'a çizer, re-encode eder → yeni Blob döner.
 */

import { parseFile } from './parser.js'

const MIME_MAP = {
  jpg:  'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  png:  'image/png',
  tiff: 'image/png',
  tif:  'image/png',
  heic: 'image/jpeg',
  heif: 'image/jpeg',
}

const EXT_MAP = {
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/png':  'png',
}

export async function stripExif(file) {
  // Orijinal field sayısını önceden al
  let originalFieldCount = 0
  try {
    const parsed = await parseFile(file)
    originalFieldCount = parsed?.fieldCount ?? 0
  } catch {
    originalFieldCount = 0
  }

  const rawExt = (file.name.split('.').pop() ?? '').toLowerCase()
  const outputMime = MIME_MAP[rawExt] ?? 'image/jpeg'
  const outputExt  = EXT_MAP[outputMime]

  // Görüntüyü yükle
  const objectUrl = URL.createObjectURL(file)
  let img
  try {
    img = await loadImage(objectUrl)
  } finally {
    URL.revokeObjectURL(objectUrl)
  }

  // Offscreen canvas'a çiz
  const canvas = document.createElement('canvas')
  canvas.width  = img.naturalWidth
  canvas.height = img.naturalHeight
  canvas.getContext('2d').drawImage(img, 0, 0)

  // Re-encode (PNG lossless, diğerleri quality 0.92)
  const quality = outputMime === 'image/png' ? undefined : 0.92
  const blob    = await canvasToBlob(canvas, outputMime, quality)

  if (!blob) throw new Error('Canvas encoding failed')

  // Dosya adı: orijinal uzantı → yeni uzantı + _clean
  const baseName      = file.name.replace(/\.[^.]+$/, '')
  const outputFilename = `${baseName}_clean.${outputExt}`

  return { blob, originalFieldCount, outputFilename }
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload  = () => resolve(img)
    img.onerror = () => reject(new Error('Image load failed'))
    img.src = src
  })
}

function canvasToBlob(canvas, mimeType, quality) {
  return new Promise((resolve) => {
    if (quality !== undefined) {
      canvas.toBlob(resolve, mimeType, quality)
    } else {
      canvas.toBlob(resolve, mimeType)
    }
  })
}

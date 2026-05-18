/**
 * privacy.js — Privacy flag ve sensitive key hesabı
 */

const SERIAL_KEYS = ['LensSerialNumber', 'BodySerialNumber', 'SerialNumber', 'InternalSerialNumber']

/**
 * Parsed EXIF'ten privacy flag listesi üretir.
 * Her zaman en az bir flag döner (temizse "clean" flag).
 * @returns {{ label: string, type: string, detail: string }[]}
 */
export function computePrivacyFlags(parsed) {
  const flags = []
  const raw = parsed.raw

  if (raw.latitude !== undefined || raw.GPSLatitude !== undefined) {
    flags.push({
      label:  '⚠ Location leak',
      type:   'danger',
      detail: 'GPS coordinates embedded: GPSLatitude, GPSLongitude',
    })
  }

  const foundSerials = SERIAL_KEYS.filter(k => raw[k] !== undefined)
  if (foundSerials.length > 0) {
    flags.push({
      label:  '• Device fingerprint',
      type:   'warning',
      detail: `Serial numbers found: ${foundSerials.join(', ')}`,
    })
  }

  if (raw.DateTimeOriginal) {
    flags.push({
      label:  '• Exact timestamp',
      type:   'warning',
      detail: 'DateTimeOriginal has second-level precision',
    })
  }

  const softwareTrail = ['HistorySoftwareAgent', 'ProcessingHistory'].filter(k => raw[k] !== undefined)
  if (softwareTrail.length > 0) {
    flags.push({
      label:  '• Software trail',
      type:   'warning',
      detail: `Editing history found: ${softwareTrail.join(', ')}`,
    })
  }

  if (flags.length === 0) {
    return [{ label: '✓ Clean', type: 'clean', detail: 'No sensitive metadata detected.' }]
  }

  return flags
}

/**
 * Flaglı field adlarını Set olarak döner.
 * renderDataRows bu Set'i kullanarak değerleri kırmızı renklendirir.
 * @returns {Set<string>}
 */
export function getSensitiveKeys(parsed) {
  const keys = new Set()
  const raw = parsed.raw

  if (raw.latitude !== undefined) {
    keys.add('latitude'); keys.add('longitude')
    keys.add('GPSLatitude'); keys.add('GPSLongitude')
  }

  SERIAL_KEYS.forEach(k => {
    if (raw[k] !== undefined) keys.add(k)
  })

  return keys
}

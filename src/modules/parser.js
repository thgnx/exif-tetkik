/**
 * parser.js — exifr wrapper
 * Raw EXIF parse + kategorize edilmiş output
 * exifr API'yi soyutlayarak ileride library değiştirilebilir hale getirir.
 */

import * as exifr from 'exifr'

/**
 * @typedef {Object} ParsedExif
 * @property {Object} raw        - exifr'den gelen ham field'lar
 * @property {Object} camera     - Make, Model, lens bilgileri
 * @property {Object} exposure   - FNumber, ISO, shutter vs.
 * @property {Object} datetime   - Tarih/saat alanları
 * @property {Object} location   - GPS verileri
 * @property {Object} image      - Boyut, renk, orientasyon
 * @property {Object} software   - Yazılım ve post-processing izi
 * @property {Object} author     - Sanatçı, telif hakları
 * @property {number} fieldCount - Toplam field sayısı
 */

/** Tüm EXIF kategorilerini parse et */
export async function parseFile(file) {
  const raw = await exifr.parse(file, {
    tiff: true,
    exif: true,
    gps: true,
    iptc: true,
    xmp: true,
    icc: false,
    thumbnail: false,
    translateValues: true,
    translateKeys: true,
    reviveValues: true,
  })

  if (!raw) return null

  return {
    raw,
    camera:   extractCamera(raw),
    exposure: extractExposure(raw),
    datetime: extractDatetime(raw),
    location: extractLocation(raw),
    image:    extractImage(raw),
    software: extractSoftware(raw),
    author:   extractAuthor(raw),
    fieldCount: Object.keys(raw).length,
  }
}

/** GPS koordinatlarını decimal formatta döndür (exifr zaten çevirir) */
export function getGPS(parsed) {
  if (!parsed?.location?.latitude || !parsed?.location?.longitude) return null
  return {
    lat: parsed.location.latitude,
    lng: parsed.location.longitude,
    altitude: parsed.location.altitude ?? null,
  }
}

// ── Kategori extractors ──────────────────────────────────────

function extractCamera(raw) {
  return pick(raw, [
    'Make', 'Model',
    'LensMake', 'LensModel', 'LensInfo',
    'LensSerialNumber', 'BodySerialNumber', 'SerialNumber', 'InternalSerialNumber',
  ])
}

function extractExposure(raw) {
  return pick(raw, [
    'FNumber', 'ApertureValue',
    'ExposureTime', 'ShutterSpeedValue',
    'ISO', 'ISOSpeedRatings',
    'FocalLength', 'FocalLengthIn35mmFormat',
    'ExposureMode', 'ExposureProgram', 'ExposureBiasValue',
    'MeteringMode', 'WhiteBalance', 'WhiteBalanceMode',
    'Flash', 'FlashMode',
    'BrightnessValue',
  ])
}

function extractDatetime(raw) {
  return pick(raw, [
    'DateTimeOriginal', 'CreateDate', 'ModifyDate',
    'DateTimeDigitized', 'GPSDateStamp', 'GPSTimeStamp',
    'OffsetTime', 'OffsetTimeOriginal', 'OffsetTimeDigitized',
    'SubSecTimeOriginal', 'SubSecTimeDigitized',
  ])
}

function extractLocation(raw) {
  return pick(raw, [
    'latitude', 'longitude',
    'GPSLatitude', 'GPSLatitudeRef',
    'GPSLongitude', 'GPSLongitudeRef',
    'GPSAltitude', 'GPSAltitudeRef',
    'altitude',
    'GPSSpeed', 'GPSSpeedRef',
    'GPSImgDirection', 'GPSImgDirectionRef',
    'GPSDestBearing', 'GPSProcessingMethod',
    'GPSHPositioningError',
  ])
}

function extractImage(raw) {
  const out = pick(raw, [
    'ImageWidth', 'ImageHeight', 'ExifImageWidth', 'ExifImageHeight',
    'PixelXDimension', 'PixelYDimension',
    'ColorSpace', 'BitsPerSample', 'SamplesPerPixel',
    'Orientation', 'XResolution', 'YResolution', 'ResolutionUnit',
    'Compression', 'PhotometricInterpretation',
    'ImageDescription',
  ])

  // Megapixel hesabı
  const w = raw.PixelXDimension ?? raw.ExifImageWidth ?? raw.ImageWidth
  const h = raw.PixelYDimension ?? raw.ExifImageHeight ?? raw.ImageHeight
  if (w && h) out._megapixels = ((w * h) / 1_000_000).toFixed(1)

  return out
}

function extractSoftware(raw) {
  return pick(raw, [
    'Software', 'ProcessingSoftware', 'HostComputer',
    'CreatorTool', 'HistorySoftwareAgent',
    'RawFileName', 'Rating', 'Label',
  ])
}

function extractAuthor(raw) {
  return pick(raw, [
    'Artist', 'Copyright', 'OwnerName',
    'Creator', 'CopyrightNotice', 'Rights',
    'By-line', 'Credit', 'Source',
  ])
}

/** Nesnenin belirtilen key'lerini kopyalar, undefined olanları atlar */
function pick(obj, keys) {
  const out = {}
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null) out[k] = obj[k]
  }
  return out
}

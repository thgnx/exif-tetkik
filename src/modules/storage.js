/**
 * storage.js — localStorage history management
 */

const HISTORY_KEY = 'exif-tetkik-history'
const MAX_HISTORY = 10

export function saveToHistory(entry) {
  try {
    const items = loadHistory()
    const filtered = items.filter(i => i.filename !== entry.filename)
    filtered.unshift({
      filename:   entry.filename,
      filesize:   entry.filesize,
      fieldCount: entry.fieldCount,
      savedAt:    Date.now(),
    })
    localStorage.setItem(HISTORY_KEY, JSON.stringify(filtered.slice(0, MAX_HISTORY)))
  } catch {
    // localStorage unavailable or full — silently ignore
  }
}

export function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]')
  } catch {
    return []
  }
}

export function clearHistory() {
  try {
    localStorage.removeItem(HISTORY_KEY)
  } catch {}
}

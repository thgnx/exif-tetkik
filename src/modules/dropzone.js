/**
 * dropzone.js — Drag-drop, file picker, clipboard paste, multi-file
 * Kütüphanesiz, vanilla JS. Browser File API kullanır.
 */

const ACCEPTED_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/webp',
  'image/heic', 'image/heif', 'image/tiff',
])
const ACCEPTED_EXTS = /\.(jpe?g|png|webp|heic|heif|tiff?)$/i
const MAX_BYTES = 50 * 1024 * 1024  // 50MB

/**
 * Dropzone'u başlatır.
 * @param {Function} onFiles  - Kabul edilen File[]'ı alan callback
 * @param {Function} onError  - (message: string) hata callback'i
 */
export function initDropzone(onFiles, onError) {
  const dropzone  = document.getElementById('dropzone')
  const fileInput = document.getElementById('file-input')
  const browseBtn = document.getElementById('browse-btn')

  // ── Tıklama → file picker ────────────────────────────────
  browseBtn.addEventListener('click', (e) => {
    e.stopPropagation()
    fileInput.click()
  })

  dropzone.addEventListener('click', () => fileInput.click())

  dropzone.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      fileInput.click()
    }
  })

  fileInput.addEventListener('change', () => {
    if (fileInput.files.length > 0) handleFiles([...fileInput.files], onFiles, onError)
    fileInput.value = ''  // aynı dosyayı tekrar yükleyebilmek için reset
  })

  // ── Drag & drop ──────────────────────────────────────────
  dropzone.addEventListener('dragenter', (e) => {
    e.preventDefault()
    dropzone.classList.add('drag-over')
  })

  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  })

  dropzone.addEventListener('dragleave', (e) => {
    // dropzone içindeki child'a geçişlerde false tetiklenmesin
    if (!dropzone.contains(e.relatedTarget)) {
      dropzone.classList.remove('drag-over')
    }
  })

  dropzone.addEventListener('drop', (e) => {
    e.preventDefault()
    dropzone.classList.remove('drag-over')
    const files = [...(e.dataTransfer?.files ?? [])]
    if (files.length > 0) handleFiles(files, onFiles, onError)
  })

  // ── Clipboard paste ──────────────────────────────────────
  document.addEventListener('paste', (e) => {
    const items = [...(e.clipboardData?.items ?? [])]
    const imageItems = items.filter(i => i.kind === 'file' && i.type.startsWith('image/'))
    if (imageItems.length === 0) return
    e.preventDefault()
    const files = imageItems.map(i => i.getAsFile()).filter(Boolean)
    if (files.length > 0) handleFiles(files, onFiles, onError)
  })
}

/** Dosyaları doğrular ve callback'e geçer */
function handleFiles(files, onFiles, onError) {
  const valid = []
  for (const file of files) {
    if (!isAccepted(file)) {
      onError(`${file.name}: unsupported format. Use JPEG, PNG, WebP, HEIC, or TIFF.`)
      continue
    }
    if (file.size > MAX_BYTES) {
      onError(`${file.name}: file exceeds 50MB limit.`)
      continue
    }
    valid.push(file)
  }
  if (valid.length > 0) onFiles(valid)
}

function isAccepted(file) {
  if (ACCEPTED_TYPES.has(file.type)) return true
  // HEIC gibi bazı dosyalarda MIME type boş gelebilir, extension'a bak
  return ACCEPTED_EXTS.test(file.name)
}

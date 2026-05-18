# EXIF Tetkik

**Upload a photo. Uncover every hidden detail. Strip what you don't want shared.**

🔗 **Live Demo:** [exif.tahagenc.com](https://exif.tahagenc.com)

EXIF Tetkik is a browser-based EXIF metadata inspector built with vanilla JavaScript. All processing happens client-side — no uploads, no tracking, no accounts.

## Features

- 📸 **Deep metadata extraction** — Camera, lens, exposure settings, GPS, timestamps, software trails
- 🗺️ **Interactive GPS map** — Pinpoint where your photo was taken
- 🔒 **Privacy analysis** — Flags sensitive data like GPS coordinates, device serial numbers, exact timestamps
- 🧹 **One-click EXIF stripping** — Download a clean copy with all metadata removed
- 📊 **Export options** — JSON dump, formatted text reports, shareable PNG cards
- 💾 **Local history** — Recent investigations saved in browser (no server)
- ⌨️ **Keyboard shortcuts** — Power-user friendly (press `?` to see all)

## Tech Stack

- **Vanilla JavaScript** + Vite
- **exifr** for EXIF/IPTC/XMP parsing
- **Leaflet** + CARTO Dark Matter tiles for mapping
- Hand-written CSS with custom design tokens (no frameworks)
- Zero external dependencies for core features

## Development

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # outputs to dist/
```

## Project Structure

```
src/
  main.js              # App coordinator
  style.css            # Design system + components
  modules/
    parser.js          # exifr wrapper, categorized output
    dropzone.js        # Drag-drop, paste, file picker
    map.js             # Leaflet integration
    privacy.js         # Privacy risk detection
    stripper.js        # Canvas-based EXIF removal
    exporter.js        # JSON/TXT export
    shareCard.js       # PNG card generator
    storage.js         # localStorage history
    ui.js              # DOM helpers, toast, formatting
```

## Why No Framework?

This project is a portfolio piece demonstrating:

- Vanilla JS module architecture
- CSS custom properties design system
- Progressive enhancement
- Accessibility-first UI
- File API + Canvas API mastery

Everything is built from scratch to prove it can be done without reaching for React/Vue/Tailwind.

## What I Learned

- **exifr quirks**: Different camera brands use different field names — defensive coding with optional chaining saved me
- **Leaflet race conditions**: CDN script tags with `defer` require wait-for-ready patterns
- **Canvas EXIF stripping**: Re-encoding via Canvas is simple but quality settings matter (0.92 for JPEG is the sweet spot)
- **CSS attribute selectors**: `[hidden] { display: none }` must have higher specificity than `display: flex`
- **localStorage pitfalls**: Always `JSON.parse` inside `try/catch` — one corrupt entry breaks everything

## License

MIT

## Author

Taha Genc — [tahagenc.com](https://tahagenc.com)

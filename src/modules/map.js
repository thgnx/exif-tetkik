/**
 * map.js — Leaflet harita modülü
 * Leaflet CDN defer yüklemesini bekler, map instance'ı burada tutar.
 */

let leafletMap = null

function waitForLeaflet() {
  return new Promise((resolve) => {
    if (window.L) return resolve()
    const interval = setInterval(() => {
      if (window.L) { clearInterval(interval); resolve() }
    }, 50)
  })
}

export async function initMap(lat, lng) {
  await waitForLeaflet()

  if (leafletMap) {
    leafletMap.remove()
    leafletMap = null
  }

  const mapEl = document.getElementById('map')
  if (!mapEl) return

  mapEl.style.display = 'block'

  leafletMap = window.L.map('map', {
    center: [lat, lng],
    zoom: 14,
    zoomControl: true,
    attributionControl: true,
  })

  window.L.tileLayer(
    'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OSM</a> © <a href="https://carto.com">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 20,
    }
  ).addTo(leafletMap)

  const markerHtml = `<div style="width:12px;height:12px;border-radius:50%;background:#b8975f;border:2px solid #e6e1d4;box-shadow:0 0 8px rgba(184,151,95,0.5)"></div>`
  const icon = window.L.divIcon({
    html: markerHtml,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
    className: '',
  })

  window.L.marker([lat, lng], { icon }).addTo(leafletMap)
  // Center with padding so marker isn't at the edge
  leafletMap.setView([lat, lng], 14)
}

export function destroyMap() {
  if (leafletMap) {
    leafletMap.remove()
    leafletMap = null
  }
}

export function isMapReady() {
  return !!window.L && !!document.getElementById('map')
}

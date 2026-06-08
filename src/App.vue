<script setup>
import { ref, onMounted, watch } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const showFilterModal = ref(false)
const selectedPOI = ref(null)
const pois = ref([])
const loading = ref(false)
const errorMsg = ref(null)
const map = ref(null)
const mapContainer = ref(null)
const markers = ref([])

const filters = ref({
  activityType: '',
  accessibility: '',
  distance: '2000',
  availability: '',
  price: '',
  language: 'fr'
})

const filterFields = [
  {
    key: 'activityType',
    label: "Type d'activité",
    options: [
      { value: '', label: "Tous les types" },
      { value: 'museum', label: 'Musée / Galerie' },
      { value: 'restaurant', label: 'Restaurant / Café' },
      { value: 'park', label: 'Parc / Jardin' },
      { value: 'theatre', label: 'Théâtre / Cinéma' },
      { value: 'attraction', label: 'Attraction touristique' },
      { value: 'hotel', label: 'Hôtel / Hébergement' },
    ]
  },
  {
    key: 'accessibility',
    label: 'Accessibilité PMR',
    options: [
      { value: '', label: 'Peu importe' },
      { value: 'yes', label: 'Entièrement accessible ♿' },
      { value: 'limited', label: 'Partiellement accessible ♿' },
    ]
  },
  {
    key: 'distance',
    label: 'Rayon de recherche',
    options: [
      { value: '500', label: '500 m' },
      { value: '1000', label: '1 km' },
      { value: '2000', label: '2 km' },
      { value: '5000', label: '5 km' },
    ]
  },
  {
    key: 'availability',
    label: 'Disponibilité',
    options: [
      { value: '', label: 'Peu importe' },
      { value: 'open', label: 'Ouvert maintenant' },
    ]
  },
  {
    key: 'price',
    label: 'Tarif',
    options: [
      { value: '', label: 'Peu importe' },
      { value: 'free', label: 'Gratuit' },
      { value: 'paid', label: 'Payant' },
    ]
  },
  {
    key: 'language',
    label: 'Langue préférée',
    options: [
      { value: 'fr', label: 'Français' },
      { value: 'en', label: 'English' },
      { value: 'es', label: 'Español' },
      { value: 'de', label: 'Deutsch' },
    ]
  }
]

const buildQuery = (lat, lon) => {
  const radius = parseInt(filters.value.distance) || 2000
  const wc = filters.value.accessibility === 'yes'
    ? '["wheelchair"="yes"]'
    : filters.value.accessibility === 'limited'
    ? '["wheelchair"~"yes|limited"]'
    : ''
  const t = filters.value.activityType

  let body = ''
  if (t === 'museum') {
    body = `
      node["tourism"~"museum|gallery"]${wc}["name"](around:${radius},${lat},${lon});
      way["tourism"~"museum|gallery"]${wc}["name"](around:${radius},${lat},${lon});`
  } else if (t === 'restaurant') {
    body = `
      node["amenity"~"restaurant|cafe|fast_food"]${wc}["name"](around:${radius},${lat},${lon});`
  } else if (t === 'park') {
    body = `
      node["leisure"~"park|garden"]["name"](around:${radius},${lat},${lon});
      way["leisure"~"park|garden"]["name"](around:${radius},${lat},${lon});`
  } else if (t === 'theatre') {
    body = `
      node["amenity"~"theatre|cinema"]${wc}["name"](around:${radius},${lat},${lon});
      way["amenity"~"theatre|cinema"]${wc}["name"](around:${radius},${lat},${lon});`
  } else if (t === 'attraction') {
    body = `
      node["tourism"="attraction"]${wc}["name"](around:${radius},${lat},${lon});
      way["tourism"="attraction"]${wc}["name"](around:${radius},${lat},${lon});`
  } else if (t === 'hotel') {
    body = `
      node["tourism"~"hotel|hostel|guest_house"]${wc}["name"](around:${radius},${lat},${lon});
      way["tourism"~"hotel|hostel|guest_house"]${wc}["name"](around:${radius},${lat},${lon});`
  } else {
    body = `
      node["tourism"~"museum|attraction|gallery"]${wc}["name"](around:${radius},${lat},${lon});
      node["leisure"~"park|garden"]["name"](around:${radius},${lat},${lon});
      node["amenity"~"theatre|cinema"]${wc}["name"](around:${radius},${lat},${lon});
      way["tourism"~"museum|attraction|gallery"]${wc}["name"](around:${radius},${lat},${lon});
      way["leisure"~"park|garden"]["name"](around:${radius},${lat},${lon});`
  }
  return `[out:json][timeout:30];(${body});out center 25;`
}

const formatHours = (oh) => {
  if (!oh) return null
  if (oh === '24/7') return 'Ouvert 24h/24, 7j/7'
  return oh.length > 70 ? oh.slice(0, 67) + '…' : oh
}

const typeLabel = (tags) => {
  const map = {
    museum: 'Musée', gallery: 'Galerie', attraction: 'Attraction',
    restaurant: 'Restaurant', cafe: 'Café', fast_food: 'Restauration rapide',
    theatre: 'Théâtre', cinema: 'Cinéma',
    park: 'Parc', garden: 'Jardin',
    hotel: 'Hôtel', hostel: 'Auberge', guest_house: 'Chambre d\'hôtes',
  }
  const key = tags.tourism || tags.amenity || tags.leisure || ''
  return map[key] || 'Lieu d\'intérêt'
}

const transformElement = (el) => {
  const tags = el.tags || {}
  const lat = el.lat ?? el.center?.lat
  const lon = el.lon ?? el.center?.lon
  if (!lat || !lon || !tags.name) return null

  const label = typeLabel(tags)
  const street = [tags['addr:housenumber'], tags['addr:street']].filter(Boolean).join(' ')
  const city = tags['addr:city'] || 'Paris'
  const address = street ? `${street}, ${city}` : city

  const wcMap = { yes: 'Entièrement accessible PMR.', limited: 'Partiellement accessible PMR.', no: 'Non accessible PMR.' }
  const wcInfo = wcMap[tags.wheelchair] || ''

  const description = tags['description:fr'] || tags.description
    || `${label} situé à ${address}. ${wcInfo}`.trim().replace(/\.$/, '') + '.'

  const website = tags.website || tags['contact:website'] || tags.url || null
  const phone = tags.phone || tags['contact:phone'] || null

  const actions = []
  if (website) actions.push({ label: 'Réservez en ligne', type: 'web', href: website })
  if (phone) actions.push({ label: 'Appelez maintenant', type: 'phone', href: `tel:${phone.replace(/\s/g, '')}` })
  if (actions.length === 0) {
    actions.push(
      { label: 'Réservez en ligne', type: 'web', href: null },
      { label: 'Appelez maintenant', type: 'phone', href: null }
    )
  } else if (actions.length === 1) {
    if (actions[0].type === 'web') actions.push({ label: 'Appelez maintenant', type: 'phone', href: null })
    else actions.unshift({ label: 'Réservez en ligne', type: 'web', href: null })
  }

  return {
    id: el.id,
    name: tags.name,
    lat, lon,
    description: description.slice(0, 180),
    hours: formatHours(tags.opening_hours),
    wheelchair: tags.wheelchair,
    actions: actions.slice(0, 2)
  }
}

const createPinIcon = (selected = false) => {
  const fill = selected ? '#1a1a2e' : '#E8474C'
  return L.divIcon({
    html: `<svg width="26" height="38" viewBox="0 0 26 38" xmlns="http://www.w3.org/2000/svg">
      <path d="M13 0C5.82 0 0 5.82 0 13c0 8.45 13 25 13 25s13-16.55 13-25C26 5.82 20.18 0 13 0z"
        fill="${fill}" stroke="rgba(0,0,0,0.15)" stroke-width="1"/>
      <circle cx="13" cy="13" r="4" fill="white"/>
    </svg>`,
    iconSize: [26, 38],
    iconAnchor: [13, 38],
    className: ''
  })
}

const renderMarkers = () => {
  if (!map.value) return
  markers.value.forEach(m => map.value.removeLayer(m))
  markers.value = []
  pois.value.forEach(poi => {
    const marker = L.marker([poi.lat, poi.lon], {
      icon: createPinIcon(selectedPOI.value?.id === poi.id)
    })
    marker.on('click', () => { selectedPOI.value = poi })
    marker.addTo(map.value)
    markers.value.push(marker)
  })
}

const fetchPOIs = async () => {
  if (!map.value) return
  loading.value = true
  errorMsg.value = null
  selectedPOI.value = null

  try {
    const center = map.value.getCenter()
    const query = buildQuery(center.lat, center.lng)
    const resp = await fetch('/overpass', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`
    })
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
    const data = await resp.json()
    pois.value = data.elements.map(transformElement).filter(Boolean).slice(0, 25)
    renderMarkers()
    if (pois.value.length > 0) selectedPOI.value = pois.value[0]
    else errorMsg.value = 'Aucun résultat trouvé. Essayez d\'autres filtres.'
  } catch (err) {
    errorMsg.value = 'Impossible de charger les données. Vérifiez votre connexion.'
    console.error(err)
  } finally {
    loading.value = false
  }
}

const getActionIcon = (action) => action.type === 'phone' ? '▶' : '+'

const handleAction = (action) => {
  if (action.href) {
    window.open(action.href, '_blank', 'noopener')
  } else {
    alert(`Aucune information disponible pour ce lieu.`)
  }
}

const submitFilters = () => {
  showFilterModal.value = false
  fetchPOIs()
}

onMounted(() => {
  if (mapContainer.value) {
    map.value = L.map(mapContainer.value, { zoomControl: false, attributionControl: false })
      .setView([48.8566, 2.3522], 14)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 })
      .addTo(map.value)
    fetchPOIs()
  }
})

watch(selectedPOI, () => {
  renderMarkers()
  if (selectedPOI.value && map.value) {
    map.value.setView([selectedPOI.value.lat, selectedPOI.value.lon], 16)
  }
})
</script>

<template>
  <div class="app-wrapper">
    <div class="phone-screen">

      <!-- Header -->
      <header class="header">
        <button class="icon-btn" @click="showFilterModal = true" aria-label="Filtres">
          <svg width="20" height="16" viewBox="0 0 20 16" fill="none">
            <rect x="0" y="0.5" width="20" height="2.5" rx="1.25" fill="#222"/>
            <circle cx="5.5" cy="1.75" r="3" fill="white" stroke="#222" stroke-width="1.5"/>
            <rect x="0" y="6.5" width="20" height="2.5" rx="1.25" fill="#222"/>
            <circle cx="14.5" cy="7.75" r="3" fill="white" stroke="#222" stroke-width="1.5"/>
            <rect x="0" y="12.5" width="20" height="2.5" rx="1.25" fill="#222"/>
            <circle cx="5.5" cy="13.75" r="3" fill="white" stroke="#222" stroke-width="1.5"/>
          </svg>
        </button>

        <div class="logo">
          <svg width="30" height="38" viewBox="0 0 30 38" fill="none">
            <path d="M15 0C6.72 0 0 6.72 0 15c0 10.31 15 23 15 23S30 25.31 30 15C30 6.72 23.28 0 15 0z" fill="#E8474C"/>
            <circle cx="15" cy="15" r="5.5" fill="white" opacity="0.65"/>
          </svg>
          <div class="logo-text">
            <span>GOOD</span>
            <span>MAPS</span>
          </div>
        </div>

        <button class="icon-btn" aria-label="Informations">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="9" stroke="#222" stroke-width="2"/>
            <path d="M10 9v6" stroke="#222" stroke-width="2.2" stroke-linecap="round"/>
            <circle cx="10" cy="6.2" r="1.2" fill="#222"/>
          </svg>
        </button>
      </header>

      <!-- Map -->
      <div ref="mapContainer" class="map-container"></div>

      <!-- Scrollable Content -->
      <div class="content">
        <button class="suggest-btn" :disabled="loading" @click="fetchPOIs">
          <span v-if="loading" class="btn-spinner"></span>
          <span v-else>Obtenir des suggestions</span>
        </button>

        <!-- Loading -->
        <div v-if="loading" class="status-block">
          <div class="spinner"></div>
          <p>Chargement des lieux…</p>
        </div>

        <!-- Error -->
        <div v-else-if="errorMsg" class="status-block error">
          <p>{{ errorMsg }}</p>
        </div>

        <!-- POI Card -->
        <div v-else-if="selectedPOI" class="poi-card">
          <h2 class="poi-name">{{ selectedPOI.name }}</h2>
          <p class="poi-description">{{ selectedPOI.description }}</p>
          <p v-if="selectedPOI.hours" class="poi-hours">
            <strong>{{ selectedPOI.hours }}</strong>
          </p>
          <div class="poi-actions">
            <button
              v-for="action in selectedPOI.actions"
              :key="action.label"
              class="action-btn"
              :class="{ 'action-btn--disabled': !action.href }"
              :title="action.href ? action.label : 'Information non disponible'"
              @click="handleAction(action)"
            >
              <div class="action-icon-circle">{{ getActionIcon(action) }}</div>
              <span class="action-text">{{ action.label }}</span>
            </button>
          </div>
          <p class="disclaimer">
            Les données proviennent d'OpenStreetMap et peuvent être incomplètes.
            Envisagez de vérifier les informations importantes.
          </p>
        </div>

        <!-- Empty state -->
        <div v-else class="status-block">
          <p>Appuyez sur « Obtenir des suggestions » pour découvrir les lieux accessibles près de vous.</p>
        </div>
      </div>

      <!-- Filter Modal -->
      <Transition name="fade">
        <div v-if="showFilterModal" class="filter-overlay">
          <div class="filter-modal">
            <button class="close-btn" @click="showFilterModal = false">✕</button>
            <h2 class="filter-title">Bienvenue !</h2>
            <p class="filter-subtitle">
              Pour mieux personnaliser vos suggestions d'activités, merci de remplir ce formulaire.
            </p>

            <div class="form-fields">
              <div v-for="field in filterFields" :key="field.key" class="form-field">
                <label class="field-label">{{ field.label }}</label>
                <div class="select-wrapper">
                  <select v-model="filters[field.key]" class="form-select">
                    <option
                      v-for="opt in field.options"
                      :key="opt.value"
                      :value="opt.value"
                    >{{ opt.label }}</option>
                  </select>
                  <svg class="select-arrow" width="12" height="8" viewBox="0 0 12 8" fill="none">
                    <path d="M1 1l5 5 5-5" stroke="#888" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </div>
              </div>
            </div>

            <button class="cta-btn" @click="submitFilters">
              Passer à la carte
            </button>
          </div>
        </div>
      </Transition>

    </div>
  </div>
</template>

<style scoped>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.app-wrapper {
  min-height: 100vh;
  background: #d6d6d6;
  display: flex;
  justify-content: center;
  align-items: flex-start;
}

.phone-screen {
  width: 100%;
  max-width: 420px;
  min-height: 100vh;
  background: white;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}

/* ── Header ── */
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  background: white;
  flex-shrink: 0;
  z-index: 2;
}

.icon-btn {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: 2.5px solid #111;
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.15s;
}
.icon-btn:hover { background: #f4f4f4; }

.logo {
  display: flex;
  align-items: center;
  gap: 10px;
}

.logo-text {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  line-height: 1.05;
}
.logo-text span {
  font-weight: 900;
  font-size: 15px;
  letter-spacing: 3px;
  color: #111;
  font-family: 'Arial Black', Arial, sans-serif;
}

/* ── Map ── */
.map-container {
  flex-shrink: 0;
  height: 280px;
  z-index: 1;
}

/* ── Content ── */
.content {
  flex: 1;
  overflow-y: auto;
  background: white;
}

.suggest-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: calc(100% - 32px);
  margin: 16px auto;
  padding: 16px;
  background: #E8474C;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s;
}
.suggest-btn:disabled { background: #e08a8d; cursor: not-allowed; }
.suggest-btn:not(:disabled):hover { background: #d0393e; }

.btn-spinner {
  width: 18px;
  height: 18px;
  border: 2.5px solid rgba(255,255,255,0.4);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.75s linear infinite;
}

/* ── Status blocks ── */
.status-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 24px 20px;
  color: #777;
  font-size: 14px;
  text-align: center;
  line-height: 1.6;
}
.status-block.error { color: #E8474C; }

.spinner {
  width: 36px;
  height: 36px;
  border: 3px solid #f0f0f0;
  border-top-color: #E8474C;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

/* ── POI Card ── */
.poi-card {
  padding: 0 18px 36px;
}

.poi-name {
  font-size: 18px;
  font-weight: 800;
  color: #111;
  margin-bottom: 10px;
  font-family: 'Arial Black', Arial, sans-serif;
}

.poi-description {
  font-size: 14px;
  color: #333;
  line-height: 1.7;
  text-align: justify;
  margin-bottom: 12px;
}

.poi-hours {
  font-size: 14px;
  color: #111;
  margin-bottom: 20px;
}
.poi-hours strong { font-weight: 700; }

.poi-actions {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}

.action-btn {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  text-align: left;
}

.action-icon-circle {
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  border-radius: 50%;
  border: 2px solid #E8474C;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: 900;
  color: #E8474C;
}

.action-text {
  font-size: 13px;
  font-weight: 600;
  color: #E8474C;
  line-height: 1.4;
}

.action-btn--disabled .action-icon-circle,
.action-btn--disabled .action-text {
  opacity: 0.35;
}
.action-btn--disabled {
  cursor: not-allowed;
}

.disclaimer {
  font-size: 11px;
  color: #999;
  line-height: 1.55;
}

/* ── Filter Modal ── */
.filter-overlay {
  position: absolute;
  inset: 0;
  background: white;
  z-index: 100;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.filter-modal {
  flex: 1;
  padding: 20px 24px 32px;
  display: flex;
  flex-direction: column;
}

.close-btn {
  align-self: flex-end;
  background: none;
  border: none;
  font-size: 20px;
  font-weight: 700;
  color: #222;
  cursor: pointer;
  padding: 4px 6px;
  line-height: 1;
  margin-bottom: 12px;
}

.filter-title {
  text-align: center;
  font-size: 26px;
  font-weight: 900;
  color: #111;
  margin-bottom: 12px;
  font-family: 'Arial Black', Arial, sans-serif;
}

.filter-subtitle {
  text-align: center;
  font-size: 13px;
  color: #666;
  line-height: 1.6;
  margin-bottom: 24px;
  padding: 0 4px;
}

.form-fields {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 32px;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-label {
  font-size: 12px;
  font-weight: 700;
  color: #444;
  padding-left: 16px;
  letter-spacing: 0.3px;
  text-transform: uppercase;
}

.select-wrapper {
  position: relative;
}

.form-select {
  width: 100%;
  padding: 14px 40px 14px 20px;
  background: #f0f0f0;
  border: none;
  border-radius: 30px;
  font-size: 14px;
  color: #333;
  outline: none;
  appearance: none;
  -webkit-appearance: none;
  cursor: pointer;
  font-weight: 500;
  transition: background 0.15s;
}
.form-select:focus { background: #e8e8e8; }

.select-arrow {
  position: absolute;
  right: 18px;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
}

.cta-btn {
  display: block;
  width: 100%;
  padding: 18px;
  background: #E8474C;
  color: white;
  border: none;
  border-radius: 30px;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  letter-spacing: 0.4px;
  margin-top: auto;
  transition: background 0.15s;
}
.cta-btn:hover { background: #d0393e; }

/* ── Transition ── */
.fade-enter-active, .fade-leave-active { transition: opacity 0.22s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

:global(.leaflet-container) { font-family: inherit; }
</style>

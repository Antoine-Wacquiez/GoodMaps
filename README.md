# GoodMaps

Application web mobile-first permettant de découvrir des **lieux accessibles aux PMR** (Personnes à Mobilité Réduite) autour de soi, en utilisant les données réelles d'OpenStreetMap.

---

## Aperçu

| Carte principale | Filtres personnalisés |
|---|---|
| Carte interactive avec marqueurs rouges | Formulaire de personnalisation |
| Bouton « Obtenir des suggestions » | 6 critères : type, accessibilité, distance… |
| Fiche détail du lieu sélectionné | Résultats mis à jour en temps réel |

---

## Fonctionnalités

- **Carte interactive** (Leaflet + OpenStreetMap) centrée sur Paris
- **Données réelles** récupérées via l'API Overpass (OSM) — aucune donnée mockée
- **Filtres personnalisables** : type d'activité, accessibilité PMR, rayon, disponibilité, tarif, langue
- **Fiche lieu** : nom, description, horaires, boutons « Réservez en ligne » et « Appelez maintenant » fonctionnels
- **Design mobile-first** fidèle à la maquette Canva
- Limite de **25 résultats** par requête

---

## Stack technique

| Outil | Rôle |
|---|---|
| [Vue 3](https://vuejs.org/) | Framework UI (Composition API, `<script setup>`) |
| [Vite](https://vitejs.dev/) | Bundler et serveur de développement |
| [Leaflet](https://leafletjs.com/) | Carte interactive |
| [Overpass API](https://overpass-api.de/) | Données POI en temps réel (OpenStreetMap) |

---

## Installation

```bash
# Cloner le projet
git clone https://github.com/Antoine-Wacquiez/GoodMaps.git
cd GoodMaps

# Installer les dépendances
npm install

# Lancer en développement
npm run dev
```

L'application est accessible sur `http://localhost:5173`

```bash
# Build de production
npm run build
```

---

## Structure du projet

```
GoodMaps/
├── src/
│   ├── App.vue          # Composant principal (carte, filtres, fiche lieu)
│   ├── main.js          # Point d'entrée Vue
│   └── style.css        # Styles globaux
├── public/
│   └── favicon.svg
├── vite.config.js       # Config Vite + proxy Overpass API
├── index.html
└── package.json
```

---

## Architecture & choix techniques

### Proxy Vite (sécurité CORS)
Les requêtes vers l'API Overpass transitent par un **proxy Vite** configuré dans `vite.config.js`. Cela évite d'exposer des appels cross-origin directs depuis le navigateur et contourne les restrictions CORS/SSL en développement.

```js
// vite.config.js
proxy: {
  '/overpass': {
    target: 'https://overpass-api.de',
    changeOrigin: true,
    secure: false,
    rewrite: (path) => path.replace(/^\/overpass/, '/api/interpreter'),
  }
}
```

### Requêtes Overpass dynamiques
La fonction `buildQuery()` génère une requête Overpass QL adaptée aux filtres sélectionnés par l'utilisateur (type de lieu, accessibilité PMR, rayon en mètres). Les résultats sont limités à 25 éléments.

### Marqueurs SVG personnalisés
Les marqueurs sont des icônes SVG injectées via `L.divIcon()` — rouge pour les POI normaux, noir pour le POI sélectionné.

---

## Maquette

Maquette réalisée sur Canva :  
https://www.canva.com/design/DAGVbhB06_I/4CYx7G4rFxwTKfwmLq2KSw/edit

---

## Méthodologie IA

Projet réalisé en **pair-programming avec Claude Code** (Anthropic).  
Voir le fichier [PROMPT.md](./PROMPT.md) pour le préprompt utilisé.

---

## Auteur

Antoine Wacquiez — Atelier IA Générative

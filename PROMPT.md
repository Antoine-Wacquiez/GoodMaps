# Préprompt — GoodMaps

Document décrivant la méthodologie et les prompts utilisés avec l'IA générative pour développer l'application GoodMaps.

---

## Outil IA utilisé

**Claude Code** (Anthropic) — assistant IA intégré directement dans l'environnement de développement (VS Code), capable de lire, écrire et modifier des fichiers, exécuter des commandes terminal, et itérer sur le code en temps réel.

---

## Préprompt initial

> Je développe une application web mobile appelée **GoodMaps**, une carte interactive qui aide les personnes à mobilité réduite (PMR) à trouver des lieux accessibles autour d'elles.
>
> **Stack imposée :** Vue 3 + Vite + Leaflet (déjà installés).
>
> **Maquette de référence :** deux écrans —
> 1. **Écran principal** : header avec icône filtre (cercle), logo GOOD MAPS (pin rouge + texte bold), icône info (cercle) ; carte Leaflet pleine largeur ; bouton rouge « Obtenir des suggestions » ; fiche du lieu sélectionné avec titre, description, horaires, deux boutons d'action (+ Réservez en ligne / ▶ Appelez maintenant) et un disclaimer.
> 2. **Modale filtres** (ouverte par le bouton filtre) : titre « Bienvenue ! », sous-titre, 6 champs de formulaire en pill arrondi, bouton rouge « Passer à la carte ».
>
> **Contraintes :**
> - Design mobile-first, max-width 420px, fond blanc, couleur principale #E8474C
> - Pas de données mockées : utiliser l'**API Overpass** (OpenStreetMap) pour récupérer de vrais POI
> - Limiter les résultats à 25
> - Les filtres doivent avoir des labels pertinents pour une app d'accessibilité PMR
> - Les boutons d'action doivent être fonctionnels : `tel:` pour appeler, `window.open` pour le site web
> - Marqueurs SVG personnalisés (pin rouge / pin noir pour sélectionné)
> - Transitions fluides pour la modale

---

## Itérations principales

| Étape | Prompt / Demande | Résultat |
|---|---|---|
| 1 | Implémenter la maquette Canva exactement | Refonte complète de App.vue en mobile-first |
| 2 | Remplacer les données mockées par l'API Overpass avec les bons labels | Intégration Overpass API + 6 filtres PMR |
| 3 | Les filtres n'affichent pas leurs labels | Ajout de `<label>` + flèche dropdown sur chaque select |
| 4 | Les boutons Réserver/Appeler ne fonctionnent pas | Stockage phone/website dans le POI + handlers `tel:` et `window.open` |
| 5 | Erreur CORS sur l'API Overpass | Proxy Vite avec `secure: false` dans `vite.config.js` |
| 6 | Initialisation git + push sur GitHub/main | `git init` → `git push --force origin main` |

---

## Bonnes pratiques appliquées

- **Sécurité** : pas de clé API exposée côté client, proxy serveur pour les appels externes
- **Maintenabilité** : tout le code dans un seul composant `App.vue` clair et commenté, séparation logique (query builder, transform, render)
- **UX** : état de chargement (spinner), état d'erreur, état vide, boutons désactivés si donnée manquante
- **Accessibilité** : attributs `aria-label` sur les boutons icônes, titre `title` sur les boutons d'action

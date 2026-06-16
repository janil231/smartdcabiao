# AGENTS.md — SmartDCabiao Frontend

## Build / Lint / Dev Commands

```bash
npm run dev      # Start Vite dev server with HMR
npm run build    # Production build via Vite
npm run preview  # Preview production build locally
npm run lint     # ESLint check (flat config, ESLint 9)
```

**No test framework is installed.** The project has no test dependencies and no test files. To add tests, install a framework (e.g., `npm install -D vitest`) and configure it.

**Single test:** Not possible without first adding a test framework. If Vitest is added, convention would be:
```
npx vitest run path/to/test  # run once
npx vitest path/to/test      # watch mode
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19 |
| Language | JavaScript (JSX) — **no TypeScript** |
| Bundler | Vite 7 |
| Styling | Tailwind CSS v4 (`@tailwindcss/vite` plugin) |
| Routing | react-router-dom v7 |
| Maps | react-leaflet + Leaflet |
| Backend | Firebase (Auth, Firestore, Storage) |
| QR | html5-qrcode (scan), qrcode (generate) |
| Sanitization | DOMPurify |
| State Mgmt | React Context API (3 contexts: Auth, Favorites, Language) + localStorage |
| Linting | ESLint 9 flat config |

## Code Style Guidelines

### Naming Conventions
| Entity | Convention | Examples |
|--------|-----------|----------|
| Components (files & exports) | PascalCase.jsx | `BusinessCard.jsx`, `LoginModal.jsx` |
| Pages | PascalCase.jsx | `HomePage.jsx`, `MapPage.jsx` |
| Hooks | camelCase, `use` prefix | `useIsMobile.js`, `useMapFilters.js` |
| Contexts | PascalCase.jsx | `AuthContext.jsx`, `FavoritesContext.jsx` |
| Services | camelCase, `.service.js` | `businesses.service.js`, `destinations.service.js` |
| Utilities | camelCase | `dateHelpers.js`, `sanitization.js` |
| Constants | UPPER_SNAKE_CASE | `CABIAO_BARANGAYS`, `BUSINESS_CATEGORIES` |
| Functions / variables | camelCase | `getBusinessById`, `filteredPlaces` |

### File Organization
- Components in `src/components/<area>/` (grouped by feature: `auth/`, `owner/`, `quest/`, `reviews/`, `ui/`)
- Pages in `src/pages/` (flat or grouped by role: `lgu/`)
- Services in `src/services/` (one file per domain, `.service.js` suffix)
- Utils in `src/utils/` (pure functions, reusable helpers)
- Constants in `src/constants/`
- Contexts in `src/contexts/`
- Hooks in `src/hooks/`
- Data (mock/static) in `src/data/`

### Imports
- **Relative imports only** — no path aliases configured
- Order: third-party (bare specifiers) → internal (relative)
```
import { useState, useEffect } from 'react'
import { MapContainer, TileLayer } from 'react-leaflet'
import { initializeApp } from 'firebase/app'

import { useAuth } from '../contexts/AuthContext'
import { getBusinessById } from '../../services/businesses.service'
import { CABIAO_BARANGAYS } from '../constants/cabiaoBarangays'
import BusinessCard from '../components/BusinessCard'
import './index.css'
```

### Component Patterns
- Default export for every component: `export default function ComponentName({ prop1, prop2 = 'default' }) {`
- Destructure props with defaults
- Arrow functions for handlers inside components
- No PropTypes, no JSDoc

### Formatting
- 2-space indentation
- Single quotes for strings
- Semicolons: use them (inconsistent in legacy code; ESLint recommended config expects them)
- JSX: `className` attribute, template literals for dynamic classes

### ESLint Rules (active)
- `no-unused-vars`: error, but allows uppercase-starting names (e.g., `const A_constant = ...`) and underscore-prefixed

### Error Handling
- Services wrap Firestore/async calls in try/catch, return `null`, `[]`, or fallback data
- Console warn with `[context]` prefix: `console.warn('[businesses] Firestore fetch failed:', error)`
- Component-level: try/catch in async handlers → `setError(msg)` state → show user feedback
- `ErrorBoundary` (class component) catches render errors globally
- Navigation redirects on not-found errors

### CSS / Styling
- Tailwind utility classes exclusively (no CSS modules, no styled-components)
- Custom animations in `src/index.css` via `@keyframes` and `@layer utilities`
- Custom components use `className` prop forwarding for extensibility
- Mobile-first responsive design (`sm:`, `md:`, `lg:`, `xl:` breakpoints)

### State Management
- React Context for global state (Auth, Favorites, Language)
- `useState` + `useEffect` for local state
- `localStorage` for persistence (favorites, language, cache)
- URL search params for filter/shareable state (map page)

### Firebase / Services Patterns
- Service files export async functions
- Check `import.meta.env.VITE_USE_FIRESTORE_DATA` to toggle Firestore vs mock
- Fallback chain: Firestore → localStorage cache → static mock data (`src/data/`)
- Merge strategies with `_source` tracking on objects

### Security
- DOMPurify for any user-rendered HTML (`sanitization.js`)
- Firestore rules restrict writes to authenticated users
- Image upload validation in `storage.service.js`
- Never log or expose Firebase secrets, API keys, or tokens

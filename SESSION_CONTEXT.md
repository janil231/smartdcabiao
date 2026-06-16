# SMARTDCABIAO — Full Project Context Brief (Updated: June 16, 2026)

---

## 1. One-Line Summary

SMARTDCABIAO is a React 19 + Firebase SPA that promotes sustainable tourism, community engagement, and a points-based reward system in Cabiao, Nueva Ecija, Philippines.

---

## 2. What This Project Is

A mobile-first web application that lets tourists and residents discover local businesses, tourist destinations, and community events (quests) in Cabiao. Users earn points by completing quests (visiting places, buying local, participating in events) and redeem those points for voucher discounts at partner businesses. The app also features a full LGU (Local Government Unit) admin dashboard for managing seasons, quests, vouchers, user submissions, reviews, reports, and verifications.

**Target audience:** Tourists visiting Cabiao, local residents, business owners, and LGU administrators.

**Product goals:** Drive sustainable tourism, increase local business visibility, incentivize community participation through gamification, and provide the LGU with tools to manage the tourism ecosystem.

---

## 3. Tech Stack

| Category | Technology | Version |
|---|---|---|
| Frontend framework | React | ^19.2.0 |
| Build tool | Vite | ^7.2.4 |
| Routing | react-router-dom | ^7.13.0 |
| Styling | Tailwind CSS (via @tailwindcss/vite) | ^4.1.18 |
| Language | Plain JavaScript (JSX) | ES Modules |
| Backend / BaaS | Firebase | ^12.9.0 |
| Database | Cloud Firestore | (via Firebase SDK) |
| Auth | Firebase Auth | (via Firebase SDK) |
| Image hosting | Cloudinary (unsigned upload preset) | (REST API) |
| Maps | Leaflet + react-leaflet | ^1.9.4 / ^5.0.0 |
| Sanitization | DOMPurify | ^3.3.1 |
| i18n | Custom translation system (no library) | (see src/i18n/) |
| QR scanning | html5-qrcode | ^2.3.8 |
| Lint | ESLint (flat config) | ^9.39.1 |
| React plugin | @vitejs/plugin-react | ^5.1.1 |
| PostCSS | postcss + autoprefixer | ^8.5.6 / ^10.4.24 |

---

## 4. Environment Variables

All env vars are prefixed `VITE_` and accessed via `import.meta.env.VITE_*`:

| Variable | Required | Purpose |
|---|---|---|
| `VITE_FIREBASE_API_KEY` | Yes | Firebase API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Yes | Firebase auth domain (e.g. `smartdcabiao.firebaseapp.com`) |
| `VITE_FIREBASE_PROJECT_ID` | Yes | Firebase project ID (`smartdcabiao`) |
| `VITE_FIREBASE_STORAGE_BUCKET` | Yes | Firebase storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Yes | Firebase sender ID |
| `VITE_FIREBASE_APP_ID` | Yes | Firebase app ID |
| `VITE_FACEBOOK_APP_ID` | Yes | Facebook App ID (for FB Login + FB Page plugin) |
| `VITE_USE_FIRESTORE_DATA` | No | `"true"` loads businesses/destinations from Firestore; `"false"` or missing uses static mock data only |
| `VITE_CLOUDINARY_CLOUD_NAME` | No* | Cloudinary cloud name (required for photo uploads) |
| `VITE_CLOUDINARY_UPLOAD_PRESET` | No* | Cloudinary unsigned upload preset (required for photo uploads) |

The app throws on startup if any of the 7 Firebase/Facebook vars are missing (line 18-21 of `src/lib/firebase.js`).

---

## 5. How To Run

**Prerequisites:**
- Node.js >= 18
- A `.env.local` file with all required env vars (copy from `.env.example`)
- (Optional) Firebase CLI for deploying rules/indexes

**Commands:**

| Command | Script | Purpose |
|---|---|---|
| `npm install` | — | Install dependencies |
| `npm run dev` | `vite` | Start dev server (default http://localhost:5173) |
| `npm run build` | `vite build` | Production build to `dist/` |
| `npm run preview` | `vite preview` | Preview production build locally |
| `npm run lint` | `eslint .` | Run ESLint across the project |

**Deployment:** The app is deployed on Vercel at `smartdcabiao.vercel.app`. Vercel is linked to GitHub repo `janil231/smartdcabiao1.git` (NOT `smartdcabiao.git`). Pushing to `main` on `smartdcabiao1` remote triggers auto-deployment.

**Two remotes:**
- `origin` → `https://github.com/janil231/smartdcabiao.git` (primary/code)
- `smartdcabiao1` → `https://github.com/janil231/smartdcabiao1.git` (Vercel-linked)

After committing, run both: `git push origin main && git push smartdcabiao1 main`

---

## 6. Repository Structure

```
smartdcabiao-frontend/
├── src/
│   ├── App.jsx                         # Root component: providers, BrowserRouter, all routes
│   ├── main.jsx                        # Entry point: StrictMode, AuthProvider, render App
│   ├── index.css                       # Tailwind imports + global styles + animations
│   ├── lib/
│   │   └── firebase.js                 # Firebase init (app, auth, db, storage)
│   ├── contexts/
│   │   ├── AuthContext.jsx             # Firebase Auth state + login/signup/logout/OAuth methods
│   │   ├── FavoritesContext.jsx        # localStorage-based favorites (businesses + destinations)
│   │   └── LanguageContext.jsx         # i18n context (en/fil), translation lookup, date/number formatting
│   ├── pages/
│   │   ├── HomePage.jsx                # Landing page (hero, featured businesses, community events, tips)
│   │   ├── MapPage.jsx                 # Full-screen Leaflet map with POI markers, filters, bottom sheet
│   │   ├── BusinessesPage.jsx          # Searchable business listing with category + barangay filters
│   │   ├── BusinessDetailPage.jsx      # Single business view (info, reviews, map preview)
│   │   ├── Destinations.jsx            # Destination listing with search and filters
│   │   ├── DestinationDetails.jsx      # Single destination view
│   │   ├── FavoritesPage.jsx           # User's saved businesses + destinations
│   │   ├── CommunityActivitiesPage.jsx # Seasonal quest listing (available + user's quests)
│   │   ├── RewardsPreviewPage.jsx      # Points, badges, leaderboard, quest history
│   │   ├── VoucherStorePage.jsx        # Voucher catalog + balance + redemptions
│   │   ├── ProfilePage.jsx             # User profile (stats, submissions, settings)
│   │   ├── RegisterBusinessPage.jsx    # Multi-step wizard: business registration submission
│   │   ├── SuggestDestinationPage.jsx  # Multi-step wizard: destination suggestion submission
│   │   ├── PrivacyPolicyPage.jsx       # Static privacy policy
│   │   ├── TermsPage.jsx               # Static terms of service
│   │   ├── DataDeletionPage.jsx        # Static data deletion instructions
│   │   ├── AboutPage.jsx               # Static about page
│   │   ├── LGUDashboardPage.jsx        # LGU admin dashboard (2814 lines, all tabs inline)
│   │   └── lgu/
│   │       └── LGUMerchantInsightsPage.jsx  # Partner merchant insights dashboard
│   ├── components/
│   │   ├── Navbar.jsx                  # Sticky top nav: desktop (links + search + user menu) + mobile (hamburger drawer)
│   │   ├── BottomNav.jsx               # Fixed bottom nav (mobile only): Home, Map, Shops, Spots, Saved, Deals
│   │   ├── Footer.jsx                  # 4-column footer (municipality info, contact, tourism links, legal)
│   │   ├── PageTransition.jsx          # Route enter animation wrapper
│   │   ├── ScrollManager.jsx           # Scroll-to-top / hash-scroll on route change
│   │   ├── ErrorBoundary.jsx           # Class-based error boundary with "Refresh Page" fallback UI
│   │   ├── SearchBar.jsx               # Reusable search input with magnifying glass icon
│   │   ├── BusinessCard.jsx            # Business listing card (image, name, category, rating, barangay)
│   │   ├── FeaturedBusinesses.jsx      # Homepage horizontal scroll of featured businesses
│   │   ├── Hero.jsx                    # Homepage hero section (headline, CTA buttons, background carousel)
│   │   ├── HeroBackgroundCarousel.jsx  # Auto-rotating background images for Hero
│   │   ├── PhotoCarousel.jsx              # Reusable carousel with arrows, dots, auto-rotate, touch swipe
│   │   ├── ManualPhotoUploadModal.jsx     # Master admin manual photo upload with Cloudinary, compression, progress
│   │   ├── BusinessPromotionCarousel.jsx  # "Spotlight on Local Excellence" — dynamic carousel of recently approved items
│   │   ├── EventsSection.jsx           # Homepage events/quests preview section
│   │   ├── SustainableTourismTips.jsx  # Homepage tips section
│   │   ├── MapPreview.jsx              # Small Leaflet map preview (used on detail pages)
│   │   ├── FavoriteButton.jsx          # Heart icon toggle button
│   │   ├── DataStatusBadge.jsx         # "Live" / "Cached" / "Static" badge for data source
│   │   ├── FacebookAuthStatus.jsx      # Shows FB auth connection status
│   │   ├── ReportIssueModal.jsx        # Modal to submit an issue report
│   │   ├── QuestOnboardingModal.jsx    # Quest intro/onboarding modal for new users
│   │   ├── Auth/
│   │   │   └── LoginModal.jsx          # Full-screen auth modal: login/signup/forgot-password + Google/Facebook OAuth
│   │   ├── home/
│   │   │   └── FloatingFacebookWidget.jsx  # Facebook Page plugin (desktop: bottom-left card; mobile: bubble + modal)
│   │   ├── quest/
│   │   │   ├── QRScannerModal.jsx      # Camera QR scanner (html5-qrcode) for quest verification
│   │   │   ├── EventCodeModal.jsx      # Event code entry + photo upload for quest verification
│   │   │   └── QuestVerificationSetup.jsx  # Admin tool: QR/code token generation for a quest
│   │   ├── ui/
│   │   │   └── AppImage.jsx            # Image component with fallback placeholder
│   │   ├── animations/
│   │   │   └── Reveal.jsx              # Scroll-triggered fade-in animation wrapper
│   │   ├── reviews/
│   │   │   ├── StarRating.jsx          # Read-only star display (1-5)
│   │   │   ├── ReviewsList.jsx         # List of review cards
│   │   │   ├── ReviewForm.jsx          # Write/edit review form with star rating input
│   │   │   └── RatingSummary.jsx       # Aggregate rating display (average + breakdown)
│   │   └── badges/
│   │       ├── BadgesGrid.jsx          # Grid display of earned/locked badges
│   │       └── BadgeCard.jsx           # Single badge display
│   ├── panels/
│   │   └── CheckInPanel.jsx            # LGU manual check-in panel (embedded in LGU dashboard)
│   ├── services/                       # (see Section 12 for full list)
│   ├── features/
│   │   ├── badges/
│   │   │   ├── badgesCatalog.js        # 13 badge definitions with criteria
│   │   │   └── badgesEngine.js         # Badge computation (earned/locked/progress)
│   │   └── map/
│   │       ├── mapHelpers.js           # Aggregate businesses + destinations into POI list
│   │       ├── useMapFilters.js        # URL search param-based map filter hook
│   │       ├── MapFilterBar.jsx        # Map filter pills (All / Businesses / Spots)
│   │       ├── MapInitialView.jsx      # Sets initial Leaflet map bounds
│   │       ├── MapResults.jsx          # Bottom sheet POI list overlay on map
│   │       ├── MapUtilities.jsx        # FitBounds, ResetToCabiao, LocateMe controls
│   │       └── InvalidateMapSize.jsx   # Fix Leaflet rendering when container becomes visible
│   ├── constants/
│   │   ├── cabiaoBarangays.js          # 44 barangays array + business categories lookup
│   │   └── cabiaoGeo.js                # Cabiao center [15.2522, 120.8596], bounds, isWithinCabiaoBounds()
│   ├── utils/
│   │   ├── cloudinary.js               # uploadToCloudinary(file) via fetch + FormData
│   │   ├── compressImage.js            # Client-side JPEG compression via Canvas
│   │   ├── voucherCode.js              # generateVoucherCode() → "CAB-XXXXXXXXXX"
│   │   ├── sanitization.js             # sanitizeHTML, sanitizeText, validatePhone, validateURL
│   │   ├── questSlots.js               # getQuestSlotInfo(quest) → { capacity, reserved, slotsLeft, isFull }
│   │   ├── imageUrl.js                 # isValidImageUrl, normalizeImageUrl, getFirstValidImage
│   │   ├── placeImages.js              # getBusinessImage, getDestinationImage, getActivityImage, getImage
│   │   ├── imageUtils.js               # (overlapping with placeImages.js — legacy)
│   │   ├── firestoreSanitize.js        # sanitizeForFirestore — recursive undefined/fn/symbol remover
│   │   ├── spotlightItems.js           # getSpotlightItems(limit) — merge businesses + destinations with real photos
│   │   └── csv.js                      # CSV parse/normalize for business/destination bulk import
│   ├── i18n/
│   │   ├── en.js                       # English translations (~650 keys)
│   │   ├── fil.js                      # Filipino translations (~650 keys)
│   │   └── index.js                    # Exports { translations: { en, fil }, languages }
│   ├── data/                           # Static/mock data (businesses, destinations, activities, rewards, heroImages)
│   └── assets/
│       └── placeholders/               # 9 SVG placeholder images (generic, service, event, destination, park, landmark, shop, market, restaurant)
├── dist/                               # Build output (gitignored)
├── public/                             # Static assets (favicon, etc.)
├── firebase.json                       # Firestore rules + indexes config
├── firestore.rules                     # Deployed Firestore security rules
├── firestore.indexes.json              # Deployed composite indexes
├── .firebaserc                         # Default Firebase project: smartdcabiao
├── AGENTS.md                           # Agentic coding guide (build/lint commands, code style, conventions)
├── .env.example                        # Env var template
├── .gitignore
├── .gitattributes
├── eslint.config.js                    # ESLint flat config
├── vite.config.js                      # Vite config (React + Tailwind plugins)
├── package.json
└── FIRESTORE_RULES_VOUCHERS.md         # Docs for voucher-related Firestore rules
```

---

## 7. All Routes

| Path | Component | Purpose | Auth Required |
|---|---|---|---|
| `/` | HomePage | Landing page with hero, featured businesses, events, tips | No |
| `/map` | MapPage | Full-screen Leaflet map with POI markers, filters, bottom sheet | No |
| `/businesses` | BusinessesPage | Searchable business listing with category/barangay filters | No |
| `/businesses/:id` | BusinessDetailPage | Single business detail with reviews, map preview | No |
| `/destinations` | Destinations | Destination listing with search/filters | No |
| `/destinations/:id` | DestinationDetails | Single destination detail | No |
| `/favorites` | FavoritesPage | User's saved businesses + destinations | No (guest: localStorage) |
| `/events` | CommunityActivitiesPage | Seasonal quests catalog + user's quests | No (join requires login) |
| `/rewards` | RewardsPreviewPage | Points, badges, leaderboard, quest history | No |
| `/vouchers` | VoucherStorePage | Voucher catalog, balance, past redemptions | No (redeem requires login) |
| `/privacy` | PrivacyPolicyPage | Static privacy policy | No |
| `/terms` | TermsPage | Static terms of service | No |
| `/data-deletion` | DataDeletionPage | Static data deletion instructions | No |
| `/about` | AboutPage | Static about page | No |
| `/suggest-destination` | SuggestDestinationPage | Multi-step destination suggestion wizard | Yes (signed-in) |
| `/profile` | ProfilePage | User stats, submissions, settings | Yes (signed-in) |
| `/register-business` | RegisterBusinessPage | Multi-step business registration wizard | Yes (signed-in) |
| `/lgu` | LGUDashboardPage | Full LGU admin dashboard (all tabs inline) | Yes (admin role) |
| `/lgu/merchant/:businessId` | LGUMerchantInsightsPage | Partner merchant insights | Yes (admin role) |

---

## 8. Navigation Structure

### Desktop Navbar (`Navbar.jsx`)
- Visible `>= lg` breakpoint
- **Left:** Logo + nav links: **Home, Map, Businesses, Destinations, Events**
- **Right:** Search icon (toggles search bar), **More** dropdown (Favorites, Rewards, Vouchers, Suggest), Language toggle (EN/FIL), User menu (Login / user avatar + Profile + Logout + LGU Dashboard for admins)
- Behavior: transparent on homepage hero, white on scroll/other pages

### Mobile Bottom Nav (`BottomNav.jsx`)
- Visible only on small screens (`< lg`)
- 6 fixed items: **Home, Map, Shops, Spots, Saved, Deals**
- Active item highlighted with emerald accent bar + scale-110 icon

### Mobile Hamburger Drawer (inside `Navbar.jsx`)
- Triggered by hamburger icon in top navbar
- Full-height slide-in drawer from left
- Sections: Main links, Discover (Map, Businesses, Destinations), Community (Events, Rewards, Vouchers), Profile/Favorites, LGU Dashboard (if admin), Suggest a Place, About, Language toggle, Logout

### Admin-specific links
- LGU Dashboard link appears in user menu (desktop) and hamburger drawer (mobile) when `isAdmin()` returns true
- `/lgu/merchant/:businessId` accessible from LGU dashboard only

---

## 9. Auth System

**Login mechanism:** Modal-based (no dedicated `/login` route). `LoginModal.jsx` is a full-screen portal that supports:
- Email/password login
- Email/password signup
- Forgot password (sends reset email)
- Google OAuth (popup)
- Facebook OAuth (popup)

**Auth context:** `AuthContext.jsx` provides `{ user, loading, login, signUp, logout, signInWithGoogle, signInWithFacebook, resetPassword, isAuthenticated }`. Uses `onAuthStateChanged` listener.

**Admin role check:** `adminRole.service.js` → `getUserRole(uid)` reads `admins/{uid}.data.role` from Firestore. Returns `"master"`, `"admin"`, or `null`. Legacy `isAdmin(uid)` still checks for doc existence. Uses in-memory cache (Map) to avoid repeated reads. Cleared on logout.

**Admin gating in UI:** `LGUDashboardPage.jsx` calls `getUserRole(user.uid)` in a useEffect and shows "Access Denied" if null. Masters see all tabs; admins see only the Quests tab. `LGUMerchantInsightsPage.jsx` similarly gates.

---

## 10. Core Product Loop

### Season
- A time-bound period (e.g., "Summer 2025", "Wet Season 2025") stored in `seasons/{id}`.
- Exactly one season can be "active" at a time (booleans, toggled by admin).
- Quests, vouchers, points, and balances are all scoped to a season.
- Key fields: `name`, `startAt`, `endAt`, `isActive`, `description`.

### Quest
- A community activity stored in `quests/{id}`.
- 3 types: `visit` (go to a place), `buy` (purchase from a business), `participate` (attend an event).
- Key fields: `title`, `description`, `questType`, `category` (tour, cleanup, tree-planting, etc.), `seasonId`, `capacity`, `reservedCount`, `points`, `impactUnit`, `impactAmount`, `verificationMethod`, `autoApprove`, `geofenceRadius`, `qrToken`, `eventCode`, `startAt`, `endAt`, `isActive`, `position`, `barangay`, `partnerBusinessId`, `partnerBusinessName`.

### Join Quest
- User clicks "Join" on a quest → `joinQuest()` in `participations.service.js` creates a `participations/{id}` doc with status `joined`.
- Checks capacity (`reservedCount < capacity`) and existing participation (one per user per quest, enforced by doc ID `{uid}_{questId}`).
- Batched write increments quest `reservedCount`.

### Verification (3 methods)
1. **QR code scan:** LGU prints QR at venue → user scans with camera → `verifyQuestByQR()` → auto-approves (with optional geofence check) or sets status to `pending` for admin review.
2. **Event code + photo:** LGU gives out code → user types code in modal + uploads photo → `verifyQuestByCode()` → sets status to `pending` (always admin review).
3. **Manual LGU check-in:** Admin uses `CheckInPanel` in LGU dashboard → `adminMarkCompleted()` → directly completes with points awarded.

### Points Crediting
When a quest is completed (verified):
1. `participations/{id}` status set to `completed`
2. `pointsLedger/{id}` entry created: `{ uid, seasonId, questId, points, reason, createdAt }`
3. `seasonBalances/{seasonId}_{uid}` incremented via `incrementEarnedPoints()`
4. `impactLedger/{id}` entry created: `{ uid, seasonId, questId, questTitle, unit, amount, reason }`
5. `seasonUserStats/{seasonId}_{uid}` created/updated for leaderboard

### Voucher Redemption
1. User browses vouchers at `/vouchers` → vouchers listed from `seasons/{id}/vouchers`.
2. User clicks "Redeem" → Firestore transaction in `redeemVoucher()`:
   - Reads voucher (checks active, not expired, stock > 0)
   - Reads balance (checks sufficient points)
   - Updates `stockRemaining--` on voucher
   - Deducts `pointsBalance` on seasonBalances doc
   - Creates `voucherRedemptions/{id}` doc with unique code (`CAB-XXXXXXXXXX`), status `unused`, and `voucherSnapshot`
3. Points ledger entry added (negative points for spend)
4. Audit log entry created

### Mark Used
Admin uses the "Mark as Used" button in LGU dashboard → `adminMarkVoucherUsed()` → sets `status: 'used'` + `usedAt` + `usedByEmail`.

### Impact Tracking
Each quest has an `impactUnit` (e.g., `trash_kg`, `trees`, `co2_kg`, `plastic_kg`, `volunteer_hours`) and `impactAmount`. Completion creates an entry in `impactLedger`. The leaderboard can show top users by impact unit.

### Leaderboard
`seasonUserStats/{seasonId}_{uid}` stores `{ points, completedQuests, impactByUnit, showOnLeaderboard, publicName }`. Queried by `listTopByPoints()` or `listTopByImpact()`.

---

## 11. Firestore Data Model

### `businesses/{businessId}`
- **Read:** public | **Write:** admin | **Delete:** master admin only
- Fields: `name`, `type`, `category`, `description`, `position[lat, lng]`, `barangay`, `address`, `phone`, `hours`, `priceRange`, `website`, `facebook`, `instagram`, `verified`, `images[]`, `rating`, `ratingCount`, `createdAt`, `updatedAt`, `isActive` (default true), `archivedAt`, `archivedBy`, `archivedReason`
- Purpose: Business directory / map POIs
- Notes: Soft delete sets `isActive: false`. Backward compatible — missing `isActive` treated as active.

### `destinations/{destinationId}`
- **Read:** public | **Write:** admin | **Delete:** master admin only
- Fields: Similar to businesses + `bestTime`, `activities`, `entranceFee`, `landmark`, `tagline`, `isActive` (default true), `archivedAt`, `archivedBy`, `archivedReason`
- Purpose: Destination directory / map POIs
- Notes: Soft delete sets `isActive: false`. Backward compatible — missing `isActive` treated as active.

### `seasons/{seasonId}`
- **Read:** public | **Write:** admin only
- Fields: `name`, `description`, `startAt`, `endAt`, `isActive`, `createdAt`, `updatedAt`
- Purpose: Time-bound tourism seasons

### `seasons/{seasonId}/vouchers/{voucherId}` (subcollection)
- **Read:** public | **Write:** admin only
- Fields: `title`, `description`, `partnerBusinessId`, `partnerName`, `terms`, `pointsCost`, `expiresAt`, `stockTotal`, `stockRemaining`, `isActive`, `createdAt`, `updatedAt`, `createdByEmail`
- Purpose: Voucher catalog for each season

### `seasons/{seasonId}/voucherRedemptions/{redemptionId}` (subcollection)
- **Read:** admin (all) / user (own via `uid == request.auth.uid`) | **Write:** user (create own), admin (update)
- Fields: `voucherId`, `seasonId`, `uid`, `userEmail`, `code`, `status` (unused/used), `redeemedAt`, `usedAt`, `usedByEmail`, `pointsCost`, `voucherSnapshot{title, partnerName, partnerBusinessId, pointsCost, expiresAt}`
- Doc ID: `{voucherId}_{uid}` (ensures one redemption per user per voucher)
- Purpose: Track voucher redemptions and usage

### `quests/{questId}`
- **Read:** public | **Write:** admin only
- Fields: `title`, `description`, `questType` (visit/buy/participate), `category`, `seasonId`, `capacity`, `reservedCount`, `points`, `impactUnit`, `impactAmount`, `verificationMethod` (qr/code/manual), `autoApprove`, `geofenceRadius`, `qrToken`, `eventCode`, `requirePhoto`, `startAt`, `endAt`, `isActive`, `position`, `barangay`, `partnerBusinessId`, `partnerBusinessName`, `createdAt`, `updatedAt`
- Purpose: Definable quests within a season

### `participations/{participationId}`
- **Read:** signed-in users | **Write:** user (create own), admin (update), user (update own cancel)
- Fields: `uid`, `questId`, `seasonId`, `status` (joined/completed/cancelled/expired/pending), `joinedAt`, `completedAt`, `verificationMethod`, `photoURL`, `verification.location{lat, lng}`, `adminVerifiedBy`, `adminVerifiedAt`, `notes`
- Doc ID: `{uid}_{questId}` (unique per user per quest)
- Purpose: Track user quest participation lifecycle

### `pointsLedger/{entryId}`
- **Read:** admin (all) / user (own) | **Write:** user (create own, append-only), admin
- Fields: `uid`, `seasonId`, `questId`, `points` (positive=earned, negative=spent), `reason`, `voucherId`, `createdAt`
- Purpose: Immutable audit trail of all point transactions

### `seasonBalances/{balanceId}`
- **Read:** admin (all) / user (own, via `balanceId.matches('.*_' + uid + '$')`) | **Write:** admin (update), user (create own, update own)
- Fields: `seasonId`, `uid`, `userEmail`, `pointsEarned`, `pointsSpent`, `pointsBalance`, `updatedAt`, `_rebuiltFromLedger`
- Doc ID: `{seasonId}_{uid}`
- Purpose: Denormalized point balance per user per season (rebuilt from ledger)

### `impactLedger/{entryId}`
- **Read:** admin (all) / user (own) | **Write:** admin, user (create with `reason == 'quest_completed'`)
- Fields: `uid`, `userEmail`, `seasonId`, `questId`, `questTitle`, `unit`, `amount`, `reason`, `createdAt`
- Purpose: Environmental impact tracking

### `seasonUserStats/{statsId}`
- **Read:** public | **Write:** admin, signed-in users
- Fields: `uid`, `seasonId`, `points`, `completedQuests`, `impactByUnit{unit: amount}`, `showOnLeaderboard`, `publicName`, `updatedAt`
- Purpose: Leaderboard data per user per season

### `submissions/{submissionId}`
- **Read:** admin (all) / signed-in (any) | **Write:** user (create), admin (update/delete)
- Fields: `type` (business/destination), `status` (new/approved/rejected/needs_info), `submittedBy`, `createdByUid`, `data{...}`, `reviewedBy`, `reviewedAt`, `notes`, `createdAt`
- Purpose: User-submitted business registrations and destination suggestions

### `reports/{reportId}`
- **Read:** admin (all) / user (own) | **Write:** user (create), admin (update/delete)
- Fields: `createdByUid`, `targetType`, `targetId`, `reason`, `description`, `status` (new/in_progress/resolved), `createdAt`
- Purpose: User-submitted issue reports

### `reviews/{reviewId}`
- **Read:** approved (public), own (user), all (admin) | **Write:** user (create/update own pending), admin (approve/reject)
- Fields: `targetType` (business/destination), `targetId`, `uid`, `rating`, `title`, `text`, `sustainabilityNote`, `status` (pending/approved/rejected), `createdAt`
- Purpose: User reviews for businesses and destinations

### `admins/{uid}`
- **Read:** self or admin (hasLguAccess) | **Write:** master admin only
- Fields: `role` (`"master"` | `"admin"` | missing = master for backward compat)
- Purpose: Admin role marker with tiered access

### `auditLogs/{logId}`
- **Read:** admin | **Write:** admin only
- Fields: `action`, `targetType`, `targetId`, `adminUid`, `adminEmail`, `meta{}`, `createdAt`
- Purpose: Immutable audit trail for admin actions

### `users/{uid}`
- **Read:** self or any admin (hasLguAccess) | **Write:** self (create/update), no delete
- Fields (auto-populated on sign-in): `email`, `displayName`, `photoURL`, `lastLoginAt`, `updatedAt`, plus legacy `onboarding`, `location`, `showOnLeaderboard`, `publicName`
- Purpose: User profile auto-created on sign-in; used by Manage Admins panel for searchable user list

---

## 12. Services Layer

| File | Key Exports | What It Does |
|---|---|---|
| `seasons.service.js` | `getActiveSeason`, `getSeasonById`, `listSeasons`, `createSeason`, `activateSeason`, `closeSeason`, `updateSeason`, `endSeasonWithExpiry`, `activateSeasonStrict`, `autoEndStaleSeasons`, `deleteSeasonIfEmpty`, `updateSeasonDetails`, `getSeasonStatus`, `getSeasonStatusConfig`, `formatSeasonDate`, `toJSDate` | Season CRUD + lifecycle (activate, close, end with expiry, auto-end stale), auto-pauses owner quests on end |
| `vouchers.service.js` | `listSeasonVouchers`, `createVoucher`, `updateVoucher`, `seedSampleVouchersForActiveSeason`, `seedPercentOffVouchersForActiveSeason` | Voucher catalog CRUD + seed data |
| `voucherRedemptions.service.js` | `listMyRedemptions`, `listSeasonRedemptions`, `findRedemptionByCode`, `redeemVoucher` (transactional), `adminMarkVoucherUsed` | Voucher redemption lifecycle |
| `seasonBalances.service.js` | `rebuildSeasonBalanceFromLedger`, `getMySeasonBalance`, `ensureBalanceDoc`, `getOrCreateSeasonBalance`, `incrementEarnedPoints`, `spendPoints` | Point balance management |
| `quests.service.js` | `listActiveQuests`, `getQuestById`, `listActiveQuestsBySeason`, `listQuestsBySeason`, `listAllQuests`, `createQuest`, `updateQuest`, `activateQuest`, `deactivateQuest`, `adjustQuestReservedCount`, `repairQuestReservedCounts`, `seedSampleQuestsForActiveSeason`, `ensureQuestVerificationTokensAdmin`, `recommendQuests`, `seedVisitAndBuyQuestsForActiveSeason`, + more | Full quest CRUD + maintenance |
| `participations.service.js` | `getUserParticipation`, `getUserParticipations`, `getQuestParticipations`, `countActiveJoinedParticipations`, `syncQuestReservedCount`, `joinQuest`, `cancelQuest`, `expireMyStaleParticipations`, `expireAllStaleParticipations`, `adminMarkCompleted`, `markQuestCompletedByUser` | Quest participation lifecycle |
| `pointsLedger.service.js` | `addPointsEntry`, `getUserPointsLedger`, `getUserPointsForSeason`, `getUserSeasonPointsSummary` | Points ledger read/write |
| `impactLedger.service.js` | `addImpactEntry`, `listUserImpact`, `listSeasonImpact`, `sumImpactByUnit` | Impact ledger read/write |
| `adminRole.service.js` | `isAdmin`, `getUserRole`, `getAdminDoc`, `clearAdminCache` | Admin role check (in-memory cached), returns master/admin/null |
| `ownerQuests.service.js` | `listOwnerQuestsForBusiness`, `listOwnerQuestsByOwner`, `getOwnerQuestById`, `createOwnerQuest`, `updateOwnerQuest`, `toggleOwnerQuestActive`, `joinOwnerQuest`, `completeOwnerQuest`, `verifyOwnerQuestByQR`, `verifyOwnerQuestByCode`, `verifyBuyQuestByQR`, `verifyBuyQuestByCode`, `merchantMarkParticipationComplete`, `pauseAllOwnerQuestsForSeasonEnd`, `getPausedQuestsCountForOwner`, `reactivatePausedQuestsForOwner`, `reactivateSinglePausedQuest`, + participation/timer/geofence helpers | Owner/business quest CRUD, buy quest verification (QR/code), merchant manual complete, auto-pause on season end, bulk/single reactivation |
| `businesses.service.js` | `listBusinesses`, `getBusinessById`, `searchBusinesses`, `getFeaturedBusinesses`, `clearBusinessesCache`, `archiveBusiness`, `restoreBusiness`, `permanentlyDeleteBusiness`, `listBusinessesWithFilter`, `resyncBusinessImagesFromSubmission`, `repairAllBusinessImages`, `manuallySetBusinessImages`, `isStaticBusiness` | Business listing with Firestore/mock fallback + soft delete + image re-sync + manual upload + static item protection |
| `destinations.service.js` | `listDestinations`, `getDestinationById`, `getDestinationBarangays`, `searchDestinations`, `clearDestinationsCache`, `archiveDestination`, `restoreDestination`, `permanentlyDeleteDestination`, `listDestinationsWithFilter`, `resyncDestinationImagesFromSubmission`, `repairAllDestinationImages`, `manuallySetDestinationImages`, `isStaticDestination` | Destination listing with Firestore/mock fallback + soft delete + image re-sync + manual upload + static item protection |
| `reviews.service.js` | `createOrUpdateReview`, `getMyReview`, `listApprovedReviews`, `listPendingReviews`, `setReviewStatus`, `recomputeAggregatesForTarget` | Full review system with moderation + rating aggregation |
| `submissions.service.js` | `createSubmission`, `getMyBusinessSubmissions`, `getMyBusinessSubmission`, `submitBusinessRegistration`, `submitDestinationSuggestion`, `getMyDestinationSubmissions` | User-facing submission (register business, suggest destination) |
| `reports.service.js` | `createReport` | Create user reports |
| `audit.service.js` | `logAudit` | Centralized audit logging |
| `leaderboard.service.js` | `listTopByPoints`, `listTopByImpact`, `getUserSeasonStats`, `updateUserLeaderboardSettings` | Leaderboard queries + user stat management |
| `user.service.js` | `getUserSubmissions`, `getUserReports` | User's own submissions + reports |
| `userSettings.service.js` | `getUserSettings`, `hasUserSeenOnboarding`, `setSeenOnboarding`, `getUserLocation`, `setUserLocation` | User preferences (onboarding, location) |
| `questVerification.service.js` | `generateQRToken`, `generateEventCode`, `verifyQuestByQR`, `verifyQuestByCode`, `listPendingSelfVerifications`, `approvePendingVerification`, `rejectPendingVerification`, `rotateEventCode`, `rotateQRToken`, `downloadQRAsPNG`, `printQRPoster`, + validation helpers | Full hybrid verification system |
| `users.service.js` | `upsertUserProfile` | Auto-create/update user profile doc on sign-in |
| `profileStats.service.js` | `getMySeasonStats`, `getUserSeasonWithActive`, `clearStatsCache` | User profile stats aggregation |
| `adminSubmissions.service.js` | `listSubmissions`, `getSubmissionById`, `updateSubmissionStatus`, `approveSubmissionAndPublish`, `rejectSubmission`, `approveBusinessSubmission`, `requestMoreInfoSubmission` | Admin submission moderation workflow |
| `adminReports.service.js` | `listReports`, `getReportById`, `updateReportStatus`, `markReportInProgress`, `markReportResolved` | Admin report management |
| `merchantInsights.service.js` | `listPartnerRedemptions`, `listPartnerVouchers`, `summarizePartnerRedemptions`, `estimatePartnerImpact`, `getPartnerInsights` | Partner merchant analytics |
| `favorites.service.js` | `getFavorites`, `toggleFavorite`, `isFavorite`, `getFavoritesByType`, `migrateGuestFavorites` | localStorage-based favorites |

---

## 13. Key Components

| Component | File | Purpose |
|---|---|---|
| Navbar | `components/Navbar.jsx` | Sticky top nav: desktop links + search + user menu; mobile hamburger drawer |
| BottomNav | `components/BottomNav.jsx` | Fixed bottom tab bar (mobile only): 6 icon+label links |
| LoginModal | `components/Auth/LoginModal.jsx` | Full-screen auth portal: login/signup/forgot-password + Google/Facebook OAuth |
| Footer | `components/Footer.jsx` | 4-column site footer with links and copyright |
| FloatingFacebookWidget | `components/home/FloatingFacebookWidget.jsx` | Facebook Page plugin: desktop bottom-left card, mobile bubble+modal |
| QRScannerModal | `components/quest/QRScannerModal.jsx` | Camera-based QR scanner using html5-qrcode |
| EventCodeModal | `components/quest/EventCodeModal.jsx` | Event code entry + photo upload for quest verification |
| PageTransition | `components/PageTransition.jsx` | Route enter animation wrapper |
| ScrollManager | `components/ScrollManager.jsx` | Scroll-to-top / hash-anchor on route change |
| ErrorBoundary | `components/ErrorBoundary.jsx` | Class-based error boundary with "Refresh Page" UI |
| SearchBar | `components/SearchBar.jsx` | Reusable search input |
| BusinessCard | `components/BusinessCard.jsx` | Business listing card |
| FeaturedBusinesses | `components/FeaturedBusinesses.jsx` | Homepage horizontal scroll |
| Hero | `components/Hero.jsx` | Homepage hero section |
| HeroBackgroundCarousel | `components/HeroBackgroundCarousel.jsx` | Auto-rotating hero background |
| EventsSection | `components/EventsSection.jsx` | Homepage quests preview |
| MapPreview | `components/MapPreview.jsx` | Mini Leaflet map (detail pages) |
| FavoriteButton | `components/FavoriteButton.jsx` | Heart toggle icon |
| ReportIssueModal | `components/ReportIssueModal.jsx` | Modal to submit issue report |
| QuestOnboardingModal | `components/QuestOnboardingModal.jsx` | Quest intro modal for new users |
| StarRating | `components/reviews/StarRating.jsx` | Read-only star display |
| ReviewsList | `components/reviews/ReviewsList.jsx` | Review cards list |
| ReviewForm | `components/reviews/ReviewForm.jsx` | Write/edit review with star input |
| RatingSummary | `components/reviews/RatingSummary.jsx` | Aggregate rating breakdown |
| BadgesGrid | `components/badges/BadgesGrid.jsx` | Badge collection display |
| BadgeCard | `components/badges/BadgeCard.jsx` | Single badge display |
| AppImage | `components/ui/AppImage.jsx` | Image with fallback |
| Reveal | `components/animations/Reveal.jsx` | Scroll-triggered fade-in |
| CheckInModal | `components/quest/CheckInModal.jsx` | LGU manual quest check-in modal |
| QRDisplayModal | `components/quest/QRDisplayModal.jsx` | Standalone QR code display for quests |
| QuestDetailsModal | `components/quest/QuestDetailsModal.jsx` | Full quest detail with verification UI, participations, stats |

---

## 14. Feature Inventory (What Works Today)

### Tourism & Discovery
- [x] Business directory with search, category/barangay filters
- [x] Destination directory with search, category/barangay filters
- [x] Interactive Leaflet map with POI markers (businesses + destinations)
- [x] Map filter pills (All / Businesses / Spots)
- [x] Map bottom sheet with POI cards
- [x] Business/destination detail pages with reviews
- [x] Homepage with featured businesses, events section, sustainable tourism tips
- [x] Favorites (localStorage-based, per user)
- [x] Facebook Page plugin widget (desktop card + mobile bubble)

### Business Registration (User-Submitted)
- [x] Multi-step wizard on `/register-business`
- [x] Map pin placement with Cabiao bounds validation
- [x] Photo upload to Cloudinary (max 5, 3MB each, JPG/PNG/WebP)
- [x] Owner verification checkbox
- [x] Status tracking on Profile page

### Destination Suggestion (User-Submitted)
- [x] Multi-step wizard on `/suggest-destination`
- [x] Map pin placement
- [x] Photo upload
- [x] Status tracking on Profile page

### Community Quests & Events
- [x] Quest catalog on `/events` (available + user's quests)
- [x] Quest types: visit, buy, participate
- [x] Join quest with capacity/slot management
- [x] Cancel quest
- [x] Quest recommendation engine (`recommendQuests()`)
- [x] Sample quest seeding (10 seed quests + visit/buy quests)

### Quest Verification (Hybrid System)
- [x] QR code scan via camera (html5-qrcode)
- [x] Event code + photo upload
- [x] Manual LGU check-in (CheckInPanel)
- [x] Auto-approve vs manual review configuration per quest
- [x] Geofence check (optional, by radius)
- [x] Admin pending verification approval/rejection
- [x] QR token / event code generation and rotation
- [x] Download QR as PNG, print QR poster

### Rewards & Gamification
- [x] Points ledger (immutable transaction log)
- [x] Season balances (denormalized per user per season, rebuildable from ledger)
- [x] Impact ledger (environmental impact tracking)
- [x] Badge system (13 badges with criteria)
- [x] Badge engine (compute earned/locked/progress)
- [x] Leaderboard (points + impact units)
- [x] Leaderboard opt-in with public name
- [x] Profile stats (points, quests completed, impact totals)
- [x] Rewards page at `/rewards`

### Voucher Store
- [x] Voucher catalog (`/vouchers`) — public read
- [x] Point balance display per season
- [x] Redeem voucher (atomic Firestore transaction: stock + balance + redemptions)
- [x] Voucher redemptions list with status (unused/used/expired)
- [x] QR code per voucher (via external API qrserver.com)
- [x] Copy code button
- [x] View details modal (QR, code, status, dates)
- [x] Redemption filtering by `uid` for rules-compliant access

### LGU Admin Dashboard
- [x] Submissions moderation (approve/reject/request info business + destination submissions)
- [x] Reports management (in-progress/resolved)
- [x] Reviews moderation (approve/reject)
- [x] Seasons management (create, activate, close, list)
- [x] Quests management (create, toggle live/draft, edit, repair counts, seed, expire all stale)
- [x] Quest participations view + admin-mark-completed
- [x] Vouchers: create, edit, verify by code, mark used, seed samples
- [x] Redemption log (all redemptions for active season)
- [x] Leaderboard view (by points)
- [x] Impact overview (by unit)
- [x] Manual check-in tool (quest completion)
- [x] Merchant insights page at `/lgu/merchant/:businessId`

### Reviews & Moderation
- [x] Write reviews for businesses + destinations
- [x] Rating (1-5 stars) + title + text + sustainability note
- [x] Pending → approved/rejected workflow
- [x] Aggregate rating recomputation on status change
- [x] One review per user per target

### i18n
- [x] English + Filipino translations (~650 keys each)
- [x] Language toggle in navbar
- [x] Date/number formatting per locale
- [x] Translation key fallback (fil → en, then shows key)

### Mobile UX
- [x] Bottom navigation bar (6 items)
- [x] Hamburger drawer menu
- [x] Sticky navbar with scroll shadow
- [x] Floating Facebook widget (mobile bubble + modal)
- [x] Register Business / Suggest Destination floating "Add" buttons
- [x] Map page: full-height map, floating filter pills, bottom sheet

### Facebook Embed
- [x] Facebook Page plugin for Cabiao LGU page
- [x] Desktop: collapsible card bottom-left
- [x] Mobile: floating bubble → full-screen modal
- [x] SDK loaded dynamically

### Soft Delete / Archive (Master Admin)
- [x] Archive (soft delete) — sets `isActive: false`, hides from public pages and map
- [x] Restore — sets `isActive: true`, makes public again
- [x] Permanent delete — `deleteDoc()` with double-confirm (type name to confirm) — Firestore-only items only
- [x] Static item protection — permanent delete BLOCKED on static mock items (code-level guard + UI button hidden + info banner)
- [x] Archive button (top-left of business/destination cards) — Master Admin only
- [x] Restore + Delete Permanently buttons on archived cards (delete hidden on static items)
- [x] "Show Archived" toggle (Live / Archived / All) at top of `/businesses` and `/destinations`
- [x] Archived cards shown with faded styling (opacity-60, amber ring) + "ARCHIVED" badge
- [x] Public users never see archived items (filtered at service + page level)
- [x] Map page excludes archived items for everyone
- [x] All archive/restore/delete actions logged via `logAudit()`
- [x] Backward compatible — existing docs without `isActive` field treated as active
- [x] Confirmation modal with color-coded messaging (amber=archive, emerald=restore, red=delete)

---

## 15. LGU Admin Dashboard Structure

**File:** `LGUDashboardPage.jsx` (single monolithic component)

**Sidebar groups** (role-dependent):

**For master admin:**
1. **Moderation** (3 items)
   - Submissions (📥) — approve/reject/request-info business + destination submissions
   - Reports (🚩) — mark in-progress/resolved
   - Reviews (⭐) — approve/reject pending reviews

2. **Tourism Program** (3 items)
   - Seasons (🗓️) — create, activate, close, list
   - Quests (🎯) — create/edit/toggle/repair/seed, quest search, view participations, admin-complete, check-in modal, QR display, quest detail modal
   - Vouchers (🎟️) — create/edit, verify by code, mark used, redemption log, seed samples

3. **Settings** (2 items)
   - Manage Admins (🛡️) — add/remove admin users with role assignment
   - Data Tools (🛠️) — repair business/destination images from submissions (master only)

**For admin (event helper):**
- Only the Quests tab (🎯) is visible — can run check-in, view quest details/QR, but cannot create/edit quests or access other sections.

**Additional in-dashboard:**
- Leaderboard tab (accessible from quests panel)
- Impact overview tab (accessible from vouchers/quests panels)

All tabs render inline (no route change, just state-switching). The dashboard is a single component with conditional rendering per tab.

---

## 16. Verification System (Hybrid)

### Flow 1: QR Code Scan
1. Admin generates QR token per quest (or uses seed defaults)
2. LGU prints QR code poster (via "Print Poster" button in `QuestDetailsModal.jsx` or `printQRPoster()` in `questVerification.service.js`)
3. User at venue opens quest → taps "Scan QR Code" → `QRScannerModal` opens camera
4. On scan → `verifyQuestByQR(uid, scannedPayload, userLocation)`:
   - Parses payload → extracts `questId` + `qrToken`
   - Validates token matches quest's `qrToken`
   - Optional geofence check (if quest has `geofenceRadius`)
   - If `autoApprove`: status → `completed`, points credited immediately
   - If not auto-approve: status → `pending`, points held until admin review

### Flow 2: Event Code + Photo
1. LGU announces event code (e.g., "CABIAO-SUSTAIN") at event
2. User opens quest → taps "Enter Event Code" → `EventCodeModal`
3. User types code + optionally uploads photo
4. On submit → `verifyQuestByCode(uid, questId, code, photoURL, userLocation)`:
   - Validates code matches quest's `eventCode`
   - Status always → `pending` (requires admin review)
   - Photo uploaded to Cloudinary, URL stored in participation doc

### Flow 3: Manual LGU Check-In
1. Admin opens Check-In panel in LGU dashboard
2. Searches/finds user + quest pair
3. Clicks "Mark Complete" → `adminMarkCompleted()` in `participations.service.js`
4. Points credited immediately, audit logged

### Permissions:
- Each quest has `verificationMethod` (qr/code/manual), `qrToken`, `eventCode`, `autoApprove`, `geofenceRadius`, `requirePhoto`
- QR and event code can be rotated by admin at any time
- Verification tokens are stored on the quest doc itself

---

## 17. Image Upload System

**Provider:** Cloudinary (NOT Firebase Storage)

**Utility:** `src/utils/cloudinary.js` — `uploadToCloudinary(file)`:
- Uses native `fetch` + `FormData` (no SDK)
- Uploads to unsigned preset
- Folder: `smartdcabiao/business-submissions` (hardcoded)
- Returns `secure_url` string

**Compression:** `src/utils/compressImage.js` — `compressImage(file, maxWidthPx=1024, quality=0.75)`:
- Client-side Canvas API
- Output: JPEG blob, renamed to `.jpg`

**Where images are used:**
- Business registration (multi-step wizard, `submitBusinessRegistration()`)
- Destination suggestion (multi-step wizard, `submitDestinationSuggestion()`)
- Quest verification photos (EventCodeModal uploads to Cloudinary before calling `verifyQuestByCode()`)

**Storage convention:** Photo URLs (Cloudinary) are stored in Firestore as string arrays (`images[]`), not as Firebase Storage paths.

---

## 18. Firestore Security Rules Summary

**File:** `firestore.rules` (deployed to `smartdcabiao` project)

| Collection | Read | Write | Notes |
|---|---|---|---|
| `businesses` | **public** | admin | |
| `destinations` | **public** | admin | |
| `seasons` | **public** | admin | |
| `seasons/{id}/vouchers` | **public** | admin | **Must be public** so logged-out users see catalog |
| `seasons/{id}/voucherRedemptions` | admin (all) / user (own, via `uid` query or `get`) | user (create own), admin (update) | List requires `where('uid', '==', uid)` for non-admins |
| `quests` | **public** | admin | |
| `participations` | signed-in | user (create own), admin (update), user (update own) | |
| `pointsLedger` | admin (all) / user (own) | user (create own, append-only) | Immutable — no update/delete |
| `seasonBalances` | admin (all) / user (own via doc ID suffix) | user (create/update own), admin | |
| `impactLedger` | admin (all) / user (own) | admin, user (create with reason=quest_completed) | |
| `seasonUserStats` | **public** | admin, signed-in | |
| `submissions` | admin (all) / signed-in (any) | user (create), admin (update/delete) | |
| `reports` | admin (all) / user (own) | user (create), admin (update/delete) | |
| `reviews` | public (approved only), user (own), admin (all) | user (create/update own pending), admin (moderate) | |
| `admins` | self or hasLguAccess | master only | |
| `auditLogs` | hasLguAccess | hasLguAccess (create only) | |
| `users` | self or hasLguAccess | self (create/update), no delete | |

**Key gotcha:** The `voucherRedemptions` list rule requires non-admin users to pass `request.query.uid == request.auth.uid` — client MUST use `where('uid', '==', uid)` query, never `getDocs()` with client-side filter.

---

## 19. Mobile UX Details

**Bottom nav** (6 items, fixed at bottom, `sm:hidden`): Home, Map, Shops, Spots, Saved, Deals.

**Hamburger drawer** (in `Navbar.jsx`, `< lg`): Full-height slide-in from left. Sections: Main links, Discover (Map, Businesses, Destinations), Community (Events, Rewards, Vouchers), Profile/Favorites, LGU Dashboard (admin), Suggest a Place, About, Language toggle, Logout.

**Sticky navbar:** Becomes sticky with shadow on scroll. On homepage: transparent background over hero, white after scroll. Other pages: white background always.

**Floating Facebook widget:**
- Desktop (`lg+`): Collapsible card, bottom-left, shows Facebook Page plugin timeline
- Mobile (`< lg`): Floating bubble button (bottom-right, above bottom nav) → opens full-screen modal with Facebook timeline

**Register Business / Suggest Destination:** Floating "Add a Place" / "Suggest" button on relevant listing pages that links to the wizard.

**Map page mobile layout:**
- Full-height Leaflet map (`h-[calc(100vh-var(--nav-height))]`)
- Floating filter pills (All / Businesses / Spots) overlaid at top
- Bottom sheet (`MapResults.jsx`) with POI list — slides up, overlays map
- Skeleton loading state while POIs load

---

## 20. Known Issues / Gotchas

1. **Ad blockers blocking Firestore:** Some ad blockers (uBlock Origin) can block `googleapis.com` requests causing `ERR_BLOCKED_BY_CLIENT` errors. The app shows a generic error message.

2. **Facebook SDK console warnings:** Facebook SDK logs non-blocking console warnings (e.g., "FB.getLoginStatus() called before FB.init()"). These are expected and not real errors.

3. **Negative reservedCount on quests:** If a quest has `reservedCount < 0`, the UI clamps to 0 via `Math.max(0, reserved)` in `questSlots.js`. A "Repair Counts" button in the LGU dashboard calls `repairQuestReservedCounts()` to fix by recounting actual participations.

4. **Legacy/unused files:**
   - `src/utils/imageUtils.js` — deleted (overlapped with `src/utils/placeImages.js`)
   - `src/utils/imageUtils.js` — overlaps with `src/utils/placeImages.js` (both define the same functions)
   - `src/config/` — empty directory

5. **Bundle size:** ~1.4MB (1763kB main JS chunk). No code splitting. Vite warns about chunks >500kB.

6. **Missing/incomplete features:**
   - No password change flow (only reset via email)
   - No email verification enforcement
   - No push notifications
   - No analytics integration (commented out in firebase.js)
   - No performance monitoring (commented out in firebase.js)
   - Badges are computed client-side only (not stored in Firestore)

7. **VoucherStorePage historically had a bug** where a single `try/catch` around all operations (season fetch, catalog fetch, balance fetch, redemptions fetch) meant a single failure cleared all state including the catalog. **Fixed** by separating catalog fetch into its own effect (see Section 21).

8. **Firestore `doc()` requires string path segments.** The Firebase SDK internally calls `.indexOf('/')` on path segments. If you pass a number (e.g., from mock data `id: 6`), it throws "n.indexOf is not a function". Always wrap IDs with `String(id)` when calling `doc(db, "collection", id)`. This affects `archiveBusiness`, `restoreBusiness`, `permanentlyDeleteBusiness`, and their destination counterparts.

---

## 21. Important Behavioral Details for Developers

### Participation Lifecycle
1. `joined` → created by `joinQuest()`
2. → `completed` → either by user (QR/code auto-approve) or admin (manual check-in or approve pending)
3. → `cancelled` → user calls `cancelQuest()` before completion
4. → `expired` → stale participations (past quest end date) marked by `expireMyStaleParticipations()` or `expireAllStaleParticipations()`

### Point Crediting Flow (quest completion)
1. `participations/{id}` status → `completed`, `completedAt` set
2. `pointsLedger/{id}` entry added: `{ uid, seasonId, questId, points: +N, reason }`
3. `seasonBalances/{seasonId}_{uid}` incremented via `incrementEarnedPoints(seasonId, user, amount)`
4. `impactLedger/{id}` entry added: `{ uid, seasonId, questId, questTitle, unit, amount }`
5. `seasonUserStats/{seasonId}_{uid}` created/updated: `{ points: increment(N), completedQuests: increment(1), impactByUnit.*: increment(amount) }`

### Voucher Redemption Transaction (atomic)
`redeemVoucher()` in `voucherRedemptions.service.js` uses a Firestore `runTransaction`:
1. Read voucher doc → validate active, not expired, stock > 0
2. Read redemption doc (unique by `{voucherId}_{uid}`) → validate not already redeemed
3. Read balance doc → validate sufficient points
4. Update voucher: `stockRemaining--`
5. Update balance: `pointsBalance -= cost`, `pointsSpent += cost`
6. Create redemption doc with generated code
7. After transaction commits: log audit, add negative points ledger entry

### Dual Storage Pattern
- **Ledgers** (`pointsLedger`, `impactLedger`) = immutable source of truth
- **Balances** (`seasonBalances`, `seasonUserStats`) = denormalized for fast reads
- If balances drift from ledgers, `rebuildSeasonBalanceFromLedger()` can reconstruct from the ledger

### Geo Constants
- Cabiao center: `[15.2522, 120.8596]`
- Default zoom: 13
- Bounds: southWest `[15.1576, 120.6779]`, northEast `[15.3060, 121.0075]`
- `isWithinCabiaoBounds(lat, lng)` validates coordinates
- Used in: map initial view, business/destination submission location validation, quest geofence checks

### Caching Strategies
- **Businesses:** In-memory cache (module-level variable) in `businesses.service.js`. Refreshed on manual `clearBusinessesCache()` or `forceRefresh` param.
- **Destinations:** Same pattern in `destinations.service.js`.
- **Map POIs:** Combined in-memory cache in `features/map/mapHelpers.js` (`getAllPlaces()`).
- **Admin role:** In-memory `Map` in `adminRole.service.js`. Cleared on logout.
- **Profile stats:** In-memory cache in `profileStats.service.js`. Per-user TTL of 60 seconds.
- **Favorites:** `localStorage` (not Firestore) in `favorites.service.js`.
- **Language preference:** `localStorage` key `smartdcabiao:lang`.

---

## 22. Typical Admin Setup Flow

1. **Create admin doc:** Manually in Firebase Console → create `admins/{uid}` doc (any content) with the admin user's UID
2. **Create season:** LGU Dashboard → Seasons tab → "Create Season" → add name, start/end dates → click Create
3. **Activate season:** Select season → click "Activate"
4. **Create quests:** Quests tab → "Create Quest" → fill out form (title, description, type, category, capacity, points, impact values, verification method, dates, optional location/partner)
5. **Toggle quests live:** Switch "Active" toggle on each quest
6. **(Optional) Seed sample quests:** Click "Seed Sample Quests" button (generates 10 sample quests for the active season)
7. **(Optional) Seed vouchers:** Vouchers tab → "Seed % Off Vouchers" (creates vouchers tied to existing businesses) or "Seed Sample Vouchers" (12 generic vouchers)
8. **User flow through quests:** Users see quests on `/events` → join → complete via QR/code/manual
9. **Admin verification:** Dashboard → Quests tab → Pending Verifications → approve or reject
10. **Voucher redemption + mark used:** User redeems at `/vouchers` → admin uses Vouchers tab → "Verify Voucher" to find by code → "Mark as Used"

---

## 23. Design & UX Conventions

**Color theme:** Emerald/green primary (`emerald-600` buttons, `emerald-50` backgrounds, `text-emerald-700` accents). Secondary blue (`blue-50`/`blue-800` for earned points), amber (`amber-50`/`amber-800` for spent points).

**Card styling:** `rounded-xl border border-gray-200 bg-white p-4 shadow-sm` is the standard card pattern.

**Button styling:**
- Primary: `bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium`
- Secondary: `border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50`
- Disabled: `bg-gray-100 text-gray-400 cursor-not-allowed`
- Danger: `bg-red-600 text-white`

**Toast notification pattern:** Fixed bottom-right, disappears after 3 seconds. Green for success, red for error.

**Modal pattern:**
- Full-screen backdrop: `fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4`
- Body scroll lock via `overflow: hidden` on `<body>` (injected by component mount)
- Close on backdrop click, stopPropagation on modal content
- Content: `bg-white rounded-xl max-w-md w-full p-6`

**Wizard pattern** (used in Register Business + Suggest Destination):
- Multi-step with Back/Next buttons
- Step indicator at top: `Step X of Y`
- Per-step validation before advancing
- Final step: review + submit
- Submit button with loading state
- Success screen with next steps + action buttons

**Table pattern** (used in LGU dashboard): `w-full` with `overflow-x-auto`, sticky header, alternating row hover, status badges, actions column with icons/buttons.

**Empty state pattern:** Centered text with gray color + descriptive message.

**Data loading pattern:** Loading skeleton or "Loading..." text, then content or empty state.

**Language toggle:** A nav button with text "EN" / "FIL" that switches all UI text immediately.

---

## 24. Build & Deployment Status

- **Build command:** `npm run build` → outputs to `dist/`
- **Build output:** `index.html` (0.5kB), `assets/index-*.css` (100kB), `assets/index-*.js` (1763kB)
- **Lint status:** Runs via `npm run lint` (ESLint flat config)
- **Deployment target:** Vercel at `smartdcabiao.vercel.app`
- **CI/CD:** Auto-deploys from `main` branch via Vercel GitHub integration
- **Firebase project ID:** `smartdcabiao`
- **Firebase services used:** Firestore, Auth (email/password, Google, Facebook), Storage (declared but unused)
- **Firebase deployments:** Rules (`firestore.rules`) and indexes (`firestore.indexes.json`) deployed via `npx firebase deploy --only firestore`

---

## Recent Fix (June 2, 2026) — Voucher Store for Regular Users

### Problem
Signed-in regular (non-admin) users saw "No vouchers available for this season yet." while logged-out users and admins saw the full catalog.

### Root Cause
The `VoucherStorePage.jsx` had a single `useEffect` wrapping ALL operations in one `try/catch`. User-specific fetches (balance rebuild from ledger, redemptions) that threw errors caused the catch block to clear `vouchers` to `[]` — even though the catalog fetch itself succeeded.

### Fix Applied
1. Split into 3 independent effects:
   - Effect 1 (no deps): fetch active season
   - Effect 2 (depends on season): fetch voucher catalog — sets vouchers + loading, independent of user
   - Effect 3 (depends on user + season): fetch balance + redemptions — each wrapped in `.catch()`, non-fatal
2. `handleRedeem` post-redeem refresh also wrapped in `.catch()` so success toast survives refresh failures
3. `listMyRedemptions` in `voucherRedemptions.service.js` fixed to use `where('uid', '==', uid)` query (not unfiltered `getDocs` + client filter)
4. Composite index created on `pointsLedger` (uid ASC, seasonId ASC) via `firestore.indexes.json`

### Key Files Changed
- `src/pages/VoucherStorePage.jsx` — effect restructuring
- `src/services/voucherRedemptions.service.js` — query filter fix
- `firestore.rules` — comprehensive rewrite with helper functions
- `firestore.indexes.json` — new composite index
- `firebase.json` — added indexes config

---

## Session: June 3, 2026 — Role-Based LGU Access, Quest Verification Modals, Inline QR Display

### Changes

**1. Role-based access control in Firestore rules (`firestore.rules`)**
- Split admin role into `isMasterAdmin` (full write access) vs `hasLguAccess` (read access for event helpers)
- Added `getUserRole(uid)` helper reading `admins/{uid}.data.role`
- Restricted write on businesses, destinations, seasons, quests, vouchers to master admin only
- Restricted update/delete on submissions, reports, reviews to master admin only
- Changed `users` collection rules: admins can read all users (for Manage Admins panel), users can create/update their own doc
- Changed `participations` delete to allow master admin
- Changed `pointsLedger` create to allow any signed-in user (removed self-only restriction for system writes)

**2. LGU Dashboard role-aware refactor (`LGUDashboardPage.jsx`)**
- Replaced binary `isUserAdmin` boolean with `role` (null / `"master"` / `"admin"`)
- Master: full sidebar (Moderation, Tourism Program, Settings with Manage Admins)
- Admin (event helper): only Quests tab visible
- Added quest search/filter (`questSearchQuery`, `filteredQuests`)
- Replaced `CheckInPanel` import with `CheckInModal` + `QRDisplayModal` + `QuestDetailsModal`
- Added `rotateEventCode` integration for quest verification
- Layout changed to full-height flex with scrollable content areas (prevents double scrollbars)
- Replaced inline `QuestVerificationModal` with `QuestDetailsModal`
- Removed `getQuestParticipations` bulk load + `expandedQuestStats` pattern

**3. New check-in modals (`src/components/quest/`)**
- `CheckInModal.jsx` — modal for LGU to manually mark quests completed (replaces old `CheckInPanel.jsx`)
- `QRDisplayModal.jsx` — standalone portal showing QR image for a quest (opened from table "View QR" button)
- `QuestDetailsModal.jsx` — full quest detail view with stats, impact, verification section, participations table
  - Verification section shows inline QR image (w-48 sm:w-56) with Download PNG (800px fetch+blob) and Print Poster buttons
  - QR payload shown in collapsible `<details>` with Copy button
  - Event code quests show styled code box with Copy button
  - Manual quests show explanation text

**4. Auth profile upsert (`AuthContext.jsx` + `users.service.js` [new])**
- New `src/services/users.service.js` exports `upsertUserProfile(user)` — fires `setDoc` with merge to `users/{uid}` on every sign-in
- `AuthContext.jsx` `onAuthStateChanged` callback now awaits `upsertUserProfile(u)` on auth state change
- Stores `email`, `displayName`, `photoURL`, `lastLoginAt`, `updatedAt`

**5. App layout restructure (`App.jsx`)**
- Extracted `AppLayout` component using `useLocation()` to conditionally render `BottomNav`
- BottomNav hidden on LGU routes (`/lgu*`)

**6. Admin role service extended (`adminRole.service.js`)**
- Added `getUserRole(uid)` export — returns `"master"`, `"admin"`, or `null`
- Legacy `isAdmin(uid)` still maintained for backward compat

**7. Removed legacy panel**
- `src/panels/CheckInPanel.jsx` deleted (replaced by `CheckInModal`)

### Relevant Files Changed
- `firestore.rules` — role-based access rewrite
- `src/App.jsx` — AppLayout + BottomNav gating
- `src/contexts/AuthContext.jsx` — user profile upsert
- `src/pages/LGUDashboardPage.jsx` — role-aware UI, new modals, quest search
- `src/services/adminRole.service.js` — added `getUserRole`
- `src/components/quest/CheckInModal.jsx` — [new] manual check-in modal
- `src/components/quest/QRDisplayModal.jsx` — [new] standalone QR display
- `src/components/quest/QuestDetailsModal.jsx` — [new] quest detail + verification UI
- `src/services/users.service.js` — [new] user profile upsert service
- `src/pages/lgu/panels/ManageAdminsPanel.jsx` — [new] master admin management panel
- `src/panels/CheckInPanel.jsx` — [deleted] replaced by CheckInModal

---

## Session: June 3, 2026 (cont.) — Archive Persistence Fix + Re-sync + Bulk Repair Data Tools

### 3 Critical Issues Fixed

**A. Archive Persistence Across Refresh**
- **Problem:** Archived items vanished after page refresh because static mock data overwrote Firestore data in the merge logic. `fetchFromFirestore` in `businesses.service.js` filtered by `isActive`, so archived Firestore items were excluded, allowing mock data to fill the gap with `isActive: true`. Destinations service had `VITE_USE_FIRESTORE_DATA` guard preventing Firestore fetches when flag was off.
- **Fix:** Added `mergeStaticAndFirestore` helper (Firestore-wins via Map). Renamed `fetchFromFirestore` → `fetchAllFromFirestore` (removed isActive filter). Rewrote `listBusinesses`/`listDestinations` to always fetch Firestore for archive overrides. `listBusinessesWithFilter`/`listDestinationsWithFilter` delegate to main list with `forceRefresh`. All mutations clear cache via `clearBusinessesCache()`/`clearDestinationsCache()`. All writes use `setDoc({ merge: true })` with `String(id)`.

**B. Per-Item "Re-sync Photos from Submission" Tool**
- Master admin can click 🔄 on any business/destination card to re-pull photos from original submission (for items approved before the image pipeline fix).
- Looks up `sourceSubmissionId` first, then falls back to name matching. Writes to both `images[]` and `photos[]`.
- Confirmation modal → success toast with synced count.

**C. Bulk "Repair All Images" in LGU Dashboard → Data Tools Tab**
- New `🛠️ Data Tools` tab in Settings sidebar (master only).
- `DataToolsPanel` component: two buttons ("Repair All Business Images" / "Repair All Destination Images"), live progress bar, summary grid (repaired/skipped/failed), detailed log.
- Scans all items, re-syncs those missing images from submissions.

### Files Changed
- `src/services/businesses.service.js` — fully rewritten merge logic + `resyncBusinessImagesFromSubmission` + `repairAllBusinessImages`
- `src/services/destinations.service.js` — fully mirrored merge logic + `resyncDestinationImagesFromSubmission` + `repairAllDestinationImages` (old duplicate functions removed)
- `src/pages/BusinessesPage.jsx` — 🔄 resync button on BusinessCard, confirmation modal
- `src/pages/Destinations.jsx` — 🔄 resync button + confirmation modal mirror
- `src/pages/LGUDashboardPage.jsx` — DATA_TOOLS tab, settingsItems update, DataToolsPanel component, EMPTY_STATES entry, imports for repair functions
- `src/utils/placeImages.js` — `getBusinessImages`/`getDestinationImages` (previous session)
- `src/components/PhotoCarousel.jsx` — [new] (previous session)
- `src/components/BusinessCard.jsx` — PhotoCarousel upgrade (previous session)
- `src/pages/BusinessDetailPage.jsx` — PhotoCarousel upgrade (previous session)
- `src/pages/DestinationDetails.jsx` — PhotoCarousel upgrade (previous session)

### Build Status
- `npm run build` passes with zero errors.

---

## Session: June 3, 2026 (cont. 2) — undefined Field Fix + Smarter Submission Matching + Manual Photo Upload + Static Item Protection

### 4 Changes

**1. 🐛 undefined Field Bug (CRITICAL) — `sanitizeForFirestore`**
- **Problem:** `setDoc` failed with "Unsupported field value: undefined" when archiving Firestore items containing `socialMedia.facebook: undefined` (nested undefined values).
- **Fix:** Created `src/utils/firestoreSanitize.js` — recursive `sanitizeForFirestore(value)` that strips `undefined`, functions, and symbols from nested objects/arrays while preserving Firestore special types (Timestamp, GeoPoint, serverTimestamp sentinels). Also exports `stripIdField` (removes `id` + `_source`).
- Applied to `archiveBusiness`/`archiveDestination` — payload runs through `sanitizeForFirestore` before `setDoc`
- Applied to `approveSubmissionAndPublish`/`approveBusinessSubmission` in `adminSubmissions.service.js`
- All `resync` and `manuallySet*` writes also sanitized

**2. 🐛 Smarter Submission Matching**
- **Problem:** Strict `trim().toLowerCase()` matching failed for "Café Amore" (diacritics), "Cafentot", "hubeat" — even when submissions existed.
- **Fix:** Added `normalizeName()` — strips diacritics (NFD normalization), punctuation, extra spaces
- Multi-strategy `findSubmissionForBusiness`/`findSubmissionForDestination`:
  1. Direct `sourceSubmissionId`
  2. Exact normalized name (prefers approved, falls back to any status)
  3. By owner UID (`createdByUid`/`publishedBy`)
  4. Fuzzy substring match
- Errors now have `.code` (`NO_SUBMISSION`, `SUBMISSION_EMPTY`)
- `repairAll*` uses error codes for skip reasons, adds `hint: "use Manual Upload"`

**3. ✨ Manual Photo Upload Feature**
- New `src/components/ManualPhotoUploadModal.jsx` — reusable modal: file picker (JPG/PNG/WebP, max 3MB, max 8), Cloudinary upload with compression, live progress, photo grid with remove/reorder (◀▶), save writes via `manuallySetBusinessImages`/`manuallySetDestinationImages`
- 📷 green button on active cards (master only, below 🔄 re-sync)
- "Upload Photos Manually Instead" fallback button in re-sync error modals
- All actions logged via `logAudit`

**4. 🛡️ Static Item Permanent Delete Protection**
- **Problem:** Delete on static mock items (e.g., San Roque Parish Church, ID 5) removed the Firestore override doc, so the item reappeared on refresh as Live.
- **Fix:** Added `isStaticBusiness`/`isStaticDestination` helpers — detects via `_source` tag (from `mergeStaticAndFirestore`) or numeric/short ID fallback
- Service layer guard: `permanentlyDeleteBusiness`/`permanentlyDeleteDestination` throws `STATIC_ITEM_NOT_DELETABLE` if called on static data
- UI: Permanently Delete button hidden on archived static cards; info banner shown ("Built-in sample — archive only (cannot delete)")
- Firestore-only items (string auto-IDs) unaffected

### Files Changed
- `src/utils/firestoreSanitize.js` — [NEW] `sanitizeForFirestore` + `stripIdField`
- `src/components/ManualPhotoUploadModal.jsx` — [NEW] reusable photo upload modal
- `src/services/businesses.service.js` — sanitizer integration, smarter matching, `manuallySetBusinessImages`, `isStaticBusiness`, static delete guard
- `src/services/destinations.service.js` — mirror: sanitizer, smarter matching, `manuallySetDestinationImages`, `isStaticDestination`, static delete guard
- `src/services/adminSubmissions.service.js` — sanitize approval payloads
- `src/pages/BusinessesPage.jsx` — 📷 button, manual upload modal, static delete protection, info banner, resync fallback, STATIC_ITEM_NOT_DELETABLE handling
- `src/pages/Destinations.jsx` — mirror all changes
- `src/pages/LGUDashboardPage.jsx` — DataToolsPanel detailed log rendering (reason, hint, source)

### Build Status
- `npm run build` passes with zero errors.

---

## Session: June 4, 2026 — Card Declutter + Dynamic Spotlight Carousel + Map Zoom-to-Selected

### Card Cleanup (🧹)

**Removed from BusinessesPage.jsx and Destinations.jsx:**
- 🔄 Re-sync Photos button (blue) from active cards
- 📷 Manage Photos button (emerald) from active cards
- All related state (`resyncTarget`, `resyncing`, `resyncResult`, `resyncError`, `manualUploadTarget`)
- `handleResyncConfirm`, `handleManualUploadSave` handlers and resync auto-close `useEffect`
- Modal renders for resync confirmation and ManualPhotoUploadModal
- Unused imports: `resyncBusinessImagesFromSubmission`, `manuallySetBusinessImages`, `ManualPhotoUploadModal`

**Kept intact:**
- Archive / Restore / Permanently Delete buttons
- Static item delete guard
- All service exports (`resync*`, `manuallySet*`, `repairAll*`) — still used by Data Tools panel
- `ManualPhotoUploadModal.jsx` — file preserved for future use
- `BusinessCard.jsx` — already had no re-sync/manage buttons, no changes needed

**Data Tools info banner:** Added above repair buttons: *"💡 These bulk tools replace the per-card re-sync buttons..."*
- `src/pages/LGUDashboardPage.jsx`

### Dynamic Spotlight Carousel (✨)

**1. New service helpers — `getRecentApprovedBusinesses` / `getRecentApprovedDestinations`**
- Filters active items with `createdAt` timestamp (Firestore-published)
- Sorts by `createdAt` DESC, returns up to `limit`
- Added to `src/services/businesses.service.js` and `src/services/destinations.service.js`

**2. New utility — `getSpotlightItems(limit)` in `src/utils/spotlightItems.js`**
- Merges businesses + destinations, tags each with `_kind` ("business"/"destination")
- Strict filter: only items with `createdAt` AND at least 1 real image via `getBusinessImages`/`getDestinationImages`
- No static fallback — if fewer than `limit` qualify, returns fewer items
- If 0 items qualify → empty array → section hidden

**3. Rewrote `BusinessPromotionCarousel.jsx` — now exports `SpotlightCarousel`**
- Fetches real data from `getSpotlightItems(5)` on mount
- Loading skeleton while fetching; hides entirely if 0 items
- Auto-rotate every 6s, pause/restart on user interaction
- Touch swipe support (40px threshold)
- Desktop: arrow buttons (hidden on mobile), dot indicators
- Dark gradient overlay (bottom-to-top) for text readability on any image
- Real category badge + kind badge ("🏪 Business" / "📍 Destination")
- "View Details" → navigates to `/businesses/:id` or `/destinations/:id`
- "View on Map" → navigates to `/map?filter=...&selected=ID`
- Mobile-first responsive (sm/md breakpoints, `line-clamp-2`/`line-clamp-3`, stacked buttons on mobile)
- Quick links section preserved (Browse All Businesses, Your Favorites, Community Events)

**4. MapPage — `?selected=ID` & `?filter=TYPE` URL param handling**
- Added `hasAutoZoomedRef` (once-per-mount guard)
- Replaced fragile `setTimeout(flyToPlace, 300)` with robust `useEffect`
- Applies filter from URL (`business`/`destination`)
- Calls `setSelectedPOI(target)` — opens bottom sheet on mobile, highlights on desktop
- Calls `map.flyTo(target.position, 17)` with smooth animation
- Supports both `[lat, lng]` array and `{lat, lng}` object position shapes
- Cleans up `?selected=` param after zoom (keeps `?filter=`)
- Gracefully exits if POI not found or position missing
- `setSearchParams` destructured from `useSearchParams()`

### Files Changed (this session)

| File | Change |
|---|---|
| `src/utils/spotlightItems.js` | **[NEW]** `getSpotlightItems(limit)` — merge + filter real images |
| `src/services/businesses.service.js` | Added `getRecentApprovedBusinesses(limit)` |
| `src/services/destinations.service.js` | Added `getRecentApprovedDestinations(limit)` |
| `src/components/BusinessPromotionCarousel.jsx` | Complete rewrite — renamed to `SpotlightCarousel`, dynamic data, mobile polish |
| `src/pages/MapPage.jsx` | `setSearchParams`, `hasAutoZoomedRef`, robust `?selected=` handler with flyTo |
| `src/pages/BusinessesPage.jsx` | Removed resync + manage photos buttons, state, handlers, modals, unused imports |
| `src/pages/Destinations.jsx` | Mirror all BusinessesPage removals |
| `src/pages/LGUDashboardPage.jsx` | Added info banner above Data Tools repair buttons |
| `SESSION_CONTEXT.md` | Updated with this session |

### Files Preserved (not modified)

- `src/components/ManualPhotoUploadModal.jsx` — intact
- `src/components/PhotoCarousel.jsx` — intact
- `src/utils/placeImages.js` — intact
- `src/utils/firestoreSanitize.js` — intact

### Build Status
- `npm run build` passes with zero errors (pre-existing warnings: dynamic imports, chunk size).

---

## Session: June 5, 2026 — Owner Quest Public Card + Reward Features (Multi-Session)

### Overview
A multi-session feature effort adding quest/reward visibility across the app: business listing reward badges, quest markers on the map, homepage reward carousel, rewards-nearby page, and a major restructuring of the BusinessDetailPage layout.

### Changes Across Sessions

**1. Reward badge on business listing cards (`BusinessCard.jsx`)**
- Shows a gold "🎁 Reward" badge on cards for businesses with active quests
- `getBusinessIdsWithActiveQuests()` fetches quests for all businesses with per-page-load cache

**2. "Show Only Rewards" filter chip (`BusinessesPage.jsx`)**
- Pill toggle next to category/barangay filters
- Filters listing to only businesses with active quests

**3. Quest markers on MapPage (`MapPage.jsx`)**
- Gold quest overlay on POI markers for businesses with active quests
- "🎁 Reward Available" pill in map bottom sheet cards

**4. Homepage Merchant Rewards Carousel (`MerchantRewardsCarousel.jsx`)**
- Horizontal scroll section on homepage between FeaturedBusinesses and MapPreview
- Photo-backed cards (gradient fallback if no image), links to business detail page

**5. Rewards Nearby Page (`RewardsNearbyPage.jsx`)**
- Full catalog at `/rewards-nearby` with filter/sort
- Photo-backed cards, join quest flow, logged-out redirect

**6. Nav links + BottomNav**
- "Rewards Nearby" in Navbar More dropdown + mobile hamburger drawer
- 7th nav item in BottomNav (Deals → Rewards)

**7. OwnerQuestPublicCard photo support + join flow rewrite**
- Converted `<Link>` to `<button>` with full `joinOwnerQuest()` flow
- Loading/error/success states, logged-out redirect via `onLoginRequired` callback
- Optional photo background mode (`onPhoto` prop)

**8. Photo backgrounds on quest cards at 3 locations**
- BusinessDetailPage reward banner section
- MerchantRewardsCarousel
- RewardsNearbyPage

**9. BusinessDetailPage layout restructure (THIS SESSION — June 5)**
- Container widened from `max-w-7xl` → `max-w-[1600px]` with `xl:px-12` padding
- No parent max-width wrappers in App.jsx — all constraints in-page
- **3-column layout** (with quests): Photo **4/12** | Info **3/12** | Quests **5/12** (sticky)
- **2-column layout** (no quests): Photo 1/2 | Info 1/2
- Photo column uses `h-full min-h-[400px]` to eliminate empty space below gallery
- PhotoCarousel uses `w-full h-full` with `object-cover` images
- Reward banner text tightened: `text-base`, `leading-tight`, `flex-1 min-w-0` on text containers, `shrink-0` on icon
- **Duplicate "Quests at this Business" section REMOVED** — quests display once inside the photo-background banner
- `OwnerQuestPublicCard` handles all states inline: Join → Timer → Completed (no "scroll down" needed)
- Unused `QuestTimerCard` import removed from BusinessDetailPage
- Breadcrumb + loading skeleton + not-found containers all updated to match `max-w-[1600px]`
- `overflow-hidden` avoidance maintained for sticky column; `lg:sticky lg:top-24` preserved
- Reviews, Map, Nearby Businesses remain full-width below grid
- Mobile single-column stack unchanged
- `.pulse-slow` animation in `index.css` for quest marker pulsing

### Relevant Files Modified

| File | Change |
|---|---|
| `src/pages/BusinessDetailPage.jsx` | **Major:** grid layout restructured, column ratios, photo fill, duplicate quest section removed, width widened, reward banner tightened, QuestTimerCard import removed |
| `src/components/owner/OwnerQuestPublicCard.jsx` | Join quest button with full flow (loading/error/success/logged-out), photo support, inline QuestTimerCard integration, updated success message |
| `src/components/owner/QuestTimerCard.jsx` | Timer/start/completed UI for quest participation |
| `src/pages/BusinessesPage.jsx` | Reward badge + "Show Only Rewards" filter chip |
| `src/pages/MapPage.jsx` | Quest marker overlay + gold reward pill in bottom sheet |
| `src/components/MerchantRewardsCarousel.jsx` | Homepage carousel with photo backgrounds |
| `src/pages/RewardsNearbyPage.jsx` | Rewards catalog page with photo-backed cards, filter/sort |
| `src/pages/HomePage.jsx` | Carousel insertion point |
| `src/services/ownerQuests.service.js` | `getBusinessIdsWithActiveQuests()` with per-page-load cache |
| `src/utils/placeImages.js` | `getBusinessImages()` utility |
| `src/utils/imageUrl.js` | `getFirstValidImage()` utility |
| `src/components/BottomNav.jsx` | 7-column nav with rewards link |
| `src/components/Navbar.jsx` | "Rewards Nearby" in More dropdown + mobile drawer |
| `src/App.jsx` | `/rewards-nearby` route |
| `src/index.css` | `pulse-slow` animation |

### Build Status
- `npm run build` passes with zero errors (pre-existing warnings: chunk size ~1900kB, circular dynamic imports).

---

## Sessions: June 5–7, 2026 — Owner Quest Buy Verification System + What-to-Buy Details + Photo Stretching Fix

### Overview
Three feature areas shipped in this multi-session effort: (A) buy quest verification with QR/code flow and merchant panels, (B) what-to-buy detail fields displayed across all surfaces, and (C) a photo gallery stretching fix on the business detail page.

---

### A. Buy Quest Verification System

**Schema additions** (`src/services/ownerQuests.service.js`):
- `normalizeQuestDoc` and `createOwnerQuest` updated with buy quest fields: `buyVerificationMethod` (`"qr"` / `"code"`), `qrToken`, `dailyCode`, `dailyCodeRotatedAt`, `autoRotateDaily`
- 6 new service functions: `regenerateBuyQuestQRToken`, `rotateBuyQuestDailyCode`, `verifyBuyQuestByQR`, `verifyBuyQuestByCode`, `merchantMarkParticipationComplete`, `getQuestParticipationsForMerchant`, `getBusinessPosition`
- `generateDailyCode()` helper for random daily codes
- All functions use `sanitizeForFirestore()` and `String(id)`
- Server-side geofence validation — never trust client for verification

**Customer-facing components** (`src/components/owner/`):
- `OwnerQuestPublicCard.jsx` — 5 visual states (not joined / joined idle / active / paused / completed). Buy quest branch shows "Scan Merchant QR Code" and "Enter Code Instead" buttons with geofence gating. Geolocation `watchPosition` with auto-pause/resume via `geofenceStateRef`. Timer countdown with auto-complete via `autoCompleteTriggeredRef`. Toast notifications, cancel confirmation, reward code copy.
- `BuyQuestScannerModal.jsx` — **[NEW]** Camera-based QR scanner using `html5-qrcode`, calls `verifyBuyQuestByQR`, error recovery with scanner restart
- `BuyQuestCodeModal.jsx` — **[NEW]** Text input for daily code entry, uppercase formatting, calls `verifyBuyQuestByCode`
- `BuyQuestQRDisplayModal.jsx` — **[NEW]** Canvas-based QR display for merchants to show customers
- `BuyQuestParticipantsModal.jsx` — **[NEW]** Participants list with pending/completed/all tabs, merchant manual complete + confirm dialog
- `MyQuestsSection.jsx` — **[NEW]** Profile quests tab, loads all owner quest participations grouped by status with filter chips, reward code copy, "Go to Business" links

**Merchant components & pages:**
- `OwnerQuestForm.jsx` — Updated buy quest section with `buyVerificationMethod` radio (QR Code / Daily Code), auto-rotate daily checkbox
- `MyBusinessQuestsPage.jsx` — Buy quest merchant action panels: "Show QR to Customer", "Rotate QR", "Rotate" daily code with timestamp, "View Participants"; handler functions `handleRegenerateBuyQR` and `handleRotateDailyCode`
- `ProfilePage.jsx` — Migrated from `useState` tab management to `useSearchParams` for URL-based tab routing (`?tab=quests`); added "My Quests" tab

**Business detail page:**
- `BusinessDetailPage.jsx` — Photo background removed from reward banner, replaced with `bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-700`; quest column narrowed to `lg:col-span-3`, photo widened to `lg:col-span-5`, info to `lg:col-span-4`; `onPhoto={false}` to quest cards
- `OwnerQuestPublicCard.jsx` — `onPhoto={false}` branch changed to light white card with border, stacked vertical layout, full-width Join button

**Dead code (preserved on disk, no longer imported):**
- `QuestTimerCard.jsx` — Replaced by inline timer in OwnerQuestPublicCard

---

### B. What-to-Buy Details (June 7, 2026)

**Schema additions** (`src/services/ownerQuests.service.js`):
- 6 new fields added to `normalizeQuestDoc` and `createOwnerQuest` payload: `itemPhotoUrl` (Cloudinary URL, optional), `itemDetails` (string, optional), `minimumPurchase` (number, 0 = no minimum), `quantityRequired` (number, default 1), `conditions` (string, optional), `questInstructions` (string, for visit quests, optional)
- All fields optional and backward compatible — existing quests work without them
- Sanitized via `sanitizeForFirestore()`

**Form updates** (`OwnerQuestForm.jsx`):
- New state variables for all 6 fields + `photoUploading`
- Photo upload handler using existing `uploadToCloudinary` + `compressImage` — validates size (3MB max) and type (JPG/PNG/WebP)
- **Buy quest**: Collapsible "What to Buy Details" section (photo upload with remove, item details text input, minimum purchase + quantity required grid, conditions textarea)
- **Visit quest**: "Quest Instructions" textarea below duration field
- All fields included in save payload

**Display component** (`QuestDetailsPanel.jsx`) — **[NEW]** Reusable dumb component:
- **Buy quest**: Shows item photo (optional), item name + quantity badge, item details text, minimum purchase badge, conditions text
- **Visit quest**: Shows quest instructions text
- `compact` prop for smaller spaces (homepage, profile rows, merchant view)
- Renders nothing if no detail fields present — safe to render unconditionally

**Integration across all surfaces:**
| Surface | File | Placement |
|---|---|---|
| Business detail quest card (not joined) | `OwnerQuestPublicCard.jsx` | After reward badges, before Join button |
| Business detail quest card (joined idle/active/paused) | `OwnerQuestPublicCard.jsx` | Prominently after status header |
| Business detail quest card (completed) | `OwnerQuestPublicCard.jsx` | Compact below title |
| Rewards Nearby page cards | `RewardsNearbyPage.jsx` | Compact below reward info |
| Homepage carousel | `MerchantRewardsCarousel.jsx` | Item photo + name inline; min purchase badge when no photo |
| Profile My Quests rows | `MyQuestsSection.jsx` | Compact in each quest row |
| Merchant quest list | `MyBusinessQuestsPage.jsx` | Compact under quest metadata + tip hint for missing details |

---

### C. Photo Stretching Fix (June 7, 2026)

**Problem:** Photo gallery in `BusinessDetailPage.jsx` used `h-full min-h-[400px]`, causing the photo to stretch unnaturally tall when the quest column became very long.

**Fix** (`src/pages/BusinessDetailPage.jsx:222-224`):
- Removed `h-full min-h-[400px]` from photo column div
- Added `aspect-[4/3]` container with `relative rounded-xl overflow-hidden bg-gray-100`
- Wrapped photo carousel in `absolute inset-0` to force it inside the aspect box
- Photo column now uses `lg:sticky lg:top-24` — stays pinned when scrolling through long quest lists
- No ancestor `overflow-hidden` to break sticky behavior (verified)
- Mobile (`< lg`) unchanged — still single-column stack

---

### D. Remote Fix (June 7, 2026)

**Problem:** Git remote `origin` pointed to wrong repo `janil231/smartdcabiao1.git` instead of `janil231/smartdcabiao.git`

**Fix:**
- `git remote remove origin` + `git remote add origin https://github.com/janil231/smartdcabiao.git`
- `git push origin main` — `* [new branch] main -> main` (5 commits pushed)

---

### Files Changed (this session set)

| File | Change |
|---|---|
| `src/services/ownerQuests.service.js` | Buy quest schema + 6 new verification functions; what-to-buy schema fields |
| `src/services/businessQuestRewards.service.js` | **[NEW]** Reward creation/retrieval |
| `src/components/owner/OwnerQuestPublicCard.jsx` | 5-state rewrite + buy quest branch + What-to-Buy integration |
| `src/components/owner/BuyQuestScannerModal.jsx` | **[NEW]** QR scanner modal |
| `src/components/owner/BuyQuestCodeModal.jsx` | **[NEW]** Code entry modal |
| `src/components/owner/BuyQuestQRDisplayModal.jsx` | **[NEW]** Merchant QR display |
| `src/components/owner/BuyQuestParticipantsModal.jsx` | **[NEW]** Participants list + manual complete |
| `src/components/owner/MyQuestsSection.jsx` | **[NEW]** Profile quests tab |
| `src/components/owner/QuestDetailsPanel.jsx` | **[NEW]** What-to-Buy display component |
| `src/components/owner/OwnerQuestForm.jsx` | Buy verification method radios + what-to-buy + instructions sections + photo upload |
| `src/pages/BusinessDetailPage.jsx` | Photo gallery aspect ratio + sticky fix; quest column width; reward banner gradient |
| `src/pages/ProfilePage.jsx` | URL-based tab routing + My Quests tab |
| `src/pages/MyBusinessQuestsPage.jsx` | Buy quest merchant panels + What-to-Buy display + tip hint |
| `src/pages/MyBusinessesPage.jsx` | **[NEW]** Business management list |
| `src/pages/RewardsNearbyPage.jsx` | Compact What-to-Buy integration |
| `src/components/MerchantRewardsCarousel.jsx` | Item photo + info in homepage cards |
| `src/components/BottomNav.jsx` | Nav updates |
| `src/components/Navbar.jsx` | Nav updates |
| `src/components/Auth/LoginModal.jsx` | Auth modal updates |
| `src/App.jsx` | Route additions |
| `src/pages/BusinessesPage.jsx` | Reward badge filter |
| `src/pages/DestinationDetails.jsx` | Detail page updates |
| `src/pages/HomePage.jsx` | Carousel insertion |
| `src/pages/LGUDashboardPage.jsx` | LGU dashboard updates |
| `src/pages/MapPage.jsx` | Quest marker overlay |
| `firestore.rules` | Security rules updates |
| `firestore.indexes.json` | Composite indexes |
| `src/services/adminSubmissions.service.js` | Service updates |
| `src/services/businesses.service.js` | Business service updates |
| `src/utils/voucherCode.js` | Voucher code utility |
| `SESSION_CONTEXT.md` | Updated with this session |

### Build Status
- `npm run build` passes with zero errors

---

## Session: June 11, 2026 — Auto-Pause Owner Quests When Season Ends

### Overview
When an LGU season ends (via `closeSeason()` or `endSeasonWithExpiry()`), all owner/business quests (`ownerQuests` collection) are automatically paused (`isActive: false`, `pausedBySeasonEnd: true`). Merchants can reactivate them with one click when a new season starts. Customer-facing pages hide paused quests and show a notice if a paused quest's detail modal is opened.

---

### A. Auto-Pause on Season End

**`src/services/ownerQuests.service.js`:**
- Added `pauseAllOwnerQuestsForSeasonEnd()` — batch-writes `isActive: false`, `pausedBySeasonEnd: true`, `pausedAt: serverTimestamp()` on ALL active owner quests. Wrapped in `sanitizeForFirestore()`. Calls `bumpDataVersion()` and `logAudit()` with individual try/catch.
- Added `getPausedQuestsCountForOwner(ownerUid)` — queries `ownerQuests(ownerUid, pausedBySeasonEnd == true)`, returns count.
- Added `reactivatePausedQuestsForOwner(ownerUid)` — batch reactivates all paused quests for a merchant: `isActive: true`, `pausedBySeasonEnd: false`, `pausedAt: null`, `reactivatedAt: serverTimestamp()`. Calls `bumpDataVersion()` and `logAudit()`.
- Added `reactivateSinglePausedQuest(questId, ownerUid)` — same as above but for a single quest.
- Updated `normalizeQuestDoc()` to include `pausedBySeasonEnd`, `pausedAt`, `reactivatedAt` fields.
- Removed `.filter(q => q.isActive !== false)` from `listOwnerQuestsForBusiness()` so paused quests appear in merchant dashboard.
- Updated `toggleOwnerQuestActive()` — when activating (`isActive: true`), also clears `pausedBySeasonEnd` and sets `reactivatedAt`.

**`src/services/seasons.service.js`:**
- Imported `pauseAllOwnerQuestsForSeasonEnd`.
- Wired into `closeSeason()` — called after `updateDoc` in a try/catch (non-blocking).
- Wired into `endSeasonWithExpiry()` — called before audit log in a try/catch (non-blocking).

---

### B. Merchant Dashboard Banner + Paused Badge

**`src/pages/MyBusinessQuestsPage.jsx`:**
- Imported `reactivatePausedQuestsForOwner`, `reactivateSinglePausedQuest`.
- Quests split into 3 groups: paused (`pausedBySeasonEnd`), active (`isActive && !pausedBySeasonEnd`), inactive (`!isActive && !pausedBySeasonEnd`).
- Amber banner at top of page showing "Quests Paused — Season Ended" with count and "Reactivate All" button.
- Paused quests rendered in their own section ("Paused Quests (N)"), each card gets:
  - Amber "Paused" badge next to the quest type badge.
  - "Reactivate" button (amber) replacing the toggle switch.
  - `onReactivateSingle` handler refreshes quest list after reactivation.

---

### C. Customer-Facing Paused Notice

**`src/components/owner/QuestDetailsViewModal.jsx`:**
- When `quest.pausedBySeasonEnd` is true: renders an amber notice banner with info icon and text: _"This quest has been paused because the LGU season ended. It will be available again when the business owner reactivates it."_
- All action sections (Join, Start, Scan QR, Enter Code, Cancel, timer, completed) are hidden when paused — gated by `!quest.pausedBySeasonEnd`.

---

### D. Composite Index

**`firestore.indexes.json`:**
- Added composite index: `ownerQuests(ownerUid ASC, pausedBySeasonEnd ASC)` — required by `getPausedQuestsCountForOwner` and `reactivatePausedQuestsForOwner` queries.

---

### E. Build Status

- `npm run build` passes with zero errors (pre-existing warnings: chunk size ~1990kB, circular dynamic imports).

### Files Changed

| File | Change |
|---|---|
| `src/services/ownerQuests.service.js` | 3 new functions + normalizeQuestDoc update + filter removal + toggleOwnerQuestActive update |
| `src/services/seasons.service.js` | Import + try/catch call in closeSeason and endSeasonWithExpiry |
| `src/pages/MyBusinessQuestsPage.jsx` | Paused quests section, amber banner, reactivate buttons, paused badge |
| `src/components/owner/QuestDetailsViewModal.jsx` | Paused notice banner + action section gating |
| `firestore.indexes.json` | ownerUid + pausedBySeasonEnd composite index |
| `SESSION_CONTEXT.md` | Updated with this session | (pre-existing warnings: chunk size ~1935kB, circular dynamic imports).

---

## Session: June 8, 2026 — Seed Owner Quests Tool + Quest UI Enhancements

### Seed Sample Owner Quests Tool

**Service** (`src/services/seedSampleOwnerQuests.service.js`):
- `seedSampleQuestsForAllBusinesses({ onProgress })` — batch seeds 5 quests + 5 rewards per qualifying business (filters static/mock/archived, skips businesses with existing quests)
- Per-quest try/catch: each of the 5 quests wrapped individually, one failure doesn't abort remaining; tracks per-quest errors with `questIndex`, `questTitle`, `questType`, `stage` (quest/reward), `error` message, and `code`
- `deleteAllSeededQuestsAndRewards()` — deletes all docs from `ownerQuests` and `businessQuestRewards` collections
- All writes through `sanitizeForFirestore()`, all IDs wrapped with `String(id)`, audit-logged

**Firestore rules** (`firestore.rules`):
- Added `|| isMasterAdmin()` to `ownerQuests` `create` clause (line 213) and `businessQuestRewards` `create`/`update` clauses (lines 244-248) — existing owner check preserved as OR condition

**LGU Dashboard DataToolsPanel** (`LGUDashboardPage.jsx`):
- Seed button with confirmation modal, live progress bar, results panel (seeded/skipped/errors with per-quest failure details)
- "⚠️ Delete All Seeded Quests" red button with confirmation modal + result display

### Business Detail Page Quest Container

**3 CSS-only changes** to `BusinessDetailPage.jsx`:
1. Removed `lg:sticky lg:top-24` from photo column wrapper — scrolls naturally
2. Removed `lg:sticky lg:top-24` from quest column wrapper — scrolls naturally
3. Changed `lg:max-h-[calc(100vh-8rem)]` → `lg:max-h-[465px]` — matches photo column aspect-[4/3] height

**Sticky header removed:**
- Removed the "🎁 N Rewards Available!" sticky header block (was causing visual overlap with quest content during internal scroll)

**Custom scrollbar** (`index.css`):
- Added `.custom-scrollbar` classes: 6px width, emerald-tinted thumb (white at 40%/60% opacity), translucent track, Firefox fallback via `scrollbar-width: thin`

### Quest Details View Modal

**New component** (`src/components/owner/QuestDetailsViewModal.jsx`):
- Full quest detail modal with: title + status badge, type/verification pills, reward highlight box (emerald), full description (no truncation, `whitespace-pre-wrap`), `QuestDetailsPanel` for what-to-buy/instructions, geofence info, status-aware action section (Join/Start/Scan QR/Enter Code/Cancel/timer/reward code)
- Portal to `document.body`, Escape + backdrop close, body scroll lock

**Modified** `OwnerQuestPublicCard.jsx`:
- Added "View Details →" text link at bottom of each card (above error, hidden during cancel confirm)
- Link uses `onPhoto ? 'text-white' : 'text-emerald-700'` for correct card variants

### HelpTooltip Component

**New component** (`src/components/ui/HelpTooltip.jsx`):
- Reusable `?` icon tooltip: hover (desktop) / tap-to-toggle (mobile), closes on Escape, outside click, and scroll
- Auto-positions above/below based on viewport space; horizontal anchoring (right/left/center) to prevent edge overflow
- `variant` prop: `'light'` (emerald icon, white popover) / `'dark'` (white icon, dark popover)
- Uses existing `animate-pulse-slow` class for subtle box-shadow pulse

**Modified** `OwnerQuestPublicCard.jsx`:
- Replaced large "How it works" instruction block with compact `?` icon at top-right corner of card (`absolute top-3 right-3 z-10`)
- Card container marked `relative` for absolute positioning
- `getQuestSteps(quest)` helper returns 3-4 steps based on quest type + verification method
- Icons use `variant={onPhoto ? 'dark' : 'light'}` for correct card background matching

### Profile Page Header Cleanup

**Modified** `ProfilePage.jsx`:
- Removed "Sign Out" button from header card (was causing overflow/text-wrapping issues on mobile)
- Email changed from `text-xl font-bold` → `text-sm font-semibold break-words` with `min-w-0` on parent for proper wrapping
- Added "Sign Out" as centered red text link at very bottom of page (`mt-8 mb-4 flex justify-center`)

### Files Changed (this session)

| File | Change |
|---|---|
| `src/services/seedSampleOwnerQuests.service.js` | **[NEW]** Seed + delete functions |
| `src/components/ui/HelpTooltip.jsx` | **[NEW]** Tooltip component |
| `src/components/owner/QuestDetailsViewModal.jsx` | **[NEW]** Quest detail modal |
| `firestore.rules` | Master admin bypass on ownerQuests/businessQuestRewards |
| `src/pages/LGUDashboardPage.jsx` | Seed tool UI + detailed error rendering + delete button |
| `src/pages/BusinessDetailPage.jsx` | Remove sticky, bounded height, scrollable quest container |
| `src/components/owner/OwnerQuestPublicCard.jsx` | View Details link, HelpTooltip at top-right, how-it-works replacement |
| `src/pages/ProfilePage.jsx` | Email shrink, sign out moved to page bottom |
| `src/index.css` | `.custom-scrollbar` utility classes |

### Build Status
- `npm run build` passes with zero errors (pre-existing warnings: chunk size ~1960kB, circular dynamic imports).

---

## Session: June 8, 2026 (cont.) — Owner UID Bug Fix + Vercel Deployment Discovery

### Critical Bug Fix: Owner UID Mismatch in Seeded Quests

**Problem:** Seeded owner quests got the LGU admin's UID as `ownerUid` instead of the business owner's UID.

**Root cause (two bugs):**
1. `createOwnerQuest(ownerUid, businessId, businessName, data)` in `ownerQuests.service.js:184` ignored the passed `ownerUid` parameter and always used `auth.currentUser.uid` (`const resolvedOwnerUid = user.uid`)
2. `seedSampleOwnerQuests.service.js:193` passed `user.uid` (admin's UID) instead of the business's actual `ownerUid`

**Impact:** All owner-scoped operations broke for seeded quests — `rotateBuyQuestDailyCode`, `merchantMarkParticipationComplete`, `getQuestParticipationsForMerchant`, `listOwnerQuestsByOwner` all check `data.ownerUid`

**Fix:**
- `ownerQuests.service.js`: Changed `const resolvedOwnerUid = user.uid` to `const resolvedOwnerUid = ownerUid || user.uid` (respects passed param, falls back to auth UID)
- `seedSampleOwnerQuests.service.js`: Changed `createOwnerQuest(user.uid, ...)` to `createOwnerQuest(business.ownerUid || user.uid, ...)` (looks up business's owner)

### Vercel Deployment Discovery

**Problem:** Commits pushed to `origin` (which points to `smartdcabiao.git`) never triggered a Vercel deployment. The user reported the live site was 9 hours stale.

**Root cause:** Two remotes exist:
- `origin` → `https://github.com/janil231/smartdcabiao.git` (code storage)
- `smartdcabiao1` → `https://github.com/janil231/smartdcabiao1.git` (Vercel-linked)

Vercel is integrated with `smartdcabiao1.git`, not `smartdcabiao.git`. All prior pushes to `origin` never reached Vercel.

**Fix:** After committing, must push to both:
```
git push origin main
git push smartdcabiao1 main
```

**Verification:**
- `git remote -v` shows both remotes
- `git ls-remote smartdcabiao1 main` confirmed old commit `1d65f72`
- After push to `smartdcabiao1`: commit `2b7b30c` now present on both remotes
- Vercel auto-deploys from `smartdcabiao1/main`

### Files Changed (this session)

| File | Change |
|---|---|
| `src/services/ownerQuests.service.js` | `resolvedOwnerUid = ownerUid || user.uid` |
| `src/services/seedSampleOwnerQuests.service.js` | `business.ownerUid || user.uid` |
| `.gitignore` | Added `nul` |
| `SESSION_CONTEXT.md` | Updated deployment info + this session |

### Build Status
- `npm run build` passes with zero errors (pre-existing warnings).

---

## Session: June 8, 2026 (cont. 2) — End Season Read-Only + Events Page Active Quest Filtering

### Overview
Two changes: (A) ended seasons in LGU dashboard are read-only, and (B) Community Activities (`/events`) page filters quests by `seasonId` + `isActive` using a new composite index, removing all mock data fallback.

---

### A. Ended Seasons Read-Only in LGU Dashboard

**`src/services/quests.service.js`:**
- Added `listActiveQuestsBySeason(seasonId)` — queries `quests` collection with `where('seasonId', '==', sid)` AND `where('isActive', '==', true)`. Preserves existing `listQuestsBySeason()` unchanged.

**`src/components/lgu/EditSeasonModal.jsx`:**
- Added `readOnly` prop. When `true`: title shows "View Season", all fields disabled, "This season has ended and cannot be modified" banner, no Save button, Cancel becomes "Close".
- Fixed date conversion to use `toJSDate()` instead of raw `.toDate?.()`.

**`src/pages/LGUDashboardPage.jsx`:**
- Added `viewingSeason` state. Ended seasons show only "View" button (no "Expire All Quests", no "View/Edit").
- `handleExpireAllQuests` kept defined but no longer exposed from any UI button.
- Renders `EditSeasonModal` with `readOnly={true}` for `viewingSeason`.

---

### B. Events Page Active Quest Filtering

**`src/pages/CommunityActivitiesPage.jsx`:**
- Removed `activities` import from `src/data` and `MockQuestCard` component entirely
- Replaced `listQuestsBySeason` with `listActiveQuestsBySeason` — only returns `isActive: true` quests
- Removed all `useMockData` state, `setUseMockData` calls, and mock data rendering paths
- Error state now includes a **"Try again"** retry button
- Empty state changed to "No quests in this season yet" (was "No active quests at the moment. Check back soon!")
- The `finishingSoonQuests`, `highImpactQuests`, `nearbyQuests`, and `beginnerQuests` sections still render client-side filters on the already-filtered set

---

### C. Composite Index + Deploy

**`firestore.indexes.json`:**
- Added composite index for `quests` collection: `seasonId ASC, isActive ASC` (supports the new `listActiveQuestsBySeason` query)

**Deployment:**
- `firebase deploy --only firestore:rules,firestore:indexes` — indexes deployed successfully (rules already up-to-date)

**Build:**
- `npm run build` passes with zero errors

---

### Files Changed (this session)

| File | Change |
|---|---|
| `src/services/quests.service.js` | Added `listActiveQuestsBySeason(seasonId)` |
| `src/components/lgu/EditSeasonModal.jsx` | Added `readOnly` prop, `toJSDate()` fix |
| `src/pages/LGUDashboardPage.jsx` | Ended seasons read-only, `viewingSeason` state |
| `src/pages/CommunityActivitiesPage.jsx` | Removed mock data, use `listActiveQuestsBySeason`, retry button, empty state |
| `firestore.indexes.json` | Added quests(seasonId ASC, isActive ASC) composite index |
| `SESSION_CONTEXT.md` | Updated with this session |

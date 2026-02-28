# SmartDCabiao Frontend - Project Structure

## Root Directory
```
smartdcabiao-frontend/
├── 📄 .env                           # Environment variables (Firebase config)
├── 📄 .env.example                   # Environment variables template
├── 📄 .gitignore                    # Git ignore file
├── 📄 COORDINATES_UPDATE_SUMMARY.md   # Recent coordinates update documentation
├── 📄 DESTINATIONS_IMPLEMENTATION.md # Destinations feature documentation
├── 📄 FACEBOOK_LOGIN_SETUP.md        # Facebook authentication setup guide
├── 📄 FAVORITES_IMPLEMENTATION.md    # Favorites feature documentation
├── 📄 index.html                    # Main HTML entry point
├── 📄 package.json                  # Project dependencies and scripts
├── 📄 package-lock.json              # Dependency lock file
├── 📄 README.md                     # Project readme
├── 📄 eslint.config.js              # ESLint configuration
├── 📄 vite.config.js               # Vite build configuration
└── 📁 dist/                        # Built production files
```

## Source Code Structure (`src/`)
```
src/
├── 📁 api/                          # API layer for backend communication
│   └── 📄 participation.js         # Activity participation API (Firestore)
├── 📁 components/                    # Reusable UI components
│   ├── 📄 Auth/
│   │   └── 📄 LoginModal.jsx         # Authentication modal component
│   ├── 📄 BusinessCard.jsx           # Business listing card
│   ├── 📄 BusinessPromotionCarousel.jsx # Featured businesses carousel
│   ├── 📄 FacebookAuthStatus.jsx    # Facebook auth status display
│   ├── 📄 FavoriteButton.jsx        # Favorite toggle button
│   ├── 📄 FeaturedBusinesses.jsx    # Featured businesses section
│   ├── 📄 Footer.jsx                # App footer
│   ├── 📄 Hero.jsx                  # Homepage hero section
│   ├── 📄 MapPreview.jsx            # Map preview component
│   ├── 📄 Navbar.jsx                # Main navigation bar
│   ├── 📄 SearchBar.jsx             # Search functionality
│   └── 📄 SustainableTourismTips.jsx # Tourism tips section
├── 📁 constants/                    # App constants and configuration
│   └── 📄 cabiaoGeo.js             # Cabiao geographic boundaries and center
├── 📁 contexts/                     # React context providers
│   ├── 📄 AuthContext.jsx           # Authentication context
│   └── 📄 FavoritesContext.jsx      # Favorites management context
├── 📁 data/                         # Static data and mock data
│   ├── 📄 activities.js             # Community activities data
│   ├── 📄 businesses.js             # Business listings data
│   ├── 📄 destinations.js          # Destinations data (map POIs)
│   ├── 📄 index.js                 # Central data export point
│   └── 📄 rewards.js               # Rewards/participation mock data
├── 📁 features/                     # Feature-specific components
│   └── 📁 map/                     # Map-related functionality
│       ├── 📄 MapFilterBar.jsx       # Map filtering controls
│       ├── 📄 MapResults.jsx         # Map results display
│       ├── 📄 MapUtilities.jsx       # Map utility functions
│       ├── 📄 mapHelpers.js         # Map helper functions
│       └── 📄 useMapFilters.js      # Map filtering hook
├── 📁 lib/                         # Library initialization
│   └── 📄 firebase.js              # Firebase configuration and initialization
├── 📁 pages/                        # Page components
│   ├── 📄 BusinessDetailPage.jsx    # Individual business details
│   ├── 📄 BusinessesPage.jsx       # Business listings page
│   ├── 📄 CommunityActivitiesPage.jsx # Community activities page
│   ├── 📄 DestinationDetails.jsx   # Destination details page
│   ├── 📄 Destinations.jsx          # Destinations listing page
│   ├── 📄 FavoritesPage.jsx        # User favorites page
│   ├── 📄 HomePage.jsx             # Homepage
│   ├── 📄 MapPage.jsx              # Interactive map page
│   └── 📄 RewardsPreviewPage.jsx   # User rewards/participation page
├── 📁 services/                     # Service layer
│   ├── 📄 destinations.service.js    # Destinations data service
│   └── 📄 favorites.service.js      # Favorites data service
├── 📄 App.css                      # Global app styles
├── 📄 App.jsx                      # Main app component with routing
├── 📄 index.css                    # Base styles
└── 📄 main.jsx                     # App entry point
```

## Public Assets (`public/`)
```
public/
└── 🖼️ vite.svg                    # Vite logo
```

## Documentation (`docs/`)
```
docs/
└── 📄 IMPLEMENTATION_PLAN.md       # Overall project implementation plan
```

## Build Output (`dist/`)
```
dist/
├── 📄 index.html                   # Built HTML file
├── 🖼️ vite.svg                    # Copied Vite logo
└── 📁 assets/                     # Built assets
    ├── 📄 index-CKilfPGD.css      # Built CSS
    └── 📄 index-vN8ScGJr.js       # Built JavaScript bundle
```

## Key Technology Stack
- **Framework:** React 19.2.0
- **Build Tool:** Vite 7.2.4
- **Styling:** Tailwind CSS 4.1.18
- **Routing:** React Router DOM 7.13.0
- **Maps:** Leaflet 1.9.4 + React-Leaflet 5.0.0
- **Backend:** Firebase 12.9.0 (Auth + Firestore)
- **Authentication:** Email/Password, Google OAuth, Facebook OAuth
- **Package Manager:** npm

## Project Features
1. **🗺️ Interactive Map** - Business and destination discovery with filtering
2. **🏪 Business Directory** - Searchable business listings with details
3. **❤️ Favorites System** - Save favorite businesses and destinations
4. **🎯 Community Activities** - Join local events and earn rewards
5. **🏆 Rewards System** - Points and vouchers for participation
6. **🔐 Authentication** - Multi-provider login system
7. **📍 Geographic Focus** - Cabiao, Nueva Ecija, Philippines

## Data Flow
- **Static Data:** `src/data/` (businesses, activities, destinations)
- **User Data:** Firebase Firestore (participation, rewards, user profiles)
- **UI State:** React Context (Auth, Favorites)
- **Local Storage:** Favorites persistence

## Development Commands
```bash
npm run dev        # Start development server
npm run build      # Build for production
npm run preview    # Preview production build
npm run lint       # Run ESLint
```
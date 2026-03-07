import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { FavoritesProvider } from './contexts/FavoritesContext'
import { AuthProvider } from './contexts/AuthContext'
import ScrollManager from './components/ScrollManager'
import PageTransition from './components/PageTransition'
import ErrorBoundary from './components/ErrorBoundary'
import BottomNav from './components/BottomNav'
import HomePage from './pages/HomePage'
import MapPage from './pages/MapPage'
import BusinessesPage from './pages/BusinessesPage'
import BusinessDetailPage from './pages/BusinessDetailPage'
import DestinationsPage from './pages/Destinations'
import DestinationDetails from './pages/DestinationDetails'
import FavoritesPage from './pages/FavoritesPage'
import CommunityActivitiesPage from './pages/CommunityActivitiesPage'
import RewardsPreviewPage from './pages/RewardsPreviewPage'
import VoucherStorePage from './pages/VoucherStorePage'
import PrivacyPolicyPage from './pages/PrivacyPolicyPage'
import TermsPage from './pages/TermsPage'
import DataDeletionPage from './pages/DataDeletionPage'
import AboutPage from './pages/AboutPage'
import SuggestPlacePage from './pages/SuggestPlacePage'
import LGUDashboardPage from './pages/LGUDashboardPage'
import LGUPlacesPage from './pages/lgu/LGUPlacesPage'
import LGUPlaceFormPage from './pages/lgu/LGUPlaceFormPage'
import LGUCheckinPage from './pages/lgu/LGUCheckinPage'
import ProfilePage from './pages/ProfilePage'

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <FavoritesProvider>
          <BrowserRouter>
            <ScrollManager />
            <PageTransition>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/map" element={<MapPage />} />
                <Route path="/businesses" element={<BusinessesPage />} />
                <Route path="/businesses/:id" element={<BusinessDetailPage />} />
                <Route path="/destinations" element={<DestinationsPage />} />
                <Route path="/destinations/:id" element={<DestinationDetails />} />
                <Route path="/favorites" element={<FavoritesPage />} />
                <Route path="/events" element={<CommunityActivitiesPage />} />
                <Route path="/rewards" element={<RewardsPreviewPage />} />
                <Route path="/vouchers" element={<VoucherStorePage />} />
                <Route path="/privacy" element={<PrivacyPolicyPage />} />
                <Route path="/terms" element={<TermsPage />} />
                <Route path="/data-deletion" element={<DataDeletionPage />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/suggest" element={<SuggestPlacePage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/lgu" element={<LGUDashboardPage />} />
                <Route path="/lgu/places" element={<LGUPlacesPage />} />
                <Route path="/lgu/places/:type/new" element={<LGUPlaceFormPage />} />
                <Route path="/lgu/places/:type/:id/edit" element={<LGUPlaceFormPage />} />
                <Route path="/lgu/checkin" element={<LGUCheckinPage />} />
              </Routes>
            </PageTransition>
            <BottomNav />
          </BrowserRouter>
        </FavoritesProvider>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App

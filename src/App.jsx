import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { FavoritesProvider } from './contexts/FavoritesContext'
import { AuthProvider } from './contexts/AuthContext'
import { LanguageProvider } from './contexts/LanguageContext'
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
import SuggestDestinationPage from './pages/SuggestDestinationPage'
import LGUDashboardPage from './pages/LGUDashboardPage'
import LGUMerchantInsightsPage from './pages/lgu/LGUMerchantInsightsPage'
import ProfilePage from './pages/ProfilePage'
import RegisterBusinessPage from './pages/RegisterBusinessPage'

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <FavoritesProvider>
          <LanguageProvider>
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
                  <Route path="/suggest-destination" element={<SuggestDestinationPage />} />
                  <Route path="/profile" element={<ProfilePage />} />
                  <Route path="/register-business" element={<RegisterBusinessPage />} />
                  <Route path="/lgu" element={<LGUDashboardPage />} />
                  <Route path="/lgu/merchant/:businessId" element={<LGUMerchantInsightsPage />} />
                </Routes>
              </PageTransition>
              <BottomNav />
            </BrowserRouter>
          </LanguageProvider>
        </FavoritesProvider>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App

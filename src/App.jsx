import { useState, useEffect, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { FavoritesProvider } from './contexts/FavoritesContext'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { LanguageProvider } from './contexts/LanguageContext'
import ScrollManager from './components/ScrollManager'
import PageTransition from './components/PageTransition'
import ErrorBoundary from './components/ErrorBoundary'
import BottomNav from './components/BottomNav'
import LoginModal from './components/Auth/LoginModal'
import HomePage from './pages/HomePage'
import MapPageSkeleton from './components/MapPageSkeleton'

const MapPage = lazy(() => import('./pages/MapPage'))
import BusinessesPage from './pages/BusinessesPage'
import BusinessDetailPage from './pages/BusinessDetailPage'
import DestinationsPage from './pages/Destinations'
import DestinationDetails from './pages/DestinationDetails'
import FavoritesPage from './pages/FavoritesPage'
import CommunityActivitiesPage from './pages/CommunityActivitiesPage'
import RewardsPreviewPage from './pages/RewardsPreviewPage'
import RewardsNearbyPage from './pages/RewardsNearbyPage'
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
import MyBusinessesPage from './pages/MyBusinessesPage'
import MyBusinessQuestsPage from './pages/MyBusinessQuestsPage'
import InterestOnboardingPage from './pages/InterestOnboardingPage'

function WizardAutoOpener() {
  const { user, needsSignupWizard } = useAuth()
  const [showWizard, setShowWizard] = useState(false)

  useEffect(() => {
    if (!user) {
      setShowWizard(false)
      return
    }

    if (document.querySelector('[data-wizard-instance]')) {
      console.log('[WizardAutoOpener] wizard already in DOM — skipping duplicate')
      return
    }

    needsSignupWizard(user).then(needs => {
      if (needs) {
        console.log('[WizardAutoOpener] user needs wizard — opening')
        setShowWizard(true)
      }
    })
  }, [user, needsSignupWizard])

  if (!showWizard) return null

  return (
    <LoginModal
      isOpen={true}
      initialMode="signup-wizard"
      onClose={() => setShowWizard(false)}
    />
  )
}

function AppLayout() {
  const { pathname } = useLocation()
  const isLguRoute = pathname.startsWith('/lgu')

  return (
    <>
      <PageTransition>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/map" element={<Suspense fallback={<MapPageSkeleton />}><MapPage /></Suspense>} />
          <Route path="/businesses" element={<BusinessesPage />} />
          <Route path="/businesses/:id" element={<BusinessDetailPage />} />
          <Route path="/destinations" element={<DestinationsPage />} />
          <Route path="/destinations/:id" element={<DestinationDetails />} />
          <Route path="/favorites" element={<FavoritesPage />} />
          <Route path="/events" element={<CommunityActivitiesPage />} />
          <Route path="/rewards" element={<RewardsPreviewPage />} />
          <Route path="/rewards-nearby" element={<RewardsNearbyPage />} />
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
          <Route path="/my-businesses" element={<MyBusinessesPage />} />
          <Route path="/my-businesses/:id/quests" element={<MyBusinessQuestsPage />} />
          <Route path="/welcome" element={<InterestOnboardingPage />} />
        </Routes>
      </PageTransition>
      {!isLguRoute && <BottomNav />}
      <WizardAutoOpener />
    </>
  )
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <FavoritesProvider>
          <LanguageProvider>
            <BrowserRouter>
              <ScrollManager />
              <AppLayout />
            </BrowserRouter>
          </LanguageProvider>
        </FavoritesProvider>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App

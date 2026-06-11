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
import PageSkeleton from './components/PageSkeleton'

const MapPage = lazy(() => import('./pages/MapPage'))
const BusinessesPage = lazy(() => import('./pages/BusinessesPage'))
const BusinessDetailPage = lazy(() => import('./pages/BusinessDetailPage'))
const DestinationsPage = lazy(() => import('./pages/Destinations'))
const DestinationDetails = lazy(() => import('./pages/DestinationDetails'))
const FavoritesPage = lazy(() => import('./pages/FavoritesPage'))
const CommunityActivitiesPage = lazy(() => import('./pages/CommunityActivitiesPage'))
const RewardsPreviewPage = lazy(() => import('./pages/RewardsPreviewPage'))
const RewardsNearbyPage = lazy(() => import('./pages/RewardsNearbyPage'))
const VoucherStorePage = lazy(() => import('./pages/VoucherStorePage'))
const PrivacyPolicyPage = lazy(() => import('./pages/PrivacyPolicyPage'))
const TermsPage = lazy(() => import('./pages/TermsPage'))
const DataDeletionPage = lazy(() => import('./pages/DataDeletionPage'))
const AboutPage = lazy(() => import('./pages/AboutPage'))
const SuggestDestinationPage = lazy(() => import('./pages/SuggestDestinationPage'))
const LGUDashboardPage = lazy(() => import('./pages/LGUDashboardPage'))
const LGUMerchantInsightsPage = lazy(() => import('./pages/lgu/LGUMerchantInsightsPage'))
const ProfilePage = lazy(() => import('./pages/ProfilePage'))
const RegisterBusinessPage = lazy(() => import('./pages/RegisterBusinessPage'))
const MyBusinessesPage = lazy(() => import('./pages/MyBusinessesPage'))
const MyBusinessQuestsPage = lazy(() => import('./pages/MyBusinessQuestsPage'))
const InterestOnboardingPage = lazy(() => import('./pages/InterestOnboardingPage'))

function WizardAutoOpener() {
  const { user, needsSignupWizard } = useAuth()
  const [showWizard, setShowWizard] = useState(false)
  const [userDismissed, setUserDismissed] = useState(false)

  useEffect(() => {
    if (!user) {
      setShowWizard(false)
      setUserDismissed(false)
      return
    }

    if (userDismissed) return

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
  }, [user, needsSignupWizard, userDismissed])

  if (!showWizard) return null

  return (
    <LoginModal
      isOpen={true}
      initialMode="signup-wizard"
      onClose={() => {
        setShowWizard(false)
        setUserDismissed(true)
      }}
    />
  )
}

function AppLayout() {
  const { pathname } = useLocation()
  const isLguRoute = pathname.startsWith('/lgu')

  return (
    <>
      <PageTransition>
        <Suspense fallback={<PageSkeleton />}>
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
        </Suspense>
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

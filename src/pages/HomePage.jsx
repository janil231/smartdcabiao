import { useAuth } from '../contexts/AuthContext'
import { useEffect } from 'react'
import { schedulePreloadTiles } from '../utils/tilePreloader'
import Navbar from '../components/Navbar'
import Hero from '../components/Hero'
import FeaturedBusinesses from '../components/FeaturedBusinesses'
import BusinessPromotionCarousel from '../components/BusinessPromotionCarousel'
import MerchantRewardsCarousel from '../components/MerchantRewardsCarousel'
import MapPreview from '../components/MapPreview'
import EventsSection from '../components/EventsSection'
import SustainableTourismTips from '../components/SustainableTourismTips'
import FloatingFacebookWidget from '../components/home/FloatingFacebookWidget'
import Footer from '../components/Footer'
import EmailVerificationBanner from '../components/EmailVerificationBanner'
import InterestNudgeBanner from '../components/InterestNudgeBanner'

export default function HomePage() {
  const { grandfatheredUnverified } = useAuth()

  useEffect(() => {
    schedulePreloadTiles()
  }, [])

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 -mt-18 pb-mobile-nav">
        {grandfatheredUnverified && <EmailVerificationBanner />}
        <InterestNudgeBanner />
        <Hero />
        <BusinessPromotionCarousel />
        <FeaturedBusinesses />
        <MerchantRewardsCarousel />
        <MapPreview />
        <EventsSection />
        <SustainableTourismTips />
      </main>
      <FloatingFacebookWidget />
      <Footer />
    </div>
  )
}

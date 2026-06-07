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

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 -mt-18 pb-mobile-nav">
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

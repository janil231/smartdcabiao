import { Link } from 'react-router-dom'
import Reveal from './animations/Reveal'
import HeroBackgroundCarousel from './HeroBackgroundCarousel'
import { heroImages } from '../data/heroImages'

export default function Hero() {
  return (
    <section
      id="home"
      className="relative overflow-hidden min-h-[70vh] lg:min-h-[85vh] flex items-center"
    >
      {/* Background Carousel */}
      <HeroBackgroundCarousel images={heroImages} intervalMs={5000} />
      
      {/* Dark + Emerald Overlay Gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-emerald-900/30 to-black/40 z-10 backdrop-blur-[1px]" />
      
      {/* Hero Content */}
      <div className="relative z-20 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <Reveal delay={0}>
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl drop-shadow-lg">
              Discover{' '}
              <span className="text-emerald-300">Cabiao</span>
              {' '}with SMARTDCABIAO
            </h1>
          </Reveal>
          <Reveal delay={80}>
            <p className="mt-6 text-lg text-white/90 sm:text-xl drop-shadow-md">
              Your digital gateway to local tourism. Explore businesses, events, and attractions
              across the Municipality of Cabiao — all in one place. Join with Facebook for instant access!
            </p>
          </Reveal>
          <Reveal delay={160}>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Link
                to="/businesses"
                className="rounded-lg bg-emerald-600 px-6 py-3 text-base font-medium text-white shadow-lg transition-all duration-200 ease-out hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 active:scale-[0.98] backdrop-blur-sm"
              >
                Explore Businesses
              </Link>
              <Link
                to="/map"
                className="rounded-lg border border-white/20 bg-white/10 px-6 py-3 text-base font-medium text-white backdrop-blur-sm transition-all duration-200 ease-out hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 active:scale-[0.98]"
              >
                View Map
              </Link>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}

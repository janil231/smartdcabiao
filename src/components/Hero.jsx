import { Link } from 'react-router-dom'
import Reveal from './animations/Reveal'
import HeroBackgroundCarousel from './HeroBackgroundCarousel'
import { heroImages } from '../data/heroImages'
import { useLanguage } from '../contexts/LanguageContext'

export default function Hero() {
  const { t } = useLanguage()
  
  return (
    <section
      id="home"
      className="relative w-full overflow-hidden h-[60vh] min-h-[420px] sm:h-[70vh] sm:min-h-0 lg:h-[80vh] lg:min-h-[85vh] flex items-center"
    >
      {/* Background Carousel */}
      <HeroBackgroundCarousel images={heroImages} intervalMs={5000} />
      
      {/* Dark + Emerald Overlay Gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-emerald-900/35 to-black/50 z-10 sm:from-black/40 sm:via-emerald-900/30 sm:to-black/40 backdrop-blur-[1px]" />
      
      {/* Hero Content */}
      <div className="relative z-20 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <Reveal delay={0}>
            <h1 className="text-3xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl drop-shadow-lg">
              {t('home.headline')}
            </h1>
          </Reveal>
          <Reveal delay={80}>
            <p className="mt-4 sm:mt-6 text-base text-white/90 sm:text-xl drop-shadow-md">
              {t('home.subtitle')}
            </p>
          </Reveal>
          <Reveal delay={160}>
            <div className="mt-6 sm:mt-10 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 w-full max-w-sm sm:max-w-none mx-auto sm:w-auto">
              <Link
                to="/businesses"
                className="rounded-xl bg-emerald-600 px-6 py-3 min-h-[44px] flex items-center justify-center text-base font-semibold text-white shadow-lg transition-all duration-200 ease-out hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 active:scale-[0.98] w-full sm:w-auto"
              >
                {t('home.ctaExplore')}
              </Link>
              <Link
                to="/map"
                className="rounded-xl border border-white/30 bg-white/90 px-6 py-3 min-h-[44px] flex items-center justify-center text-base font-semibold text-gray-900 sm:bg-white/10 sm:text-white backdrop-blur-sm transition-all duration-200 ease-out hover:bg-white sm:hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 active:scale-[0.98] w-full sm:w-auto"
              >
                {t('home.ctaMap')}
              </Link>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}

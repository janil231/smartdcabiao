import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

const PAGE_URL = 'https://www.facebook.com/lgucabiao'
const APP_ID = import.meta.env.VITE_FACEBOOK_APP_ID || ''

export default function FloatingFacebookWidget() {
  const [desktopCollapsed, setDesktopCollapsed] = useState(false)
  const [mobileModalOpen, setMobileModalOpen] = useState(false)
  const desktopContainerRef = useRef(null)
  const mobileContainerRef = useRef(null)

  useEffect(() => {
    if (!document.getElementById('fb-root')) {
      const fbRoot = document.createElement('div')
      fbRoot.id = 'fb-root'
      document.body.appendChild(fbRoot)
    }

    const scriptId = 'facebook-jssdk'
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script')
      script.id = scriptId
      script.async = true
      script.defer = true
      script.crossOrigin = 'anonymous'
      script.src = `https://connect.facebook.net/en_US/sdk.js#xfbml=1&version=v19.0${APP_ID ? `&appId=${APP_ID}` : ''}`
      document.body.appendChild(script)
    }

    const interval = setInterval(() => {
      if (window.FB) {
        if (desktopContainerRef.current) window.FB.XFBML.parse(desktopContainerRef.current)
        if (mobileContainerRef.current) window.FB.XFBML.parse(mobileContainerRef.current)
        clearInterval(interval)
      }
    }, 300)

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!mobileModalOpen) return
    const handler = (e) => e.key === 'Escape' && setMobileModalOpen(false)
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [mobileModalOpen])

  useEffect(() => {
    if (mobileModalOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [mobileModalOpen])

  const widgetMarkup = (
    <>
      {/* Desktop floating card (lg+) */}
      <div className="hidden lg:block fixed bottom-6 left-6 z-[9999]">
        <button
          type="button"
          onClick={() => setDesktopCollapsed(false)}
          className={`w-12 h-12 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-xl flex items-center justify-center text-xl transition hover:scale-105 ${desktopCollapsed ? 'block' : 'hidden'}`}
          aria-label="Show Cabiao LGU updates"
        >
          📘
        </button>

        <div className={`w-[360px] bg-white rounded-2xl border border-gray-200 shadow-2xl overflow-hidden ${desktopCollapsed ? 'hidden' : 'block'}`}>
          <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 px-4 py-2.5 flex items-center justify-between">
            <span className="text-white font-bold text-xs tracking-wider uppercase">
              📘 Cabiao LGU
            </span>
            <button
              type="button"
              onClick={() => setDesktopCollapsed(true)}
              className="text-white hover:bg-white/20 rounded-lg w-7 h-7 flex items-center justify-center transition"
              aria-label="Collapse"
            >
              ✕
            </button>
          </div>

          <div className="p-3 bg-gray-50" style={{ width: '360px' }}>
            <div ref={desktopContainerRef} style={{ width: '340px', minHeight: '460px' }}>
              <div
                className="fb-page"
                data-href={PAGE_URL}
                data-tabs="timeline"
                data-width="340"
                data-height="460"
                data-small-header="false"
                data-adapt-container-width="false"
                data-hide-cover="false"
                data-show-facepile="true"
              >
                <blockquote cite={PAGE_URL} className="fb-xfbml-parse-ignore">
                  <a href={PAGE_URL} target="_blank" rel="noopener noreferrer">
                    Cabiao LGU on Facebook
                  </a>
                </blockquote>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100 px-4 py-2.5 text-center bg-white">
            <a
              href={PAGE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
            >
              Visit Page on Facebook →
            </a>
          </div>
        </div>
      </div>

      {/* Mobile floating bubble (< lg) */}
      <button
        type="button"
        onClick={() => setMobileModalOpen(true)}
        className="lg:hidden fixed right-4 z-[9999] bottom-[80px] w-14 h-14 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-xl flex items-center justify-center text-2xl transition hover:scale-105 active:scale-95 animate-pulse-slow"
        style={{ bottom: 'calc(80px + env(safe-area-inset-bottom))' }}
        aria-label="Open Cabiao LGU updates"
      >
        📘
      </button>

      {/* Mobile full-screen modal - always mounted, visibility toggled */}
      <div
        className={`lg:hidden fixed inset-0 z-[10000] flex flex-col transition-opacity duration-200 ${mobileModalOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        aria-hidden={!mobileModalOpen}
      >
        <div
          className="absolute inset-0 bg-black/60"
          onClick={() => setMobileModalOpen(false)}
        />

        <div
          className={`relative w-full h-full bg-white flex flex-col transition-transform duration-250 ${mobileModalOpen ? 'translate-y-0' : 'translate-y-full'}`}
        >
          <div className="shrink-0 bg-gradient-to-r from-emerald-600 to-emerald-500 px-4 py-3 flex items-center justify-between">
            <span className="text-white font-bold">
              📘 Cabiao LGU Updates
            </span>
            <button
              type="button"
              onClick={() => setMobileModalOpen(false)}
              className="text-white hover:bg-white/20 rounded-lg w-9 h-9 flex items-center justify-center transition"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto bg-gray-50 p-3">
            <p className="text-center text-sm text-gray-600 mb-3">
              Stay updated with announcements, events, and news from the
              Local Government of Cabiao.
            </p>
            <div ref={mobileContainerRef} style={{ width: '340px', margin: '0 auto' }}>
              <div
                className="fb-page"
                data-href={PAGE_URL}
                data-tabs="timeline"
                data-width="340"
                data-height="600"
                data-small-header="false"
                data-adapt-container-width="false"
                data-hide-cover="false"
                data-show-facepile="true"
              >
                <blockquote cite={PAGE_URL} className="fb-xfbml-parse-ignore">
                  <a href={PAGE_URL} target="_blank" rel="noopener noreferrer">
                    Cabiao LGU on Facebook
                  </a>
                </blockquote>
              </div>
            </div>
          </div>

          <div className="shrink-0 border-t border-gray-200 px-4 py-3 text-center bg-white">
            <a
              href={PAGE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-semibold text-emerald-600 hover:text-emerald-700"
            >
              Visit Page on Facebook →
            </a>
          </div>
        </div>
      </div>
    </>
  )

  return createPortal(widgetMarkup, document.body)
}

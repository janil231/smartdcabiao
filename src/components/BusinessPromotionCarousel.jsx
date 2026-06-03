import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { getSpotlightItems } from "../utils/spotlightItems";
import { getBusinessImages, getBusinessImage, getDestinationImages, getDestinationImage } from "../utils/placeImages";

const AUTO_ROTATE_MS = 6000;

export default function SpotlightCarousel() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [imageError, setImageError] = useState({});
  const touchStartX = useRef(null);
  const autoRotateRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await getSpotlightItems(5);
        if (!cancelled) setItems(result);
      } catch (err) {
        console.warn("[SpotlightCarousel] fetch failed:", err);
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const count = items.length;
  const hasMultiple = count > 1;

  const goTo = useCallback((idx) => {
    if (count === 0) return;
    setCurrentIndex(((idx % count) + count) % count);
  }, [count]);

  const goPrev = useCallback(() => goTo(currentIndex - 1), [currentIndex, goTo]);
  const goNext = useCallback(() => goTo(currentIndex + 1), [currentIndex, goTo]);

  useEffect(() => {
    if (!hasMultiple) return;
    autoRotateRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % count);
    }, AUTO_ROTATE_MS);
    return () => {
      if (autoRotateRef.current) clearInterval(autoRotateRef.current);
    };
  }, [hasMultiple, count]);

  const restartAutoRotate = () => {
    if (autoRotateRef.current) clearInterval(autoRotateRef.current);
    if (!hasMultiple) return;
    autoRotateRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % count);
    }, AUTO_ROTATE_MS);
  };

  const onTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const onTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const diff = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(diff) > 40) {
      if (diff > 0) goPrev();
      else goNext();
      restartAutoRotate();
    }
    touchStartX.current = null;
  };

  const handleViewDetails = (item) => {
    navigate(item._kind === "destination" ? `/destinations/${item.id}` : `/businesses/${item.id}`);
  };

  const handleViewOnMap = (item) => {
    const kind = item._kind === "destination" ? "destinations" : "businesses";
    navigate(`/map?filter=${kind}&selected=${encodeURIComponent(String(item.id))}`);
  };

  const getItemImage = (item) => {
    if (!item) return null;
    const images = item._kind === "destination" ? getDestinationImages(item) : getBusinessImages(item);
    if (images && images.length > 0) return images[0];
    return item._kind === "destination" ? getDestinationImage(item) : getBusinessImage(item);
  };

  if (loading) {
    return (
      <section className="relative bg-emerald-700 py-10 sm:py-16 overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-10">
            <div className="h-8 sm:h-10 w-64 sm:w-96 mx-auto bg-white/20 rounded-lg animate-pulse mb-3" />
            <div className="h-4 sm:h-5 w-80 sm:w-[32rem] mx-auto bg-white/15 rounded animate-pulse" />
          </div>
          <div className="max-w-5xl mx-auto aspect-[16/10] sm:aspect-[16/9] bg-white/10 rounded-2xl animate-pulse" />
        </div>
      </section>
    );
  }

  if (count === 0) return null;

  const current = items[currentIndex];
  const currentImage = getItemImage(current);
  const errored = imageError[currentIndex];

  return (
    <section className="relative bg-emerald-700 py-10 sm:py-16 overflow-hidden">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-6 sm:mb-10">
          <h2 className="text-2xl sm:text-4xl font-bold text-white mb-2 sm:mb-3 px-2">
            Spotlight on Local Excellence
          </h2>
          <p className="text-sm sm:text-base text-emerald-100 max-w-2xl mx-auto px-2 leading-relaxed">
            Discover the heart and soul of Cabiao through these featured local
            businesses and destinations that embody our community&apos;s spirit.
          </p>
        </div>

        <div className="relative max-w-5xl mx-auto">
          <div
            className="bg-white rounded-2xl shadow-2xl overflow-hidden"
            onTouchStart={hasMultiple ? onTouchStart : undefined}
            onTouchEnd={hasMultiple ? onTouchEnd : undefined}
          >
            <div className="relative aspect-[16/11] sm:aspect-[16/9] bg-gray-800">
              {currentImage && !errored ? (
                <img
                  key={`${current.id}-${currentIndex}`}
                  src={currentImage}
                  alt={current.name}
                  className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500"
                  loading="eager"
                  onError={() => setImageError((prev) => ({ ...prev, [currentIndex]: true }))}
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-700 to-emerald-900 flex items-center justify-center">
                  <span className="text-white/60 text-sm">No photo available</span>
                </div>
              )}

              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/50 to-black/20 sm:from-black/80 sm:via-black/30 sm:to-transparent" />

              <div className="absolute top-3 left-3 right-3 sm:top-5 sm:left-5 sm:right-5 flex items-start justify-between gap-2 z-10">
                <div className="flex flex-wrap gap-2">
                  {current.category && (
                    <span className="inline-flex items-center px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full bg-emerald-500/95 backdrop-blur text-white text-[10px] sm:text-xs font-bold uppercase tracking-wider shadow-md">
                      {String(current.category).replace(/_/g, " ")}
                    </span>
                  )}
                  <span className="inline-flex items-center px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full bg-white/95 backdrop-blur text-gray-900 text-[10px] sm:text-xs font-semibold shadow-md">
                    {current._kind === "destination" ? "📍 Destination" : "🏪 Business"}
                  </span>
                </div>
              </div>

              <div className="absolute inset-x-0 bottom-0 p-4 sm:p-7 md:p-10 z-10">
                <h3 className="text-white text-xl sm:text-3xl md:text-4xl font-bold mb-2 sm:mb-3 leading-tight drop-shadow-lg">
                  {current.name}
                </h3>
                {current.description && (
                  <p className="text-white/95 text-sm sm:text-base md:text-lg mb-4 sm:mb-5 leading-relaxed line-clamp-2 sm:line-clamp-3 max-w-2xl drop-shadow">
                    {current.description}
                  </p>
                )}

                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 max-w-md sm:max-w-none">
                  <button
                    onClick={() => handleViewDetails(current)}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 sm:px-6 sm:py-3 rounded-xl bg-white hover:bg-gray-100 text-gray-900 font-semibold text-sm sm:text-base shadow-lg transition-all active:scale-95"
                  >
                    View Details
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleViewOnMap(current)}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 sm:px-6 sm:py-3 rounded-xl bg-black/40 hover:bg-black/60 backdrop-blur border border-white/40 text-white font-semibold text-sm sm:text-base shadow-lg transition-all active:scale-95"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                    View on Map
                  </button>
                </div>
              </div>

              {hasMultiple && (
                <>
                  <button
                    type="button"
                    onClick={() => { goPrev(); restartAutoRotate(); }}
                    className="hidden sm:flex absolute left-3 md:left-5 top-1/2 -translate-y-1/2 w-11 h-11 md:w-12 md:h-12 rounded-full bg-white/90 hover:bg-white shadow-lg items-center justify-center text-gray-800 hover:text-emerald-700 transition z-20 active:scale-95"
                    aria-label="Previous slide"
                  >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="15 18 9 12 15 6" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => { goNext(); restartAutoRotate(); }}
                    className="hidden sm:flex absolute right-3 md:right-5 top-1/2 -translate-y-1/2 w-11 h-11 md:w-12 md:h-12 rounded-full bg-white/90 hover:bg-white shadow-lg items-center justify-center text-gray-800 hover:text-emerald-700 transition z-20 active:scale-95"
                    aria-label="Next slide"
                  >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </button>
                </>
              )}
            </div>
          </div>

          {hasMultiple && (
            <div className="flex justify-center gap-2 mt-4 sm:mt-5">
              {items.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => { goTo(idx); restartAutoRotate(); }}
                  className={`transition-all rounded-full ${
                    idx === currentIndex
                      ? "w-7 sm:w-8 h-2 bg-white shadow-md"
                      : "w-2 h-2 bg-white/50 hover:bg-white/75"
                  }`}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>
          )}
        </div>

        <div className="mt-8 sm:mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 max-w-4xl mx-auto">
          <Link
            to="/businesses"
            className="bg-white/10 backdrop-blur-sm rounded-xl p-5 sm:p-6 text-center hover:bg-white/20 transition border border-white/20"
          >
            <div className="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 bg-white/20 rounded-full mb-3 sm:mb-4">
              <svg className="h-5 w-5 sm:h-6 sm:w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h3 className="text-base sm:text-lg font-semibold text-white mb-1 sm:mb-2">Browse All Businesses</h3>
            <p className="text-emerald-100 text-xs sm:text-sm">Explore our complete directory of local establishments</p>
          </Link>

          <Link
            to="/favorites"
            className="bg-white/10 backdrop-blur-sm rounded-xl p-5 sm:p-6 text-center hover:bg-white/20 transition border border-white/20"
          >
            <div className="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 bg-white/20 rounded-full mb-3 sm:mb-4">
              <svg className="h-5 w-5 sm:h-6 sm:w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <h3 className="text-base sm:text-lg font-semibold text-white mb-1 sm:mb-2">Your Favorites</h3>
            <p className="text-emerald-100 text-xs sm:text-sm">View and manage your saved places</p>
          </Link>

          <Link
            to="/events"
            className="bg-white/10 backdrop-blur-sm rounded-xl p-5 sm:p-6 text-center hover:bg-white/20 transition border border-white/20"
          >
            <div className="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 bg-white/20 rounded-full mb-3 sm:mb-4">
              <svg className="h-5 w-5 sm:h-6 sm:w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-base sm:text-lg font-semibold text-white mb-1 sm:mb-2">Community Events</h3>
            <p className="text-emerald-100 text-xs sm:text-sm">Join local activities and celebrations</p>
          </Link>
        </div>
      </div>
    </section>
  );
}

import { useState, useMemo, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { createPortal } from 'react-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import FavoriteButton from '../components/FavoriteButton'
import PhotoCarousel from '../components/PhotoCarousel'
import RatingSummary from '../components/reviews/RatingSummary'
import { getDestinationImages } from '../utils/placeImages'
import { useAuth } from '../contexts/AuthContext'
import { isMasterAdmin } from '../services/adminRole.service'
import { logAudit } from '../services/audit.service'
import {
  archiveDestination,
  restoreDestination,
  permanentlyDeleteDestination,
  isStaticDestination,
} from '../services/destinations.service'

// Consistent styling with BusinessCard
const TYPE_STYLES = {
  restaurant: 'bg-amber-500/10 text-amber-700 border-amber-200',
  shop: 'bg-blue-500/10 text-blue-700 border-blue-200',
  attraction: 'bg-emerald-500/10 text-emerald-700 border-emerald-200',
  destination: 'bg-purple-500/10 text-purple-700 border-purple-200',
}

function DestinationCard({ destination, isMaster, onAction }) {
  const categoryStyle = TYPE_STYLES[destination.type] || TYPE_STYLES.destination
  const isArchived = destination.isActive === false

  return (
    <article className={`flex flex-col overflow-hidden rounded-xl border bg-white shadow-sm transition hover:shadow-md ${
      isArchived ? 'opacity-60 ring-2 ring-amber-200 border-amber-200' : 'border-gray-200'
    }`}>
      <div className="relative aspect-video w-full bg-gradient-to-br from-purple-50 to-pink-50">
        <PhotoCarousel images={getDestinationImages(destination)} alt={destination.name} mode="card" className="h-full w-full" />

        {isArchived && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10">
            <span className="text-xs font-bold bg-amber-500 text-white px-3 py-1 rounded-full shadow-md">
              🗂️ ARCHIVED
            </span>
          </div>
        )}

        {isMaster && (
          <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5">
              {!isArchived ? (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    onAction({ type: "archive", id: destination.id, name: destination.name, item: destination });
                  }}
                  className="w-9 h-9 rounded-full bg-white/95 backdrop-blur shadow-md hover:bg-amber-50 hover:shadow-lg flex items-center justify-center text-amber-600 hover:text-amber-700 transition"
                  title="Archive this destination (hide from public)"
                  aria-label={`Archive ${destination.name}`}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="21 8 21 21 3 21 3 8" />
                    <rect x="1" y="3" width="22" height="5" />
                    <line x1="10" y1="12" x2="14" y2="12" />
                  </svg>
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    onAction({ type: "restore", id: destination.id, name: destination.name, item: destination });
                  }}
                  className="w-9 h-9 rounded-full bg-white/95 backdrop-blur shadow-md hover:bg-emerald-50 hover:shadow-lg flex items-center justify-center text-emerald-600 hover:text-emerald-700 transition"
                  title="Restore this destination (make public again)"
                  aria-label={`Restore ${destination.name}`}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="1 4 1 10 7 10" />
                    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                  </svg>
                </button>
                {!isStaticDestination(destination) && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      onAction({ type: "delete", id: destination.id, name: destination.name, item: destination });
                    }}
                    className="w-9 h-9 rounded-full bg-white/95 backdrop-blur shadow-md hover:bg-red-50 hover:shadow-lg flex items-center justify-center text-red-600 hover:text-red-700 transition"
                    title="Permanently delete (cannot be undone)"
                    aria-label={`Permanently delete ${destination.name}`}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6" />
                      <path d="M10 11v6" />
                      <path d="M14 11v6" />
                    </svg>
                  </button>
                )}
              </>
            )}
          </div>
        )}

        {destination.isActive === false && isMaster && isStaticDestination(destination) && (
          <div className="absolute bottom-2 left-2 right-2 z-10 bg-amber-50/95 backdrop-blur border border-amber-200 rounded-lg px-2.5 py-1.5 text-[10px] text-amber-800 font-medium leading-tight">
            Built-in sample &mdash; archive only (cannot delete)
          </div>
        )}

        <div className="absolute top-3 right-3">
          <FavoriteButton 
            item={{ ...destination, type: destination.type || 'destination' }}
            size="sm"
            className="bg-white/90 backdrop-blur-sm"
          />
        </div>
      </div>
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <span
          className={`inline-block w-fit rounded border px-2 py-0.5 text-xs font-medium uppercase tracking-wider ${categoryStyle}`}
        >
          {destination.category || 'Destination'}
        </span>
        <h3 className="mt-2 text-lg font-semibold text-gray-900">{destination.name}</h3>
        <p className="mt-1 text-sm text-gray-500 flex items-center gap-1">
          <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {destination.barangay || destination.address?.split(',')[0] || 'Cabiao'}
        </p>
        {(destination.ratingAvg || destination.ratingCount) && (
          <div className="mt-1">
            <RatingSummary ratingAvg={destination.ratingAvg} ratingCount={destination.ratingCount} />
          </div>
        )}
        <p className="mt-2 flex-1 text-sm text-gray-600 line-clamp-2 sm:line-clamp-3">
          {destination.description}
        </p>
        <div className="mt-4 flex flex-col sm:flex-row gap-2 sm:gap-2">
          <Link
            to={`/destinations/${destination.id}`}
            className="w-full sm:flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 h-11 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 active:scale-[0.98]"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            View Details
          </Link>
          <Link
            to={`/map?focus=${destination.id}`}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white h-11 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 active:scale-[0.98]"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            Map
          </Link>
        </div>
      </div>
    </article>
  )
}

export default function DestinationsPage() {
  const { user } = useAuth()
  const [destinations, setDestinations] = useState([])
  const [barangays, setBarangays] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [isMaster, setIsMaster] = useState(false)
  const [archiveFilter, setArchiveFilter] = useState("active")
  const [confirmAction, setConfirmAction] = useState(null)
  const [processing, setProcessing] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")
  const [typedConfirmation, setTypedConfirmation] = useState("")

  useEffect(() => {
    if (!user?.uid) {
      setIsMaster(false);
      return;
    }
    isMasterAdmin(user.uid).then(setIsMaster).catch(() => setIsMaster(false));
  }, [user]);

  useEffect(() => {
    if (!confirmAction) {
      setTypedConfirmation("");
      setErrorMsg("");
    }
  }, [confirmAction]);

  useEffect(() => {
    if (!confirmAction) return;
    document.body.style.overflow = "hidden";
    const handler = (e) => e.key === "Escape" && !processing && setConfirmAction(null);
    window.addEventListener("keydown", handler);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handler);
    };
  }, [confirmAction, processing]);

  const activeCount = useMemo(
    () => destinations.filter((d) => d.isActive !== false).length,
    [destinations]
  );

  const archivedCount = useMemo(
    () => destinations.filter((d) => d.isActive === false).length,
    [destinations]
  );

  const handleConfirm = async () => {
    if (!confirmAction) return;
    setProcessing(true);
    setErrorMsg("");

    try {
      if (confirmAction.type === "archive") {
        await archiveDestination(confirmAction.id, user.uid, "", confirmAction.item || null);
        await logAudit({
          action: "archive_destination",
          targetType: "destination",
          targetId: confirmAction.id,
          adminUid: user.uid,
          meta: { name: confirmAction.name },
        });
        setDestinations((prev) =>
          prev.map((d) =>
            d.id === confirmAction.id
              ? { ...d, isActive: false, archivedAt: new Date(), archivedBy: user.uid }
              : d
          )
        );
      } else if (confirmAction.type === "restore") {
        await restoreDestination(confirmAction.id);
        await logAudit({
          action: "restore_destination",
          targetType: "destination",
          targetId: confirmAction.id,
          adminUid: user.uid,
          meta: { name: confirmAction.name },
        });
        setDestinations((prev) =>
          prev.map((d) =>
            d.id === confirmAction.id
              ? { ...d, isActive: true, archivedAt: null, archivedBy: null }
              : d
          )
        );
      } else if (confirmAction.type === "delete") {
        if (typedConfirmation !== confirmAction.name) {
          setErrorMsg("Typed name doesn't match. Please type the exact destination name to confirm.");
          setProcessing(false);
          return;
        }
        const destinationData = confirmAction.item || destinations.find((d) => String(d.id) === String(confirmAction.id));
        await permanentlyDeleteDestination(confirmAction.id, destinationData);
        await logAudit({
          action: "permanently_delete_destination",
          targetType: "destination",
          targetId: confirmAction.id,
          adminUid: user.uid,
          meta: { name: confirmAction.name },
        });
        setDestinations((prev) => prev.filter((d) => d.id !== confirmAction.id));
      }

      setConfirmAction(null);
    } catch (err) {
      if (err.code === "STATIC_ITEM_NOT_DELETABLE") {
        setErrorMsg(err.message);
      } else {
        setErrorMsg(err.message || "Action failed. Please try again.");
      }
    } finally {
      setProcessing(false);
    }
  };

  const loadDestinations = useCallback(async () => {
    try {
      setLoading(true)
      const { listDestinations: fetchDestinations } = await import('../services/destinations.service')
      const { data } = await fetchDestinations()
      
      setDestinations(data)
      
      const barangaysData = [...new Set(data.map(d => d.barangay).filter(Boolean))].sort()
      setBarangays(barangaysData)
    } catch {
      // Silent fallback
    } finally {
      setLoading(false)
    }
  }, [])

  // Load destinations and barangays
  useEffect(() => {
    loadDestinations()
  }, [loadDestinations])

  // Build filter options
  const filterOptions = useMemo(() => [
    { value: 'all', label: 'All Barangays' },
    ...barangays.map(barangay => ({ value: barangay, label: barangay }))
  ], [barangays])

  const filteredDestinations = useMemo(() => {
    let list = destinations

    if (!isMaster) {
      list = list.filter((d) => d.isActive !== false);
    } else {
      if (archiveFilter === "active") {
        list = list.filter((d) => d.isActive !== false);
      } else if (archiveFilter === "archived") {
        list = list.filter((d) => d.isActive === false);
      }
    }

    if (filter !== 'all') {
      list = list.filter(d => d.barangay === filter)
    }

    const q = searchQuery.trim().toLowerCase()
    if (q) {
      list = list.filter(d => {
        const haystack = [
          d.name,
          d.description,
          d.category,
          d.barangay,
          d.address,
          ...(d.tags || []),
        ].filter(Boolean).join(' ').toLowerCase()
        return haystack.includes(q)
      })
    }

    return list
  }, [destinations, filter, searchQuery, isMaster, archiveFilter])

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 pb-mobile-nav">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="text-center sm:text-left">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Tourist Destinations
            </h1>
            <p className="mt-2 sm:mt-3 max-w-2xl text-base sm:text-lg text-gray-600">
              Explore beautiful destinations and points of interest in Cabiao. Discover natural attractions, historical sites, and local landmarks.
            </p>
          </div>

          {/* Master Admin Archive Toggle */}
          {isMaster && (
            <div className="mb-4 flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                🛡️ Master View:
              </span>
              <div className="inline-flex rounded-xl border border-gray-300 bg-white overflow-hidden">
                <button
                  onClick={() => setArchiveFilter("active")}
                  className={`px-3 py-1.5 text-xs font-semibold transition ${
                    archiveFilter === "active"
                      ? "bg-emerald-600 text-white"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  Live ({activeCount})
                </button>
                <button
                  onClick={() => setArchiveFilter("archived")}
                  className={`px-3 py-1.5 text-xs font-semibold transition border-l border-gray-300 ${
                    archiveFilter === "archived"
                      ? "bg-amber-600 text-white"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  🗂️ Archived ({archivedCount})
                </button>
                <button
                  onClick={() => setArchiveFilter("all")}
                  className={`px-3 py-1.5 text-xs font-semibold transition border-l border-gray-300 ${
                    archiveFilter === "all"
                      ? "bg-gray-700 text-white"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  All
                </button>
              </div>
            </div>
          )}

          {/* Search and Filter Section - Sticky on mobile */}
          <div className="mt-6 sm:mt-8 space-y-4 sticky top-[72px] sm:top-0 z-30 -mx-4 sm:mx-0 px-4 sm:py-0 py-3 bg-white/95 sm:bg-transparent backdrop-blur-sm sm:backdrop-blur-none -top-3 sm:top-0">
            <div className="max-w-md relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search destinations..."
                className="w-full px-4 py-3 pr-10 rounded-2xl border border-emerald-300 bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 focus:outline-none text-sm"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-10 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 w-6 h-6 flex items-center justify-center"
                  aria-label="Clear search"
                >
                  ✕
                </button>
              )}
            </div>
            
            <div className="flex flex-wrap gap-2">
              {filterOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setFilter(option.value)}
                  className={`rounded-lg px-3 py-2 sm:px-4 sm:py-2 text-sm font-medium transition h-11 active:scale-[0.98] ${
                    filter === option.value
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Results Count */}
          <div className="mt-4 sm:mt-6">
            <p className="text-sm text-gray-600">
              {loading ? 'Loading...' : (
                <>
                  {filteredDestinations.length} {filteredDestinations.length === 1 ? 'destination' : 'destinations'} found
                  {searchQuery && ` for "${searchQuery}"`}
                  {filter !== 'all' && ` in ${filter}`}
                </>
              )}
            </p>
          </div>

          {/* Destinations Grid */}
          {loading ? (
            <div className="mt-6 sm:mt-10 grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="animate-pulse">
                  <div className="flex flex-col overflow-hidden rounded-xl border border-gray-200">
                    <div className="aspect-video bg-gray-200" />
                    <div className="p-5 space-y-3">
                      <div className="h-4 bg-gray-200 rounded w-20" />
                      <div className="h-6 bg-gray-200 rounded" />
                      <div className="h-4 bg-gray-200 rounded" />
                      <div className="h-12 bg-gray-200 rounded" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredDestinations.length > 0 ? (
            <div className="mt-6 sm:mt-10 grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {filteredDestinations.map((destination) => (
                <DestinationCard key={destination.id} destination={destination} isMaster={isMaster} onAction={setConfirmAction} />
              ))}
            </div>
          ) : (
            <div className="mt-6 sm:mt-10 text-center">
              <div className="rounded-lg bg-gray-50 px-6 py-12">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                  <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No destinations found</h3>
                <p className="text-gray-600 mb-4">
                  {searchQuery
                    ? `We couldn't find anything matching "${searchQuery}".`
                    : 'Try adjusting your search or filter criteria.'}
                </p>
                {(searchQuery || filter !== 'all') && (
                  <div className="flex gap-3 justify-center">
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="text-sm font-medium text-emerald-600 hover:text-emerald-700"
                      >
                        Clear search
                      </button>
                    )}
                    {filter !== 'all' && (
                      <button
                        type="button"
                        onClick={() => setFilter('all')}
                        className="text-sm font-medium text-emerald-600 hover:text-emerald-700"
                      >
                        Clear filter
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />

      {confirmAction && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/60"
            onClick={() => !processing && setConfirmAction(null)}
          />

          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 animate-fade-in">
            {confirmAction.type === "archive" && (
              <>
                <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center text-3xl mx-auto mb-4">
                  🗂️
                </div>
                <h3 className="font-bold text-lg text-gray-900 text-center mb-2">
                  Archive this destination?
                </h3>
                <p className="text-sm text-gray-600 text-center mb-1">
                  You're about to hide:
                </p>
                <p className="text-base font-semibold text-gray-900 text-center mb-4">
                  "{confirmAction.name}"
                </p>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-5 text-xs text-amber-800">
                  ℹ️ The destination will be hidden from the public directory and map.
                  User favorites and reviews remain intact. You can restore it
                  anytime from the "Archived" filter.
                </div>
              </>
            )}

            {confirmAction.type === "restore" && (
              <>
                <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center text-3xl mx-auto mb-4">
                  ♻️
                </div>
                <h3 className="font-bold text-lg text-gray-900 text-center mb-2">
                  Restore this destination?
                </h3>
                <p className="text-sm text-gray-600 text-center mb-1">
                  You're about to make this public again:
                </p>
                <p className="text-base font-semibold text-gray-900 text-center mb-4">
                  "{confirmAction.name}"
                </p>
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 mb-5 text-xs text-emerald-800">
                  ✅ The destination will reappear on the public directory and map.
                </div>
              </>
            )}

            {confirmAction.type === "delete" && (
              <>
                <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center text-3xl mx-auto mb-4">
                  ⚠️
                </div>
                <h3 className="font-bold text-lg text-gray-900 text-center mb-2">
                  Permanently delete?
                </h3>
                <p className="text-sm text-gray-600 text-center mb-1">
                  This will permanently delete:
                </p>
                <p className="text-base font-semibold text-gray-900 text-center mb-4">
                  "{confirmAction.name}"
                </p>
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 text-xs text-red-800">
                  🔥 <strong>This cannot be undone.</strong> The destination document
                  will be erased from the database. Reviews and favorites pointing
                  to it will become orphaned. Consider archiving instead.
                </div>
                <div className="mb-4">
                  <label className="text-xs font-semibold text-gray-700 block mb-1">
                    To confirm, type the destination name:
                  </label>
                  <input
                    type="text"
                    value={typedConfirmation}
                    onChange={(e) => setTypedConfirmation(e.target.value)}
                    placeholder={confirmAction.name}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 text-sm focus:border-red-500 focus:ring-2 focus:ring-red-100"
                  />
                </div>
              </>
            )}

            {errorMsg && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm mb-4">
                {errorMsg}
              </div>
            )}

            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3">
              <button
                onClick={() => setConfirmAction(null)}
                disabled={processing}
                className="flex-1 px-5 py-2.5 rounded-xl border border-gray-300 bg-white text-gray-700 font-semibold hover:bg-gray-50 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={processing || (confirmAction.type === "delete" && typedConfirmation !== confirmAction.name)}
                className={`flex-1 px-5 py-2.5 rounded-xl text-white font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                  confirmAction.type === "archive"
                    ? "bg-amber-600 hover:bg-amber-700"
                    : confirmAction.type === "restore"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {processing ? (
                  <>
                    <span className="animate-spin">⏳</span> Processing...
                  </>
                ) : confirmAction.type === "archive" ? (
                  "Yes, archive"
                ) : confirmAction.type === "restore" ? (
                  "Yes, restore"
                ) : (
                  "Permanently delete"
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  )
}

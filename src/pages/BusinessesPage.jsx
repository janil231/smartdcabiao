import { Link, useNavigate } from 'react-router-dom'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import LoginModal from '../components/Auth/LoginModal'
import FavoriteButton from '../components/FavoriteButton'
import PhotoCarousel from '../components/PhotoCarousel'
import Reveal from '../components/animations/Reveal'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import { getBusinessImages } from '../utils/placeImages'
import { BUSINESS_TYPES } from '../data'
import { isMasterAdmin } from '../services/adminRole.service'
import { logAudit } from '../services/audit.service'
import {
  archiveBusiness,
  restoreBusiness,
  permanentlyDeleteBusiness,
  isStaticBusiness,
} from '../services/businesses.service'
import { getBusinessIdsWithActiveQuests } from '../services/ownerQuests.service'

const TYPE_STYLES = {
  [BUSINESS_TYPES.restaurant]: 'bg-amber-500/10 text-amber-700 border-amber-200',
  [BUSINESS_TYPES.shop]: 'bg-blue-500/10 text-blue-700 border-blue-200',
  [BUSINESS_TYPES.attraction]: 'bg-emerald-500/10 text-emerald-700 border-emerald-200',
}

function BusinessCard({ business, isMaster, onAction, hasReward }) {
  const categoryStyle = TYPE_STYLES[business.type] || 'bg-gray-100 text-gray-700 border-gray-200'
  const isArchived = business.isActive === false

  return (
    <article className={`flex flex-col overflow-hidden rounded-xl border bg-white shadow-sm transition-all duration-200 ease-out hover:shadow-md hover:-translate-y-0.5 ${
      isArchived ? 'opacity-60 ring-2 ring-amber-200 border-amber-200' : 'border-gray-200'
    }`}>
      <div className="relative aspect-video w-full overflow-hidden">
        <PhotoCarousel images={getBusinessImages(business)} alt={business.name} mode="card" className="h-full w-full" />

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
                    onAction({ type: "archive", id: business.id, name: business.name, item: business });
                  }}
                  className="w-9 h-9 rounded-full bg-white/95 backdrop-blur shadow-md hover:bg-amber-50 hover:shadow-lg flex items-center justify-center text-amber-600 hover:text-amber-700 transition"
                  title="Archive this business (hide from public)"
                  aria-label={`Archive ${business.name}`}
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
                    onAction({ type: "restore", id: business.id, name: business.name, item: business });
                  }}
                  className="w-9 h-9 rounded-full bg-white/95 backdrop-blur shadow-md hover:bg-emerald-50 hover:shadow-lg flex items-center justify-center text-emerald-600 hover:text-emerald-700 transition"
                  title="Restore this business (make public again)"
                  aria-label={`Restore ${business.name}`}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="1 4 1 10 7 10" />
                    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                  </svg>
                </button>
                {!isStaticBusiness(business) && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      onAction({ type: "delete", id: business.id, name: business.name, item: business });
                    }}
                    className="w-9 h-9 rounded-full bg-white/95 backdrop-blur shadow-md hover:bg-red-50 hover:shadow-lg flex items-center justify-center text-red-600 hover:text-red-700 transition"
                    title="Permanently delete (cannot be undone)"
                    aria-label={`Permanently delete ${business.name}`}
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

        {business.isActive === false && isMaster && isStaticBusiness(business) && (
          <div className="absolute bottom-2 left-2 right-2 z-10 bg-amber-50/95 backdrop-blur border border-amber-200 rounded-lg px-2.5 py-1.5 text-[10px] text-amber-800 font-medium leading-tight">
            Built-in sample &mdash; archive only (cannot delete)
          </div>
        )}

        {hasReward && (
          <div className="absolute top-3 left-3 z-10">
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600/95 backdrop-blur-sm px-2.5 py-1 text-xs font-bold text-white shadow-lg">
              🎁 Reward
            </span>
          </div>
        )}
        <div className="absolute top-3 right-3">
          <FavoriteButton 
            item={{ ...business, type: business.type }}
            size="sm"
            className="bg-white/90 backdrop-blur-sm"
          />
        </div>
      </div>
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <span
          className={`inline-block w-fit rounded border px-2 py-0.5 text-xs font-medium uppercase tracking-wider ${categoryStyle}`}
        >
          {business.category}
        </span>
        <Link
          to={`/businesses/${business.id}`}
          className="mt-2 block"
        >
          <h2 className="text-lg font-semibold text-gray-900 hover:text-emerald-600 transition">{business.name}</h2>
        </Link>
        <p className="mt-2 flex-1 text-sm text-gray-600 line-clamp-2 sm:line-clamp-3">{business.description}</p>
        <div className="mt-4 flex flex-col sm:flex-row gap-2 sm:gap-2">
            <Link
              to={`/businesses/${business.id}`}
              className="w-full sm:flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 h-11 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-200 ease-out hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 active:scale-[0.98]"
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
            to={`/map?focus=${business.id}`}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white h-11 px-4 py-2.5 text-sm font-medium text-gray-700 transition-all duration-200 ease-out hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 active:scale-[0.98]"
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

const FILTER_OPTIONS = [
  { value: 'all', label: 'All Businesses' },
  { value: BUSINESS_TYPES.restaurant, label: 'Restaurants' },
  { value: BUSINESS_TYPES.shop, label: 'Shops' },
  { value: BUSINESS_TYPES.attraction, label: 'Attractions' },
]

export default function BusinessesPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { t } = useLanguage()
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [filter, setFilter] = useState('all')
  const [businesses, setBusinesses] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [isMaster, setIsMaster] = useState(false)
  const [archiveFilter, setArchiveFilter] = useState("active")
  const [confirmAction, setConfirmAction] = useState(null)
  const [processing, setProcessing] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")
  const [typedConfirmation, setTypedConfirmation] = useState("")
  const [rewardBusinessIds, setRewardBusinessIds] = useState(null)
  const [showRewardsOnly, setShowRewardsOnly] = useState(false)

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
    () => businesses.filter((b) => b.isActive !== false).length,
    [businesses]
  );

  const archivedCount = useMemo(
    () => businesses.filter((b) => b.isActive === false).length,
    [businesses]
  );

  const handleConfirm = async () => {
    if (!confirmAction) return;
    setProcessing(true);
    setErrorMsg("");

    try {
      if (confirmAction.type === "archive") {
        await archiveBusiness(confirmAction.id, user.uid, "", confirmAction.item || null);
        await logAudit({
          action: "archive_business",
          targetType: "business",
          targetId: confirmAction.id,
          adminUid: user.uid,
          meta: { name: confirmAction.name },
        });
        setBusinesses((prev) =>
          prev.map((b) =>
            b.id === confirmAction.id
              ? { ...b, isActive: false, archivedAt: new Date(), archivedBy: user.uid }
              : b
          )
        );
      } else if (confirmAction.type === "restore") {
        await restoreBusiness(confirmAction.id);
        await logAudit({
          action: "restore_business",
          targetType: "business",
          targetId: confirmAction.id,
          adminUid: user.uid,
          meta: { name: confirmAction.name },
        });
        setBusinesses((prev) =>
          prev.map((b) =>
            b.id === confirmAction.id
              ? { ...b, isActive: true, archivedAt: null, archivedBy: null }
              : b
          )
        );
      } else if (confirmAction.type === "delete") {
        if (typedConfirmation !== confirmAction.name) {
          setErrorMsg("Typed name doesn't match. Please type the exact business name to confirm.");
          setProcessing(false);
          return;
        }
        const businessData = confirmAction.item || businesses.find((b) => String(b.id) === String(confirmAction.id));
        await permanentlyDeleteBusiness(confirmAction.id, businessData);
        await logAudit({
          action: "permanently_delete_business",
          targetType: "business",
          targetId: confirmAction.id,
          adminUid: user.uid,
          meta: { name: confirmAction.name },
        });
        setBusinesses((prev) => prev.filter((b) => b.id !== confirmAction.id));
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

  const handleAddBusiness = () => {
    if (user) {
      navigate('/register-business')
    } else {
      setAuthModalOpen(true)
    }
  }

  const loadBusinesses = useCallback(async () => {
    try {
      setLoading(true)
      const { listBusinesses } = await import('../services/businesses.service')
      const { data } = await listBusinesses()
      setBusinesses(data)
    } catch {
      // Silent fallback
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadBusinesses()
  }, [loadBusinesses])

  useEffect(() => {
    getBusinessIdsWithActiveQuests().then(setRewardBusinessIds).catch(() => {})
  }, [])

  const filteredBusinesses = useMemo(() => {
    let list = businesses

    if (!isMaster) {
      list = list.filter((b) => b.isActive !== false);
    } else {
      if (archiveFilter === "active") {
        list = list.filter((b) => b.isActive !== false);
      } else if (archiveFilter === "archived") {
        list = list.filter((b) => b.isActive === false);
      }
    }

    if (filter !== 'all') {
      list = list.filter(b => b.type === filter)
    }

    const q = searchQuery.trim().toLowerCase()
    if (q) {
      list = list.filter(b => {
        const haystack = [
          b.name,
          b.description,
          b.category,
          b.barangay,
          b.address,
        ].filter(Boolean).join(' ').toLowerCase()
        return haystack.includes(q)
      })
    }

    if (showRewardsOnly && rewardBusinessIds) {
      list = list.filter(b => rewardBusinessIds.has(String(b.id)))
    }

    return list
  }, [businesses, filter, searchQuery, isMaster, archiveFilter, showRewardsOnly, rewardBusinessIds])

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 pb-mobile-nav">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="text-center sm:text-left">
          <Reveal delay={0}>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Local Businesses
            </h1>
          </Reveal>
          <Reveal delay={80}>
            <p className="mt-2 sm:mt-3 max-w-2xl text-base sm:text-lg text-gray-600">
              Discover shops, restaurants, and attractions in Cabiao. Click "View on Map" to see a
              business location on the interactive map.
            </p>
          </Reveal>

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
          <Reveal delay={160}>
            <div className="mt-6 sm:mt-8 space-y-4 sticky top-[72px] sm:top-0 z-30 -mx-4 sm:mx-0 px-4 sm:px-0 py-3 sm:py-0 bg-white/95 sm:bg-transparent backdrop-blur-sm sm:backdrop-blur-none -top-3 sm:top-0">
              <div className="max-w-md relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search businesses..."
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
              {FILTER_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setFilter(option.value)}
                  className={`rounded-lg px-3 py-2 sm:px-4 sm:py-2 text-sm font-medium transition-all duration-200 ease-out active:scale-[0.98] h-11 ${
                    filter === option.value
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {option.label}
                </button>
              ))}
              <div className="w-px h-8 bg-gray-200 self-center" />
              <button
                type="button"
                onClick={() => setShowRewardsOnly(prev => !prev)}
                disabled={!rewardBusinessIds}
                className={`rounded-lg px-3 py-2 sm:px-4 sm:py-2 text-sm font-medium transition-all duration-200 ease-out active:scale-[0.98] h-11 ${
                  showRewardsOnly
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                🎁 Rewards
                {rewardBusinessIds && (
                  <span className={`ml-1.5 inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold ${
                    showRewardsOnly ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {rewardBusinessIds.size}
                  </span>
                )}
              </button>
            </div>
            </div>
          </Reveal>

          {/* Results Count */}
          <Reveal delay={240}>
            <div className="mt-4 sm:mt-6">
              <p className="text-sm text-gray-600">
              {loading ? 'Loading...' : (
                <>
                  {filteredBusinesses.length} {filteredBusinesses.length === 1 ? 'business' : 'businesses'} found
                  {searchQuery && ` for "${searchQuery}"`}
                  {filter !== 'all' && ` in ${FILTER_OPTIONS.find(f => f.value === filter)?.label.toLowerCase()}`}
                </>
              )}
              </p>
            </div>
          </Reveal>

          {/* Business Grid */}
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
          ) : filteredBusinesses.length > 0 ? (
            <div className="mt-6 sm:mt-10 grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {filteredBusinesses.map((business) => (
                <BusinessCard key={business.id} business={business} isMaster={isMaster} onAction={setConfirmAction} hasReward={rewardBusinessIds?.has(String(business.id))} />
              ))}
            </div>
          ) : (
            <div className="mt-6 sm:mt-10 text-center">
              <div className="rounded-lg bg-gray-50 px-6 py-12">
                <div className="text-5xl mb-3">🔍</div>
                <h3 className="text-lg font-semibold text-gray-800 mb-1">
                  No results found
                </h3>
                <p className="text-sm text-gray-500">
                  {searchQuery
                    ? `We couldn't find anything matching "${searchQuery}".`
                    : 'No businesses match the selected filter.'}
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  Try a different search or filter.
                </p>
                {(searchQuery || filter !== 'all') && (
                  <div className="mt-4 flex gap-3 justify-center">
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

          <Reveal delay={300}>
            <div className="mt-10 sm:mt-12 bg-emerald-50 border border-emerald-200 rounded-2xl p-6 sm:p-8 text-center">
              <div className="text-3xl mb-3">🏪</div>
              <h2 className="text-lg font-semibold text-gray-900">{t('registerBusiness.dontSeeYourBusiness')}</h2>
              <p className="text-sm text-gray-600 mt-2 max-w-md mx-auto">{t('registerBusiness.getListedCTA')}</p>
              <button
                type="button"
                onClick={handleAddBusiness}
                className="mt-5 inline-flex items-center px-5 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition"
              >
                + {t('registerBusiness.addYourBusiness')}
              </button>
            </div>
          </Reveal>
        </div>
        </div>
      </main>
      <Footer />
      <LoginModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />

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
                  Archive this business?
                </h3>
                <p className="text-sm text-gray-600 text-center mb-1">
                  You're about to hide:
                </p>
                <p className="text-base font-semibold text-gray-900 text-center mb-4">
                  "{confirmAction.name}"
                </p>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-5 text-xs text-amber-800">
                  ℹ️ The business will be hidden from the public directory and map.
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
                  Restore this business?
                </h3>
                <p className="text-sm text-gray-600 text-center mb-1">
                  You're about to make this public again:
                </p>
                <p className="text-base font-semibold text-gray-900 text-center mb-4">
                  "{confirmAction.name}"
                </p>
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 mb-5 text-xs text-emerald-800">
                  ✅ The business will reappear on the public directory and map.
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
                  🔥 <strong>This cannot be undone.</strong> The business document
                  will be erased from the database. Reviews and favorites pointing
                  to it will become orphaned. Consider archiving instead.
                </div>
                <div className="mb-4">
                  <label className="text-xs font-semibold text-gray-700 block mb-1">
                    To confirm, type the business name:
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

import { useEffect, useState, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'
import { useAuth } from '../../contexts/AuthContext'
import { isAdmin } from '../../services/adminRole.service'
import { getActiveSeason } from '../../services/seasons.service'
import { getBusinessById } from '../../services/businesses.service'
import {
  getPartnerInsights,
  summarizePartnerRedemptions,
} from '../../services/merchantInsights.service'
import { IMPACT_UNITS } from '../../services/leaderboard.service'

function anonymizeUserIdentifier(redemption) {
  const email = redemption.userEmail
  if (email && typeof email === 'string') {
    const [name, domain] = email.split('@')
    if (!domain) return 'User'
    const safePrefix = name.slice(0, 3) || 'user'
    return `${safePrefix}***@${domain}`
  }

  if (redemption.uid) {
    const suffix = String(redemption.uid).slice(-4).toUpperCase()
    return `User #${suffix}`
  }

  return 'User'
}

function formatDateTime(ts) {
  if (!ts) return '—'
  if (ts.toDate) {
    const d = ts.toDate()
    return d.toLocaleString()
  }
  try {
    const d = new Date(ts)
    return d.toLocaleString()
  } catch {
    return '—'
  }
}

export default function LGUMerchantInsightsPage() {
  const { user } = useAuth()
  const { businessId } = useParams()

  const [checkingAdmin, setCheckingAdmin] = useState(true)
  const [isUserAdmin, setIsUserAdmin] = useState(false)

  const [loading, setLoading] = useState(true)
  const [season, setSeason] = useState(null)
  const [business, setBusiness] = useState(null)
  const [partnerRedemptions, setPartnerRedemptions] = useState([])
  const [seasonImpactTotals, setSeasonImpactTotals] = useState({})
  const [partnerImpactTotals, setPartnerImpactTotals] = useState({})
  const [seasonTotalRedemptionsCount, setSeasonTotalRedemptionsCount] = useState(0)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function checkAdminStatus() {
      if (!user) {
        setCheckingAdmin(false)
        setIsUserAdmin(false)
        return
      }
      const adminStatus = await isAdmin(user.uid)
      setIsUserAdmin(adminStatus)
      setCheckingAdmin(false)
    }
    checkAdminStatus()
  }, [user])

  useEffect(() => {
    if (!user || !isUserAdmin || !businessId) return

    async function loadData() {
      setLoading(true)
      setError(null)
      try {
        const active = await getActiveSeason()
        setSeason(active)

        const biz = await getBusinessById(businessId)
        setBusiness(biz)

        if (active && biz) {
          const { partnerRedemptions: redemptions, seasonTotalRedemptionsCount: totalRedemptions, seasonImpactTotalsByUnit, partnerImpactTotalsByUnit } =
            await getPartnerInsights({
              seasonId: active.id,
              businessId: biz.id,
              partnerName: biz.name,
            })

          setPartnerRedemptions(redemptions || [])
          setSeasonTotalRedemptionsCount(totalRedemptions || 0)
          setSeasonImpactTotals(seasonImpactTotalsByUnit || {})
          setPartnerImpactTotals(partnerImpactTotalsByUnit || {})
        }
      } catch (err) {
        setError(err.message || 'Failed to load insights')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [user, isUserAdmin, businessId])

  const redemptionSummary = useMemo(
    () => summarizePartnerRedemptions(partnerRedemptions || []),
    [partnerRedemptions]
  )

  const sortedRedemptions = useMemo(() => {
    return [...(partnerRedemptions || [])].sort((a, b) => {
      const at = a.redeemedAt?.toDate?.() ?? new Date(0)
      const bt = b.redeemedAt?.toDate?.() ?? new Date(0)
      return bt - at
    })
  }, [partnerRedemptions])

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="flex-1 flex items-center justify-center px-4 py-20">
          <div className="text-center">
            <p className="text-gray-600 mb-4">Please sign in to access the LGU Dashboard.</p>
            <Link to="/" className="text-emerald-600 hover:underline">
              Go to Home
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  if (checkingAdmin) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="flex-1 flex items-center justify-center px-4 py-20">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-emerald-600 border-t-transparent" />
            <p className="text-gray-600 mt-2">Checking admin access...</p>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  if (!isUserAdmin) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="flex-1 flex items-center justify-center px-4 py-20">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
            <p className="text-gray-600 mb-4">You are not authorized to access this page.</p>
            <Link to="/" className="text-emerald-600 hover:underline">
              Back to Home
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="flex-1 pb-mobile-nav">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="mb-4">
            <Link to="/lgu/places" className="text-sm text-emerald-600 hover:underline">
              ← Back to Places
            </Link>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                Merchant Insights
              </h1>
              <p className="mt-1 text-gray-600 text-sm">
                Voucher performance and sustainability impact for this partner. User identifiers are
                anonymized for privacy.
              </p>
            </div>
            {season && (
              <div className="text-sm text-gray-600 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                <span className="font-medium text-emerald-800">Season:&nbsp;</span>
                <span className="font-semibold text-emerald-900">{season.name}</span>
                {season.startAt && season.endAt && (
                  <span className="text-emerald-700">
                    {' '}
                    ({new Date(season.startAt).toLocaleDateString()} -{' '}
                    {new Date(season.endAt).toLocaleDateString()})
                  </span>
                )}
              </div>
            )}
          </div>

          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {loading ? (
            <div className="text-center py-16">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-emerald-600 border-t-transparent" />
              <p className="text-gray-600 mt-2">Loading merchant insights…</p>
            </div>
          ) : !season ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800">
              No active season found. Activate a season to view voucher performance.
            </div>
          ) : !business ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
              Business not found.
            </div>
          ) : (
            <>
              <section className="mb-6">
                <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                  <h2 className="text-lg font-semibold text-gray-900 mb-1">
                    {business.name}
                  </h2>
                  <p className="text-sm text-gray-600 mb-1">
                    {business.category || 'Business partner'}
                  </p>
                  {business.address && (
                    <p className="text-sm text-gray-500">📍 {business.address}</p>
                  )}
                </div>
              </section>

              <section className="mb-8 grid gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                  <p className="text-xs font-medium text-emerald-800 uppercase">
                    Redeemed vouchers
                  </p>
                  <p className="mt-2 text-3xl font-bold text-emerald-900">
                    {redemptionSummary.totalRedeemed}
                  </p>
                </div>
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                  <p className="text-xs font-medium text-blue-800 uppercase">
                    Used in person
                  </p>
                  <p className="mt-2 text-3xl font-bold text-blue-900">
                    {redemptionSummary.totalUsed}
                  </p>
                </div>
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-xs font-medium text-amber-800 uppercase">
                    Not yet used
                  </p>
                  <p className="mt-2 text-3xl font-bold text-amber-900">
                    {redemptionSummary.totalUnused}
                  </p>
                </div>
              </section>

              <section className="mb-10 grid gap-6 lg:grid-cols-2">
                <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                  <h2 className="text-lg font-semibold text-gray-900 mb-1">
                    Impact Story (This Season)
                  </h2>
                  {Object.keys(partnerImpactTotals).length === 0 ? (
                    <p className="mt-2 text-sm text-gray-600">
                      No impact recorded yet for this partner. When vouchers are redeemed and quests
                      are completed, their share of the season&apos;s impact will appear here.
                    </p>
                  ) : (
                    <>
                      <p className="mt-2 text-sm text-gray-600">
                        This season, your voucher program helped support approximately:
                      </p>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        {Object.entries(partnerImpactTotals)
                          .filter(([, value]) => typeof value === 'number' && value > 0)
                          .map(([unit, value]) => {
                            const config =
                              IMPACT_UNITS.find(u => u.value === unit) || {
                                label: unit,
                                icon: '🌱',
                              }
                            const displayValue =
                              value >= 10 ? Math.round(value) : Math.round(value * 10) / 10
                            return (
                              <div
                                key={unit}
                                className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 flex items-center gap-3"
                              >
                                <span className="text-xl" aria-hidden="true">
                                  {config.icon}
                                </span>
                                <div>
                                  <p className="text-sm font-semibold text-gray-900">
                                    {displayValue}
                                  </p>
                                  <p className="text-xs text-gray-600">
                                    {config.label || unit}
                                  </p>
                                </div>
                              </div>
                            )
                          })}
                      </div>
                      {seasonTotalRedemptionsCount > 0 && (
                        <p className="mt-4 text-xs text-gray-500">
                          Estimated using this partner&apos;s share of all voucher redemptions this
                          season ({partnerRedemptions.length} of {seasonTotalRedemptionsCount}{' '}
                          total redemptions).
                        </p>
                      )}
                    </>
                  )}
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-semibold text-gray-900">
                      Redemption Timeline
                    </h2>
                    <span className="text-xs text-gray-500">
                      Latest first – identifiers anonymized
                    </span>
                  </div>

                  {sortedRedemptions.length === 0 ? (
                    <p className="text-sm text-gray-600">
                      No voucher redemptions recorded for this partner in the current season.
                    </p>
                  ) : (
                    <div className="max-h-80 overflow-y-auto divide-y divide-gray-200">
                      {sortedRedemptions.map(r => (
                        <div key={r.id} className="py-3 flex items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900">
                              {r.voucherSnapshot?.title || r.voucherId}
                            </p>
                            <p className="text-xs text-gray-500">
                              Redeemed: {formatDateTime(r.redeemedAt)}
                            </p>
                            {r.usedAt && (
                              <p className="text-xs text-gray-500">
                                Used: {formatDateTime(r.usedAt)}
                              </p>
                            )}
                            <p className="text-xs text-gray-500 mt-1">
                              User: {anonymizeUserIdentifier(r)}
                            </p>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${
                              r.status === 'used'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {r.status === 'used' ? 'Used' : 'Unused'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}


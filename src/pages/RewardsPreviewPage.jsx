import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { useAuth } from '../contexts/AuthContext'
import { getActiveSeason } from '../services/seasons.service'
import { listActiveQuests, recommendQuests } from '../services/quests.service'
import { getUserParticipations, expireMyStaleParticipations } from '../services/participations.service'
import { getMySeasonBalance } from '../services/seasonBalances.service'
import { listUserImpact, listSeasonImpact, sumImpactByUnit } from '../services/impactLedger.service'
import { listTopByPoints, listTopByImpact, IMPACT_UNITS } from '../services/leaderboard.service'
import { listSeasonVouchers } from '../services/vouchers.service'
import { listMyRedemptions } from '../services/voucherRedemptions.service'
import { computeBadges, getBadgePercentage } from '../features/badges/badgesEngine'
import BadgeCard from '../components/badges/BadgeCard'

const IMPACT_UNIT_CONFIG = {
  kg_trash: { label: 'Kg waste collected', icon: '🗑️' },
  trees: { label: 'Trees planted', icon: '🌳' },
  hours: { label: 'Volunteer hours', icon: '⏱️' },
  kg_plastic: { label: 'Kg plastic avoided', icon: '♻️' },
  co2_kg: { label: 'Kg CO₂ avoided', icon: '🌍' },
}

function SkeletonCard({ className = '' }) {
  return (
    <div className={`animate-pulse rounded-xl border border-gray-200 bg-gray-50 p-4 ${className}`}>
      <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
      <div className="h-8 bg-gray-200 rounded w-3/4"></div>
    </div>
  )
}

function RecommendedQuestCard({ quest, onJoin }) {
  const now = new Date()
  const endAt = quest.endAt ? new Date(quest.endAt) : null
  const slotsLeft = (quest.capacity || 0) - (quest.reservedCount || 0)

  const formatDeadline = () => {
    if (!endAt) return 'No deadline'
    const days = Math.ceil((endAt - now) / (1000 * 60 * 60 * 24))
    if (days <= 0) return 'Ended'
    if (days === 1) return 'Ends tomorrow'
    if (days <= 7) return `Ends in ${days} days`
    return `Ends ${endAt.toLocaleDateString()}`
  }

  return (
    <div className="rounded-xl border border-emerald-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">{quest.title}</h3>
          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{quest.description}</p>
        </div>
        <div className="shrink-0 text-right">
          <span className="text-lg font-bold text-emerald-600">+{quest.points}</span>
          <span className="text-xs text-gray-500 block">points</span>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
        <span>{formatDeadline()}</span>
        <span className={slotsLeft <= 5 ? 'text-amber-600' : ''}>{slotsLeft} slots left</span>
      </div>
      {quest.impact && (
        <div className="mt-2 inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full">
          <span>{IMPACT_UNIT_CONFIG[quest.impact.unit]?.icon || '🌱'}</span>
          <span>{quest.impact.label || quest.impact.unit}</span>
        </div>
      )}
      <button
        onClick={() => onJoin(quest.id)}
        className="mt-3 w-full py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors"
      >
        Join Quest
      </button>
    </div>
  )
}

function BadgeProgressCard({ badge, progress, onViewProfile }) {
  const percentage = getBadgePercentage(badge.id, { [badge.id]: progress })
  const isComplete = percentage >= 100

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-center gap-3">
        <div className="text-3xl">{badge.icon}</div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-gray-900">{badge.title}</h4>
          <p className="text-xs text-gray-500">{badge.description}</p>
        </div>
      </div>
      <div className="mt-3">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>{progress.current} / {progress.target}</span>
          <span>{percentage}%</span>
        </div>
        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-500 ${isComplete ? 'bg-emerald-500' : 'bg-amber-500'}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
      {!isComplete && (
        <button
          onClick={onViewProfile}
          className="mt-3 w-full py-2 border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50"
        >
          View Profile
        </button>
      )}
    </div>
  )
}

function VoucherNudgeBanner({ eligibleVouchers, pointsBalance, onGoToStore }) {
  if (eligibleVouchers.length === 0) return null

  const cheapest = eligibleVouchers.reduce((min, v) => 
    v.pointsCost < min.pointsCost ? v : min
  )

  return (
    <div className="rounded-xl border border-amber-300 bg-gradient-to-r from-amber-50 to-yellow-50 p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="text-2xl">🎟️</div>
        <div className="flex-1">
          <h3 className="font-semibold text-amber-900">
            You can redeem {eligibleVouchers.length} voucher{eligibleVouchers.length > 1 ? 's' : ''} now!
          </h3>
          <p className="text-sm text-amber-700 mt-1">
            Your {pointsBalance} points can get you <strong>{cheapest.title}</strong> for just {cheapest.pointsCost} points.
          </p>
          <button
            onClick={onGoToStore}
            className="mt-3 inline-flex items-center px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700"
          >
            Go to Voucher Store →
          </button>
        </div>
      </div>
    </div>
  )
}

export default function RewardsPreviewPage() {
  const { user } = useAuth()
  
  const [loading, setLoading] = useState(true)
  const [activeSeason, setActiveSeason] = useState(null)
  const [seasonBalance, setSeasonBalance] = useState(null)
  const [participations, setParticipations] = useState([])
  const [recommendedQuests, setRecommendedQuests] = useState([])
  const [seasonImpactTotals, setSeasonImpactTotals] = useState({})
  const [userImpactTotals, setUserImpactTotals] = useState({})
  const [redemptions, setRedemptions] = useState([])
  const [eligibleVouchers, setEligibleVouchers] = useState([])
  const [badgeData, setBadgeData] = useState({ earnedBadges: [], lockedBadges: [], progress: {} })
  
  const [leaderboardTab, setLeaderboardTab] = useState('points')
  const [leaderboardUnit, setLeaderboardUnit] = useState('trees')
  const [leaderboardData, setLeaderboardData] = useState([])
  const [leaderboardLoading, setLeaderboardLoading] = useState(false)
  const [showFullLeaderboard, setShowFullLeaderboard] = useState(false)

  const completedCount = useMemo(() => 
    participations.filter(p => p.status === 'completed').length
  , [participations])

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      try {
        const season = await getActiveSeason()
        
        if (!season) {
          setActiveSeason(null)
          setLoading(false)
          return
        }

        setActiveSeason(season)

        if (!user) {
          setLoading(false)
          return
        }

        await expireMyStaleParticipations(user.uid)

        const [
          balance,
          userParts,
          seasonImpactEntries,
          userImpactEntries,
          seasonVouchers,
          userRedemptions,
        ] = await Promise.all([
          getMySeasonBalance(season.id, user.uid),
          getUserParticipations(user.uid),
          listSeasonImpact(season.id),
          listUserImpact({ uid: user.uid, seasonId: season.id }),
          listSeasonVouchers(season.id),
          listMyRedemptions(season.id, user.uid),
        ])

        setSeasonBalance(balance)
        setParticipations(userParts)
        setSeasonImpactTotals(sumImpactByUnit(seasonImpactEntries))
        setUserImpactTotals(sumImpactByUnit(userImpactEntries))
        setRedemptions(userRedemptions)

        const quests = await listActiveQuests(season.id)

        const recommended = recommendQuests({ quests, participations: userParts, limit: 2 })
        setRecommendedQuests(recommended)

        const points = balance?.pointsEarned || 0
        const impactTotals = sumImpactByUnit(userImpactEntries)
        
        const computed = computeBadges({
          pointsTotal: points,
          completedCount: userParts.filter(p => p.status === 'completed').length,
          impactTotalsByUnit: impactTotals,
          reviewsCount: 0,
          favoritesCount: 0,
        })
        setBadgeData(computed)

        if (balance?.pointsBalance > 0) {
          const now = new Date()
          const eligible = seasonVouchers.filter(v => {
            if (!v.isActive) return false
            if (v.stockRemaining <= 0) return false
            if (v.pointsCost > balance.pointsBalance) return false
            
            if (v.expiresAt) {
              const expiry = v.expiresAt.toDate ? v.expiresAt.toDate() : new Date(v.expiresAt)
              if (expiry < now) return false
            }
            return true
          })
          setEligibleVouchers(eligible)
        }

      } catch (error) {
        console.error('Error loading rewards data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [user])

  useEffect(() => {
    async function loadLeaderboard() {
      if (!activeSeason) {
        setLeaderboardData([])
        return
      }

      setLeaderboardLoading(true)
      try {
        const limit = showFullLeaderboard ? 10 : 5
        let data
        if (leaderboardTab === 'points') {
          data = await listTopByPoints(activeSeason.id, limit)
        } else {
          data = await listTopByImpact(activeSeason.id, leaderboardUnit, limit)
        }
        setLeaderboardData(data || [])
      } catch (error) {
        console.error('Error loading leaderboard:', error)
        setLeaderboardData([])
      } finally {
        setLeaderboardLoading(false)
      }
    }

    loadLeaderboard()
  }, [activeSeason, leaderboardTab, leaderboardUnit, showFullLeaderboard])

  const getSeasonCountdown = () => {
    if (!activeSeason?.endAt) return ''
    const endDate = new Date(activeSeason.endAt)
    const now = new Date()
    const daysLeft = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24))
    if (daysLeft <= 0) return 'Season ended'
    return `${daysLeft} day${daysLeft > 1 ? 's' : ''} left`
  }

  const handleJoinQuest = (questId) => {
    window.location.href = `/events?focusQuestId=${questId}`
  }

  const unusedVouchersCount = useMemo(() => 
    redemptions.filter(r => r.status === 'unused').length
  , [redemptions])

  const redeemedVouchersCount = redemptions.length

  const topEarnedBadges = badgeData.earnedBadges.slice(0, 3)
  const nextLockedBadge = badgeData.lockedBadges[0]

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 pb-20 md:pb-0">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Rewards Home
            </h1>
            <p className="mt-3 max-w-2xl text-lg text-gray-600">
              Track your progress, earn points, and redeem rewards!
            </p>
          </div>

          {!user && (
            <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-5 text-amber-800">
              <p className="font-medium">Preview Mode</p>
              <p className="mt-1 text-sm">Log in to track your personal rewards, points, and progress.</p>
              <Link to="/login" className="mt-3 inline-block px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm font-medium">
                Log In
              </Link>
            </div>
          )}

          {activeSeason && (
            <div className="mb-6 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-emerald-800 font-medium">Season: </span>
                  <strong className="text-emerald-900">{activeSeason.name}</strong>
                </div>
                <span className="text-sm font-medium text-emerald-700">
                  {getSeasonCountdown()}
                </span>
              </div>
            </div>
          )}

          {loading && user ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : (
            <>
              <section className="mb-8">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Season Overview</h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-4">
                    <p className="text-sm font-medium text-amber-800">Available Points</p>
                    <p className="mt-1 text-3xl font-bold text-amber-900">
                      {seasonBalance?.pointsBalance ?? 0}
                    </p>
                    <p className="mt-1 text-xs text-amber-700">
                      Earned: {seasonBalance?.pointsEarned ?? 0} • Spent: {seasonBalance?.pointsSpent ?? 0}
                    </p>
                  </div>
                  <div className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 p-4">
                    <p className="text-sm font-medium text-emerald-800">My Vouchers</p>
                    <p className="mt-1 text-3xl font-bold text-emerald-900">
                      {redeemedVouchersCount}
                    </p>
                    <p className="mt-1 text-xs text-emerald-700">
                      {unusedVouchersCount} unused
                    </p>
                  </div>
                  <div className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
                    <p className="text-sm font-medium text-blue-800">Quests Completed</p>
                    <p className="mt-1 text-3xl font-bold text-blue-900">
                      {completedCount}
                    </p>
                    <p className="mt-1 text-xs text-blue-700">This season</p>
                  </div>
                  <div className="rounded-xl border border-purple-200 bg-gradient-to-br from-purple-50 to-fuchsia-50 p-4">
                    <p className="text-sm font-medium text-purple-800">Badges Earned</p>
                    <p className="mt-1 text-3xl font-bold text-purple-900">
                      {badgeData.earnedBadges.length}
                    </p>
                    <p className="mt-1 text-xs text-purple-700">
                      {badgeData.lockedBadges.length} more available
                    </p>
                  </div>
                </div>
              </section>

              <section className="mb-8">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Impact</h2>
                {user && Object.keys(userImpactTotals).length > 0 ? (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {Object.entries(userImpactTotals).slice(0, 4).map(([unit, amount]) => {
                      const config = IMPACT_UNIT_CONFIG[unit] || { label: unit, icon: '🌱' }
                      return (
                        <div key={unit} className="rounded-lg border border-gray-200 bg-white p-3 flex items-center gap-3">
                          <span className="text-xl">{config.icon}</span>
                          <div>
                            <p className="text-xs text-gray-500">{config.label}</p>
                            <p className="font-bold text-gray-900">{amount}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">
                    Complete quests to see your environmental impact.
                  </p>
                )}
              </section>

              {user && eligibleVouchers.length > 0 && (
                <section className="mb-8">
                  <VoucherNudgeBanner
                    eligibleVouchers={eligibleVouchers}
                    pointsBalance={seasonBalance?.pointsBalance ?? 0}
                    onGoToStore={() => window.location.href = '/vouchers'}
                  />
                </section>
              )}

              {user && recommendedQuests.length > 0 && (
                <section className="mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">Next Best Actions</h2>
                    <Link to="/events" className="text-sm text-emerald-600 hover:text-emerald-700">
                      View all →
                    </Link>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {recommendedQuests.map(quest => (
                      <RecommendedQuestCard
                        key={quest.id}
                        quest={quest}
                        onJoin={handleJoinQuest}
                      />
                    ))}
                  </div>
                </section>
              )}

              {user && (
                <section className="mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">Badge Progress</h2>
                    <Link to="/profile" className="text-sm text-emerald-600 hover:text-emerald-700">
                      View all →
                    </Link>
                  </div>
                  
                  {topEarnedBadges.length > 0 && (
                    <div className="mb-4">
                      <p className="text-sm text-gray-500 mb-2">Your Badges</p>
                      <div className="flex gap-3">
                        {topEarnedBadges.map(badge => (
                          <div key={badge.id} className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2">
                            <span className="text-xl">{badge.icon}</span>
                            <span className="text-sm font-medium text-yellow-900">{badge.title}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {nextLockedBadge && badgeData.progress[nextLockedBadge.id] && (
                    <div>
                      <p className="text-sm text-gray-500 mb-2">Next Badge</p>
                      <div className="max-w-md">
                        <BadgeProgressCard
                          badge={nextLockedBadge}
                          progress={badgeData.progress[nextLockedBadge.id]}
                          onViewProfile={() => window.location.href = '/profile'}
                        />
                      </div>
                    </div>
                  )}

                  {badgeData.earnedBadges.length === 0 && badgeData.lockedBadges.length === 0 && (
                    <p className="text-sm text-gray-500">Complete quests to earn badges!</p>
                  )}
                </section>
              )}

              {activeSeason && (
                <section className="mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">Community Leaderboard</h2>
                    <button
                      onClick={() => setShowFullLeaderboard(!showFullLeaderboard)}
                      className="text-sm text-emerald-600 hover:text-emerald-700"
                    >
                      {showFullLeaderboard ? 'Show less' : 'View more'}
                    </button>
                  </div>

                  <div className="mb-3 flex gap-2 flex-wrap">
                    <button
                      onClick={() => setLeaderboardTab('points')}
                      className={`px-3 py-1.5 rounded-lg font-medium text-sm transition ${
                        leaderboardTab === 'points'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      Points
                    </button>
                    {IMPACT_UNITS.slice(0, 3).map(unit => (
                      <button
                        key={unit.value}
                        onClick={() => { setLeaderboardTab('impact'); setLeaderboardUnit(unit.value) }}
                        className={`px-3 py-1.5 rounded-lg font-medium text-sm transition ${
                          leaderboardTab === 'impact' && leaderboardUnit === unit.value
                            ? 'bg-emerald-600 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {unit.icon} {unit.label}
                      </button>
                    ))}
                  </div>

                  {leaderboardLoading ? (
                    <div className="space-y-2">
                      {[...Array(5)].map((_, i) => <SkeletonCard key={i} className="h-14" />)}
                    </div>
                  ) : leaderboardData.length === 0 ? (
                    <p className="text-gray-500 text-sm">No leaderboard data yet. Complete quests to appear here!</p>
                  ) : (
                    <div className="space-y-2">
                      {leaderboardData.map(entry => (
                        <div
                          key={entry.uid}
                          className={`flex items-center gap-3 p-3 rounded-lg ${
                            entry.uid === user?.uid ? 'bg-emerald-50 border border-emerald-200' : 'bg-gray-50'
                          }`}
                        >
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${
                            entry.rank <= 3 ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-200 text-gray-600'
                          }`}>
                            {entry.rank}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 truncate">
                              {entry.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {entry.completedQuestsCount} quest{entry.completedQuestsCount !== 1 ? 's' : ''}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-gray-900">
                              {leaderboardTab === 'points' ? `${entry.pointsTotal} pts` : entry.impact}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              )}

              {activeSeason && Object.keys(seasonImpactTotals).length > 0 && (
                <section className="mb-8">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Season Impact</h2>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {Object.entries(seasonImpactTotals).slice(0, 4).map(([unit, amount]) => {
                      const config = IMPACT_UNIT_CONFIG[unit] || { label: unit, icon: '🌱' }
                      return (
                        <div key={unit} className="rounded-lg border border-gray-200 bg-white p-3 flex items-center gap-3">
                          <span className="text-xl">{config.icon}</span>
                          <div>
                            <p className="text-xs text-gray-500">{config.label}</p>
                            <p className="font-bold text-gray-900">{amount}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}

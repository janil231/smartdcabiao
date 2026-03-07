import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { useAuth } from '../contexts/AuthContext'
import { getActiveSeason } from '../services/seasons.service'
import { getQuestById } from '../services/quests.service'
import { getUserParticipations, expireMyStaleParticipations } from '../services/participations.service'
import { getUserSeasonPointsSummary } from '../services/pointsLedger.service'
import { getMySeasonBalance } from '../services/seasonBalances.service'
import { listUserImpact, listSeasonImpact, sumImpactByUnit } from '../services/impactLedger.service'
import { listTopByPoints, listTopByImpact, IMPACT_UNITS } from '../services/leaderboard.service'
import { participation as mockParticipation, rewardTotals as mockRewardTotals } from '../data'

const STATUS_CONFIG = {
  joined: { style: 'bg-amber-100 text-amber-800 border-amber-200', label: 'Pending', icon: '⏳' },
  completed: { style: 'bg-emerald-100 text-emerald-800 border-emerald-200', label: 'Completed', icon: '✅' },
  expired: { style: 'bg-red-100 text-red-800 border-red-200', label: 'Expired', icon: '❌' },
  cancelled: { style: 'bg-gray-100 text-gray-800 border-gray-200', label: 'Cancelled', icon: '🚫' },
}

function ParticipationCard({ participation, questTitle, points, onGoToQuest }) {
  const statusConfig = STATUS_CONFIG[participation.status] || STATUS_CONFIG.cancelled

  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const joinedDate = participation.joinedAt ? formatDate(participation.joinedAt) : ''
  const completedDate = participation.completedAt ? formatDate(participation.completedAt) : ''
  const expiresDate = participation.expiresAt ? formatDate(participation.expiresAt) : ''

  const isPending = participation.status === 'joined'
  const isReleased = participation.rewardStatus === 'released'

  return (
    <article className="flex flex-col rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">{questTitle || 'Unknown Quest'}</h3>
          <p className="mt-1 text-sm text-gray-500">
            {joinedDate && `Joined: ${joinedDate}`}
            {completedDate && ` • Completed: ${completedDate}`}
            {!completedDate && expiresDate && isPending && ` • Expires: ${expiresDate}`}
          </p>
        </div>
        <span className={`shrink-0 inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium ${statusConfig.style}`}>
          {statusConfig.icon} {statusConfig.label}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {isReleased ? (
          <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2">
            <span className="text-emerald-700 font-bold text-lg">+{points || 0}</span>
            <span className="text-emerald-600 text-sm">points released</span>
          </div>
        ) : isPending ? (
          <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
            <span className="text-amber-700 font-medium">Pending</span>
            <span className="text-amber-600 text-sm">{points || 0} points</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-lg bg-gray-50 border border-gray-200 px-3 py-2">
            <span className="text-gray-500 text-sm">
              {participation.status === 'expired' ? 'No points (expired)' : 'No points'}
            </span>
          </div>
        )}
      </div>

      {isPending && (
        <div className="mt-4">
          <button
            onClick={() => onGoToQuest(participation.questId)}
            className="text-sm font-medium text-emerald-600 hover:text-emerald-700"
          >
            → Go to quest
          </button>
        </div>
      )}
    </article>
  )
}

function MockRewardCard({ entry }) {
  const statusConfig = STATUS_CONFIG[entry.status] || STATUS_CONFIG.cancelled

  return (
    <article className="flex flex-col rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">{entry.activityName}</h3>
          <p className="mt-1 text-sm text-gray-500">{entry.date}</p>
        </div>
        <span className={`shrink-0 inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium ${statusConfig.style}`}>
          {statusConfig.icon} {statusConfig.label}
        </span>
      </div>
      <div className="mt-4">
        <div className="rounded-lg bg-gray-50 border border-gray-200 px-3 py-2">
          <span className="text-gray-600 text-sm">{entry.rewardLabel || 'Sample reward'}</span>
        </div>
      </div>
    </article>
  )
}

export default function RewardsPreviewPage() {
  const { user } = useAuth()
  const [participations, setParticipations] = useState([])
  const [questTitles, setQuestTitles] = useState({})
  const [totalPoints, setTotalPoints] = useState(0)
  const [loading, setLoading] = useState(false)
  const [activeSeason, setActiveSeason] = useState(null)
  const [useMockData, setUseMockData] = useState(false)
  const [seasonImpactTotals, setSeasonImpactTotals] = useState({})
  const [userImpactTotals, setUserImpactTotals] = useState({})
  const [leaderboardTab, setLeaderboardTab] = useState('points')
  const [leaderboardUnit, setLeaderboardUnit] = useState('trees')
  const [leaderboardData, setLeaderboardData] = useState([])
  const [leaderboardLoading, setLeaderboardLoading] = useState(false)
  const [seasonBalance, setSeasonBalance] = useState(null)

  useEffect(() => {
    async function loadData() {
      if (!user) {
        setUseMockData(true)
        return
      }
      
      setLoading(true)
      try {
        const season = await getActiveSeason()
        
        if (season) {
          setActiveSeason(season)
          const summary = await getUserSeasonPointsSummary(user.uid, season.id)
          setTotalPoints(summary.totalPoints)

          const userParts = await getUserParticipations(user.uid)
          setParticipations(userParts)

          await expireMyStaleParticipations(user.uid)
          const refreshedParts = await getUserParticipations(user.uid)
          setParticipations(refreshedParts)

          const titlePromises = userParts.map(async (p) => {
            if (p.questId) {
              try {
                const quest = await getQuestById(p.questId)
                return { [p.questId]: quest?.title || 'Quest' }
              } catch {
                return { [p.questId]: 'Quest' }
              }
            }
            return {}
          })
          
          const titleResults = await Promise.all(titlePromises)
          const titles = Object.assign({}, ...titleResults)
          setQuestTitles(titles)

          const [seasonImpactEntries, userImpactEntries, balance] = await Promise.all([
            listSeasonImpact(season.id),
            listUserImpact({ uid: user.uid, seasonId: season.id }),
            getMySeasonBalance(season.id, user.uid)
          ])
          setSeasonImpactTotals(sumImpactByUnit(seasonImpactEntries))
          setUserImpactTotals(sumImpactByUnit(userImpactEntries))
          setSeasonBalance(balance)
        } else {
          setUseMockData(true)
        }
      } catch {
        setUseMockData(true)
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
        let data
        if (leaderboardTab === 'points') {
          data = await listTopByPoints(activeSeason.id, 10)
        } else {
          data = await listTopByImpact(activeSeason.id, leaderboardUnit, 10)
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
  }, [activeSeason, leaderboardTab, leaderboardUnit])

  const sortedParticipations = useMemo(() => {
    return [...participations].sort((a, b) => {
      const dateA = new Date(b.joinedAt || 0)
      const dateB = new Date(a.joinedAt || 0)
      return dateA - dateB
    })
  }, [participations])

  const stats = useMemo(() => {
    const pending = participations.filter(p => p.status === 'joined').length
    const completed = participations.filter(p => p.status === 'completed').length
    const released = participations.filter(p => p.rewardStatus === 'released').length
    const expired = participations.filter(p => p.status === 'expired' || p.status === 'cancelled').length
    return { pending, completed, released, expired }
  }, [participations])

  const getSeasonCountdown = () => {
    if (!activeSeason?.endAt) return ''
    const endDate = new Date(activeSeason.endAt)
    const now = new Date()
    const daysLeft = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24))
    if (daysLeft <= 0) return 'Season ended'
    return `Ends in ${daysLeft} day${daysLeft > 1 ? 's' : ''}`
  }

  const IMPACT_UNIT_CONFIG = {
    kg_trash: { label: 'Kg of waste collected', icon: '🗑️' },
    trees: { label: 'Trees planted', icon: '🌳' },
    hours: { label: 'Volunteer hours', icon: '⏱️' },
    kg_plastic: { label: 'Kg of plastic avoided', icon: '♻️' },
    co2_kg: { label: 'Kg of CO₂ avoided', icon: '🌍' },
  }

  const handleGoToQuest = (questId) => {
    window.location.href = `/events?focusQuestId=${questId}`
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 pb-20 md:pb-0">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Rewards & Participation
            </h1>
            <p className="mt-3 max-w-2xl text-lg text-gray-600">
              Track your quest participation and rewards. Complete quests to earn points!
            </p>
          </div>

          {activeSeason && (
            <div className="mb-6 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-emerald-800 font-medium">Season: </span>
                  <strong className="text-emerald-900">{activeSeason.name}</strong>
                  {activeSeason.startAt && activeSeason.endAt && (
                    <span className="text-emerald-600 ml-2">
                      ({new Date(activeSeason.startAt).toLocaleDateString()} - {new Date(activeSeason.endAt).toLocaleDateString()})
                    </span>
                  )}
                </div>
                <span className="text-sm font-medium text-emerald-700">
                  {getSeasonCountdown()}
                </span>
              </div>
            </div>
          )}

          {activeSeason && !useMockData && (
            <div className="mb-8 grid gap-6 lg:grid-cols-2">
              <section>
                <h2 className="text-lg font-semibold text-gray-900">This Season&apos;s Impact</h2>
                <p className="mt-1 text-sm text-gray-600">
                  Total environmental impact from all completed quests this season.
                </p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {Object.keys(seasonImpactTotals).length === 0 && (
                    <p className="text-sm text-gray-500">No impact recorded yet. Approve completed quests to start tracking.</p>
                  )}
                  {Object.entries(seasonImpactTotals).map(([unit, amount]) => {
                    const config = IMPACT_UNIT_CONFIG[unit] || { label: unit, icon: '🌱' }
                    return (
                      <div
                        key={unit}
                        className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 p-4 flex items-center gap-3"
                      >
                        <div className="text-2xl" aria-hidden="true">{config.icon}</div>
                        <div>
                          <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
                            {config.label}
                          </p>
                          <p className="mt-1 text-2xl font-bold text-emerald-900">
                            {amount}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-gray-900">Your Contribution</h2>
                <p className="mt-1 text-sm text-gray-600">
                  How your completed quests add up for this season.
                </p>
                {!user && (
                  <p className="mt-3 text-sm text-gray-500">
                    Login to track your personal contribution.
                  </p>
                )}
                {user && (
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    {Object.keys(userImpactTotals).length === 0 && (
                      <p className="text-sm text-gray-500 col-span-full">
                        Complete quests and have them verified by an LGU admin to see your impact here.
                      </p>
                    )}
                    {Object.entries(userImpactTotals).map(([unit, amount]) => {
                      const config = IMPACT_UNIT_CONFIG[unit] || { label: unit, icon: '🌱' }
                      return (
                        <div
                          key={unit}
                          className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-4 flex items-center gap-3"
                        >
                          <div className="text-2xl" aria-hidden="true">{config.icon}</div>
                          <div>
                            <p className="text-xs font-medium uppercase tracking-wide text-blue-700">
                              {config.label}
                            </p>
                            <p className="mt-1 text-2xl font-bold text-blue-900">
                              {amount}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </section>
            </div>
          )}

          {!user && (
            <div className="mb-8 rounded-xl border border-amber-200 bg-amber-50 p-5 text-amber-800">
              <p className="font-medium">Preview mode</p>
              <p className="mt-1 text-sm">Below is sample data. Log in to see your real points and rewards from completed quests.</p>
            </div>
          )}

          {user && useMockData && !loading && (
            <div className="mb-8 rounded-xl border border-amber-200 bg-amber-50 p-5 text-amber-800">
              <p className="font-medium">No active season</p>
              <p className="mt-1 text-sm">There are no active quests at the moment. Check back soon!</p>
            </div>
          )}

          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-5">
              <p className="text-sm font-medium text-amber-800">Total Points</p>
              <p className="mt-1 text-3xl font-bold text-amber-900">
                {loading && user ? '...' : (useMockData ? mockRewardTotals.totalPoints : totalPoints)}
              </p>
              <p className="mt-1 text-xs text-amber-700">This season</p>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 p-5">
              <p className="text-sm font-medium text-emerald-800">Rewards Released</p>
              <p className="mt-1 text-3xl font-bold text-emerald-900">
                {loading && user ? '...' : (useMockData ? mockRewardTotals.voucherCount : stats.released)}
              </p>
              <p className="mt-1 text-xs text-emerald-700">Points unlocked</p>
            </div>
            <div className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-5">
              <p className="text-sm font-medium text-blue-800">Quests Completed</p>
              <p className="mt-1 text-3xl font-bold text-blue-900">
                {loading && user ? '...' : (useMockData ? mockParticipation.filter(p => p.status === 'completed').length : stats.completed)}
              </p>
              <p className="mt-1 text-xs text-blue-700">Finished</p>
            </div>
            <div className="rounded-xl border border-amber-200 bg-gradient-to-br from-yellow-50 to-amber-50 p-5 flex flex-col">
              <p className="text-sm font-medium text-yellow-800">Available Points</p>
              <p className="mt-1 text-3xl font-bold text-yellow-900">
                {seasonBalance ? seasonBalance.pointsBalance || 0 : 0}
              </p>
              <p className="mt-1 text-xs text-yellow-700">
                Earned: {seasonBalance ? seasonBalance.pointsEarned || 0 : 0} • Spent: {seasonBalance ? seasonBalance.pointsSpent || 0 : 0}
              </p>
              {activeSeason && (
                <Link
                  to="/vouchers"
                  className="mt-3 inline-flex items-center justify-center px-3 py-2 text-sm font-medium rounded-lg bg-amber-600 text-white hover:bg-amber-700"
                >
                  Go to Voucher Store
                </Link>
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Your Quest History</h2>
                <p className="mt-1 text-sm text-gray-600">
                  {participations.length > 0 
                    ? `Showing ${participations.length} quest${participations.length !== 1 ? 's' : ''} - most recent first`
                    : 'Join quests on the Events page to start earning rewards!'
                  }
                </p>
              </div>
              {participations.length > 0 && (
                <Link
                  to="/events"
                  className="text-sm font-medium text-emerald-600 hover:text-emerald-700"
                >
                  Browse quests →
                </Link>
              )}
            </div>

            {loading && user ? (
              <p className="mt-6 text-gray-500">Loading…</p>
            ) : (
              <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {useMockData ? (
                  mockParticipation.length === 0 ? (
                    <p className="text-gray-500 col-span-full">No participation yet. Join quests on the Events page.</p>
                  ) : (
                    mockParticipation.map((entry, index) => (
                      <MockRewardCard key={`${entry.activityId ?? index}-${entry.activityName}`} entry={entry} />
                    ))
                  )
                ) : participations.length === 0 ? (
                  <div className="col-span-full rounded-xl border border-gray-200 bg-gray-50 p-8 text-center">
                    <p className="text-gray-500 mb-4">You haven't joined any quests yet.</p>
                    <Link
                      to="/events"
                      className="inline-flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium"
                    >
                      Browse Available Quests
                    </Link>
                  </div>
                ) : (
                  sortedParticipations.map((entry, index) => (
                    <ParticipationCard 
                      key={`${entry.questId ?? index}-${entry.id}`} 
                      participation={entry} 
                      questTitle={questTitles[entry.questId]}
                      points={entry.pointsAwarded || entry.status === 'completed' ? (entry.pointsAwarded || 0) : 0}
                      onGoToQuest={handleGoToQuest}
                    />
                  ))
                )}
              </div>
            )}
          </div>

          {activeSeason && (
            <div className="mt-12">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="border-b border-gray-200 px-6 py-4">
                  <h2 className="text-xl font-semibold text-gray-900">Community Leaderboard</h2>
                  <p className="mt-1 text-sm text-gray-600">
                    Top contributors this season
                  </p>
                </div>

                <div className="border-b border-gray-200 px-4 py-3">
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => setLeaderboardTab('points')}
                      className={`px-4 py-2 rounded-lg font-medium text-sm transition ${
                        leaderboardTab === 'points'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      Top by Points
                    </button>
                    {IMPACT_UNITS.map(unit => (
                      <button
                        key={unit.value}
                        onClick={() => {
                          setLeaderboardTab('impact')
                          setLeaderboardUnit(unit.value)
                        }}
                        className={`px-4 py-2 rounded-lg font-medium text-sm transition ${
                          leaderboardTab === 'impact' && leaderboardUnit === unit.value
                            ? 'bg-emerald-600 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {unit.icon} {unit.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-6">
                  {leaderboardLoading ? (
                    <div className="text-center py-8">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-emerald-600 border-t-transparent"></div>
                      <p className="text-gray-500 mt-2">Loading leaderboard...</p>
                    </div>
                  ) : leaderboardData.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500">No leaderboard data yet. Complete quests to appear here!</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {leaderboardData.map(entry => (
                        <div
                          key={entry.uid}
                          className={`flex items-center gap-4 p-3 rounded-lg ${
                            entry.uid === user?.uid ? 'bg-emerald-50 border border-emerald-200' : 'bg-gray-50'
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                            entry.rank <= 3
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-200 text-gray-600'
                          }`}>
                            {entry.rank}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 truncate">
                              {entry.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {entry.completedQuestsCount} quest{entry.completedQuestsCount !== 1 ? 's' : ''} completed
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-gray-900">
                              {leaderboardTab === 'points'
                                ? `${entry.pointsTotal} pts`
                                : `${entry.impact || 0}`
                              }
                            </p>
                            {leaderboardTab === 'impact' && (
                              <p className="text-xs text-gray-500">
                                {IMPACT_UNITS.find(u => u.value === leaderboardUnit)?.label || leaderboardUnit}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}

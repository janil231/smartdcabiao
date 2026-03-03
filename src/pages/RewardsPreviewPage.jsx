import { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { useAuth } from '../contexts/AuthContext'
import { getActiveSeason } from '../services/seasons.service'
import { getQuestById } from '../services/quests.service'
import { getUserParticipations, expireMyStaleParticipations } from '../services/participations.service'
import { getUserSeasonPointsSummary } from '../services/pointsLedger.service'
import { participation as mockParticipation, rewardTotals as mockRewardTotals, REWARD_STATUS } from '../data'

const STATUS_STYLES = {
  pending: 'bg-yellow-500/10 text-yellow-800 border-yellow-200',
  released: 'bg-emerald-500/10 text-emerald-800 border-emerald-200',
  expired: 'bg-red-500/10 text-red-800 border-red-200',
  joined: 'bg-blue-500/10 text-blue-800 border-blue-200',
  completed: 'bg-sky-500/10 text-sky-800 border-sky-200',
  cancelled: 'bg-gray-500/10 text-gray-800 border-gray-200',
}

const STATUS_ICONS = {
  pending: (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  released: (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  expired: (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  joined: (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  completed: (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
}

function ParticipationCard({ participation, questTitle, points }) {
  const statusStyle = STATUS_STYLES[participation.rewardStatus] || STATUS_STYLES[participation.status] || 'bg-gray-100 text-gray-800'
  const icon = STATUS_ICONS[participation.rewardStatus] || STATUS_ICONS[participation.status] || STATUS_ICONS.pending

  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const getStatusLabel = () => {
    if (participation.rewardStatus === 'released') {
      return `${points} pts released`
    }
    if (participation.rewardStatus === 'pending') {
      return 'Pending completion'
    }
    if (participation.rewardStatus === 'expired' || participation.status === 'expired') {
      return 'Expired'
    }
    if (participation.status === 'completed') {
      return 'Completed'
    }
    if (participation.status === 'cancelled') {
      return 'Cancelled'
    }
    return participation.status || 'Unknown'
  }

  const joinedDate = participation.joinedAt ? formatDate(participation.joinedAt) : ''
  const completedDate = participation.completedAt ? formatDate(participation.completedAt) : ''

  return (
    <article className="flex flex-col rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md">
      <h2 className="text-lg font-semibold text-gray-900">{questTitle || 'Unknown Quest'}</h2>
      <p className="mt-1 text-sm text-gray-500">
        {joinedDate && `Joined: ${joinedDate}`}
        {completedDate && ` • Completed: ${completedDate}`}
      </p>
      <div className="mt-4 flex flex-wrap items-start gap-3">
        <span className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium ${statusStyle}`}>
          {icon}
          {getStatusLabel()}
        </span>
      </div>
      {participation.rewardStatus === 'released' && (
        <p className="mt-3 text-sm text-gray-600">
          Points have been added to your account.
        </p>
      )}
      {participation.rewardStatus === 'pending' && participation.expiresAt && (
        <p className="mt-3 text-sm text-gray-600">
          Complete by {formatDate(participation.expiresAt)} to receive your reward.
        </p>
      )}
    </article>
  )
}

function MockRewardCard({ entry }) {
  const statusStyle = STATUS_STYLES[entry.rewardStatus] || STATUS_STYLES.completed
  const icon = STATUS_ICONS[entry.rewardStatus] || STATUS_ICONS.completed

  return (
    <article className="flex flex-col rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md">
      <h2 className="text-lg font-semibold text-gray-900">{entry.activityName}</h2>
      <p className="mt-1 text-sm text-gray-500">{entry.date}</p>
      <div className="mt-4 flex flex-wrap items-start gap-3">
        <span className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium ${statusStyle}`}>
          {icon}
          {entry.rewardLabel}
        </span>
      </div>
      {entry.rewardDetail && (
        <p className="mt-3 text-sm text-gray-600">{entry.rewardDetail}</p>
      )}
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
        } else {
          setUseMockData(true)
        }
      } catch (err) {
        console.error('Error loading rewards:', err)
        setUseMockData(true)
      } finally {
        setLoading(false)
      }
    }
    
    loadData()
  }, [user])

  const pendingCount = participations.filter(p => p.status === 'joined').length
  const completedCount = participations.filter(p => p.status === 'completed').length
  const releasedCount = participations.filter(p => p.rewardStatus === 'released').length

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 pb-20 md:pb-0">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-10">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Rewards & Participation
            </h1>
            <p className="mt-3 max-w-2xl text-lg text-gray-600">
              Your community actions support city improvement and local businesses.
              {user ? (useMockData === false ? ' Here are your participation and earned rewards.' : ' Loading…') : ' Sign in to see your rewards and participation.'}
            </p>
          </div>

          {activeSeason && (
            <div className="mb-6 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-2 text-sm text-emerald-800">
              Season: <strong>{activeSeason.name}</strong>
            </div>
          )}

          {!user && (
            <div className="mb-10 rounded-xl border border-amber-200 bg-amber-50 p-5 text-amber-800">
              <p className="font-medium">Preview mode</p>
              <p className="mt-1 text-sm">Below is sample data. Log in to see your real points and rewards from completed quests.</p>
            </div>
          )}

          {user && useMockData && !loading && (
            <div className="mb-10 rounded-xl border border-amber-200 bg-amber-50 p-5 text-amber-800">
              <p className="font-medium">No active season</p>
              <p className="mt-1 text-sm">There are no active quests at the moment. Check back soon!</p>
            </div>
          )}

          <div className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-amber-50 to-orange-50 p-5">
              <p className="text-sm font-medium text-amber-800">Total points (season)</p>
              <p className="mt-1 text-2xl font-bold text-amber-900 sm:text-3xl">{loading && user ? '…' : (useMockData ? mockRewardTotals.totalPoints : totalPoints)}</p>
              <p className="mt-1 text-xs text-amber-700">Earned from quests</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-emerald-50 to-teal-50 p-5">
              <p className="text-sm font-medium text-emerald-800">Rewards released</p>
              <p className="mt-1 text-2xl font-bold text-emerald-900 sm:text-3xl">{loading && user ? '…' : (useMockData ? mockRewardTotals.voucherCount : releasedCount)}</p>
              <p className="mt-1 text-xs text-emerald-700">Points unlocked</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-5">
              <p className="text-sm font-medium text-blue-800">Quests completed</p>
              <p className="mt-1 text-2xl font-bold text-blue-900 sm:text-3xl">{loading && user ? '…' : (useMockData ? mockParticipation.filter(p => p.rewardStatus === 'completed').length : completedCount)}</p>
              <p className="mt-1 text-xs text-blue-700">Finished quests</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-yellow-50 to-amber-50 p-5">
              <p className="text-sm font-medium text-yellow-800">Pending</p>
              <p className="mt-1 text-2xl font-bold text-yellow-900 sm:text-3xl">{loading && user ? '…' : pendingCount}</p>
              <p className="mt-1 text-xs text-yellow-700">Awaiting completion</p>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-gray-900">Your participation</h2>
            <p className="mt-1 text-sm text-gray-600">
              Quests you've joined and rewards earned. Complete quests within the deadline to receive your points.
            </p>
            {loading && user ? (
              <p className="mt-6 text-gray-500">Loading…</p>
            ) : (
              <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {useMockData ? (
                  mockParticipation.length === 0 ? (
                    <p className="text-gray-500">No participation yet. Join quests on the Events page.</p>
                  ) : (
                    mockParticipation.map((entry, index) => (
                      <MockRewardCard key={`${entry.activityId ?? index}-${entry.activityName}`} entry={entry} index={index} />
                    ))
                  )
                ) : participations.length === 0 ? (
                  <p className="text-gray-500">No participation yet. Join quests on the Events page.</p>
                ) : (
                  participations.map((entry, index) => (
                    <ParticipationCard 
                      key={`${entry.questId ?? index}-${entry.id}`} 
                      participation={entry} 
                      questTitle={questTitles[entry.questId]}
                      points={entry.pointsAwarded}
                    />
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}

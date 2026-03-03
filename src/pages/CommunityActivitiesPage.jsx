import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { useAuth } from '../contexts/AuthContext'
import { getActiveSeason } from '../services/seasons.service'
import { listActiveQuests } from '../services/quests.service'
import { 
  getUserParticipations, 
  joinQuest, 
  cancelQuest, 
  expireMyStaleParticipations 
} from '../services/participations.service'
import { activities, ACTIVITY_TYPES } from '../data'

const TYPE_STYLES = {
  [ACTIVITY_TYPES.cleanup]: 'bg-sky-500/10 text-sky-700 border-sky-200',
  [ACTIVITY_TYPES.treePlanting]: 'bg-emerald-500/10 text-emerald-700 border-emerald-200',
  [ACTIVITY_TYPES.event]: 'bg-amber-500/10 text-amber-700 border-amber-200',
}

const TYPE_LABELS = {
  [ACTIVITY_TYPES.cleanup]: 'Clean-up',
  [ACTIVITY_TYPES.treePlanting]: 'Tree planting',
  [ACTIVITY_TYPES.event]: 'Event',
}

const QUEST_STATUS_STYLES = {
  joined: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  completed: 'bg-blue-100 text-blue-800 border-blue-200',
  cancelled: 'bg-gray-100 text-gray-800 border-gray-200',
  expired: 'bg-red-100 text-red-800 border-red-200',
}

const REWARD_STATUS_STYLES = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  released: 'bg-green-100 text-green-800 border-green-200',
  expired: 'bg-red-100 text-red-800 border-red-200',
}

function QuestCard({ quest, participation, onJoin, onCancel, isLoading }) {
  const typeStyle = TYPE_STYLES[quest.category] || 'bg-gray-100 text-gray-700 border-gray-200'
  const typeLabel = TYPE_LABELS[quest.category] || 'Quest'

  const slotsLeft = quest.capacity - (quest.reservedCount || 0)
  const isFull = slotsLeft <= 0
  
  const getStatusBadge = () => {
    if (!participation) return null
    
    const statusStyle = QUEST_STATUS_STYLES[participation.status] || 'bg-gray-100 text-gray-800'
    
    return (
      <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusStyle}`}>
        {participation.status === 'joined' && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />}
        {participation.status.charAt(0).toUpperCase() + participation.status.slice(1)}
      </span>
    )
  }

  const getRewardBadge = () => {
    if (!participation || participation.rewardStatus === 'pending') return null
    
    const rewardStyle = REWARD_STATUS_STYLES[participation.rewardStatus] || 'bg-gray-100 text-gray-800'
    const rewardLabel = participation.rewardStatus === 'released' 
      ? `${participation.pointsAwarded || quest.points} pts released`
      : 'Reward expired'
    
    return (
      <span className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs font-medium ${rewardStyle}`}>
        {rewardLabel}
      </span>
    )
  }

  const getDeadlineInfo = () => {
    if (!participation || participation.status !== 'joined') return null
    
    const expiresAt = new Date(participation.expiresAt)
    const now = new Date()
    const isExpired = expiresAt < now
    
    if (isExpired) {
      return <span className="text-red-600 font-medium">Expired</span>
    }
    
    const hoursLeft = Math.max(0, Math.floor((expiresAt - now) / (1000 * 60 * 60)))
    const daysLeft = Math.floor(hoursLeft / 24)
    const remainingHours = hoursLeft % 24
    
    let timeText
    if (daysLeft > 0) {
      timeText = `${daysLeft}d ${remainingHours}h left`
    } else if (hoursLeft > 0) {
      timeText = `${hoursLeft}h left`
    } else {
      const minsLeft = Math.floor((expiresAt - now) / (1000 * 60))
      timeText = `${minsLeft}m left`
    }
    
    return (
      <span className={hoursLeft < 6 ? 'text-orange-600 font-medium' : 'text-gray-600'}>
        Complete by: {expiresAt.toLocaleDateString()} ({timeText})
      </span>
    )
  }

  const isJoined = participation?.status === 'joined'
  const isCompleted = participation?.status === 'completed'
  const isCancelledOrExpired = participation?.status === 'cancelled' || participation?.status === 'expired'

  const handleAction = () => {
    if (isJoined) {
      onCancel(quest.id)
    } else if (!isCompleted && !isCancelledOrExpired) {
      onJoin(quest.id)
    }
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition hover:shadow-md">
      <div className="flex flex-1 flex-col p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`inline-block w-fit rounded border px-2 py-0.5 text-xs font-medium uppercase tracking-wider ${typeStyle}`}>
            {typeLabel}
          </span>
          {getStatusBadge()}
          {getRewardBadge()}
        </div>
        
        <h2 className="mt-3 text-lg font-semibold text-gray-900">{quest.title}</h2>
        <p className="mt-2 flex-1 text-sm text-gray-600 line-clamp-3">{quest.description}</p>
        
        <dl className="mt-4 flex flex-col gap-1.5 text-sm text-gray-500">
          <div className="flex items-start gap-2">
            <dt className="shrink-0 font-medium text-gray-600">Dates</dt>
            <dd>{formatDate(quest.startAt)} - {formatDate(quest.endAt)}</dd>
          </div>
          <div className="flex items-start gap-2">
            <dt className="shrink-0 font-medium text-gray-600">Points</dt>
            <dd className="text-amber-600 font-medium">{quest.points} pts</dd>
          </div>
          <div className="flex items-start gap-2">
            <dt className="shrink-0 font-medium text-gray-600">Slots</dt>
            <dd className={isFull ? 'text-red-600 font-medium' : ''}>
              {slotsLeft} of {quest.capacity} available
            </dd>
          </div>
          {getDeadlineInfo() && (
            <div className="flex items-start gap-2">
              <dt className="shrink-0 font-medium text-gray-600">Deadline</dt>
              <dd>{getDeadlineInfo()}</dd>
            </div>
          )}
        </dl>
        
        <button
          type="button"
          onClick={handleAction}
          disabled={isLoading || isCompleted || isCancelledOrExpired || (isJoined === false && isFull)}
          className={`mt-4 inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
            isCompleted
              ? 'cursor-default bg-blue-100 text-blue-600'
              : isCancelledOrExpired
              ? 'cursor-default bg-gray-100 text-gray-500'
              : isJoined
              ? 'bg-red-100 text-red-700 hover:bg-red-200'
              : isFull
              ? 'cursor-not-allowed bg-gray-100 text-gray-400'
              : 'bg-emerald-600 text-white hover:bg-emerald-700'
          }`}
        >
          {isLoading ? (
            'Processing...'
          ) : isCompleted ? (
            <>
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Completed
            </>
          ) : isJoined ? (
            <>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Cancel
            </>
          ) : isFull ? (
            'Full'
          ) : (
            <>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              Join
            </>
          )}
        </button>
      </div>
    </article>
  )
}

function MockQuestCard({ activity }) {
  const typeStyle = TYPE_STYLES[activity.type] || 'bg-gray-100 text-gray-700 border-gray-200'
  const typeLabel = TYPE_LABELS[activity.type] || 'Activity'

  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex flex-1 flex-col p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`inline-block w-fit rounded border px-2 py-0.5 text-xs font-medium uppercase tracking-wider ${typeStyle}`}>
            {typeLabel}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
            Mock Data
          </span>
        </div>
        <h2 className="mt-3 text-lg font-semibold text-gray-900">{activity.name}</h2>
        <p className="mt-2 flex-1 text-sm text-gray-600 line-clamp-3">{activity.description}</p>
        <dl className="mt-4 flex flex-col gap-1.5 text-sm text-gray-500">
          <div className="flex items-start gap-2">
            <dt className="shrink-0 font-medium text-gray-600">Date</dt>
            <dd>{activity.date}</dd>
          </div>
          <div className="flex items-start gap-2">
            <dt className="shrink-0 font-medium text-gray-600">Location</dt>
            <dd>{activity.location}</dd>
          </div>
        </dl>
        <div className="mt-4 rounded-lg bg-gray-50 p-3 text-sm text-gray-600">
          <p>Quest system not available. Connect to Firestore to enable seasonal quests.</p>
        </div>
      </div>
    </article>
  )
}

export default function CommunityActivitiesPage() {
  const { user } = useAuth()
  const [quests, setQuests] = useState([])
  const [participations, setParticipations] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [actionLoading, setActionLoading] = useState(null)
  const [activeSeason, setActiveSeason] = useState(null)
  const [useMockData, setUseMockData] = useState(false)

  const loadQuests = useCallback(async () => {
    try {
      const season = await getActiveSeason()
      
      if (season) {
        setActiveSeason(season)
        const questList = await listActiveQuests(season.id)
        
        if (questList.length > 0) {
          setQuests(questList)
          
          if (user) {
            const userParts = await getUserParticipations(user.uid)
            const partsMap = {}
            userParts.forEach(p => {
              partsMap[p.questId] = p
            })
            setParticipations(partsMap)
            
            await expireMyStaleParticipations(user.uid)
            const refreshedParts = await getUserParticipations(user.uid)
            const refreshedMap = {}
            refreshedParts.forEach(p => {
              refreshedMap[p.questId] = p
            })
            setParticipations(refreshedMap)
          }
        } else {
          setUseMockData(true)
        }
      } else {
        setUseMockData(true)
      }
    } catch (err) {
      console.error('Error loading quests:', err)
      setUseMockData(true)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    loadQuests()
  }, [loadQuests])

  const handleJoin = async (questId) => {
    if (!user) return
    setActionLoading(questId)
    setError(null)
    
    try {
      await joinQuest({
        uid: user.uid,
        questId,
        userEmail: user.email
      })
      
      const userParts = await getUserParticipations(user.uid)
      const partsMap = {}
      userParts.forEach(p => {
        partsMap[p.questId] = p
      })
      setParticipations(partsMap)
    } catch (err) {
      setError(err.message ?? 'Failed to join quest')
    } finally {
      setActionLoading(null)
    }
  }

  const handleCancel = async (questId) => {
    if (!user) return
    setActionLoading(questId)
    setError(null)
    
    try {
      await cancelQuest({
        uid: user.uid,
        questId
      })
      
      const userParts = await getUserParticipations(user.uid)
      const partsMap = {}
      userParts.forEach(p => {
        partsMap[p.questId] = p
      })
      setParticipations(partsMap)
    } catch (err) {
      setError(err.message ?? 'Failed to cancel quest')
    } finally {
      setActionLoading(null)
    }
  }

  const joinedCount = Object.values(participations).filter(p => p.status === 'joined').length
  const completedCount = Object.values(participations).filter(p => p.status === 'completed').length

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 pb-20 md:pb-0">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                Seasonal Quests
              </h1>
              <p className="mt-3 max-w-2xl text-lg text-gray-600">
                Join community quests to earn points and rewards. Complete quests within the time window to receive your reward.
                {user ? ' Your participation is saved to your account.' : ' Sign in to save your participation.'}
              </p>
            </div>
            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
                {error}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-3">
              {joinedCount > 0 && (
                <p className="text-sm font-medium text-emerald-700">
                  {joinedCount} joined, {completedCount} completed
                </p>
              )}
              <Link
                to="/rewards"
                className="text-sm font-medium text-emerald-600 hover:text-emerald-700"
              >
                View rewards →
              </Link>
            </div>
          </div>

          {activeSeason && (
            <div className="mt-4 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-2 text-sm text-emerald-800">
              Season: <strong>{activeSeason.name}</strong>
              {activeSeason.startAt && activeSeason.endAt && (
                <span> ({new Date(activeSeason.startAt).toLocaleDateString()} - {new Date(activeSeason.endAt).toLocaleDateString()})</span>
              )}
            </div>
          )}

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {loading ? (
              <p className="col-span-full text-center text-gray-500">Loading quests...</p>
            ) : useMockData ? (
              activities.slice(0, 6).map((activity) => (
                <MockQuestCard key={activity.id} activity={activity} index={activity.id} />
              ))
            ) : quests.length === 0 ? (
              <p className="col-span-full text-center text-gray-500">No active quests at the moment. Check back soon!</p>
            ) : (
              quests.map((quest) => (
                <QuestCard
                  key={quest.id}
                  quest={quest}
                  participation={participations[quest.id]}
                  onJoin={handleJoin}
                  onCancel={handleCancel}
                  isLoading={actionLoading === quest.id}
                />
              ))
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}

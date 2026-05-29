import { useState, useEffect, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { Link, useSearchParams } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { useAuth } from '../contexts/AuthContext'
import { getActiveSeason } from '../services/seasons.service'
import { listQuestsBySeason } from '../services/quests.service'
import { 
  getUserParticipations, 
  joinQuest, 
  cancelQuest, 
  expireMyStaleParticipations 
} from '../services/participations.service'
import { hasUserSeenOnboarding, setSeenOnboarding, getUserLocation, setUserLocation as saveUserLocation } from '../services/userSettings.service'
import { CABIAO_CENTER } from '../constants/cabiaoGeo'
import QuestOnboardingModal from '../components/QuestOnboardingModal'
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

const QUEST_TYPE_STYLES = {
  visit: 'bg-blue-500/10 text-blue-700 border-blue-200',
  buy: 'bg-purple-500/10 text-purple-700 border-purple-200',
  participate: 'bg-emerald-500/10 text-emerald-700 border-emerald-200',
}

const QUEST_TYPE_LABELS = {
  visit: 'VISIT',
  buy: 'BUY',
  participate: 'PARTICIPATE',
}

const IMPACT_UNIT_CONFIG = {
  kg_trash: { label: 'Kg waste', icon: '🗑️' },
  trees: { label: 'Trees', icon: '🌳' },
  hours: { label: 'Hours', icon: '⏱️' },
  kg_plastic: { label: 'Kg plastic', icon: '♻️' },
  co2_kg: { label: 'Kg CO₂', icon: '🌍' },
}

function QuestCard({ quest, participation, onJoin, onCancel, isLoading, focused, distanceKm, extraBadge }) {
  const typeStyle = TYPE_STYLES[quest.category] || 'bg-gray-100 text-gray-700 border-gray-200'
  const typeLabel = TYPE_LABELS[quest.category] || 'Quest'
  
  const questType = quest.questType || 'participate'
  const questTypeStyle = QUEST_TYPE_STYLES[questType] || QUEST_TYPE_STYLES.participate
  const questTypeLabel = QUEST_TYPE_LABELS[questType] || 'PARTICIPATE'

  const slotsLeft = quest.capacity - (quest.reservedCount || 0)
  const isFull = slotsLeft <= 0
  
  const isJoined = participation?.status === 'joined'
  const isCompleted = participation?.status === 'completed'
  const isCancelledOrExpired = participation?.status === 'cancelled' || participation?.status === 'expired'
  
  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const getStatusBadge = () => {
    if (!participation) return null
    
    const statusConfig = {
      joined: { style: 'bg-amber-100 text-amber-800 border-amber-200', label: 'Joined' },
      completed: { style: 'bg-emerald-100 text-emerald-800 border-emerald-200', label: 'Completed' },
      expired: { style: 'bg-red-100 text-red-800 border-red-200', label: 'Expired' },
      cancelled: { style: 'bg-gray-100 text-gray-800 border-gray-200', label: 'Cancelled' },
    }
    
    const config = statusConfig[participation.status] || statusConfig.cancelled
    
    return (
      <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${config.style}`}>
        {participation.status === 'joined' && <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />}
        {config.label}
      </span>
    )
  }

  const getRewardBadge = () => {
    if (!participation) return null

    const rewardConfig = {
      pending: { style: 'bg-yellow-100 text-yellow-800 border-yellow-200', label: 'Reward: Pending' },
      released: { style: 'bg-emerald-100 text-emerald-800 border-emerald-200', label: `+${participation.pointsAwarded || quest.points} pts released` },
      expired: { style: 'bg-red-100 text-red-800 border-red-200', label: 'Reward: Expired' },
    }

    const status = participation.rewardStatus || participation.status
    const config = rewardConfig[status] || rewardConfig.pending
    
    return (
      <span className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium ${config.style}`}>
        {config.label}
      </span>
    )
  }

  const getDeadlineInfo = () => {
    if (!participation || participation.status !== 'joined') return null
    
    const expiresAt = new Date(participation.expiresAt)
    const now = new Date()
    const isExpired = expiresAt < now
    
    if (isExpired) {
      return (
        <div className="mt-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2">
          <span className="text-red-700 font-medium text-sm">
            Expired on {formatDate(participation.expiresAt)}
          </span>
        </div>
      )
    }
    
    const hoursLeft = Math.max(0, Math.floor((expiresAt - now) / (1000 * 60 * 60)))
    const daysLeft = Math.floor(hoursLeft / 24)
    const remainingHours = hoursLeft % 24
    
    let timeText
    if (daysLeft > 0) {
      timeText = `${daysLeft}d ${remainingHours}h`
    } else if (hoursLeft > 0) {
      timeText = `${hoursLeft}h`
    } else {
      const minsLeft = Math.floor((expiresAt - now) / (1000 * 60))
      timeText = `${minsLeft}m`
    }
    
    const isUrgent = hoursLeft < 6
    
    return (
      <div className={`mt-2 rounded-lg px-3 py-2 ${isUrgent ? 'bg-orange-50 border border-orange-200' : 'bg-blue-50 border border-blue-200'}`}>
        <span className={isUrgent ? 'text-orange-700 font-medium text-sm' : 'text-blue-700 text-sm'}>
          {isUrgent ? '⏰ ' : '⏳ '}
          Time left: {timeText} (complete by {formatDate(participation.expiresAt)})
        </span>
      </div>
    )
  }

  const handleAction = () => {
    if (isJoined) {
      onCancel(quest.id)
    } else if (!isCompleted && !isCancelledOrExpired) {
      onJoin(quest.id)
    }
  }

  const impact = quest.impact
  const impactText = impact && impact.unit && impact.amountPerCompletion && impact.label
    ? `+${impact.amountPerCompletion} ${impact.label}`
    : null
  
  const getRequirementText = () => {
    if (questType === 'visit' && quest.visit) {
      const { requiredMinutes, targetName } = quest.visit
      return `Stay for ${requiredMinutes} minutes at ${targetName}`
    }
    if (questType === 'buy' && quest.buy) {
      const { productName, businessName, minSpend } = quest.buy
      let text = `Buy ${productName} at ${businessName}`
      if (minSpend) {
        text += ` (min ₱${minSpend})`
      }
      return text
    }
    return null
  }
  
  const requirementText = getRequirementText()

  return (
    <article 
      ref={focused ? (el) => el?.scrollIntoView({ behavior: 'smooth', block: 'center' }) : undefined}
      className={`flex flex-col overflow-hidden rounded-xl border bg-white shadow-sm transition hover:shadow-md ${
        focused ? 'border-emerald-400 ring-2 ring-emerald-200' : 'border-gray-200'
      }`}
    >
      <div className="flex flex-1 flex-col p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`inline-block w-fit rounded border px-2 py-0.5 text-xs font-medium uppercase tracking-wider ${typeStyle}`}>
            {typeLabel}
          </span>
          <span className={`inline-block w-fit rounded border px-2 py-0.5 text-xs font-medium uppercase tracking-wider ${questTypeStyle}`}>
            {questTypeLabel}
          </span>
          {getStatusBadge()}
          {getRewardBadge()}
          {extraBadge && (
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-xs font-medium text-blue-700">
              {extraBadge}
            </span>
          )}
        </div>
        
        <h2 className="mt-3 text-lg font-semibold text-gray-900">{quest.title}</h2>
        <p className="mt-2 flex-1 text-sm text-gray-600 line-clamp-3">{quest.description}</p>
        
        <dl className="mt-4 flex flex-col gap-1.5 text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <dt className="shrink-0 font-medium">📅</dt>
            <dd>{formatDate(quest.startAt)} - {formatDate(quest.endAt)}</dd>
          </div>
          <div className="flex items-center gap-2">
            <dt className="shrink-0 font-medium">⭐</dt>
            <dd className="text-amber-600 font-semibold">{quest.points} points</dd>
          </div>
          {typeof distanceKm === 'number' && (
            <div className="flex items-center gap-2">
              <dt className="shrink-0 font-medium">📍</dt>
              <dd className="text-gray-600">
                ~{distanceKm.toFixed(1)} km away
              </dd>
            </div>
          )}
          <div className="flex items-center gap-2">
            <dt className="shrink-0 font-medium">🎯</dt>
            <dd className={isFull ? 'text-red-600 font-semibold' : slotsLeft <= 3 ? 'text-orange-600 font-medium' : ''}>
              {isFull ? (
                <span>Slots: FULL</span>
              ) : (
                <span>Slots left: {slotsLeft} / {quest.capacity}</span>
              )}
            </dd>
          </div>
          {impactText && (
            <div className="flex items-center gap-2">
              <dt className="shrink-0 font-medium">🌱</dt>
              <dd className="text-emerald-700 font-medium">
                Impact: {impactText}
              </dd>
            </div>
          )}
          {requirementText && (
            <div className="flex items-center gap-2">
              <dt className="shrink-0 font-medium">📋</dt>
              <dd className="text-blue-700 font-medium">
                Requirement: {requirementText}
              </dd>
            </div>
          )}
        </dl>
        
        {getDeadlineInfo()}
        
        <button
          type="button"
          onClick={handleAction}
          disabled={isLoading || isCompleted || isCancelledOrExpired || (!isJoined && isFull)}
          className={`mt-4 inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-offset-2 ${
            isCompleted
              ? 'cursor-default bg-emerald-100 text-emerald-700'
              : isCancelledOrExpired
              ? 'cursor-default bg-gray-100 text-gray-400'
              : isJoined
              ? 'bg-red-100 text-red-700 hover:bg-red-200 focus:ring-red-400'
              : isFull
              ? 'cursor-not-allowed bg-gray-100 text-gray-400'
              : 'bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-500'
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
              Cancel Joining
            </>
          ) : isFull ? (
            'Full - No Slots Available'
          ) : (
            <>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              Join Quest
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
          <div className="flex items-center gap-2">
            <dt className="shrink-0 font-medium">📅</dt>
            <dd>{activity.date}</dd>
          </div>
          <div className="flex items-center gap-2">
            <dt className="shrink-0 font-medium">📍</dt>
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

function CancelConfirmModal({ isOpen, onClose, onConfirm, isLoading, questTitle }) {
  if (!isOpen) return null
  
  return createPortal(
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 px-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold text-gray-900">Cancel Joining?</h3>
        <p className="mt-2 text-gray-600">
          Are you sure you want to cancel your joining for "{questTitle}"? Your slot will be freed and you won't receive the points.
        </p>
        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Keep My Spot
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300"
          >
            {isLoading ? 'Cancelling...' : 'Cancel Joining'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

export default function CommunityActivitiesPage() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const focusQuestId = searchParams.get('focusQuestId')
  
  const [quests, setQuests] = useState([])
  const [participations, setParticipations] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [actionLoading, setActionLoading] = useState(null)
  const [activeSeason, setActiveSeason] = useState(null)
  const [useMockData, setUseMockData] = useState(false)
  const [activeTab, setActiveTab] = useState('all')
  const [toast, setToast] = useState(null)
  const [cancelConfirm, setCancelConfirm] = useState(null)
  
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [userLocation, setUserLocation] = useState(null)
  const [locationLoading, setLocationLoading] = useState(false)
  const [locationError, setLocationError] = useState(null)

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }

  const loadQuests = useCallback(async () => {
    try {
      const season = await getActiveSeason()
      
      if (season) {
        setActiveSeason(season)
        const questList = await listQuestsBySeason(season.id)
        
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

            const seenOnboarding = await hasUserSeenOnboarding(user.uid, season.id)
            if (!seenOnboarding) {
              setShowOnboarding(true)
            }

            const savedLocation = await getUserLocation(user.uid)
            if (savedLocation) {
              setUserLocation(savedLocation)
            }
          }
        } else {
          setUseMockData(true)
        }
      } else {
        setUseMockData(true)
      }
    } catch {
      setUseMockData(true)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    loadQuests()
  }, [loadQuests])

  const handleLocationRequest = async () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser')
      return
    }

    setLocationLoading(true)
    setLocationError(null)

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        }
        setUserLocation(location)
        
        if (user && activeSeason) {
          await saveUserLocation(user.uid, location)
        }
        setLocationLoading(false)
      },
      (err) => {
        console.warn('Geolocation error:', err)
        setLocationError('Unable to get your location. Please enable location access.')
        setLocationLoading(false)
      }
    )
  }

  const myQuestIds = useMemo(() => {
    return new Set(Object.keys(participations))
  }, [participations])

  const isQuestActiveNow = useCallback((quest) => {
    if (!quest) return false
    if (quest.status !== 'active') return false

    const now = new Date()
    const startAt = quest.startAt ? new Date(quest.startAt) : null
    const endAt = quest.endAt ? new Date(quest.endAt) : null
    const graceHours = typeof quest.gracePeriodHours === 'number' ? quest.gracePeriodHours : 24

    if (startAt && startAt > now) return false
    if (endAt) {
      const graceMs = graceHours * 60 * 60 * 1000
      if (now > new Date(endAt.getTime() + graceMs)) return false
    }

    return true
  }, [])

  const haversineDistanceKm = (lat1, lon1, lat2, lon2) => {
    const R = 6371 // km
    const dLat = ((lat2 - lat1) * Math.PI) / 180
    const dLon = ((lon2 - lon1) * Math.PI) / 180
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  const filteredQuests = useMemo(() => {
    if (activeTab === 'my') {
      return quests.filter(q => myQuestIds.has(q.id))
    }
    return quests
  }, [quests, activeTab, myQuestIds])

  const finishingSoonQuests = useMemo(() => {
    return quests
      .filter((q) => q.endAt && isQuestActiveNow(q))
      .sort((a, b) => new Date(a.endAt) - new Date(b.endAt))
      .slice(0, 5)
  }, [quests, isQuestActiveNow])

  const highImpactQuests = useMemo(() => {
    return quests
      .filter(
        (q) =>
          isQuestActiveNow(q) &&
          q.impact &&
          q.impact.amountPerCompletion &&
          q.impact.amountPerCompletion >= 2
      )
      .sort((a, b) => (b.impact?.amountPerCompletion || 0) - (a.impact?.amountPerCompletion || 0))
      .slice(0, 6)
  }, [quests, isQuestActiveNow])

  const nearbyQuests = useMemo(() => {
    const base =
      userLocation && typeof userLocation.lat === 'number' && typeof userLocation.lng === 'number'
        ? { lat: userLocation.lat, lng: userLocation.lng, isUser: true }
        : { lat: CABIAO_CENTER[0], lng: CABIAO_CENTER[1], isUser: false }

    const withLocation = quests.filter((q) => {
      if (!q.position) return false
      if (Array.isArray(q.position)) {
        return q.position.length === 2
      }
      if (typeof q.position === 'object') {
        return typeof q.position.lat === 'number' && typeof q.position.lng === 'number'
      }
      return false
    })

    const activeWithLocation = withLocation.filter((q) => isQuestActiveNow(q))

    if (activeWithLocation.length === 0) {
      return { baseIsUserLocation: base.isUser, quests: [] }
    }

    const questsWithDistance = activeWithLocation.map((q) => {
      let lat
      let lng
      if (Array.isArray(q.position)) {
        ;[lat, lng] = q.position
      } else {
        lat = q.position.lat
        lng = q.position.lng
      }
      const distanceKm = haversineDistanceKm(base.lat, base.lng, lat, lng)
      return { ...q, distanceKm }
    })

    questsWithDistance.sort((a, b) => a.distanceKm - b.distanceKm)

    return {
      baseIsUserLocation: base.isUser,
      quests: questsWithDistance.slice(0, 5),
    }
  }, [quests, userLocation, isQuestActiveNow])

  const beginnerQuests = useMemo(() => {
    return quests
      .filter(q => {
        const slotsLeft = (q.capacity || 0) - (q.reservedCount || 0)
        return slotsLeft > 0 && isQuestActiveNow(q)
      })
      .sort((a, b) => (a.points || 0) - (b.points || 0))
      .slice(0, 3)
  }, [quests, isQuestActiveNow])

  const handleCloseOnboarding = async () => {
    setShowOnboarding(false)
    if (user && activeSeason) {
      await setSeenOnboarding(user.uid, activeSeason.id)
    }
  }

  const handleJoinFromOnboarding = async (questId) => {
    setShowOnboarding(false)
    if (user && activeSeason) {
      await setSeenOnboarding(user.uid, activeSeason.id)
    }
    handleJoin(questId)
  }

  const handleJoin = async (questId) => {
    if (!user) return
    setActionLoading(questId)
    setError(null)
    
    try {
      const quest = quests.find(q => q.id === questId)
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
      
      const expiresDate = new Date(Date.now() + (quest?.gracePeriodHours || 24) * 60 * 60 * 1000)
      showToast(`🎉 Joined! Complete by ${expiresDate.toLocaleDateString()} to earn ${quest?.points || 0} points.`, 'success')
    } catch (err) {
      setError(err.message ?? 'Failed to join quest')
      showToast(err.message ?? 'Failed to join quest', 'error')
    } finally {
      setActionLoading(null)
    }
  }

  const handleCancel = async () => {
    if (!user || !cancelConfirm) return
    const questId = cancelConfirm.questId
    
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
      
      showToast('Your spot has been released.', 'success')
      setCancelConfirm(null)
    } catch (err) {
      setError(err.message ?? 'Failed to cancel quest')
      showToast(err.message ?? 'Failed to cancel quest', 'error')
    } finally {
      setActionLoading(null)
    }
  }

  const myQuestsCount = useMemo(() => {
    return Object.keys(participations).length
  }, [participations])

  const joinedCount = useMemo(() => {
    return Object.values(participations).filter(p => p.status === 'joined').length
  }, [participations])

  const completedCount = useMemo(() => {
    return Object.values(participations).filter(p => p.status === 'completed').length
  }, [participations])

  const getSeasonCountdown = () => {
    if (!activeSeason?.endAt) return null
    const endDate = new Date(activeSeason.endAt)
    const now = new Date()
    const daysLeft = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24))
    if (daysLeft <= 0) return 'Season ended'
    return `Ends in ${daysLeft} day${daysLeft > 1 ? 's' : ''}`
  }

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
          </div>

          {activeSeason && (
            <div className="mt-4 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3">
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

          <div className="mt-6 flex gap-2 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 -mb-px text-sm font-medium border-b-2 transition ${
                activeTab === 'all'
                  ? 'border-emerald-500 text-emerald-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              All Quests
              {quests.length > 0 && (
                <span className="ml-2 text-xs bg-gray-200 px-2 py-0.5 rounded-full">{quests.length}</span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('my')}
              disabled={!user || myQuestsCount === 0}
              className={`px-4 py-2 -mb-px text-sm font-medium border-b-2 transition ${
                activeTab === 'my'
                  ? 'border-emerald-500 text-emerald-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed'
              }`}
            >
              My Quests
              {user && myQuestsCount > 0 && (
                <span className="ml-2 text-xs bg-emerald-100 px-2 py-0.5 rounded-full">{myQuestsCount}</span>
              )}
            </button>
          </div>

          {user && joinedCount > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
              <span className="text-amber-700 font-medium">⏳ {joinedCount} pending</span>
              <span className="text-emerald-700 font-medium">✅ {completedCount} completed</span>
              <Link
                to="/rewards"
                className="ml-auto text-emerald-600 hover:text-emerald-700 font-medium"
              >
                View rewards →
              </Link>
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {!loading && !useMockData && quests.length > 0 && activeTab === 'all' && (
            <>
              {finishingSoonQuests.length > 0 && (
                <section className="mt-6">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      ⏰ Finishing Soon
                    </h2>
                    <button
                      onClick={() => document.getElementById('all-quests')?.scrollIntoView({ behavior: 'smooth' })}
                      className="text-sm text-emerald-600 hover:text-emerald-700"
                    >
                      See all →
                    </button>
                  </div>
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {finishingSoonQuests.map(quest => {
                      const endAt = quest.endAt ? new Date(quest.endAt) : null
                      let daysLabel = null
                      if (endAt) {
                        const now = new Date()
                        const daysLeft = Math.max(
                          0,
                          Math.ceil((endAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                        )
                        daysLabel =
                          daysLeft <= 0
                            ? 'Ends today'
                            : `Ends in ${daysLeft} day${daysLeft > 1 ? 's' : ''}`
                      }
                      return (
                        <QuestCard
                          key={quest.id}
                          quest={quest}
                          participation={participations[quest.id]}
                          onJoin={handleJoin}
                          onCancel={(id) => {
                            const q = quests.find(qu => qu.id === id)
                            setCancelConfirm({ questId: id, title: q?.title })
                          }}
                          isLoading={actionLoading === quest.id}
                          focused={focusQuestId === quest.id}
                          extraBadge={daysLabel}
                        />
                      )
                    })}
                  </div>
                </section>
              )}

              {highImpactQuests.length > 0 && (
                <section className="mt-8">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      🌱 High Impact
                    </h2>
                    <button
                      onClick={() => document.getElementById('all-quests')?.scrollIntoView({ behavior: 'smooth' })}
                      className="text-sm text-emerald-600 hover:text-emerald-700"
                    >
                      See all →
                    </button>
                  </div>
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {highImpactQuests.map(quest => (
                      <QuestCard
                        key={quest.id}
                        quest={quest}
                        participation={participations[quest.id]}
                        onJoin={handleJoin}
                        onCancel={(id) => {
                          const q = quests.find(qu => qu.id === id)
                          setCancelConfirm({ questId: id, title: q?.title })
                        }}
                        isLoading={actionLoading === quest.id}
                        focused={focusQuestId === quest.id}
                        extraBadge={quest.impact?.label ? `Impact: ${quest.impact.label}` : 'High impact'}
                      />
                    ))}
                  </div>
                </section>
              )}

              <section className="mt-8">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    📍 Near You
                  </h2>
                  <button
                    onClick={handleLocationRequest}
                    disabled={locationLoading}
                    className="text-sm text-emerald-600 hover:text-emerald-700 disabled:opacity-50"
                  >
                    {locationLoading ? 'Getting location...' : 'Use my location'}
                  </button>
                </div>
                
                {locationError && (
                  <p className="text-sm text-amber-600 mb-3">{locationError}</p>
                )}

                {nearbyQuests && nearbyQuests.quests.length === 0 && (
                  <p className="text-sm text-gray-600">
                    No quests with location data yet. Browse all quests below.
                  </p>
                )}

                {nearbyQuests && nearbyQuests.quests.length > 0 && (
                  <>
                    {!nearbyQuests.baseIsUserLocation && (
                      <p className="text-sm text-gray-600 mb-3">
                        Showing quests near Cabiao center. Enable location for more accurate results.
                      </p>
                    )}
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                      {nearbyQuests.quests.map(quest => (
                        <QuestCard
                          key={quest.id}
                          quest={quest}
                          participation={participations[quest.id]}
                          onJoin={handleJoin}
                          onCancel={(id) => {
                            const q = quests.find(qu => qu.id === id)
                            setCancelConfirm({ questId: id, title: q?.title })
                          }}
                          isLoading={actionLoading === quest.id}
                          focused={focusQuestId === quest.id}
                          distanceKm={quest.distanceKm}
                        />
                      ))}
                    </div>
                  </>
                )}
              </section>
            </>
          )}

          <div id="all-quests" className="mt-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {activeTab === 'my' ? 'My Quests' : 'All Quests'}
            </h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {loading ? (
              <p className="col-span-full text-center text-gray-500">Loading quests...</p>
            ) : useMockData ? (
              activities.slice(0, 6).map((activity) => (
                <MockQuestCard key={activity.id} activity={activity} />
              ))
            ) : filteredQuests.length === 0 ? (
              <p className="col-span-full text-center text-gray-500">
                {activeTab === 'my' ? 'You haven\'t joined any quests yet.' : 'No active quests at the moment. Check back soon!'}
              </p>
            ) : (
              filteredQuests.map((quest) => (
                <QuestCard
                  key={quest.id}
                  quest={quest}
                  participation={participations[quest.id]}
                  onJoin={handleJoin}
                  onCancel={(id) => {
                    const q = quests.find(qu => qu.id === id)
                    setCancelConfirm({ questId: id, title: q?.title })
                  }}
                  isLoading={actionLoading === quest.id}
                  focused={focusQuestId === quest.id}
                />
              ))
            )}
            </div>
          </div>
        </div>
      </main>
      <Footer />

      <QuestOnboardingModal
        isOpen={showOnboarding}
        onClose={handleCloseOnboarding}
        featuredQuests={beginnerQuests}
        onJoinQuest={handleJoinFromOnboarding}
        onViewAllQuests={() => {
          setShowOnboarding(false)
          if (user && activeSeason) {
            setSeenOnboarding(user.uid, activeSeason.id)
          }
        }}
      />

      <CancelConfirmModal
        isOpen={!!cancelConfirm}
        onClose={() => setCancelConfirm(null)}
        onConfirm={handleCancel}
        isLoading={actionLoading !== null}
        questTitle={cancelConfirm?.title}
      />

      {toast && (
        <div className={`fixed bottom-4 right-4 px-4 py-3 rounded-lg shadow-lg z-50 ${
          toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'
        }`}>
          {toast.message}
        </div>
      )}
    </div>
  )
}

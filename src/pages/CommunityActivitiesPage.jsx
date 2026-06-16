import { useState, useEffect, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { Link, useSearchParams } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { useAuth } from '../contexts/AuthContext'
import { getActiveSeason, autoEndStaleSeasons, formatSeasonDate, toJSDate, getLastEndedSeason, getSeasonSummaryStats, getSeasonStatusConfig } from '../services/seasons.service'
import { listActiveQuestsBySeason } from '../services/quests.service'
import { 
  getUserParticipations, 
  joinQuest, 
  cancelQuest, 
  expireMyStaleParticipations,
  reconcileOverbookedQuestSlots,
} from '../services/participations.service'
import { listActiveOwnerQuests } from '../services/ownerQuests.service'
import { getUserJoinedQuestIds } from '../utils/userJoinedQuests'
import OwnerQuestCompactCard from '../components/owner/OwnerQuestCompactCard'
import { hasUserSeenOnboarding, setSeenOnboarding, getUserLocation, setUserLocation as saveUserLocation } from '../services/userSettings.service'
import { CABIAO_CENTER } from '../constants/cabiaoGeo'
import { auth } from '../lib/firebase'
import { getQuestSlotInfo } from '../utils/questSlots'
import EmailVerificationBanner from '../components/EmailVerificationBanner'
import { requireEmailVerified } from '../utils/requireEmailVerified'
import QuestOnboardingModal from '../components/QuestOnboardingModal'
import QRScannerModal from '../components/quest/QRScannerModal'
import EventCodeModal from '../components/quest/EventCodeModal'
import { getEffectiveVerificationMethod } from '../services/questVerification.service'

const TYPE_STYLES = {
  cleanup: 'bg-sky-500/10 text-sky-700 border-sky-200',
  tree_planting: 'bg-emerald-500/10 text-emerald-700 border-emerald-200',
  event: 'bg-amber-500/10 text-amber-700 border-amber-200',
}

const TYPE_LABELS = {
  cleanup: 'Clean-up',
  tree_planting: 'Tree planting',
  event: 'Event',
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

function QuestCard({
  quest,
  participation,
  onJoin,
  onCancel,
  isLoading,
  focused,
  distanceKm,
  extraBadge,
  onScanQR,
  onEnterCode,
  isJoined: propIsJoined,
}) {
  const typeStyle = TYPE_STYLES[quest.category] || 'bg-gray-100 text-gray-700 border-gray-200'
  const typeLabel = TYPE_LABELS[quest.category] || 'Quest'
  
  const questType = quest.questType || 'participate'
  const questTypeStyle = QUEST_TYPE_STYLES[questType] || QUEST_TYPE_STYLES.participate
  const questTypeLabel = QUEST_TYPE_LABELS[questType] || 'PARTICIPATE'

  const { capacity, reserved, slotsLeft, isFull } = getQuestSlotInfo(quest)

  const participationJoined = participation?.status === 'joined'
  const isJoined = propIsJoined || participationJoined
  const isCompleted = participation?.status === 'completed'
  const isCancelledOrExpired = participation?.status === 'cancelled' || participation?.status === 'expired'
  
  const formatDate = (dateStr) => {
    if (!dateStr) return 'No deadline'
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return 'No deadline'
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
    if (participationJoined) {
      onCancel(quest.id)
    } else if (!isCompleted && !isCancelledOrExpired && !propIsJoined) {
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
  const verifyMethod = getEffectiveVerificationMethod(quest)
  const pendingSelfReview =
    isJoined && participation?.verifiedAt && participation?.rewardStatus === 'pending'
  const venueName =
    quest.visit?.targetName || quest.buy?.businessName || quest.title

  return (
    <article 
      ref={focused ? (el) => el?.scrollIntoView({ behavior: 'smooth', block: 'center' }) : undefined}
      className={`relative flex flex-col overflow-hidden rounded-xl border bg-white shadow-sm transition hover:shadow-md ${
        focused
          ? 'border-emerald-400 ring-2 ring-emerald-200'
          : isJoined
          ? 'border-emerald-400 ring-1 ring-emerald-200'
          : 'border-gray-200'
      }`}
    >
      {isJoined && (
        <span className="absolute top-2 right-2 z-10 bg-emerald-600 text-white text-xs font-medium px-2 py-1 rounded-full shadow-sm flex items-center gap-1">
          <span>✅</span>
          <span>Joined</span>
        </span>
      )}
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
                <span>
                  Full ({reserved}/{capacity} joined)
                </span>
              ) : (
                <span>
                  {slotsLeft} slot{slotsLeft !== 1 ? 's' : ''} left ({reserved}/{capacity} joined)
                </span>
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

        {isJoined && !isCompleted && !isCancelledOrExpired && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <h4 className="font-semibold text-amber-900 text-sm mb-2">⏳ Ready to verify?</h4>
            {pendingSelfReview ? (
              <p className="text-sm text-amber-800">
                ✅ Submitted! LGU will review and release your points shortly.
              </p>
            ) : verifyMethod === 'qr' ? (
              <>
                <p className="text-sm text-amber-800 mb-3">
                  Find the QR code posted at <strong>{venueName}</strong> and scan it.
                </p>
                <button
                  type="button"
                  onClick={() => onScanQR?.(quest)}
                  className="w-full px-4 py-3 bg-emerald-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-emerald-700 min-h-[44px]"
                >
                  📱 Scan QR Code
                </button>
              </>
            ) : verifyMethod === 'code' ? (
              <>
                <p className="text-sm text-amber-800 mb-3">
                  Ask LGU staff at the event for today&apos;s code.
                </p>
                <button
                  type="button"
                  onClick={() => onEnterCode?.(quest)}
                  className="w-full px-4 py-3 bg-emerald-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-emerald-700 min-h-[44px]"
                >
                  🔢 Enter Event Code
                </button>
              </>
            ) : (
              <p className="text-sm text-amber-800">
                ✍️ LGU staff will verify you in person at check-in.
              </p>
            )}
          </div>
        )}
        
        <button
          type="button"
          onClick={handleAction}
          disabled={isLoading || isCompleted || isCancelledOrExpired || isJoined || (!isJoined && isFull)}
          className={`mt-4 inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-offset-2 ${
            isCompleted
              ? 'cursor-default bg-emerald-100 text-emerald-700'
              : isCancelledOrExpired
              ? 'cursor-default bg-gray-100 text-gray-400'
              : propIsJoined && !participationJoined
              ? 'cursor-default bg-gray-100 text-gray-500'
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
          ) : propIsJoined && !participationJoined ? (
            <span className="text-gray-500">✅ Already Joined</span>
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
  const { user, grandfatheredUnverified, loading: authLoading } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const focusQuestId = searchParams.get('focusQuestId')
  const activeTab = searchParams.get('tab') || 'community'

  const [lguQuests, setLguQuests] = useState([])
  const [ownerQuests, setOwnerQuests] = useState([])
  const [participations, setParticipations] = useState({})
  const [joinedIds, setJoinedIds] = useState({ lguIds: new Set(), ownerIds: new Set() })
  const [myQuestsFilter, setMyQuestsFilter] = useState('active')

  const [loadingLGU, setLoadingLGU] = useState(true)
  const [loadingOwner, setLoadingOwner] = useState(true)
  const [loadingJoined, setLoadingJoined] = useState(true)
  const [lguError, setLguError] = useState(null)
  const [ownerError, setOwnerError] = useState(null)

  const [actionLoading, setActionLoading] = useState(null)
  const [activeSeason, setActiveSeason] = useState(null)
  const [lastEndedSeason, setLastEndedSeason] = useState(null)
  const [seasonStats, setSeasonStats] = useState(null)
  const [toast, setToast] = useState(null)
  const [cancelConfirm, setCancelConfirm] = useState(null)

  const [showOnboarding, setShowOnboarding] = useState(false)
  const [userLocation, setUserLocation] = useState(null)
  const [locationLoading, setLocationLoading] = useState(false)
  const [locationError, setLocationError] = useState(null)
  const [showQRScanner, setShowQRScanner] = useState(false)
  const [codeQuest, setCodeQuest] = useState(null)

  const setTab = (tab) => {
    setSearchParams(prev => {
      const params = new URLSearchParams(prev)
      params.set('tab', tab)
      return params
    })
  }

  useEffect(() => {
    autoEndStaleSeasons().catch((err) => {
      console.warn('[Events] autoEndStaleSeasons failed (expected for non-admin):', err);
    });
  }, []);

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }

  /* Effect 1: Fetch LGU quests for active season */
  const loadLguQuests = useCallback(async () => {
    setLguError(null)
    try {
      if (user) {
        await auth.authStateReady()
      }
      const season = await getActiveSeason()
      if (season) {
        setActiveSeason(season)
        let questList = []
        try {
          questList = await listActiveQuestsBySeason(season.id)
        } catch (err) {
          throw err
        }
        if (questList.length > 0 && user) {
          questList = await reconcileOverbookedQuestSlots(questList)
          const userParts = await getUserParticipations(user.uid)
          const partsMap = {}
          userParts.forEach(p => {
            partsMap[p.questId] = p
          })
          setParticipations(partsMap)

          try {
            await expireMyStaleParticipations(user.uid)
          } catch (expireErr) {
            console.warn('Expire stale participations:', expireErr?.message || expireErr)
          }
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
        setLguQuests(questList)
      } else {
        setActiveSeason(null)
        const last = await getLastEndedSeason()
        setLastEndedSeason(last)
        if (last) {
          const stats = await getSeasonSummaryStats(last.id)
          setSeasonStats(stats)
        }
      }
    } catch (err) {
      const msg = err?.message || ''
      if (msg.includes('permission') || err?.code === 'permission-denied') {
        setLguError('Could not load quest data (Firestore permission).')
      } else if (msg.includes('BLOCKED') || msg.includes('network')) {
        setLguError('Firestore was blocked by a browser extension.')
      } else {
        setLguError(err?.message || 'Failed to load quests')
      }
    } finally {
      setLoadingLGU(false)
    }
  }, [user])

  useEffect(() => {
    if (authLoading) return
    loadLguQuests()
  }, [loadLguQuests, authLoading])

  /* Effect 2: Fetch owner quests (only when active season exists) */
  useEffect(() => {
    if (!activeSeason) {
      setOwnerQuests([])
      setOwnerError(null)
      setLoadingOwner(false)
      return
    }
    let cancelled = false
    setLoadingOwner(true)
    listActiveOwnerQuests()
      .then(data => {
        if (!cancelled) {
          const filtered = data.filter(q => !q.pausedBySeasonEnd)
          setOwnerQuests(filtered)
          setLoadingOwner(false)
        }
      })
      .catch(err => {
        if (!cancelled) {
          console.warn('[Events] Failed to load owner quests:', err)
          setOwnerError(err?.message || 'Failed to load owner quests')
          setLoadingOwner(false)
        }
      })
    return () => { cancelled = true }
  }, [activeSeason])

  /* Effect 3: Fetch user's joined quest IDs */
  useEffect(() => {
    if (!user) {
      setJoinedIds({ lguIds: new Set(), ownerIds: new Set() })
      setLoadingJoined(false)
      return
    }
    let cancelled = false
    setLoadingJoined(true)
    getUserJoinedQuestIds(user.uid)
      .then(ids => {
        if (!cancelled) {
          setJoinedIds(ids)
          setLoadingJoined(false)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLoadingJoined(false)
        }
      })
    return () => { cancelled = true }
  }, [user])

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

  const isQuestActiveNow = useCallback((quest) => {
    if (!quest) return false
    if (quest.status !== 'active') return false

    const now = new Date()
    const startAt = toJSDate(quest.startAt)
    const endAt = toJSDate(quest.endAt)
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

  const finishingSoonQuests = useMemo(() => {
    return lguQuests
      .filter((q) => q.endAt && isQuestActiveNow(q))
      .sort((a, b) => (toJSDate(a.endAt) || 0) - (toJSDate(b.endAt) || 0))
      .slice(0, 5)
  }, [lguQuests, isQuestActiveNow])

  const highImpactQuests = useMemo(() => {
    return lguQuests
      .filter(
        (q) =>
          isQuestActiveNow(q) &&
          q.impact &&
          q.impact.amountPerCompletion &&
          q.impact.amountPerCompletion >= 2
      )
      .sort((a, b) => (b.impact?.amountPerCompletion || 0) - (a.impact?.amountPerCompletion || 0))
      .slice(0, 6)
  }, [lguQuests, isQuestActiveNow])

  const nearbyQuests = useMemo(() => {
    const allWithLocation = [...lguQuests, ...ownerQuests]

    const base =
      userLocation && typeof userLocation.lat === 'number' && typeof userLocation.lng === 'number'
        ? { lat: userLocation.lat, lng: userLocation.lng, isUser: true }
        : { lat: CABIAO_CENTER[0], lng: CABIAO_CENTER[1], isUser: false }

    const withLocation = allWithLocation.filter((q) => {
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
  }, [lguQuests, ownerQuests, userLocation, isQuestActiveNow])

  const beginnerQuests = useMemo(() => {
    return lguQuests
      .filter(q => {
        const { slotsLeft, isFull } = getQuestSlotInfo(q)
        return !isFull && slotsLeft > 0 && isQuestActiveNow(q)
      })
      .sort((a, b) => (a.points || 0) - (b.points || 0))
      .slice(0, 3)
  }, [lguQuests, isQuestActiveNow])

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

  const refreshParticipations = async () => {
    if (!user) return
    const userParts = await getUserParticipations(user.uid)
    const partsMap = {}
    userParts.forEach((p) => {
      partsMap[p.questId] = p
    })
    setParticipations(partsMap)
  }

  const handleVerifySuccess = async (result) => {
    await refreshParticipations()
    if (result.autoApproved) {
      showToast(`🎉 Quest completed! You earned ${result.points} QP!`, 'success')
    } else {
      showToast('✅ Submitted! LGU will review and release your points shortly.', 'success')
    }
  }

  const handleJoin = async (questId) => {
    if (!user) return
    if (!requireEmailVerified(user, showToast)) {
      setActionLoading(null)
      return
    }
    setActionLoading(questId)

    try {
      await auth.authStateReady()
      const quest = lguQuests.find(q => q.id === questId)
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
      showToast(err.message ?? 'Failed to join quest', 'error')
    } finally {
      setActionLoading(null)
    }
  }

  const handleCancel = async () => {
    if (!user || !cancelConfirm) return
    const questId = cancelConfirm.questId
    
    setActionLoading(questId)
    
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
      showToast(err.message ?? 'Failed to cancel quest', 'error')
    } finally {
      setActionLoading(null)
    }
  }

  const getSeasonCountdown = () => {
    if (!activeSeason?.endAt) return null
    const endDate = toJSDate(activeSeason.endAt)
    if (!endDate) return null
    const now = new Date()
    const daysLeft = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24))
    if (daysLeft <= 0) return 'Season ended'
    return `Ends in ${daysLeft} day${daysLeft > 1 ? 's' : ''}`
  }

  const handleCancelById = (id) => {
    const q = lguQuests.find(qu => qu.id === id)
    setCancelConfirm({ questId: id, title: q?.title })
  }

  const questVerifyProps = {
    onScanQR: () => {
      if (!user) {
        showToast('Sign in to verify quests', 'error')
        return
      }
      setShowQRScanner(true)
    },
    onEnterCode: (q) => {
      if (!user) {
        showToast('Sign in to verify quests', 'error')
        return
      }
      setCodeQuest(q)
    },
  }

  const communityCount = lguQuests.length
  const businessCount = ownerQuests.length
  const myQuestsCount = joinedIds.lguIds.size + joinedIds.ownerIds.size

  function TabButton({ tab, label, count }) {
    const isActive = activeTab === tab
    return (
      <button
        onClick={() => setTab(tab)}
        className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
          isActive
            ? 'border-emerald-600 text-emerald-700'
            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
        }`}
      >
        {label}
        {count > 0 && (
          <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
            isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'
          }`}>
            {count}
          </span>
        )}
      </button>
    )
  }

  function FilterChip({ active, onClick, children }) {
    return (
      <button
        onClick={onClick}
        className={`px-3 py-1.5 text-sm font-medium rounded-lg transition ${
          active
            ? 'bg-emerald-600 text-white shadow-sm'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }`}
      >
        {children}
      </button>
    )
  }

  function MyQuestsTab({ lguQuests: lgu, ownerQuests: owner, joinedIds: ids, participations: parts, filter: mFilter, onFilterChange, setTab: switchTab }) {
    if (!user) {
      return (
        <div className="text-center py-12 text-gray-500">
          <p>Sign in to see your quests.</p>
        </div>
      )
    }

    const myLgu = lgu
      .filter(q => ids.lguIds.has(q.id))
      .map(q => ({ ...q, _type: 'community' }))

    const myOwner = owner
      .filter(q => ids.ownerIds.has(q.id))
      .map(q => ({ ...q, _type: 'business' }))

    let combined = [...myLgu, ...myOwner]

    if (mFilter === 'active') {
      combined = combined.filter(q => {
        if (q._type === 'community') {
          const p = parts[q.id]
          return p && (p.status === 'joined' || p.status === 'active' || p.status === 'paused')
        }
        return true
      })
    } else if (mFilter === 'completed') {
      combined = combined.filter(q => {
        if (q._type === 'community') {
          const p = parts[q.id]
          return p && p.status === 'completed'
        }
        return false
      })
    }

    if (combined.length === 0) {
      return (
        <div className="text-center py-12 text-gray-500">
          <p className="mb-2">You haven't joined any quests yet.</p>
          <button
            onClick={() => switchTab('community')}
            className="text-emerald-600 hover:underline"
          >
            Browse community quests →
          </button>
        </div>
      )
    }

    return (
      <div>
        <div className="flex gap-2 mb-4">
          <FilterChip active={mFilter === 'active'} onClick={() => onFilterChange('active')}>Active</FilterChip>
          <FilterChip active={mFilter === 'completed'} onClick={() => onFilterChange('completed')}>Completed</FilterChip>
          <FilterChip active={mFilter === 'all'} onClick={() => onFilterChange('all')}>All</FilterChip>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {combined.map(quest => (
            <div key={`${quest._type}-${quest.id}`} className="relative">
              <span className={`absolute top-2 left-2 z-10 text-xs font-medium px-2 py-0.5 rounded-full ${
                quest._type === 'community'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800'
              }`}>
                {quest._type === 'community' ? 'Community' : 'Business'}
              </span>

              {quest._type === 'community' ? (
                <QuestCard
                  quest={quest}
                  participation={parts[quest.id]}
                  onJoin={handleJoin}
                  onCancel={handleCancelById}
                  isLoading={actionLoading === quest.id}
                  focused={focusQuestId === quest.id}
                  isJoined={true}
                  {...questVerifyProps}
                />
              ) : (
                <OwnerQuestCompactCard
                  quest={quest}
                  businessId={quest.businessId}
                  businessName={quest.businessName}
                  businessImage={quest.businessImage}
                  isJoined={true}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 pb-mobile-nav">
        {grandfatheredUnverified && <EmailVerificationBanner />}
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

          {!activeSeason && !loadingLGU ? (
            <div className="mt-6">
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-800">
                <div className="flex items-start gap-3">
                  <span className="text-2xl shrink-0">⏸️</span>
                  <div>
                    <div className="font-semibold text-lg">No Active Season</div>
                    <p className="mt-1 text-sm">
                      Seasonal quests are only available during an active tourism season. Please check back when the next season opens.
                    </p>
                  </div>
                </div>
              </div>

              {lastEndedSeason && (
                <div className="mt-8">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Last Season Recap</h2>
                  <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-wrap items-center gap-3 mb-4">
                      <h3 className="text-xl font-bold text-gray-900">{lastEndedSeason.name}</h3>
                      <span className={`inline-flex items-center rounded-full border px-3 py-0.5 text-xs font-medium ${getSeasonStatusConfig('ended').bg} ${getSeasonStatusConfig('ended').text} ${getSeasonStatusConfig('ended').dot ? '' : ''}`}>
                        Ended
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">
                      {formatSeasonDate(lastEndedSeason.startAt, '—')} — {formatSeasonDate(lastEndedSeason.endAt, '—')}
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      <div className="rounded-lg bg-gray-50 p-3 text-center">
                        <div className="text-2xl font-bold text-gray-900">{seasonStats?.totalParticipants || 0}</div>
                        <div className="text-xs text-gray-600 mt-1">Participants</div>
                      </div>
                      <div className="rounded-lg bg-gray-50 p-3 text-center">
                        <div className="text-2xl font-bold text-gray-900">{seasonStats?.totalQuestsCompleted || 0}</div>
                        <div className="text-xs text-gray-600 mt-1">Quests Completed</div>
                      </div>
                      {seasonStats?.impactByUnit && Object.entries(seasonStats.impactByUnit).filter(([, v]) => v > 0).map(([unit, amount]) => {
                        const unitConfig = IMPACT_UNIT_CONFIG[unit] || { label: unit, icon: '🌱' }
                        return (
                          <div key={unit} className="rounded-lg bg-gray-50 p-3 text-center">
                            <div className="text-2xl font-bold text-gray-900">{amount}</div>
                            <div className="text-xs text-gray-600 mt-1">{unitConfig.icon} {unitConfig.label}</div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}

              {!lastEndedSeason && (
                <div className="mt-8 text-center py-12 text-gray-500">
                  <p>No seasons have run yet.</p>
                </div>
              )}

              <div className="mt-8 rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-center">
                <p className="text-emerald-800 font-medium">
                  Quests are only available during an active tourism season. Please check back when the next season opens.
                </p>
              </div>
            </div>
          ) : activeSeason ? (
            <>
              <div className="mt-4 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-emerald-800 font-medium">Season: </span>
                    <strong className="text-emerald-900">{activeSeason.name}</strong>
                    <span className="text-emerald-600 ml-2">
                      ({formatSeasonDate(activeSeason.startAt, 'TBD')} - {formatSeasonDate(activeSeason.endAt, 'TBD')})
                    </span>
                  </div>
                  <span className="text-sm font-medium text-emerald-700">
                    {getSeasonCountdown()}
                  </span>
                </div>
              </div>

              {/* Near You — pinned above tabs */}
              <section className="mt-8 mb-6">
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
                    No quests with location data yet. Browse quests below.
                  </p>
                )}

                {nearbyQuests && nearbyQuests.quests.length > 0 && (
                  <>
                    {!nearbyQuests.baseIsUserLocation && (
                      <p className="text-sm text-gray-600 mb-3">
                        Showing quests near Cabiao center. Enable location for more accurate results.
                      </p>
                    )}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {nearbyQuests.quests.map(quest => (
                        quest.questType === 'visit' || quest.questType === 'buy' ? (
                          <OwnerQuestCompactCard
                            key={quest.id}
                            quest={quest}
                            businessId={quest.businessId}
                            businessName={quest.businessName}
                            businessImage={quest.businessImage}
                            isJoined={joinedIds.ownerIds.has(quest.id)}
                          />
                        ) : (
                          <QuestCard
                            key={quest.id}
                            quest={quest}
                            participation={participations[quest.id]}
                            onJoin={handleJoin}
                            onCancel={handleCancelById}
                            isLoading={actionLoading === quest.id}
                            focused={focusQuestId === quest.id}
                            distanceKm={quest.distanceKm}
                            isJoined={joinedIds.lguIds.has(quest.id)}
                            {...questVerifyProps}
                          />
                        )
                      ))}
                    </div>
                  </>
                )}
              </section>

              {/* Tab navigation */}
              <div className="border-b border-gray-200 mb-6">
                <nav className="flex gap-1 -mb-px overflow-x-auto">
                  <TabButton tab="community" label="Community Quests" count={communityCount} />
                  <TabButton tab="business" label="Business Quests" count={businessCount} />
                  <TabButton tab="my" label="My Quests" count={myQuestsCount} />
                </nav>
              </div>

              {/* Community Quests Tab */}
              {activeTab === 'community' && (
                <div>
                  {loadingLGU ? (
                    <p className="text-center text-gray-500 py-8">Loading quests...</p>
                  ) : lguError ? (
                    <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3">
                      <p className="text-sm text-red-700">{lguError}</p>
                      <button
                        onClick={() => { setLoadingLGU(true); loadLguQuests(); }}
                        className="mt-2 text-sm font-medium text-red-700 underline hover:text-red-800"
                      >
                        Try again
                      </button>
                    </div>
                  ) : lguQuests.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">No quests in this season yet.</p>
                  ) : (
                    <>
                      {finishingSoonQuests.length > 0 && (
                        <section className="mb-8">
                          <div className="flex items-center justify-between mb-3">
                            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                              ⏰ Finishing Soon
                            </h2>
                          </div>
                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {finishingSoonQuests.map(quest => {
                              const endAt = toJSDate(quest.endAt)
                              let daysLabel = null
                              if (endAt) {
                                const now = new Date()
                                const daysLeft = Math.max(0, Math.ceil((endAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
                                daysLabel = daysLeft <= 0 ? 'Ends today' : `Ends in ${daysLeft} day${daysLeft > 1 ? 's' : ''}`
                              }
                              return (
                                <QuestCard
                                  key={quest.id}
                                  quest={quest}
                                  participation={participations[quest.id]}
                                  onJoin={handleJoin}
                                  onCancel={handleCancelById}
                                  isLoading={actionLoading === quest.id}
                                  focused={focusQuestId === quest.id}
                                  extraBadge={daysLabel}
                                  isJoined={joinedIds.lguIds.has(quest.id)}
                                  {...questVerifyProps}
                                />
                              )
                            })}
                          </div>
                        </section>
                      )}

                      {highImpactQuests.length > 0 && (
                        <section className="mb-8">
                          <div className="flex items-center justify-between mb-3">
                            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                              🌱 High Impact
                            </h2>
                          </div>
                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {highImpactQuests.map(quest => (
                              <QuestCard
                                key={quest.id}
                                quest={quest}
                                participation={participations[quest.id]}
                                onJoin={handleJoin}
                                onCancel={handleCancelById}
                                isLoading={actionLoading === quest.id}
                                focused={focusQuestId === quest.id}
                                extraBadge={quest.impact?.label ? `Impact: ${quest.impact.label}` : 'High impact'}
                                isJoined={joinedIds.lguIds.has(quest.id)}
                                {...questVerifyProps}
                              />
                            ))}
                          </div>
                        </section>
                      )}

                      <section>
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">All Community Quests</h2>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                          {lguQuests.map(quest => (
                            <QuestCard
                              key={quest.id}
                              quest={quest}
                              participation={participations[quest.id]}
                              onJoin={handleJoin}
                              onCancel={handleCancelById}
                              isLoading={actionLoading === quest.id}
                              focused={focusQuestId === quest.id}
                              isJoined={joinedIds.lguIds.has(quest.id)}
                              {...questVerifyProps}
                            />
                          ))}
                        </div>
                      </section>
                    </>
                  )}
                </div>
              )}

              {/* Business Quests Tab */}
              {activeTab === 'business' && (
                <div>
                  {loadingOwner ? (
                    <p className="text-center text-gray-500 py-8">Loading business quests...</p>
                  ) : ownerError ? (
                    <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3">
                      <p className="text-sm text-red-700">{ownerError}</p>
                    </div>
                  ) : ownerQuests.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">No business quests available yet.</p>
                  ) : (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {ownerQuests.map(quest => (
                        <OwnerQuestCompactCard
                          key={quest.id}
                          quest={quest}
                          businessId={quest.businessId}
                          businessName={quest.businessName}
                          businessImage={quest.businessImage}
                          isJoined={joinedIds.ownerIds.has(quest.id)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* My Quests Tab */}
              {activeTab === 'my' && (
                <MyQuestsTab
                  lguQuests={lguQuests}
                  ownerQuests={ownerQuests}
                  joinedIds={joinedIds}
                  participations={participations}
                  filter={myQuestsFilter}
                  onFilterChange={setMyQuestsFilter}
                  setTab={setTab}
                />
              )}
            </>
          ) : null}
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

      <QRScannerModal
        isOpen={showQRScanner}
        onClose={() => setShowQRScanner(false)}
        onSuccess={handleVerifySuccess}
      />

      <EventCodeModal
        isOpen={!!codeQuest}
        quest={codeQuest}
        onClose={() => setCodeQuest(null)}
        onSuccess={handleVerifySuccess}
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

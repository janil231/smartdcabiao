import { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  getOwnerQuestParticipation,
  joinOwnerQuest,
  startOwnerQuestTimer,
  pauseOwnerQuestTimer,
  resumeOwnerQuestTimer,
  completeOwnerQuest,
  cancelOwnerQuestParticipation,
} from '../../services/ownerQuests.service'
import { getMyBusinessQuestRewards } from '../../services/businessQuestRewards.service'
import BuyQuestScannerModal from './BuyQuestScannerModal'
import BuyQuestCodeModal from './BuyQuestCodeModal'
import QuestDetailsPanel from './QuestDetailsPanel'

const GEOFENCE_RADIUS_METERS = 150

function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function formatRewardText(quest) {
  if (quest.rewardType === 'discount_percent') return `${quest.rewardValue}% off ${quest.rewardItemName || 'items'}`
  if (quest.rewardType === 'discount_fixed') return `₱${quest.rewardValue} off ${quest.rewardItemName || 'items'}`
  if (quest.rewardType === 'free_item') return `Free ${quest.rewardItemName || 'item'}`
  if (quest.rewardType === 'bogo') return `Buy 1 Get 1 on ${quest.rewardItemName || 'items'}`
  return 'Reward'
}

function formatTime(sec) {
  if (sec === null || sec === undefined) return '--:--'
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function formatDistance(m) {
  if (m === null) return null
  if (m < 1000) return `${Math.round(m)}m away`
  return `${(m / 1000).toFixed(1)}km away`
}

export default function OwnerQuestPublicCard({ quest, business, currentUser, onPhoto = false, onLoginRequired }) {
  const [participation, setParticipation] = useState(null)
  const [reward, setReward] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')

  const [userLocation, setUserLocation] = useState(null)
  const [distanceMeters, setDistanceMeters] = useState(null)
  const watchIdRef = useRef(null)

  const [remainingSeconds, setRemainingSeconds] = useState(null)
  const tickerRef = useRef(null)

  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const [showCodeModal, setShowCodeModal] = useState(false)

  const geofenceStateRef = useRef(null)
  const autoCompleteTriggeredRef = useRef(false)
  const reloadPromiseRef = useRef(null)

  const reloadParticipation = async () => {
    if (!currentUser?.uid) return
    reloadPromiseRef.current = (async () => {
      try {
        const p = await getOwnerQuestParticipation(currentUser.uid, quest.id)
        setParticipation(p)
        if (p?.status === 'completed') {
          const rewards = await getMyBusinessQuestRewards(currentUser.uid)
          const matching = rewards.find(r => r.questId === quest.id)
          setReward(matching || null)
        }
      } catch (err) {
        console.error('[OwnerQuestPublicCard] reload failed:', err)
      }
    })()
    return reloadPromiseRef.current
  }

  useEffect(() => {
    reloadParticipation()
  }, [currentUser?.uid, quest.id])

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const status = participation?.status
  const timerStatus = participation?.timerStatus

  const isCompleted = status === 'completed'
  const isActive = status === 'active' && timerStatus === 'running'
  const isPaused = status === 'active' && timerStatus === 'paused'
  const isJoinedIdle = (status === 'active' || status === 'joined') && (timerStatus === 'idle' || timerStatus === undefined || timerStatus === null)
  const isNotJoined = !participation || status === 'cancelled'
  const isBuyQuest = quest.questType === 'buy'

  const isJoined = !isNotJoined && !isCompleted

  useEffect(() => {
    if (!currentUser?.uid || !isJoined || isCompleted) {
      if (watchIdRef.current && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
      if (!isJoined) {
        setUserLocation(null)
        setDistanceMeters(null)
        geofenceStateRef.current = null
      }
      return
    }

    if (!navigator.geolocation) {
      return
    }

    const bizPos = business?.position
    if (!bizPos) return

    const bizLat = Array.isArray(bizPos) ? bizPos[0] : bizPos.lat
    const bizLng = Array.isArray(bizPos) ? bizPos[1] : bizPos.lng
    if (bizLat === undefined || bizLng === undefined) return

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        setUserLocation({ lat: latitude, lng: longitude })

        const dist = haversineDistance(latitude, longitude, bizLat, bizLng)
        setDistanceMeters(dist)

        const inside = dist <= GEOFENCE_RADIUS_METERS
        const prev = geofenceStateRef.current

        if (isActive && prev === 'inside' && !inside) {
          geofenceStateRef.current = 'outside'
          pauseOwnerQuestTimer(currentUser.uid, quest.id)
            .then(reloadParticipation)
            .catch(err => console.error('Auto-pause failed:', err))
        } else if (isPaused && prev === 'outside' && inside) {
          geofenceStateRef.current = 'inside'
          resumeOwnerQuestTimer(currentUser.uid, quest.id)
            .then(reloadParticipation)
            .catch(err => console.error('Auto-resume failed:', err))
        } else if (isActive) {
          geofenceStateRef.current = inside ? 'inside' : 'outside'
        } else if (isPaused) {
          geofenceStateRef.current = inside ? 'inside' : 'outside'
        } else {
          geofenceStateRef.current = inside ? 'inside' : 'outside'
        }
      },
      (err) => {
        if (err.code === 1) {
          console.warn('[OwnerQuestPublicCard] Geolocation permission denied')
        }
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    )

    return () => {
      if (watchIdRef.current && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
    }
  }, [currentUser?.uid, isJoined, isCompleted, isActive, isPaused, quest.id, business?.position])

  useEffect(() => {
    if (!participation || status !== 'active') {
      setRemainingSeconds(null)
      return
    }

    const requiredSec = (quest.requiredDurationMinutes || 0) * 60

    const computeRemaining = () => {
      const accumulated = participation.accumulatedSeconds || 0
      let elapsed = accumulated
      if (timerStatus === 'running' && participation.questStartedAt) {
        let startMs = Date.now()
        if (participation.questStartedAt?.toMillis) {
          startMs = participation.questStartedAt.toMillis()
        } else if (participation.questStartedAt?.seconds) {
          startMs = participation.questStartedAt.seconds * 1000
        }
        const liveSeconds = Math.floor((Date.now() - startMs) / 1000)
        elapsed = accumulated + liveSeconds
      }
      const remaining = Math.max(0, requiredSec - elapsed)
      setRemainingSeconds(remaining)

      if (remaining === 0 && timerStatus === 'running' && !autoCompleteTriggeredRef.current) {
        if (distanceMeters !== null && distanceMeters <= GEOFENCE_RADIUS_METERS) {
          autoCompleteTriggeredRef.current = true
          completeOwnerQuest(currentUser.uid, quest.id)
            .then(() => {
              showToast('Reward earned! Check your code below')
              reloadParticipation()
            })
            .catch((err) => {
              console.error('Auto-complete failed:', err)
              autoCompleteTriggeredRef.current = false
            })
        }
      }
    }

    computeRemaining()
    tickerRef.current = setInterval(computeRemaining, 1000)

    return () => {
      if (tickerRef.current) clearInterval(tickerRef.current)
    }
  }, [participation, status, timerStatus, distanceMeters])

  const handleJoin = async () => {
    if (!currentUser?.uid) {
      if (onLoginRequired) onLoginRequired()
      return
    }
    setLoading(true)
    setError('')
    try {
      await joinOwnerQuest(currentUser.uid, currentUser.email, quest.id)
      await reloadParticipation()
      showToast('Quest joined! Visit the business to start')
    } catch (err) {
      setError(err.message || 'Failed to join quest')
    } finally {
      setLoading(false)
    }
  }

  const handleStart = async () => {
    if (!currentUser?.uid) return
    if (distanceMeters !== null && distanceMeters > GEOFENCE_RADIUS_METERS) {
      setError(`You need to be within ${GEOFENCE_RADIUS_METERS}m to start`)
      return
    }
    setLoading(true)
    setError('')
    try {
      await startOwnerQuestTimer(currentUser.uid, quest.id)
      await reloadParticipation()
      showToast('Timer started! Stay within 150m')
    } catch (err) {
      setError(err.message || 'Failed to start')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = async () => {
    setLoading(true)
    setError('')
    try {
      await cancelOwnerQuestParticipation(currentUser.uid, quest.id)
      await reloadParticipation()
      setShowCancelConfirm(false)
      showToast('Quest cancelled')
    } catch (err) {
      setError(err.message || 'Failed to cancel')
    } finally {
      setLoading(false)
    }
  }

  const handleVerificationSuccess = async () => {
    setShowScanner(false)
    setShowCodeModal(false)
    showToast('Quest verified! Reward earned!')
    await reloadParticipation()
  }

  const handleCopyCode = () => {
    if (!reward?.code) return
    navigator.clipboard.writeText(reward.code)
    showToast('Code copied!')
  }

  const rewardText = formatRewardText(quest)
  const cardBg = onPhoto ? 'bg-white/95 backdrop-blur' : 'bg-white border border-emerald-300'

  return (
    <>
    <div className={`rounded-xl p-4 ${cardBg}`}>
      {toast && (
        <div className="mb-3 p-2 bg-emerald-50 text-emerald-800 text-xs font-semibold rounded-lg text-center">
          {toast}
        </div>
      )}

      {/* STATE 1 — Not Joined */}
      {isNotJoined && (
        <>
          <h3 className="font-bold text-gray-900 text-sm mb-1">{quest.title}</h3>
          <p className="text-xs text-gray-600 line-clamp-2 mb-3">{quest.description}</p>
          <div className="flex flex-wrap items-center gap-1.5 mb-3">
            <span className="bg-emerald-100 text-emerald-700 text-xs font-semibold px-2 py-0.5 rounded-full">
              {quest.questType === 'visit' ? `${quest.requiredDurationMinutes} min` : 'Buy'}
            </span>
            <span className="text-xs font-bold text-amber-700">{rewardText}</span>
          </div>
          <div className="mb-3">
            <QuestDetailsPanel quest={quest} />
          </div>
          {currentUser ? (
            <button
              onClick={handleJoin}
              disabled={loading}
              className="w-full bg-emerald-600 text-white text-sm font-bold py-2.5 rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition"
            >
              {loading ? 'Joining...' : 'Join Quest'}
            </button>
          ) : onLoginRequired ? (
            <button
              onClick={onLoginRequired}
              className="w-full bg-emerald-600 text-white text-sm font-bold py-2.5 rounded-lg hover:bg-emerald-700 transition"
            >
              Sign in to join
            </button>
          ) : (
            <Link
              to="/login"
              className="block w-full text-center bg-emerald-600 text-white text-sm font-bold py-2.5 rounded-lg hover:bg-emerald-700 transition"
            >
              Sign in to join
            </Link>
          )}
        </>
      )}

      {/* STATE 2 — Joined Idle (Visit) */}
      {isJoinedIdle && !isBuyQuest && (
        <>
          <div className="text-xs font-bold text-emerald-700 mb-1">You've joined this quest</div>
          <h3 className="font-bold text-gray-900 text-sm mb-2">{quest.title}</h3>
          <div className="flex flex-wrap items-center gap-1.5 mb-3">
            <span className="bg-emerald-100 text-emerald-700 text-xs font-semibold px-2 py-0.5 rounded-full">
              {quest.requiredDurationMinutes} min
            </span>
            <span className="text-xs font-bold text-amber-700">{rewardText}</span>
          </div>

          <div className="mb-3">
            <QuestDetailsPanel quest={quest} />
          </div>

          {distanceMeters === null ? (
            <div className="mb-3 p-2 bg-gray-50 text-gray-600 text-xs rounded-lg">
              Detecting your location...
            </div>
          ) : distanceMeters <= GEOFENCE_RADIUS_METERS ? (
            <div className="mb-3 p-2 bg-emerald-50 text-emerald-800 text-xs rounded-lg">
              You're at the location! Tap Start Quest below
            </div>
          ) : (
            <div className="mb-3 p-2 bg-amber-50 text-amber-800 text-xs rounded-lg">
              You're {formatDistance(distanceMeters)}. Visit the location to start
            </div>
          )}

          <button
            onClick={handleStart}
            disabled={loading || distanceMeters === null || distanceMeters > GEOFENCE_RADIUS_METERS}
            className="w-full bg-emerald-600 text-white text-sm font-bold py-2.5 rounded-lg hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition mb-2"
          >
            {loading ? 'Starting...' : 'Start Quest'}
          </button>

          <button
            onClick={() => setShowCancelConfirm(true)}
            className="w-full text-xs text-gray-500 hover:text-red-600 underline"
          >
            Cancel Quest
          </button>
        </>
      )}

      {/* STATE 2b — Joined Idle (Buy) */}
      {isJoinedIdle && isBuyQuest && (
        <>
          <div className="text-xs font-bold text-purple-700 mb-1">You've joined this buy quest</div>
          <h3 className="font-bold text-gray-900 text-sm mb-1">{quest.title}</h3>
          <div className="flex flex-wrap items-center gap-1.5 mb-3">
            <span className="bg-purple-100 text-purple-700 text-xs font-semibold px-2 py-0.5 rounded-full">
              Buy
            </span>
            <span className="text-xs font-bold text-amber-700">{rewardText}</span>
          </div>

          <div className="mb-3">
            <QuestDetailsPanel quest={quest} />
          </div>

          {distanceMeters === null ? (
            <div className="mb-3 p-2 bg-gray-50 text-gray-600 text-xs rounded-lg">
              Detecting your location...
            </div>
          ) : distanceMeters <= GEOFENCE_RADIUS_METERS ? (
            <div className="mb-3 p-2 bg-emerald-50 text-emerald-800 text-xs rounded-lg">
              You're at the location! Ready to redeem
            </div>
          ) : (
            <div className="mb-3 p-2 bg-amber-50 text-amber-800 text-xs rounded-lg">
              You're {formatDistance(distanceMeters)}. Visit the location to redeem
            </div>
          )}

          <button
            onClick={() => setShowScanner(true)}
            disabled={loading || distanceMeters === null || distanceMeters > GEOFENCE_RADIUS_METERS}
            className="w-full bg-emerald-600 text-white text-sm font-bold py-2.5 rounded-lg hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition mb-2"
          >
            Scan Merchant QR Code
          </button>

          <button
            onClick={() => setShowCodeModal(true)}
            disabled={loading || distanceMeters === null || distanceMeters > GEOFENCE_RADIUS_METERS}
            className="w-full bg-white border border-gray-300 text-gray-700 text-sm font-semibold py-2 rounded-lg hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed transition mb-2"
          >
            Enter Code Instead
          </button>

          {distanceMeters !== null && distanceMeters > GEOFENCE_RADIUS_METERS && (
            <div className="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-xs font-semibold text-gray-700 mb-1">How it works:</p>
              <ol className="text-xs text-gray-600 space-y-1 list-decimal ml-4">
                <li>Visit the business</li>
                <li>Buy the item</li>
                <li>Ask staff to show the quest QR</li>
                <li>Scan to claim your reward</li>
              </ol>
            </div>
          )}

          <button
            onClick={() => setShowCancelConfirm(true)}
            className="w-full text-xs text-gray-500 hover:text-red-600 underline"
          >
            Cancel Quest
          </button>
        </>
      )}

      {/* STATE 3 — Active (Running) */}
      {isActive && (
        <>
          <div className="text-xs font-bold text-emerald-700 mb-1">Timer Running</div>
          <h3 className="font-bold text-gray-900 text-sm mb-3">{quest.title}</h3>
          <div className="mb-3">
            <QuestDetailsPanel quest={quest} />
          </div>
          <div className="text-center py-4 mb-3 bg-emerald-50 rounded-xl">
            <div className="text-4xl font-bold text-emerald-700 font-mono">
              {formatTime(remainingSeconds)}
            </div>
            <div className="text-xs text-emerald-600 mt-1">remaining</div>
          </div>
          <div className="mb-3 p-2 bg-emerald-50 text-emerald-800 text-xs rounded-lg text-center">
            You're at the location
          </div>
          <button
            onClick={() => setShowCancelConfirm(true)}
            className="w-full text-xs text-gray-500 hover:text-red-600 underline"
          >
            Cancel Quest
          </button>
        </>
      )}

      {/* STATE 3b — Paused */}
      {isPaused && (
        <>
          <div className="text-xs font-bold text-amber-700 mb-1">Timer Paused</div>
          <h3 className="font-bold text-gray-900 text-sm mb-3">{quest.title}</h3>
          <div className="mb-3">
            <QuestDetailsPanel quest={quest} />
          </div>
          <div className="text-center py-4 mb-3 bg-amber-50 rounded-xl">
            <div className="text-4xl font-bold text-amber-700 font-mono">
              {formatTime(remainingSeconds)}
            </div>
            <div className="text-xs text-amber-600 mt-1">paused</div>
          </div>
          <div className="mb-3 p-2 bg-amber-50 text-amber-800 text-xs rounded-lg">
            You left the area. Return to resume the timer
          </div>
          <button
            onClick={() => setShowCancelConfirm(true)}
            className="w-full text-xs text-gray-500 hover:text-red-600 underline"
          >
            Cancel Quest
          </button>
        </>
      )}

      {/* STATE 4 — Completed */}
      {isCompleted && (
        <>
          <div className="text-center mb-3">
            <div className="text-3xl mb-1">🎉</div>
            <div className="text-sm font-bold text-emerald-700">Quest Complete!</div>
          </div>
          <h3 className="font-bold text-gray-900 text-sm mb-3 text-center">{quest.title}</h3>
          <div className="mb-3">
            <QuestDetailsPanel quest={quest} compact={true} />
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3">
            <div className="text-xs font-bold text-amber-700 uppercase mb-1">Your Reward</div>
            <div className="font-bold text-amber-900 text-sm">{rewardText}</div>
          </div>
          {reward?.code && (
            <>
              <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-3 mb-2 text-center">
                <div className="text-xs font-bold text-gray-500 uppercase mb-1">Reward Code</div>
                <div className="font-mono font-bold text-base text-gray-900 tracking-wider mb-2">
                  {reward.code}
                </div>
                <button
                  onClick={handleCopyCode}
                  className="text-xs bg-emerald-600 text-white px-3 py-1 rounded-md hover:bg-emerald-700"
                >
                  Copy Code
                </button>
              </div>
              {business?.name && (
                <p className="text-xs text-gray-600 text-center mb-3">
                  Show this to staff at <strong>{business.name}</strong> to redeem
                </p>
              )}
            </>
          )}
          <Link
            to="/profile?tab=rewards"
            className="block text-center text-xs font-semibold text-emerald-700 hover:underline"
          >
            View All My Rewards →
          </Link>
        </>
      )}

      {error && (
        <div className="mt-2 p-2 bg-red-50 text-red-700 text-xs rounded-lg">
          {error}
        </div>
      )}

      {showCancelConfirm && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-xs text-red-800 mb-2 font-semibold">
            Cancel this quest? You'll lose any timer progress.
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleCancel}
              disabled={loading}
              className="flex-1 bg-red-600 text-white text-xs font-bold py-1.5 rounded-md hover:bg-red-700 disabled:opacity-50"
            >
              Yes, cancel
            </button>
            <button
              onClick={() => setShowCancelConfirm(false)}
              className="flex-1 bg-gray-200 text-gray-700 text-xs font-bold py-1.5 rounded-md hover:bg-gray-300"
            >
              Keep quest
            </button>
          </div>
        </div>
      )}
    </div>

    {showScanner && (
      <BuyQuestScannerModal
        quest={quest}
        business={business}
        user={currentUser}
        userLocation={userLocation}
        onClose={() => setShowScanner(false)}
        onSuccess={handleVerificationSuccess}
      />
    )}

    {showCodeModal && (
      <BuyQuestCodeModal
        quest={quest}
        business={business}
        user={currentUser}
        userLocation={userLocation}
        onClose={() => setShowCodeModal(false)}
        onSuccess={handleVerificationSuccess}
      />
    )}
  </>
  )
}

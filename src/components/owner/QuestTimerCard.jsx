import { useState, useEffect, useRef, useCallback } from 'react'
import {
  getOwnerQuestParticipation,
  startOwnerQuestTimer,
  pauseOwnerQuestTimer,
  resumeOwnerQuestTimer,
  getRemainingSeconds,
  getElapsedSeconds,
  completeOwnerQuest,
  checkUserWithinGeofence,
} from '../../services/ownerQuests.service'
import { useAuth } from '../../contexts/AuthContext'

export default function QuestTimerCard({ quest, onUpdate }) {
  const { user } = useAuth()
  const [participation, setParticipation] = useState(null)
  const [remainingSeconds, setRemainingSeconds] = useState(0)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [geoStatus, setGeoStatus] = useState(null)
  const [reward, setReward] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const timerRef = useRef(null)
  const watchRef = useRef(null)
  const geoWarnShownRef = useRef(false)

  const fetchParticipation = useCallback(async () => {
    if (!user || !quest) return
    const part = await getOwnerQuestParticipation(user.uid, quest.id)
    setParticipation(part)
    return part
  }, [user, quest])

  useEffect(() => {
    let mounted = true
    async function init() {
      setLoading(true)
      const part = await fetchParticipation()
      if (mounted) {
        if (part) {
          const remaining = getRemainingSeconds(part, quest)
          setRemainingSeconds(remaining)
        }
        setLoading(false)
      }
    }
    init()
    return () => { mounted = false }
  }, [quest, fetchParticipation])

  useEffect(() => {
    if (!participation || participation.timerStatus !== 'running') return

    timerRef.current = setInterval(() => {
      const remaining = getRemainingSeconds(participation, quest)
      setRemainingSeconds(remaining)

      if (remaining <= 0) {
        clearInterval(timerRef.current)
        handleTimerComplete()
      }
    }, 1000)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [participation?.timerStatus, participation?.accumulatedSeconds, participation?.questStartedAt])

  useEffect(() => {
    if (!participation || participation.timerStatus !== 'running') {
      if (watchRef.current) {
        navigator.geolocation.clearWatch(watchRef.current)
        watchRef.current = null
      }
      return
    }

    let lastWarned = false
    watchRef.current = navigator.geolocation.watchPosition(
      async (pos) => {
        const result = await checkUserWithinGeofence(
          pos.coords.latitude,
          pos.coords.longitude,
          quest.businessId
        )
        setGeoStatus(result)

        if (result.within === false && !result.error) {
          if (!lastWarned) {
            lastWarned = true
            geoWarnShownRef.current = true
            try {
              await pauseOwnerQuestTimer(user.uid, quest.id)
              setParticipation(prev => ({
                ...prev,
                timerStatus: 'paused',
                accumulatedSeconds: prev.accumulatedSeconds + Math.floor((Date.now() - (prev.questStartedAt?.toMillis?.() || 0)) / 1000),
                questStartedAt: null,
              }))
            } catch {}
          }
        } else if (result.within === true && lastWarned) {
          lastWarned = false
          geoWarnShownRef.current = false
          try {
            await resumeOwnerQuestTimer(user.uid, quest.id)
            setParticipation(prev => ({
              ...prev,
              timerStatus: 'running',
              questStartedAt: new Date(),
            }))
          } catch {}
        }
      },
      (err) => {
        setGeoStatus({ within: false, error: 'Location access denied' })
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    )

    return () => {
      if (watchRef.current) {
        navigator.geolocation.clearWatch(watchRef.current)
        watchRef.current = null
      }
    }
  }, [participation?.timerStatus])

  async function handleTimerComplete() {
    if (!user || !quest) return
    setActionLoading(true)
    try {
      const result = await completeOwnerQuest(user.uid, quest.id)
      setReward(result.reward)
      setSuccess('Quest complete! Show your reward code to the staff.')
      setParticipation(prev => ({ ...prev, status: 'completed' }))
      if (onUpdate) onUpdate()
    } catch (err) {
      setError(err.message || 'Failed to complete quest')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleStart() {
    if (!user || !quest) return
    setError('')
    setActionLoading(true)
    try {
      if (!navigator.geolocation) {
        setError('Location access is required for this quest')
        return
      }

      const pos = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
        })
      })

      const geo = await checkUserWithinGeofence(
        pos.coords.latitude,
        pos.coords.longitude,
        quest.businessId
      )

      if (!geo.within) {
        setError(`You are ${geo.distance || 'too far'} meters from this business. Please visit the location to start.`)
        return
      }

      await startOwnerQuestTimer(user.uid, quest.id)
      const updated = await fetchParticipation()
      if (updated) {
        setParticipation(updated)
        setRemainingSeconds(getRemainingSeconds(updated, quest))
      }
    } catch (err) {
      if (err.code === 1) {
        setError('Location access denied. Please enable location permissions in your browser settings.')
      } else {
        setError(err.message || 'Failed to start quest')
      }
    } finally {
      setActionLoading(false)
    }
  }

  async function handleJoin() {
    if (!user) return
    setError('')
    setActionLoading(true)
    try {
      const { joinOwnerQuest } = await import('../../services/ownerQuests.service')
      await joinOwnerQuest(user.uid, user.email, quest.id)
      const updated = await fetchParticipation()
      if (updated) setParticipation(updated)
    } catch (err) {
      setError(err.message || 'Failed to join quest')
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 rounded w-3/4" />
          <div className="h-8 bg-gray-200 rounded w-1/2" />
        </div>
      </div>
    )
  }

  if (reward) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
        <div className="text-center">
          <div className="text-3xl mb-2">🎉</div>
          <h3 className="font-semibold text-emerald-900 text-lg">Quest Complete!</h3>
          <p className="text-sm text-emerald-700 mt-1">Show this to the staff at {quest.businessName}</p>
          <div className="mt-4 bg-white rounded-xl border border-emerald-200 p-4">
            <p className="text-xs text-gray-500 mb-1">Your Reward Code</p>
            <p className="text-2xl font-mono font-bold text-emerald-700 tracking-wider">{reward.code}</p>
            <p className="text-sm text-gray-700 mt-2 font-medium">{reward.rewardDescription}</p>
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(reward.code)}
              className="mt-3 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
            >
              Copy Code
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (participation?.status === 'completed') {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center">
        <p className="text-emerald-800 font-medium">✅ Quest completed! View your reward in Profile.</p>
      </div>
    )
  }

  if (!participation) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-gray-900">{quest.title}</h4>
            <p className="text-sm text-gray-500 mt-1">
              Reward: {quest.rewardType === 'discount_percent' ? `${quest.rewardValue}% off` :
                       quest.rewardType === 'discount_fixed' ? `₱${quest.rewardValue} off` :
                       quest.rewardType === 'free_item' ? 'Free' : 'BOGO'} {quest.rewardItemName || 'items'}
            </p>
          </div>
          <button
            type="button"
            onClick={handleJoin}
            disabled={actionLoading}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
          >
            {actionLoading ? 'Joining...' : 'Join Quest'}
          </button>
        </div>
      </div>
    )
  }

  const isRunning = participation.timerStatus === 'running'
  const isPaused = participation.timerStatus === 'paused'

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const progress = (() => {
    const total = quest.requiredDurationMinutes * 60
    if (total <= 0) return 0
    const elapsed = getElapsedSeconds(participation)
    return Math.min(100, (elapsed / total) * 100)
  })()

  return (
    <div className={`rounded-xl border p-4 ${
      isRunning ? 'border-emerald-200 bg-emerald-50' :
      isPaused ? 'border-amber-200 bg-amber-50' :
      'border-gray-200 bg-white'
    }`}>
      {error && (
        <p className="mb-3 text-sm text-red-700 bg-red-50 rounded-lg px-3 py-2">{error}</p>
      )}
      {success && (
        <p className="mb-3 text-sm text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">{success}</p>
      )}

      {isRunning || isPaused ? (
        <div className="text-center">
          <div className="relative w-32 h-32 mx-auto">
            <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 36 36">
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="#e5e7eb"
                strokeWidth="3"
              />
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke={isRunning ? '#059669' : '#d97706'}
                strokeWidth="3"
                strokeDasharray={`${progress}, 100`}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`text-2xl font-bold ${isRunning ? 'text-emerald-700' : 'text-amber-700'}`}>
                {formatTime(remainingSeconds)}
              </span>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-center gap-2">
            <span className={`inline-block w-2 h-2 rounded-full ${isRunning ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
            <span className={`text-sm font-medium ${isRunning ? 'text-emerald-700' : 'text-amber-700'}`}>
              {isRunning ? 'Tracking your visit...' : 'Timer paused'}
            </span>
          </div>

          {geoStatus?.within === false && geoStatus?.distance && (
            <p className="mt-2 text-xs text-amber-700">
              You are {geoStatus.distance}m from this business. Please return to resume.
            </p>
          )}
          {geoStatus?.error === 'Location access denied' && (
            <p className="mt-2 text-xs text-red-600">
              Location access required. Please enable location permissions.
            </p>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-gray-900">{quest.title}</h4>
            <p className="text-sm text-gray-500 mt-1">
              {quest.requiredDurationMinutes} min visit · {quest.rewardType === 'discount_percent' ? `${quest.rewardValue}% off` :
                quest.rewardType === 'discount_fixed' ? `₱${quest.rewardValue} off` :
                quest.rewardType === 'free_item' ? 'Free' : 'BOGO'} {quest.rewardItemName || 'items'}
            </p>
          </div>
          <button
            type="button"
            onClick={handleStart}
            disabled={actionLoading}
            className="px-5 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2"
          >
            {actionLoading ? 'Starting...' : <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Start Quest
            </>}
          </button>
        </div>
      )}

      {geoStatus?.error?.includes('denied') && (
        <p className="mt-2 text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
          Location access is required for this quest. Please enable location permissions in your browser settings and refresh.
        </p>
      )}
    </div>
  )
}

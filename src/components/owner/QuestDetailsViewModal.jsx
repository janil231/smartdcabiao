import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { createPortal } from 'react-dom'
import { useAuth } from '../../contexts/AuthContext'
import {
  joinOwnerQuest,
  getOwnerQuestParticipation,
  cancelOwnerQuestParticipation,
} from '../../services/ownerQuests.service'
import { checkUserWithinGeofence } from '../../services/ownerQuests.service'
import QuestDetailsPanel from './QuestDetailsPanel'

function formatRewardText(quest) {
  if (quest.rewardType === 'discount_percent') return `${quest.rewardValue}% off ${quest.rewardItemName || 'items'}`
  if (quest.rewardType === 'discount_fixed') return `₱${quest.rewardValue} off ${quest.rewardItemName || 'items'}`
  if (quest.rewardType === 'free_item') return `Free ${quest.rewardItemName || 'item'}`
  if (quest.rewardType === 'bogo') return `Buy 1 Get 1 on ${quest.rewardItemName || 'items'}`
  return 'Reward'
}

export default function QuestDetailsViewModal({
  quest,
  participation: propParticipation,
  isOpen,
  onClose,
  onJoinClick: propOnJoinClick,
  onStartClick: propOnStartClick,
  onCancelClick: propOnCancelClick,
  onScanQRClick: propOnScanQRClick,
  onEnterCodeClick: propOnEnterCodeClick,
  onLoginRequired: propOnLoginRequired,
  isWithinGeofence: propIsWithinGeofence,
  distanceText: propDistanceText,
  participationState: propParticipationState,
  rewardCode: propRewardCode,
  timerRemaining: propTimerRemaining,
  loading: propLoading,
  error: propError,
  businessId,
  businessName,
  businessImage,
}) {
  const { user } = useAuth()
  const standalone = !propOnJoinClick
  const [internalParticipation, setInternalParticipation] = useState(null)
  const [internalLoading, setInternalLoading] = useState(false)
  const [internalError, setInternalError] = useState(null)
  const [internalGeofence, setInternalGeofence] = useState(null)

  const loadParticipation = useCallback(async () => {
    if (!standalone || !user || !quest?.id) return
    try {
      const p = await getOwnerQuestParticipation(user.uid, quest.id)
      setInternalParticipation(p)
    } catch {
      setInternalParticipation(null)
    }
  }, [standalone, user, quest?.id])

  useEffect(() => {
    if (!isOpen) return
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  useEffect(() => {
    if (standalone && isOpen) {
      loadParticipation()
    }
  }, [standalone, isOpen, loadParticipation])

  const handleStandaloneJoin = async () => {
    if (!user) {
      setInternalError('Sign in to join this quest')
      return
    }
    setInternalLoading(true)
    setInternalError(null)
    try {
      const bizId = businessId || quest.businessId
      const result = await joinOwnerQuest(user.uid, user.email, quest.id)
      if (bizId) {
        try {
          const position = await new Promise((resolve) => {
            navigator.geolocation.getCurrentPosition(
              (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
              () => resolve(null),
              { timeout: 5000, enableHighAccuracy: false }
            )
          })
          if (position) {
            const geo = await checkUserWithinGeofence(position.lat, position.lng, bizId)
            setInternalGeofence(geo)
          }
        } catch {
        }
      }
      await loadParticipation()
    } catch (err) {
      setInternalError(err.message || 'Failed to join quest')
    } finally {
      setInternalLoading(false)
    }
  }

  const handleStandaloneCancel = async () => {
    if (!user || !quest?.id) return
    setInternalLoading(true)
    setInternalError(null)
    try {
      await cancelOwnerQuestParticipation(user.uid, quest.id)
      setInternalParticipation(null)
    } catch (err) {
      setInternalError(err.message || 'Failed to cancel')
    } finally {
      setInternalLoading(false)
    }
  }

  const participation = standalone ? internalParticipation : propParticipation
  const onJoinClick = standalone ? handleStandaloneJoin : propOnJoinClick
  const onCancelClick = standalone ? handleStandaloneCancel : propOnCancelClick
  const onStartClick = standalone ? null : propOnStartClick
  const onScanQRClick = standalone ? null : propOnScanQRClick
  const onEnterCodeClick = standalone ? null : propOnEnterCodeClick
  const onLoginRequired = standalone ? (() => setInternalError('Sign in to join this quest')) : propOnLoginRequired
  const loading = standalone ? internalLoading : propLoading
  const error = standalone ? internalError : propError

  const resolvedParticipationState = (() => {
    if (propParticipationState && !standalone) return propParticipationState
    if (!standalone) return propParticipationState
    if (!participation) return 'not_joined'
    if (participation.status === 'joined') return 'joined_idle'
    if (participation.status === 'active') return 'active'
    if (participation.status === 'paused') return 'paused'
    if (participation.status === 'completed') return 'completed'
    return 'not_joined'
  })()

  if (!isOpen) return null

  const isBuyQuest = quest.questType === 'buy'
  const rewardText = formatRewardText(quest)

  const statusBadge = () => {
    if (resolvedParticipationState === 'completed') return <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-0.5 rounded-full">Completed</span>
    if (resolvedParticipationState === 'active') return <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">Active</span>
    if (resolvedParticipationState === 'paused') return <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full">Paused</span>
    if (resolvedParticipationState === 'joined_idle') return <span className="bg-purple-100 text-purple-700 text-xs font-bold px-2 py-0.5 rounded-full">Joined</span>
    return <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-0.5 rounded-full">Available</span>
  }

  const modalJSX = (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-xl">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl font-bold text-gray-900">{quest.title}</h2>
              {statusBadge()}
            </div>
            <div className="flex flex-wrap items-center gap-1.5 mt-1">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${isBuyQuest ? 'bg-purple-100 text-purple-700' : 'bg-emerald-100 text-emerald-700'}`}>
                {isBuyQuest ? '🛍️ Buy Quest' : '🏃 Visit Quest'}
              </span>
              {isBuyQuest && (
                <span className="bg-gray-100 text-gray-600 text-xs font-semibold px-2 py-0.5 rounded-full">
                  {quest.buyVerificationMethod === 'code' ? 'Daily Code' : 'QR Verification'}
                </span>
              )}
              {!isBuyQuest && quest.requiredDurationMinutes > 0 && (
                <span className="bg-gray-100 text-gray-600 text-xs font-semibold px-2 py-0.5 rounded-full">
                  {quest.requiredDurationMinutes} min stay
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 ml-4 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition"
            aria-label="Close"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-4 space-y-4">
          {/* Reward highlight */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
            <div className="text-xs font-bold text-emerald-700 uppercase mb-1">Reward</div>
            <div className="text-lg font-bold text-emerald-900">{rewardText}</div>
            {quest.rewardDescription && (
              <p className="text-sm text-emerald-700 mt-1">{quest.rewardDescription}</p>
            )}
            {quest.rewardTerms && (
              <p className="text-xs text-gray-500 mt-1 italic">{quest.rewardTerms}</p>
            )}
          </div>

          {/* Full description */}
          <div>
            <h3 className="text-xs font-bold text-gray-500 uppercase mb-1">Description</h3>
            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{quest.description}</p>
          </div>

          {/* What to Buy / Quest Instructions */}
          <QuestDetailsPanel quest={quest} compact={false} />

          {/* Geofence info */}
          {quest.geofenceRadius && (
            <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600">
              📍 You must be within {quest.geofenceRadius}m of the business to verify
            </div>
          )}

          {/* Action section */}
          {resolvedParticipationState === 'not_joined' && (
            <div className="pt-2">
              {onJoinClick ? (
                <button
                  onClick={onJoinClick}
                  disabled={loading}
                  className="w-full bg-emerald-600 text-white font-bold py-3 rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition text-sm"
                >
                  {loading ? 'Joining...' : 'Join Quest'}
                </button>
              ) : onLoginRequired ? (
                <button
                  onClick={onLoginRequired}
                  className="w-full bg-emerald-600 text-white font-bold py-3 rounded-lg hover:bg-emerald-700 transition text-sm"
                >
                  Sign in to join
                </button>
              ) : null}
            </div>
          )}

          {resolvedParticipationState === 'joined_idle' && (
            <div className="pt-2 space-y-2">
              {propDistanceText && (
                <div className="text-xs text-gray-500 text-center">{propDistanceText}</div>
              )}
              {!isBuyQuest && (
                <button
                  onClick={onStartClick}
                  disabled={loading || (propIsWithinGeofence !== null && !propIsWithinGeofence)}
                  className="w-full bg-emerald-600 text-white font-bold py-3 rounded-lg hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition text-sm"
                >
                  {loading ? 'Starting...' : 'Start Quest'}
                </button>
              )}
              {isBuyQuest && (
                <>
                  <button
                    onClick={onScanQRClick}
                    disabled={loading || (propIsWithinGeofence !== null && !propIsWithinGeofence)}
                    className="w-full bg-emerald-600 text-white font-bold py-3 rounded-lg hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition text-sm"
                  >
                    Scan Merchant QR Code
                  </button>
                  <button
                    onClick={onEnterCodeClick}
                    disabled={loading || (propIsWithinGeofence !== null && !propIsWithinGeofence)}
                    className="w-full bg-white border border-gray-300 text-gray-700 font-semibold py-3 rounded-lg hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed transition text-sm"
                  >
                    Enter Code Instead
                  </button>
                </>
              )}
              {standalone && (
                <Link
                  to={`/businesses/${businessId || quest.businessId}`}
                  className="block w-full text-center text-sm font-medium text-emerald-600 hover:text-emerald-700 underline py-2"
                >
                  View Business Page →
                </Link>
              )}
              <button
                onClick={onCancelClick}
                className="w-full text-xs text-gray-500 hover:text-red-600 underline text-center block pt-1"
              >
                Cancel Quest
              </button>
            </div>
          )}

          {resolvedParticipationState === 'active' && (
            <div className="pt-2 space-y-3">
              <div className="text-center py-4 bg-emerald-50 rounded-xl">
                <div className="text-4xl font-bold text-emerald-700 font-mono">
                  {propTimerRemaining !== null ? `${String(Math.floor(propTimerRemaining / 60)).padStart(2, '0')}:${String(propTimerRemaining % 60).padStart(2, '0')}` : '--:--'}
                </div>
                <div className="text-xs text-emerald-600 mt-1">remaining</div>
              </div>
              <button
                onClick={onCancelClick}
                className="w-full text-xs text-gray-500 hover:text-red-600 underline text-center block"
              >
                Cancel Quest
              </button>
            </div>
          )}

          {resolvedParticipationState === 'paused' && (
            <div className="pt-2 space-y-3">
              <div className="text-center py-4 bg-amber-50 rounded-xl">
                <div className="text-4xl font-bold text-amber-700 font-mono">
                  {propTimerRemaining !== null ? `${String(Math.floor(propTimerRemaining / 60)).padStart(2, '0')}:${String(propTimerRemaining % 60).padStart(2, '0')}` : '--:--'}
                </div>
                <div className="text-xs text-amber-600 mt-1">paused</div>
              </div>
              <div className="p-3 bg-amber-50 text-amber-800 text-xs rounded-lg">
                You left the geofence. Return to resume the timer.
              </div>
              <button
                onClick={onCancelClick}
                className="w-full text-xs text-gray-500 hover:text-red-600 underline text-center block"
              >
                Cancel Quest
              </button>
            </div>
          )}

          {resolvedParticipationState === 'completed' && (
            <div className="pt-2 space-y-3">
              <div className="text-center">
                <div className="text-3xl mb-1">🎉</div>
                <div className="text-sm font-bold text-emerald-700">Quest Complete!</div>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <div className="text-xs font-bold text-amber-700 uppercase mb-1">Your Reward</div>
                <div className="font-bold text-amber-900">{rewardText}</div>
              </div>
              {propRewardCode && (
                <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-3 text-center">
                  <div className="text-xs font-bold text-gray-500 uppercase mb-1">Reward Code</div>
                  <div className="font-mono font-bold text-lg text-gray-900 tracking-wider mb-2">
                    {propRewardCode}
                  </div>
                  <button
                    onClick={() => navigator.clipboard.writeText(propRewardCode)}
                    className="text-xs bg-emerald-600 text-white px-3 py-1 rounded-md hover:bg-emerald-700"
                  >
                    Copy Code
                  </button>
                </div>
              )}
              {standalone && (
                <Link
                  to={`/businesses/${businessId || quest.businessId}`}
                  className="block w-full text-center text-sm font-medium text-emerald-600 hover:text-emerald-700 underline pt-1"
                >
                  Visit Business Page →
                </Link>
              )}
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  )

  return createPortal(modalJSX, document.body)
}

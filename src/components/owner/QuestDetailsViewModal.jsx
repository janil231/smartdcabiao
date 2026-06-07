import { useEffect } from 'react'
import { createPortal } from 'react-dom'
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
  participation,
  isOpen,
  onClose,
  onJoinClick,
  onStartClick,
  onCancelClick,
  onScanQRClick,
  onEnterCodeClick,
  onLoginRequired,
  isWithinGeofence,
  distanceText,
  participationState,
  rewardCode,
  timerRemaining,
  loading,
  error,
}) {
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

  if (!isOpen) return null

  const isBuyQuest = quest.questType === 'buy'
  const rewardText = formatRewardText(quest)

  const statusBadge = () => {
    if (participationState === 'completed') return <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-0.5 rounded-full">Completed</span>
    if (participationState === 'active') return <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">Active</span>
    if (participationState === 'paused') return <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full">Paused</span>
    if (participationState === 'joined_idle') return <span className="bg-purple-100 text-purple-700 text-xs font-bold px-2 py-0.5 rounded-full">Joined</span>
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
          {participationState === 'not_joined' && (
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

          {participationState === 'joined_idle' && (
            <div className="pt-2 space-y-2">
              {distanceText && (
                <div className="text-xs text-gray-500 text-center">{distanceText}</div>
              )}
              {!isBuyQuest && (
                <button
                  onClick={onStartClick}
                  disabled={loading || (isWithinGeofence !== null && !isWithinGeofence)}
                  className="w-full bg-emerald-600 text-white font-bold py-3 rounded-lg hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition text-sm"
                >
                  {loading ? 'Starting...' : 'Start Quest'}
                </button>
              )}
              {isBuyQuest && (
                <>
                  <button
                    onClick={onScanQRClick}
                    disabled={loading || (isWithinGeofence !== null && !isWithinGeofence)}
                    className="w-full bg-emerald-600 text-white font-bold py-3 rounded-lg hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition text-sm"
                  >
                    Scan Merchant QR Code
                  </button>
                  <button
                    onClick={onEnterCodeClick}
                    disabled={loading || (isWithinGeofence !== null && !isWithinGeofence)}
                    className="w-full bg-white border border-gray-300 text-gray-700 font-semibold py-3 rounded-lg hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed transition text-sm"
                  >
                    Enter Code Instead
                  </button>
                </>
              )}
              <button
                onClick={onCancelClick}
                className="w-full text-xs text-gray-500 hover:text-red-600 underline text-center block pt-1"
              >
                Cancel Quest
              </button>
            </div>
          )}

          {participationState === 'active' && (
            <div className="pt-2 space-y-3">
              <div className="text-center py-4 bg-emerald-50 rounded-xl">
                <div className="text-4xl font-bold text-emerald-700 font-mono">
                  {timerRemaining !== null ? `${String(Math.floor(timerRemaining / 60)).padStart(2, '0')}:${String(timerRemaining % 60).padStart(2, '0')}` : '--:--'}
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

          {participationState === 'paused' && (
            <div className="pt-2 space-y-3">
              <div className="text-center py-4 bg-amber-50 rounded-xl">
                <div className="text-4xl font-bold text-amber-700 font-mono">
                  {timerRemaining !== null ? `${String(Math.floor(timerRemaining / 60)).padStart(2, '0')}:${String(timerRemaining % 60).padStart(2, '0')}` : '--:--'}
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

          {participationState === 'completed' && (
            <div className="pt-2 space-y-3">
              <div className="text-center">
                <div className="text-3xl mb-1">🎉</div>
                <div className="text-sm font-bold text-emerald-700">Quest Complete!</div>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <div className="text-xs font-bold text-amber-700 uppercase mb-1">Your Reward</div>
                <div className="font-bold text-amber-900">{rewardText}</div>
              </div>
              {rewardCode && (
                <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-3 text-center">
                  <div className="text-xs font-bold text-gray-500 uppercase mb-1">Reward Code</div>
                  <div className="font-mono font-bold text-lg text-gray-900 tracking-wider mb-2">
                    {rewardCode}
                  </div>
                  <button
                    onClick={() => navigator.clipboard.writeText(rewardCode)}
                    className="text-xs bg-emerald-600 text-white px-3 py-1 rounded-md hover:bg-emerald-700"
                  >
                    Copy Code
                  </button>
                </div>
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

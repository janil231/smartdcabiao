import { useEffect, useState } from 'react'
import { getQuestById } from '../../services/quests.service'
import {
  getQRImageURL,
  downloadQRAsPNG,
  printQRPoster,
  rotateEventCode,
  rotateQRToken,
  getEffectiveVerificationMethod,
  questNeedsVerificationTokens,
} from '../../services/questVerification.service'

function formatUpdatedAt(value) {
  if (!value) return '—'
  if (typeof value === 'string') return new Date(value).toLocaleString()
  if (value?.toDate) return value.toDate().toLocaleString()
  return String(value)
}

export default function QuestVerificationSetup({
  quest,
  onQuestUpdated,
  ensureTokensForQuest,
  onError,
}) {
  const [rotating, setRotating] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [generateError, setGenerateError] = useState(null)
  const [localQuest, setLocalQuest] = useState(quest)
  const method = getEffectiveVerificationMethod(localQuest)

  useEffect(() => {
    setLocalQuest(quest)
  }, [quest])

  useEffect(() => {
    if (!quest?.id) return

    let cancelled = false
    ;(async () => {
      try {
        const fresh = await getQuestById(quest.id)
        if (cancelled || !fresh) return
        const merged = { ...quest, ...fresh, id: quest.id }
        setLocalQuest(merged)
        onQuestUpdated?.(merged)
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to load quest verification data:', err)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [quest?.id])

  const handleEnsureTokens = async () => {
    if (!ensureTokensForQuest) {
      setGenerateError('Admin sign-in required to generate codes.')
      return
    }
    setGenerating(true)
    setGenerateError(null)
    try {
      const updated = await ensureTokensForQuest(quest.id)
      if (updated) {
        const merged = { ...quest, ...updated, id: quest.id }
        setLocalQuest(merged)
        onQuestUpdated?.(merged)
      }
    } catch (err) {
      const msg = err?.message || 'Could not generate verification code'
      setGenerateError(msg)
      onError?.(msg)
    } finally {
      setGenerating(false)
    }
  }

  const handleRotateQR = async () => {
    setRotating(true)
    try {
      const updated = await rotateQRToken(localQuest.id)
      const merged = { ...localQuest, ...updated }
      setLocalQuest(merged)
      onQuestUpdated?.(merged)
    } finally {
      setRotating(false)
    }
  }

  const handleRotateCode = async () => {
    setRotating(true)
    try {
      const newCode = await rotateEventCode(localQuest.id)
      const merged = {
        ...localQuest,
        eventCode: newCode,
        eventCodeUpdatedAt: new Date().toISOString(),
      }
      setLocalQuest(merged)
      onQuestUpdated?.(merged)
    } finally {
      setRotating(false)
    }
  }

  if (method === 'manual') {
    return (
      <div className="mt-3 rounded-xl bg-gray-50 border border-gray-200 p-4 text-sm text-gray-600">
        ✍️ Manual LGU check-in at <span className="font-medium">/lgu/checkin</span>
      </div>
    )
  }

  if (generating) {
    return (
      <div className="mt-3 rounded-xl bg-gray-50 border border-gray-200 p-4 text-sm text-gray-600">
        Generating {method === 'qr' ? 'QR code' : 'event code'}…
      </div>
    )
  }

  if (method === 'qr' && localQuest.qrPayload) {
    return (
      <div className="mt-3 rounded-xl bg-gray-50 border border-gray-200 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="font-semibold text-gray-900">📱 QR Code</h4>
          <button
            type="button"
            disabled={rotating}
            onClick={handleRotateQR}
            className="text-xs text-gray-500 hover:text-emerald-600 disabled:opacity-50"
          >
            ↻ Rotate (invalidates old posters)
          </button>
        </div>
        <div className="mt-3 flex flex-col sm:flex-row items-start gap-4">
          <img
            src={getQRImageURL(localQuest.qrPayload, 200)}
            alt="Quest QR"
            className="w-40 h-40 bg-white p-2 rounded-lg border border-gray-200"
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-500 mb-1">Payload</p>
            <code className="text-xs bg-white p-2 rounded block break-all border border-gray-100">
              {localQuest.qrPayload}
            </code>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => downloadQRAsPNG(localQuest.id, localQuest.qrPayload)}
                className="px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700"
              >
                📥 Download QR (PNG)
              </button>
              <button
                type="button"
                onClick={() => printQRPoster(localQuest)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-semibold hover:bg-white"
              >
                🖨️ Print QR Poster
              </button>
            </div>
            {localQuest.geofenceRadiusMeters && (
              <p className="text-xs text-gray-500 mt-2">
                Geofence: {localQuest.geofenceRadiusMeters}m
                {localQuest.autoApprove === false ? ' · Manual review' : ' · Auto-approve'}
              </p>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (method === 'code' && localQuest.eventCode) {
    return (
      <div className="mt-3 rounded-xl bg-gray-50 border border-gray-200 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="font-semibold text-gray-900">🔢 Event Code</h4>
          <button
            type="button"
            disabled={rotating}
            onClick={handleRotateCode}
            className="text-xs text-gray-500 hover:text-emerald-600 disabled:opacity-50"
          >
            ↻ Generate new code
          </button>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <code className="text-2xl font-bold text-emerald-700 bg-white px-4 py-2 rounded-lg border border-emerald-100">
            {localQuest.eventCode}
          </code>
          <p className="text-xs text-gray-500">
            Updated: {formatUpdatedAt(localQuest.eventCodeUpdatedAt)}
          </p>
        </div>
        <p className="text-xs text-gray-500 mt-3">
          💡 Announce this code at the event. Users type it
          {localQuest.requirePhoto !== false ? ' + upload a photo' : ''} to verify.
        </p>
      </div>
    )
  }

  return (
    <div className="mt-3 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
      <p>
        Verification is set to <strong>{method}</strong> but no code or QR is stored yet.
      </p>
      {generateError && (
        <p className="mt-2 text-red-700 text-xs">{generateError}</p>
      )}
      <button
        type="button"
        disabled={generating || !ensureTokensForQuest}
        onClick={handleEnsureTokens}
        className="mt-2 px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50"
      >
        Generate {method === 'qr' ? 'QR code' : 'event code'} now
      </button>
    </div>
  )
}

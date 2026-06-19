import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { findRewardByCode, markRewardRedeemed } from '../../services/businessQuestRewards.service'
import { useAuth } from '../../contexts/AuthContext'
import { formatDate } from '../../utils/dateHelpers'

export default function RedeemRewardModal({ isOpen, onClose, businessId, businessName, onRedeemed }) {
  const { user } = useAuth()
  const [step, setStep] = useState('input')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [reward, setReward] = useState(null)

  useEffect(() => {
    if (!isOpen) {
      setStep('input')
      setCode('')
      setError(null)
      setReward(null)
    }
  }, [isOpen])

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = '' }
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  if (!isOpen) return null

  async function handleLookup() {
    setError(null)
    setLoading(true)
    try {
      const result = await findRewardByCode(code.trim().toUpperCase(), businessId, user?.uid)

      if (!result.found) {
        setError(result.reason)
        setLoading(false)
        return
      }

      if (!result.valid) {
        setError(result.reason)
        setReward(result.reward)
        setStep('preview')
        setLoading(false)
        return
      }

      setReward(result.reward)
      setStep('preview')
    } catch (err) {
      const msg = err.code === 'permission-denied'
        ? 'Could not look up reward — you may not be the owner of this business, or the security rules need redeployment.'
        : err.message || 'Lookup failed'
      console.error('[RedeemRewardModal] lookup error:', err)
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  async function handleConfirmRedemption() {
    if (!reward) return
    setError(null)
    setLoading(true)
    try {
      await markRewardRedeemed(reward.id, user.uid, user.email)
      setStep('success')
      if (onRedeemed) onRedeemed(reward)
    } catch (err) {
      const msg = err.code === 'permission-denied'
        ? 'Could not redeem — you may not be the owner of this reward, or the security rules need redeployment.'
        : err.message || 'Redemption failed'
      console.error('[RedeemRewardModal] redeem error:', err)
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">Redeem Customer Reward</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          {businessName}
        </p>

        {step === 'input' && (
          <>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Customer's Reward Code
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="BIZ-XXXXXX"
              autoFocus
              autoCapitalize="characters"
              autoComplete="off"
              className="w-full border border-gray-300 rounded-lg px-3 py-3 text-lg font-mono tracking-widest text-center uppercase focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              maxLength={20}
              onKeyDown={(e) => { if (e.key === 'Enter' && code.trim()) handleLookup() }}
            />
            <p className="text-xs text-gray-500 mt-1">
              Ask the customer to show their reward code in the app.
            </p>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-3">
                <p className="text-sm text-red-900">❌ {error}</p>
              </div>
            )}

            <button
              onClick={handleLookup}
              disabled={loading || !code.trim()}
              className="w-full mt-4 bg-emerald-600 text-white rounded-lg py-3 font-medium hover:bg-emerald-700 disabled:opacity-50"
            >
              {loading ? 'Looking up...' : 'Look Up Reward'}
            </button>

            <button
              onClick={onClose}
              className="w-full mt-2 bg-gray-100 text-gray-700 rounded-lg py-2 text-sm font-medium hover:bg-gray-200"
            >
              Cancel
            </button>
          </>
        )}

        {step === 'preview' && reward && (
          <>
            <div className={`rounded-lg p-4 mb-4 ${
              error
                ? 'bg-red-50 border border-red-200'
                : 'bg-emerald-50 border border-emerald-200'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">{error ? '⚠️' : '✓'}</span>
                <span className={`font-semibold ${error ? 'text-red-900' : 'text-emerald-900'}`}>
                  {error ? 'Cannot Redeem' : 'Valid Reward'}
                </span>
              </div>

              <dl className="text-sm space-y-1 mt-3">
                <div className="flex justify-between gap-2">
                  <dt className="text-gray-600">Quest:</dt>
                  <dd className="font-medium text-right text-gray-900">{reward.questTitle || 'Quest'}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-gray-600">Reward:</dt>
                  <dd className="font-medium text-right text-gray-900">{reward.rewardDescription || 'Reward'}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-gray-600">Customer:</dt>
                  <dd className="font-medium text-right text-gray-900 truncate max-w-[180px]">{reward.userEmail}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-gray-600">Earned:</dt>
                  <dd className="font-medium text-right text-gray-900">{formatDate(reward.completedAt)}</dd>
                </div>
                {reward.status === 'used' && (
                  <div className="flex justify-between gap-2">
                    <dt className="text-gray-600">Already Used:</dt>
                    <dd className="font-medium text-right text-red-700">{formatDate(reward.usedAt)}</dd>
                  </div>
                )}
              </dl>

              {error && (
                <p className="text-sm text-red-800 mt-3">{error}</p>
              )}
            </div>

            {!error && (
              <button
                onClick={handleConfirmRedemption}
                disabled={loading}
                className="w-full bg-emerald-600 text-white rounded-lg py-3 font-medium hover:bg-emerald-700 disabled:opacity-50"
              >
                {loading ? 'Redeeming...' : 'Confirm Redemption'}
              </button>
            )}

            <button
              onClick={() => { setStep('input'); setCode(''); setError(null); setReward(null) }}
              className="w-full mt-2 bg-gray-100 text-gray-700 rounded-lg py-2 text-sm font-medium hover:bg-gray-200"
            >
              Back
            </button>
          </>
        )}

        {step === 'success' && reward && (
          <>
            <div className="text-center py-6">
              <div className="text-5xl mb-3">🎉</div>
              <h4 className="font-bold text-lg text-emerald-900 mb-1">Reward Redeemed!</h4>
              <p className="text-sm text-gray-600 mb-4">
                {reward.rewardDescription} for {reward.userEmail}
              </p>
              <p className="text-xs text-gray-500">
                The customer's reward is now marked as used.
              </p>
            </div>

            <button
              onClick={() => { setStep('input'); setCode(''); setReward(null) }}
              className="w-full bg-emerald-600 text-white rounded-lg py-3 font-medium hover:bg-emerald-700"
            >
              Redeem Another
            </button>

            <button
              onClick={onClose}
              className="w-full mt-2 bg-gray-100 text-gray-700 rounded-lg py-2 text-sm font-medium hover:bg-gray-200"
            >
              Close
            </button>
          </>
        )}
      </div>
    </div>,
    document.body
  )
}

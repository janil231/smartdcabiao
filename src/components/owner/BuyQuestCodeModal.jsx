import { useState } from 'react'
import { verifyBuyQuestByCode } from '../../services/ownerQuests.service'

export default function BuyQuestCodeModal({ quest, business, user, userLocation, onClose, onSuccess }) {
  const [code, setCode] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!code.trim()) return

    setVerifying(true)
    setError('')
    try {
      await verifyBuyQuestByCode(user.uid, quest.id, code.trim(), userLocation)
      onSuccess()
    } catch (err) {
      setError(err.message || 'Invalid code')
      setVerifying(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-gray-900">Enter Quest Code</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
        </div>

        <p className="text-xs text-gray-600 mb-4">
          Ask staff at <strong>{business?.name || 'the business'}</strong> for today's quest code.
        </p>

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="ABC123"
            className="w-full p-3 text-center text-lg font-mono font-bold border border-gray-300 rounded-lg mb-3 uppercase"
            autoFocus
          />

          {error && (
            <div className="mb-3 p-2 bg-red-50 text-red-800 text-sm rounded-lg">
              {error}
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-200 text-gray-700 font-semibold py-2 rounded-lg hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={verifying || !code.trim()}
              className="flex-1 bg-emerald-600 text-white font-semibold py-2 rounded-lg hover:bg-emerald-700 disabled:opacity-50"
            >
              {verifying ? 'Verifying...' : 'Verify'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

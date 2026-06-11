import { useEffect, useState } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { getQuestParticipationsForMerchant, merchantMarkParticipationComplete } from '../../services/ownerQuests.service'
import { markRewardRedeemed } from '../../services/businessQuestRewards.service'
import { useAuth } from '../../contexts/AuthContext'
import { formatDate } from '../../utils/dateHelpers'

function ParticipantRewardStatus({ rewardCodeId, onRedeemClick }) {
  const [reward, setReward] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!rewardCodeId) { setLoading(false); return }
    let cancelled = false
    getDoc(doc(db, 'businessQuestRewards', String(rewardCodeId)))
      .then(snap => {
        if (!cancelled) {
          setReward(snap.exists() ? { id: snap.id, ...snap.data() } : null)
          setLoading(false)
        }
      })
      .catch(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [rewardCodeId])

  if (loading) return <span className="text-xs text-gray-400">…</span>
  if (!reward) return <span className="text-xs text-gray-400">No reward</span>

  if (reward.status === 'used') {
    return (
      <span className="inline-flex items-center gap-1 text-xs bg-emerald-100 text-emerald-800 px-2 py-1 rounded-full whitespace-nowrap">
        ✓ Redeemed {formatDate(reward.usedAt)}
      </span>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <span className="inline-flex items-center gap-1 text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-full font-mono whitespace-nowrap">
        {reward.code}
      </span>
      <button
        onClick={() => onRedeemClick(reward)}
        className="text-xs text-emerald-700 hover:text-emerald-800 font-medium underline whitespace-nowrap"
      >
        Mark Redeemed
      </button>
    </div>
  )
}

export default function BuyQuestParticipantsModal({ quest, merchantUid, onClose }) {
  const { user } = useAuth()
  const [participations, setParticipations] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending')
  const [toast, setToast] = useState('')
  const [confirmId, setConfirmId] = useState(null)
  const [confirming, setConfirming] = useState(false)

  useEffect(() => {
    if (!quest?.id || !merchantUid) return
    let mounted = true
    const load = async () => {
      try {
        const data = await getQuestParticipationsForMerchant(quest.id, merchantUid)
        if (mounted) setParticipations(data)
      } catch (err) {
        console.error('[BuyQuestParticipantsModal] load failed:', err)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [quest?.id, merchantUid])

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const handleMarkComplete = async (participationId) => {
    setConfirming(true)
    try {
      await merchantMarkParticipationComplete(merchantUid, participationId)
      setParticipations(prev => prev.map(p =>
        p.id === participationId ? { ...p, status: 'completed', completedAt: new Date() } : p
      ))
      setConfirmId(null)
      showToast('Quest marked complete for customer')
    } catch (err) {
      showToast(err.message || 'Failed to complete')
    } finally {
      setConfirming(false)
    }
  }

  const handleMarkRedeemed = async (reward) => {
    if (!confirm(`Mark reward ${reward.code} as redeemed for ${reward.userEmail || 'this customer'}?`)) return
    try {
      await markRewardRedeemed(reward.id, user.uid, user.email)
      showToast('Reward marked as redeemed')
    } catch (err) {
      showToast(err.message || 'Failed to mark redeemed')
    }
  }

  const counts = {
    pending: participations.filter(p => p.status === 'joined' || p.status === 'active').length,
    completed: participations.filter(p => p.status === 'completed').length,
    all: participations.length,
  }

  const filtered = participations.filter(p => {
    if (filter === 'pending') return p.status === 'joined' || p.status === 'active'
    if (filter === 'completed') return p.status === 'completed'
    return true
  })

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl max-w-lg w-full p-6 text-center">
          <p className="text-gray-500">Loading participants...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-900">Participants</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
        </div>

        {quest && (
          <p className="text-sm text-gray-600 mb-4">{quest.title}</p>
        )}

        {toast && (
          <div className="mb-3 p-2 bg-emerald-50 text-emerald-800 text-xs font-semibold rounded-lg text-center">
            {toast}
          </div>
        )}

        <div className="flex gap-2 mb-4">
          {['pending', 'completed', 'all'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                filter === f
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)} ({counts[f]})
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm">No participants found</div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filtered.map(p => (
              <div key={p.id} className="bg-gray-50 rounded-xl p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {p.userEmail || 'User'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {p.joinedAt?.toMillis
                        ? new Date(p.joinedAt.toMillis()).toLocaleString()
                        : p.joinedAt?.seconds
                          ? new Date(p.joinedAt.seconds * 1000).toLocaleString()
                          : 'Recently'}
                    </p>
                  </div>
                  {p.status === 'completed' ? (
                    <ParticipantRewardStatus
                      rewardCodeId={p.rewardCodeId}
                      onRedeemClick={handleMarkRedeemed}
                    />
                  ) : confirmId === p.id ? (
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleMarkComplete(p.id)}
                        disabled={confirming}
                        className="text-xs bg-red-600 text-white px-2 py-1 rounded-md hover:bg-red-700 disabled:opacity-50"
                      >
                        {confirming ? '...' : 'Confirm'}
                      </button>
                      <button
                        onClick={() => setConfirmId(null)}
                        className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded-md hover:bg-gray-300"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmId(p.id)}
                      className="text-xs bg-emerald-600 text-white px-2 py-1 rounded-md hover:bg-emerald-700"
                    >
                      Mark Complete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full bg-gray-200 text-gray-700 font-semibold py-2 rounded-lg hover:bg-gray-300 mt-4"
        >
          Close
        </button>
      </div>
    </div>
  )
}

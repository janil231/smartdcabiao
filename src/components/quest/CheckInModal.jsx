import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { adminMarkCompleted } from '../../services/participations.service'
import { useAuth } from '../../contexts/AuthContext'

export default function CheckInModal({ quest, onClose, onSuccess }) {
  const { user } = useAuth()
  const [participants, setParticipants] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [processingId, setProcessingId] = useState(null)

  useEffect(() => {
    if (!quest) return
    (async () => {
      try {
        setLoading(true)
        const q = query(
          collection(db, 'participations'),
          where('questId', '==', quest.id),
          orderBy('joinedAt', 'desc')
        )
        const snap = await getDocs(q)
        setParticipants(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    })()
  }, [quest])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  useEffect(() => {
    const handler = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const handleMarkComplete = async (participation) => {
    setProcessingId(participation.id)
    try {
      await adminMarkCompleted({
        uid: participation.uid,
        questId: participation.questId,
        adminUser: { uid: user.uid, email: user.email },
      })
      setParticipants((prev) =>
        prev.map((p) =>
          p.id === participation.id ? { ...p, status: 'completed', rewardStatus: 'released' } : p
        )
      )
      if (onSuccess) onSuccess()
    } catch (err) {
      alert(`Failed: ${err.message}`)
    } finally {
      setProcessingId(null)
    }
  }

  const filtered = participants.filter((p) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      p.userEmail?.toLowerCase().includes(q) ||
      p.uid?.toLowerCase().includes(q) ||
      p.userDisplayName?.toLowerCase().includes(q)
    )
  })

  const joinedCount = participants.filter((p) => p.status === 'joined').length
  const completedCount = participants.filter((p) => p.status === 'completed').length

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4">
      <div className="fixed inset-0 bg-black/60" onClick={onClose} />

      <div className="relative w-full h-full sm:h-auto sm:max-w-2xl sm:max-h-[85vh] bg-white sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        <div className="shrink-0 bg-gradient-to-r from-emerald-600 to-emerald-500 px-5 py-4 flex items-start justify-between">
          <div>
            <h3 className="text-white font-bold text-lg">✅ Check In Participants</h3>
            <p className="text-emerald-50 text-sm mt-0.5">{quest.title}</p>
            <p className="text-emerald-100 text-xs mt-1">
              {joinedCount} pending · {completedCount} completed
            </p>
          </div>
          <button onClick={onClose} className="text-white hover:bg-white/20 w-9 h-9 rounded-lg flex items-center justify-center">
            ✕
          </button>
        </div>

        <div className="shrink-0 p-4 border-b border-gray-200 bg-gray-50">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by email, UID, or name..."
            className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          />
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <p className="text-center text-gray-500 py-8">Loading participants...</p>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-2">📭</div>
              <p className="text-gray-500">
                {searchQuery ? 'No matching participants' : 'No one has joined this quest yet'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((p) => (
                <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:bg-gray-50">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">
                      {p.userDisplayName || p.userEmail || p.uid}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{p.userEmail || p.uid}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Joined: {p.joinedAt?.toDate?.().toLocaleString() || '—'}
                    </p>
                  </div>

                  {p.status === 'completed' ? (
                    <span className="text-xs font-semibold bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-full">
                      ✅ Completed
                    </span>
                  ) : p.status === 'cancelled' ? (
                    <span className="text-xs font-semibold bg-gray-100 text-gray-600 px-3 py-1.5 rounded-full">
                      ❌ Cancelled
                    </span>
                  ) : (
                    <button
                      onClick={() => handleMarkComplete(p)}
                      disabled={processingId === p.id}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg disabled:opacity-50"
                    >
                      {processingId === p.id ? '...' : 'Mark Complete'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}

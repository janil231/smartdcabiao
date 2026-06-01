import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getActiveSeason } from '../services/seasons.service'
import { listActiveQuests } from '../services/quests.service'
import { adminMarkCompleted } from '../services/participations.service'
import {
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore'
import { db } from '../lib/firebase'

function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

function ParticipationStatusCard({ participation, quest }) {
  if (!participation) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span className="font-medium text-yellow-800">No participation found</span>
        </div>
        <p className="text-sm text-yellow-700 mt-1">User has not joined this quest yet.</p>
      </div>
    )
  }

  const now = new Date()
  const isExpired = participation.status === 'joined' && participation.expiresAt && new Date(participation.expiresAt) < now

  if (participation.status === 'completed') {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="font-medium text-green-800">Already completed</span>
        </div>
        <p className="text-sm text-green-700 mt-1">
          Completed on {formatDate(participation.completedAt)} • {participation.pointsAwarded || quest?.points || 0} points awarded
        </p>
      </div>
    )
  }

  if (isExpired || participation.status === 'expired') {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="font-medium text-red-800">Expired</span>
        </div>
        <p className="text-sm text-red-700 mt-1">Participation expired – cannot complete.</p>
      </div>
    )
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div className="flex items-center gap-2">
        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="font-medium text-blue-800">Joined (pending)</span>
      </div>
      <p className="text-sm text-blue-700 mt-1">
        Joined {formatDate(participation.joinedAt)} • Expires {formatDate(participation.expiresAt)}
      </p>
      {participation.userEmail && (
        <p className="text-sm text-blue-700">Email: {participation.userEmail}</p>
      )}
    </div>
  )
}

export default function CheckInPanel({ user, showToast }) {
  const [searchParams] = useSearchParams()
  const [quests, setQuests] = useState([])
  const [selectedQuestId, setSelectedQuestId] = useState(searchParams.get('checkinQuestId') || '')
  const [searchMode, setSearchMode] = useState('email')
  const [userInput, setUserInput] = useState('')
  const [foundParticipation, setFoundParticipation] = useState(null)
  const [searching, setSearching] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [checkinUrl, setCheckinUrl] = useState('')

  useEffect(() => {
    async function loadQuests() {
      try {
        const season = await getActiveSeason()
        if (season) {
          const questList = await listActiveQuests(season.id)
          setQuests(questList)
        }
      } catch {
        // Silently fail - quests list may be empty
      }
    }
    loadQuests()
  }, [])

  useEffect(() => {
    if (selectedQuestId && window.location.origin) {
      const baseUrl = `${window.location.origin}/lgu/checkin`
      const url = `${baseUrl}?checkinQuestId=${selectedQuestId}`
      setCheckinUrl(url)
    }
  }, [selectedQuestId])

  const selectedQuest = quests.find(q => q.id === selectedQuestId)

  const handleSearch = async () => {
    setError('')
    setFoundParticipation(null)

    if (!selectedQuestId) {
      setError('Please select a quest first')
      return
    }

    if (!userInput.trim()) {
      setError(searchMode === 'email' ? 'Please enter an email address' : 'Please enter a UID')
      return
    }

    setSearching(true)
    try {
      const participationsRef = collection(db, 'participations')
      const field = searchMode === 'email' ? 'userEmail' : 'uid'
      const value = searchMode === 'email' ? userInput.trim().toLowerCase() : userInput.trim()

      const q = query(
        participationsRef,
        where('questId', '==', selectedQuestId),
        where(field, '==', value)
      )
      const snapshot = await getDocs(q)

      if (snapshot.empty) {
        setError(searchMode === 'email' ? 'No participation found for this email' : 'No participation found for this UID')
        return
      }

      const partData = snapshot.docs[0].data()
      setFoundParticipation({
        id: snapshot.docs[0].id,
        ...partData
      })
    } catch (err) {
      setError('Error searching: ' + err.message)
    } finally {
      setSearching(false)
    }
  }

  const handleMarkCompleted = async () => {
    if (!selectedQuestId || !foundParticipation) return
    if (foundParticipation.status !== 'joined') return

    setLoading(true)
    try {
      const result = await adminMarkCompleted({
        uid: foundParticipation.uid,
        questId: selectedQuestId,
        adminUser: { uid: user.uid, email: user.email }
      })

      if (result.success) {
        const pointsAwarded = selectedQuest?.points || 0
        showToast(`Marked completed and released ${pointsAwarded} points.`, 'success')
        setUserInput('')
        setFoundParticipation(null)
      } else {
        showToast(result.error || 'Failed to complete', 'error')
      }
    } catch (error) {
      showToast(error.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const copyCheckinLink = () => {
    navigator.clipboard.writeText(checkinUrl)
    showToast('Check-in link copied to clipboard!')
  }

  const canMarkCompleted = foundParticipation && foundParticipation.status === 'joined'

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Select Quest</label>
        <select
          value={selectedQuestId}
          onChange={(e) => {
            setSelectedQuestId(e.target.value)
            setFoundParticipation(null)
            setError('')
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
        >
          <option value="">Choose a quest...</option>
          {quests.map(quest => {
            const slotsLeft = (quest.capacity || 0) - (quest.reservedCount || 0)
            const endDate = quest.endAt ? formatDate(quest.endAt) : ''
            return (
              <option key={quest.id} value={quest.id}>
                {quest.title} ({quest.points} pts{slotsLeft <= 5 ? `, ${slotsLeft} slots left` : ''}{endDate ? `, ends ${endDate}` : ''})
              </option>
            )
          })}
        </select>
      </div>

      {selectedQuestId && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Find Participant
            </label>
            <div className="flex gap-2 mb-3">
              <button
                type="button"
                onClick={() => {
                  setSearchMode('email')
                  setUserInput('')
                  setFoundParticipation(null)
                  setError('')
                }}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                  searchMode === 'email'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Search by Email
              </button>
              <button
                type="button"
                onClick={() => {
                  setSearchMode('uid')
                  setUserInput('')
                  setFoundParticipation(null)
                  setError('')
                }}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                  searchMode === 'uid'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Search by UID
              </button>
            </div>
            <div className="flex gap-2">
              <input
                type={searchMode === 'email' ? 'email' : 'text'}
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder={searchMode === 'email' ? 'Enter participant email' : 'Enter participant UID'}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
              />
              <button
                onClick={handleSearch}
                disabled={searching || !userInput.trim()}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:bg-gray-300 font-medium"
              >
                {searching ? 'Searching...' : 'Search'}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {foundParticipation && (
            <>
              <ParticipationStatusCard participation={foundParticipation} quest={selectedQuest} />

              <button
                onClick={handleMarkCompleted}
                disabled={loading || !canMarkCompleted}
                className={`w-full px-4 py-3 rounded-lg font-medium ${
                  canMarkCompleted
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {loading ? 'Processing...' : canMarkCompleted ? 'Mark Completed & Release Reward' : 'Cannot Complete'}
              </button>
            </>
          )}

          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Check-in Link</h3>
            <p className="text-xs text-gray-500 mb-3">
              Share this link for quick check-in access
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={checkinUrl}
                readOnly
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50"
              />
              <button
                onClick={copyCheckinLink}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm"
              >
                Copy
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

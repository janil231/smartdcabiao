import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'
import { useAuth } from '../../contexts/AuthContext'
import { isAdmin } from '../../services/adminRole.service'
import { getActiveSeason } from '../../services/seasons.service'
import { listActiveQuests } from '../../services/quests.service'
import { adminMarkCompleted } from '../../services/participations.service'
import {
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore'
import { db } from '../../lib/firebase'

function NotAuthorized() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="flex-1 flex items-center justify-center px-4 py-20">
        <div className="text-center max-w-md">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-6">
            You are not authorized to access the Check-in page. Please contact your administrator.
          </p>
          <Link
            to="/"
            className="inline-flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium"
          >
            Back to Home
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  )
}

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

export default function LGUCheckinPage() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  
  const [isUserAdmin, setIsUserAdmin] = useState(false)
  const [checkingAdmin, setCheckingAdmin] = useState(true)
  
  const [quests, setQuests] = useState([])
  const [selectedQuestId, setSelectedQuestId] = useState(searchParams.get('checkinQuestId') || '')
  const [searchMode, setSearchMode] = useState('email')
  const [userInput, setUserInput] = useState('')
  const [foundParticipation, setFoundParticipation] = useState(null)
  const [searching, setSearching] = useState(false)
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState(null)
  const [checkinUrl, setCheckinUrl] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    async function checkAdminStatus() {
      if (!user) {
        setCheckingAdmin(false)
        setIsUserAdmin(false)
        return
      }
      const adminStatus = await isAdmin(user.uid)
      setIsUserAdmin(adminStatus)
      setCheckingAdmin(false)
    }
    checkAdminStatus()
  }, [user])

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
    if (isUserAdmin) {
      loadQuests()
    }
  }, [isUserAdmin])

  useEffect(() => {
    if (selectedQuestId && window.location.origin) {
      const baseUrl = `${window.location.origin}/lgu/checkin`
      const url = `${baseUrl}?checkinQuestId=${selectedQuestId}`
      setCheckinUrl(url)
    }
  }, [selectedQuestId])

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

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
      if (searchMode === 'email') {
        const participationsRef = collection(db, 'participations')
        const q = query(
          participationsRef,
          where('questId', '==', selectedQuestId),
          where('userEmail', '==', userInput.trim().toLowerCase())
        )
        const snapshot = await getDocs(q)
        
        if (snapshot.empty) {
          setError('No participation found for this email')
          return
        }

        const partData = snapshot.docs[0].data()
        setFoundParticipation({
          id: snapshot.docs[0].id,
          ...partData
        })
      } else {
        const participationsRef = collection(db, 'participations')
        const q = query(
          participationsRef,
          where('questId', '==', selectedQuestId),
          where('uid', '==', userInput.trim())
        )
        const snapshot = await getDocs(q)
        
        if (snapshot.empty) {
          setError('No participation found for this UID')
          return
        }

        const partData = snapshot.docs[0].data()
        setFoundParticipation({
          id: snapshot.docs[0].id,
          ...partData
        })
      }
    } catch (err) {
      setError('Error searching: ' + err.message)
    } finally {
      setSearching(false)
    }
  }

  const handleMarkCompleted = async () => {
    if (!selectedQuestId || !foundParticipation) {
      return
    }

    if (foundParticipation.status !== 'joined') {
      return
    }

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

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="flex-1 flex items-center justify-center px-4 py-20">
          <div className="text-center">
            <p className="text-gray-600 mb-4">Please sign in to access the Check-in page.</p>
            <Link to="/" className="text-emerald-600 hover:underline">Go to Home</Link>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  if (checkingAdmin) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="flex-1 flex items-center justify-center px-4 py-20">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-emerald-600 border-t-transparent"></div>
            <p className="text-gray-600 mt-2">Checking admin access...</p>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  if (!isUserAdmin) {
    return <NotAuthorized />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <main className="flex-1 pb-mobile-nav">
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="mb-8">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
              <Link to="/lgu" className="hover:text-emerald-600">Dashboard</Link>
              <span>/</span>
              <span>Check-in</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Quest Check-in</h1>
            <p className="text-gray-600 mt-1">Quickly mark participants as completed</p>
            <p className="text-sm text-gray-500 mt-1">Signed in as: {user.email}</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
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
        </div>
      </main>

      <Footer />

      {toast && (
        <div className={`fixed bottom-4 right-4 px-4 py-3 rounded-lg shadow-lg z-50 ${
          toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'
        }`}>
          {toast.message}
        </div>
      )}
    </div>
  )
}

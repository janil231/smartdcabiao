import { useState, useEffect, useCallback } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import OwnerQuestForm from '../components/owner/OwnerQuestForm'
import { useAuth } from '../contexts/AuthContext'
import { getBusinessById } from '../services/businesses.service'
import {
  listOwnerQuestsForBusiness,
  getOwnerQuestById,
  toggleOwnerQuestActive,
  getOwnerQuestParticipations,
  generateOwnerQuestQRToken,
  generateOwnerQuestEventCode,
  regenerateBuyQuestQRToken,
  rotateBuyQuestDailyCode,
  reactivatePausedQuestsForOwner,
  reactivateSinglePausedQuest,
} from '../services/ownerQuests.service'
import BuyQuestQRDisplayModal from '../components/owner/BuyQuestQRDisplayModal'
import BuyQuestParticipantsModal from '../components/owner/BuyQuestParticipantsModal'
import { getBusinessRewardsForOwner, markRewardAsUsed } from '../services/businessQuestRewards.service'
import { formatRewardLabel } from '../utils/rewardFormat'
import QuestDetailsPanel from '../components/owner/QuestDetailsPanel'

export default function MyBusinessQuestsPage() {
  const { id: businessId } = useParams()
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const [business, setBusiness] = useState(null)
  const [loading, setLoading] = useState(true)
  const [quests, setQuests] = useState([])
  const [rewards, setRewards] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editingQuest, setEditingQuest] = useState(null)
  const [participationCounts, setParticipationCounts] = useState({})
  const [selectedQuest, setSelectedQuest] = useState(null)
  const [toast, setToast] = useState(null)
  const [displayQRQuest, setDisplayQRQuest] = useState(null)
  const [participantsQuest, setParticipantsQuest] = useState(null)

  const showToast = useCallback((message) => {
    setToast(message)
    setTimeout(() => setToast(null), 3000)
  }, [])

  useEffect(() => {
    if (authLoading) return
    if (!user) { navigate('/'); return }

    let mounted = true
    async function load() {
      setLoading(true)
      try {
        const biz = await getBusinessById(businessId)
        if (!mounted) return
        if (!biz || biz.ownerUid !== user.uid) {
          navigate('/my-businesses')
          return
        }
        setBusiness(biz)

        if (import.meta.env.DEV) {
          console.log('[MyBusinessQuests] Loading quests for business:', businessId)
          console.log('[MyBusinessQuests] user.uid:', user.uid)
        }

        const questsData = await listOwnerQuestsForBusiness(businessId)

        if (import.meta.env.DEV) {
          console.log('[MyBusinessQuests] Loaded quests:', questsData)
          console.log('[MyBusinessQuests] Count:', questsData.length)
        }

        if (mounted) setQuests(questsData)

        const rewardsData = await getBusinessRewardsForOwner(businessId, user.uid)
        if (mounted) setRewards(rewardsData)

        const counts = {}
        await Promise.all(questsData.map(async (q) => {
          const parts = await getOwnerQuestParticipations(q.id)
          counts[q.id] = parts.length
        }))
        if (mounted) setParticipationCounts(counts)
      } catch (err) {
        console.error('[MyBusinessQuests] Load failed:', err)
        if (mounted) navigate('/my-businesses')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [user, authLoading, businessId, navigate])

  async function handleToggle(questId, isActive) {
    try {
      await toggleOwnerQuestActive(questId, isActive)
      setQuests(prev => prev.map(q => q.id === questId ? { ...q, isActive } : q))
      showToast(isActive ? 'Quest activated' : 'Quest deactivated')
    } catch (err) {
      console.error('[MyBusinessQuests] toggle failed:', err)
      showToast(`Failed to toggle quest: ${err.message}`)
    }
  }

  async function handleRegenerateBuyQR(questId) {
    try {
      await regenerateBuyQuestQRToken(questId)
      setQuests(prev => prev.map(q => q.id === questId ? { ...q, qrToken: 'regenerated' } : q))
      showToast('New QR token generated')
    } catch (err) {
      showToast('Failed to generate QR token')
    }
  }

  async function handleRotateDailyCode(questId) {
    try {
      const code = await rotateBuyQuestDailyCode(questId, user.uid)
      setQuests(prev => prev.map(q => q.id === questId ? { ...q, dailyCode: code, dailyCodeRotatedAt: new Date() } : q))
      showToast(`New code: ${code}`)
    } catch (err) {
      showToast(err.message || 'Failed to rotate code')
    }
  }

  async function handleGenerateQR(questId) {
    try {
      await generateOwnerQuestQRToken(questId)
      setQuests(prev => prev.map(q => q.id === questId ? { ...q, qrToken: 'regenerated' } : q))
      showToast('New QR token generated')
    } catch (err) {
      showToast('Failed to generate QR token')
    }
  }

  async function handleGenerateCode(questId) {
    try {
      const code = await generateOwnerQuestEventCode(questId)
      setQuests(prev => prev.map(q => q.id === questId ? { ...q, eventCode: code } : q))
      showToast(`New event code generated: ${code}`)
    } catch (err) {
      showToast('Failed to generate code')
    }
  }

  async function handleMarkUsed(rewardId) {
    try {
      await markRewardAsUsed(rewardId, user.uid)
      setRewards(prev => prev.map(r => r.id === rewardId ? { ...r, status: 'used' } : r))
      showToast('Reward marked as used')
    } catch (err) {
      showToast('Failed to mark reward as used')
    }
  }

  function handleEditQuest(quest) {
    setEditingQuest(quest)
    setShowForm(true)
  }

  async function handleFormSaved() {
    setShowForm(false)
    setEditingQuest(null)
    showToast('Quest saved successfully!')
    try {
      const updated = await listOwnerQuestsForBusiness(businessId)
      setQuests(updated)
    } catch (err) {
      console.error('[MyBusinessQuests] Refresh failed:', err)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-emerald-600 border-t-transparent" />
      </div>
    )
  }

  const pausedQuests = quests.filter(q => q.pausedBySeasonEnd)
  const activeQuests = quests.filter(q => q.isActive && !q.pausedBySeasonEnd)
  const inactiveQuests = quests.filter(q => !q.isActive && !q.pausedBySeasonEnd)
  const unusedRewards = rewards.filter(r => r.status === 'unused')

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      {toast && (
        <div className="fixed top-4 right-4 z-[2000] bg-emerald-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium animate-fade-in">
          {toast}
        </div>
      )}
      <main className="flex-1 pb-mobile-nav">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="mb-6">
            <Link to="/my-businesses" className="text-sm text-emerald-600 hover:text-emerald-700 font-medium inline-flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to My Businesses
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 mt-2">{business?.name || 'Business'}</h1>
            <p className="text-sm text-gray-500 mt-1">Manage quests and rewards</p>
          </div>

          {!showForm && (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="w-full mb-6 px-6 py-4 border-2 border-dashed border-emerald-300 rounded-xl text-emerald-700 font-medium hover:bg-emerald-50 transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create New Quest
            </button>
          )}

          {showForm && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  {editingQuest ? 'Edit Quest' : 'Create New Quest'}
                </h2>
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setEditingQuest(null) }}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Cancel
                </button>
              </div>
              <OwnerQuestForm
                businessId={businessId}
                businessName={business?.name}
                quest={editingQuest}
                onSaved={handleFormSaved}
              />
            </div>
          )}

          {quests.length === 0 && !showForm ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">No quests yet</h2>
              <p className="text-gray-500">Create your first quest to reward customers who visit or buy from your business.</p>
            </div>
          ) : (
            <>
              {pausedQuests.length > 0 && (
                <div className="mb-8">
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-semibold text-amber-900">Quests Paused — Season Ended</h3>
                        <p className="text-sm text-amber-700 mt-1">
                          {pausedQuests.length} quest{pausedQuests.length > 1 ? 's' : ''} paused because the LGU season ended.
                          Reactivate {pausedQuests.length > 1 ? 'them' : 'it'} when a new season starts.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await reactivatePausedQuestsForOwner(user.uid)
                            const updated = await listOwnerQuestsForBusiness(businessId)
                            setQuests(updated)
                            showToast('All paused quests reactivated')
                          } catch (err) {
                            showToast('Failed to reactivate: ' + err.message)
                          }
                        }}
                        className="shrink-0 px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 transition"
                      >
                        Reactivate All
                      </button>
                    </div>
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Paused Quests ({pausedQuests.length})</h2>
                  <div className="space-y-3">
                    {pausedQuests.map(quest => (
                      <QuestCard
                        key={quest.id}
                        quest={quest}
                        merchantUid={user?.uid}
                        completionCount={participationCounts[quest.id] || 0}
                        isPaused={true}
                        onReactivateSingle={async (qid) => {
                          try {
                            await reactivateSinglePausedQuest(qid, user.uid)
                            const updated = await listOwnerQuestsForBusiness(businessId)
                            setQuests(updated)
                            showToast('Quest reactivated')
                          } catch (err) {
                            showToast('Failed to reactivate: ' + err.message)
                          }
                        }}
                        onToggle={handleToggle}
                        onEdit={handleEditQuest}
                        onGenerateQR={handleGenerateQR}
                        onGenerateCode={handleGenerateCode}
                        onRegenerateBuyQR={handleRegenerateBuyQR}
                        onRotateDailyCode={handleRotateDailyCode}
                        onShowQRDisplay={(q) => setDisplayQRQuest(q)}
                        onShowParticipants={(q) => setParticipantsQuest(q)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {activeQuests.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Active Quests ({activeQuests.length})</h2>
                  <div className="space-y-3">
                    {activeQuests.map(quest => (
                      <QuestCard
                        key={quest.id}
                        quest={quest}
                        merchantUid={user?.uid}
                        completionCount={participationCounts[quest.id] || 0}
                        isPaused={false}
                        onReactivateSingle={null}
                        onToggle={handleToggle}
                        onEdit={handleEditQuest}
                        onGenerateQR={handleGenerateQR}
                        onGenerateCode={handleGenerateCode}
                        onRegenerateBuyQR={handleRegenerateBuyQR}
                        onRotateDailyCode={handleRotateDailyCode}
                        onShowQRDisplay={(q) => setDisplayQRQuest(q)}
                        onShowParticipants={(q) => setParticipantsQuest(q)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {inactiveQuests.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Inactive Quests ({inactiveQuests.length})</h2>
                  <div className="space-y-3">
                    {inactiveQuests.map(quest => (
                      <QuestCard
                        key={quest.id}
                        quest={quest}
                        merchantUid={user?.uid}
                        completionCount={participationCounts[quest.id] || 0}
                        isPaused={false}
                        onReactivateSingle={null}
                        onToggle={handleToggle}
                        onEdit={handleEditQuest}
                        onGenerateQR={handleGenerateQR}
                        onGenerateCode={handleGenerateCode}
                        onRegenerateBuyQR={handleRegenerateBuyQR}
                        onRotateDailyCode={handleRotateDailyCode}
                        onShowQRDisplay={(q) => setDisplayQRQuest(q)}
                        onShowParticipants={(q) => setParticipantsQuest(q)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {unusedRewards.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Pending Rewards ({unusedRewards.length})</h2>
                  <p className="text-sm text-gray-500 mb-3">Customers earned these rewards — mark as used once redeemed.</p>
                  <div className="space-y-2">
                    {unusedRewards.map(reward => (
                      <div key={reward.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-gray-900 truncate">{reward.rewardDescription}</p>
                          <p className="text-sm text-gray-500 truncate">
                            {reward.userEmail || 'User'} · Code: <span className="font-mono text-emerald-700 font-medium">{reward.code}</span>
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleMarkUsed(reward.id)}
                          className="ml-4 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-medium hover:bg-emerald-100 shrink-0"
                        >
                          Mark Used
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {displayQRQuest && (
        <BuyQuestQRDisplayModal
          quest={displayQRQuest}
          business={business}
          user={user}
          onClose={() => setDisplayQRQuest(null)}
        />
      )}

      {participantsQuest && (
        <BuyQuestParticipantsModal
          quest={participantsQuest}
          merchantUid={user?.uid}
          onClose={() => setParticipantsQuest(null)}
        />
      )}

      <Footer />
    </div>
  )
}

function QuestCard({ quest, merchantUid, completionCount, isPaused, onReactivateSingle, onToggle, onEdit, onGenerateQR, onGenerateCode, onRegenerateBuyQR, onRotateDailyCode, onShowQRDisplay, onShowParticipants }) {
  const [expanded, setExpanded] = useState(false)
  const isBuy = quest.questType === 'buy'

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-gray-900">{quest.title}</h3>
              {isPaused && (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                  Paused
                </span>
              )}
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                quest.questType === 'visit' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'
              }`}>
                {quest.questType === 'visit' ? 'Visit' : 'Buy'}
              </span>
              {isBuy && (
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  quest.buyVerificationMethod === 'qr' ? 'bg-cyan-50 text-cyan-700' : 'bg-orange-50 text-orange-700'
                }`}>
                  {quest.buyVerificationMethod === 'qr' ? 'QR' : 'Daily Code'}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600 mt-1 line-clamp-2">{quest.description}</p>
            <div className="flex items-center gap-3 mt-2 text-sm flex-wrap">
              <span className="text-emerald-700 font-medium">{formatRewardLabel(quest)}</span>
              {quest.questType === 'visit' && (
                <span className="text-gray-500">{quest.requiredDurationMinutes} min visit</span>
              )}
              <span className="text-gray-500">{completionCount} completed</span>
            </div>
            <div className="mt-2">
              <QuestDetailsPanel quest={quest} compact={true} />
            </div>
            {quest.questType === 'buy' && !quest.itemPhotoUrl && !quest.itemDetails && !quest.minimumPurchase && (
              <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                💡 Tip: Add item details to help customers know what to buy.{' '}
                <button onClick={() => onEdit(quest)} className="ml-1 font-semibold underline">
                  Edit quest
                </button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {isPaused ? (
              <button
                type="button"
                onClick={() => onReactivateSingle?.(quest.id)}
                className="px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-medium hover:bg-amber-700 transition"
              >
                Reactivate
              </button>
            ) : (
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={quest.isActive}
                  onChange={(e) => onToggle(quest.id, e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:bg-emerald-500 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all" />
              </label>
            )}
            <button
              type="button"
              onClick={() => onEdit(quest)}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Edit quest"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Toggle details"
            >
              <svg className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>

        {expanded && (
          <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
            {!isBuy && quest.verificationMethod === 'qr' && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">QR Token:</span>
                <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono truncate flex-1">{quest.qrToken || 'Not generated'}</code>
                <button
                  type="button"
                  onClick={() => onGenerateQR(quest.id)}
                  className="text-xs text-emerald-600 hover:text-emerald-700 font-medium shrink-0"
                >
                  Regenerate
                </button>
              </div>
            )}
            {!isBuy && quest.verificationMethod === 'code' && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Event Code:</span>
                <code className="text-sm bg-gray-100 px-2 py-1 rounded font-mono">{quest.eventCode || 'Not generated'}</code>
                <button
                  type="button"
                  onClick={() => onGenerateCode(quest.id)}
                  className="text-xs text-emerald-600 hover:text-emerald-700 font-medium shrink-0"
                >
                  Regenerate
                </button>
              </div>
            )}
            {isBuy && quest.buyVerificationMethod === 'qr' && (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onShowQRDisplay(quest)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700"
                >
                  Show QR to Customer
                </button>
                <button
                  type="button"
                  onClick={() => onShowParticipants(quest)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700"
                >
                  View Participants
                </button>
                <button
                  type="button"
                  onClick={() => onRegenerateBuyQR(quest.id)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-200"
                >
                  Rotate QR
                </button>
              </div>
            )}
            {isBuy && quest.buyVerificationMethod === 'code' && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm text-gray-600">Today's Code:</span>
                  <code className="text-sm bg-gray-100 px-2 py-1 rounded font-mono font-bold">{quest.dailyCode || 'Not generated'}</code>
                  <button
                    type="button"
                    onClick={() => onRotateDailyCode(quest.id)}
                    className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                  >
                    Rotate
                  </button>
                </div>
                {quest.dailyCodeRotatedAt && (
                  <p className="text-xs text-gray-500 mb-2">
                    Last rotated: {quest.dailyCodeRotatedAt?.toMillis
                      ? new Date(quest.dailyCodeRotatedAt.toMillis()).toLocaleString()
                      : quest.dailyCodeRotatedAt?.seconds
                        ? new Date(quest.dailyCodeRotatedAt.seconds * 1000).toLocaleString()
                        : 'Recently'}
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => onShowParticipants(quest)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700"
                >
                  View Participants
                </button>
              </div>
            )}
            {quest.questType === 'visit' && (
              <p className="text-sm text-gray-500">Geofence radius: 150m from business location</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

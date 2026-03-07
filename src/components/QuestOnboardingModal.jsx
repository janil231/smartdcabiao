import { Link } from 'react-router-dom'

const IMPACT_UNIT_CONFIG = {
  kg_trash: { label: 'Kg waste', icon: '🗑️' },
  trees: { label: 'Trees', icon: '🌳' },
  hours: { label: 'Hours', icon: '⏱️' },
  kg_plastic: { label: 'Kg plastic', icon: '♻️' },
  co2_kg: { label: 'Kg CO₂', icon: '🌍' },
}

function FeaturedQuestCard({ quest, onJoin }) {
  const slotsLeft = (quest.capacity || 0) - (quest.reservedCount || 0)
  
  const formatDeadline = () => {
    if (!quest.endAt) return 'No deadline'
    const endAt = new Date(quest.endAt)
    const now = new Date()
    const days = Math.ceil((endAt - now) / (1000 * 60 * 60 * 24))
    if (days <= 0) return 'Ended'
    if (days === 1) return 'Ends tomorrow'
    return `Ends in ${days} days`
  }

  return (
    <div className="flex flex-col rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-gray-900 text-sm line-clamp-2">{quest.title}</h3>
      </div>
      
      <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
        <span className="font-semibold text-amber-600">+{quest.points} pts</span>
        <span>•</span>
        <span>{formatDeadline()}</span>
      </div>

      {quest.impact && (
        <div className="mt-2 inline-flex items-center gap-1 text-xs bg-emerald-50 text-emerald-700 px-2 py-1 rounded-full w-fit">
          <span>{IMPACT_UNIT_CONFIG[quest.impact.unit]?.icon || '🌱'}</span>
          <span>+{quest.impact.amountPerCompletion} {quest.impact.label || quest.impact.unit}</span>
        </div>
      )}

      <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
        <span className={slotsLeft <= 5 ? 'text-orange-600' : ''}>
          {slotsLeft} slots left
        </span>
      </div>

      <button
        onClick={() => onJoin(quest.id)}
        className="mt-3 w-full py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700"
      >
        Join Quest
      </button>
    </div>
  )
}

export default function QuestOnboardingModal({ 
  isOpen, 
  onClose, 
  featuredQuests = [], 
  onJoinQuest,
  onViewAllQuests 
}) {
  if (!isOpen) return null

  const steps = [
    'Join community quests',
    'Complete and get verified',
    'Earn points → Redeem vouchers → Support sustainable tourism'
  ]

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose}></div>
      
      <div className="relative bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="p-6">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-full mb-4">
              <span className="text-3xl">🎯</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900">
              Start earning rewards this season
            </h2>
            <p className="mt-2 text-gray-600 text-sm">
              Join quests, earn points, and unlock exclusive vouchers from local partners!
            </p>
          </div>

          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">How it works:</h3>
            <ul className="space-y-2">
              {steps.map((step, index) => (
                <li key={index} className="flex items-start gap-3 text-sm text-gray-600">
                  <span className="flex-shrink-0 w-5 h-5 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center text-xs font-medium">
                    {index + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ul>
          </div>

          {featuredQuests.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Suggested beginner quests:</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {featuredQuests.slice(0, 3).map(quest => (
                  <FeaturedQuestCard 
                    key={quest.id} 
                    quest={quest} 
                    onJoin={onJoinQuest}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={onViewAllQuests}
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50"
            >
              View All Quests
            </button>
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700"
            >
              Got it!
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

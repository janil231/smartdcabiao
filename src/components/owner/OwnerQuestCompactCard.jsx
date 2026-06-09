import { useState } from 'react'
import QuestDetailsViewModal from './QuestDetailsViewModal'

function formatRewardText(quest) {
  if (quest.rewardType === 'discount_percent') return `${quest.rewardValue}% off ${quest.rewardItemName || 'items'}`
  if (quest.rewardType === 'discount_fixed') return `₱${quest.rewardValue} off ${quest.rewardItemName || 'items'}`
  if (quest.rewardType === 'free_item') return `Free ${quest.rewardItemName || 'item'}`
  if (quest.rewardType === 'bogo') return `Buy 1 Get 1 on ${quest.rewardItemName || 'items'}`
  return 'Special reward'
}

export default function OwnerQuestCompactCard({ quest, businessId, businessName, businessImage, isJoined = false }) {
  const [showModal, setShowModal] = useState(false)

  const isBuyQuest = quest.questType === 'buy'
  const minPurchase = quest.minimumPurchase || 0
  const rewardText = formatRewardText(quest)

  return (
    <>
      <button
        type="button"
        onClick={() => setShowModal(true)}
        className={`group relative flex flex-col w-full text-left bg-white border rounded-xl shadow-sm hover:shadow-md transition-all overflow-hidden h-full ${
          isJoined
            ? 'border-emerald-400 ring-1 ring-emerald-200'
            : 'border-gray-200 hover:border-emerald-300'
        }`}
      >
        {isJoined && (
          <span className="absolute top-2 right-2 z-10 bg-emerald-600 text-white text-xs font-medium px-2 py-1 rounded-full shadow-sm flex items-center gap-1">
            <span>✅</span>
            <span>Joined</span>
          </span>
        )}

        <div className="bg-emerald-50 px-4 py-2 border-b border-emerald-100 flex items-center gap-2 shrink-0">
          <span className="text-base">🏪</span>
          <span className="text-xs font-medium text-emerald-800 truncate flex-1">
            {businessName || 'Local Business'}
          </span>
          {isBuyQuest && (
            <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full shrink-0">
              Buy
            </span>
          )}
        </div>

        <div className="flex flex-col flex-1 p-4">
          <h3 className="font-semibold text-gray-900 text-base leading-snug line-clamp-2 mb-1">
            {quest.title || 'Untitled Quest'}
          </h3>

          <p className="text-sm text-gray-600 line-clamp-2 mb-3 flex-1">
            {quest.description || ''}
          </p>

          <div className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-xs font-medium px-2 py-1 rounded-md mb-2 self-start">
            <span>🎁</span>
            <span className="truncate max-w-[200px]">{rewardText}</span>
          </div>

          {isBuyQuest && minPurchase > 0 && (
            <div className="text-xs text-gray-500 mb-3 flex items-center gap-1">
              <span>💰</span>
              <span>Min purchase: ₱{minPurchase}</span>
            </div>
          )}

          <div className="mt-auto pt-2 border-t border-gray-100">
            <span className="text-sm font-medium text-emerald-600 group-hover:text-emerald-700 inline-flex items-center gap-1">
              View Details →
            </span>
          </div>
        </div>
      </button>

      {showModal && (
        <QuestDetailsViewModal
          quest={quest}
          businessId={businessId}
          businessName={businessName}
          businessImage={businessImage}
          isOpen={showModal}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  )
}

export default function QuestDetailsPanel({ quest, compact = false }) {
  const isBuyQuest = quest.questType === 'buy'

  const hasBuyDetails = isBuyQuest && (
    quest.itemPhotoUrl ||
    quest.itemDetails ||
    quest.minimumPurchase > 0 ||
    quest.quantityRequired > 1 ||
    quest.conditions
  )

  const hasVisitInstructions = !isBuyQuest && quest.questInstructions

  if (!hasBuyDetails && !hasVisitInstructions) return null

  if (isBuyQuest) {
    return (
      <div className={`bg-white/95 border border-emerald-200 rounded-lg ${compact ? 'p-2' : 'p-3'}`}>
        <div className="flex items-center gap-1.5 mb-2">
          <span className="text-sm">📋</span>
          <span className="text-xs font-bold text-emerald-900">What to Buy</span>
        </div>

        <div className="flex gap-3">
          {quest.itemPhotoUrl && (
            <img
              src={quest.itemPhotoUrl}
              alt={quest.rewardItemName}
              className={`rounded-md object-cover border border-gray-200 shrink-0 ${
                compact ? 'w-16 h-16' : 'w-20 h-20'
              }`}
            />
          )}

          <div className="flex-1 min-w-0 space-y-1">
            <div className="text-sm font-bold text-gray-900">
              {quest.rewardItemName}
              {quest.quantityRequired > 1 && (
                <span className="text-xs font-normal text-gray-600 ml-1">
                  (×{quest.quantityRequired})
                </span>
              )}
            </div>

            {quest.itemDetails && (
              <div className="text-xs text-gray-700">{quest.itemDetails}</div>
            )}

            {quest.minimumPurchase > 0 && (
              <div className="text-xs text-amber-700 font-semibold">
                💰 ₱{quest.minimumPurchase} minimum
              </div>
            )}

            {quest.conditions && (
              <div className="text-xs text-gray-600 italic mt-1">
                ⚠️ {quest.conditions}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white/95 border border-emerald-200 rounded-lg ${compact ? 'p-2' : 'p-3'}`}>
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-sm">📋</span>
        <span className="text-xs font-bold text-emerald-900">Quest Instructions</span>
      </div>
      <p className="text-xs text-gray-700">{quest.questInstructions}</p>
    </div>
  )
}

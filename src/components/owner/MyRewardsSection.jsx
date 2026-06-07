import { useState, useEffect } from 'react'
import { getMyBusinessQuestRewards } from '../../services/businessQuestRewards.service'

function assembleRewardDescription(rewardType, rewardValue, rewardItemName) {
  const item = rewardItemName || 'selected items'
  if (rewardType === 'discount_percent') return `${rewardValue}% off ${item}`
  if (rewardType === 'discount_fixed') return `₱${rewardValue} off ${item}`
  if (rewardType === 'free_item') return `Free ${item}`
  if (rewardType === 'bogo') return `Buy 1 Get 1 on ${item}`
  return `${rewardValue} off ${item}`
}

export default function MyRewardsSection({ uid }) {
  const [rewards, setRewards] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [copiedId, setCopiedId] = useState(null)

  useEffect(() => {
    if (!uid) return
    let mounted = true
    async function load() {
      setLoading(true)
      try {
        const data = await getMyBusinessQuestRewards(uid)
        if (mounted) setRewards(data)
      } catch {
        if (mounted) setRewards([])
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [uid])

  const filtered = filter === 'all'
    ? rewards
    : rewards.filter(r => r.status === filter)

  const handleCopy = (code, id) => {
    navigator.clipboard.writeText(code)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-1">My Merchant Rewards</h2>
      <p className="text-sm text-gray-500 mb-4">Reward codes earned from completing business quests</p>

      {rewards.length > 0 && (
        <div className="flex gap-2 mb-4">
          {['all', 'unused', 'used'].map(f => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                filter === f
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-4 border-emerald-600 border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-3xl mb-2">🎁</div>
          <p className="text-gray-500 text-sm">
            {rewards.length === 0
              ? "Complete merchant quests to earn exclusive rewards from local businesses!"
              : `No ${filter === 'unused' ? 'unused' : 'used'} rewards`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(reward => (
            <div
              key={reward.id}
              className={`rounded-xl border p-4 ${
                reward.status === 'used' ? 'border-gray-200 bg-gray-50' : 'border-emerald-200 bg-white'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-gray-900">{reward.businessName}</p>
                  <p className="text-sm text-gray-600 mt-0.5">
                    {assembleRewardDescription(reward.rewardType, reward.rewardValue, reward.rewardItemName)}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      reward.status === 'unused'
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}>
                      {reward.status === 'unused' ? 'Unused' : 'Used'}
                    </span>
                    {reward.completedAt && (
                      <span className="text-xs text-gray-400">
                        Earned {new Date(reward.completedAt.seconds * 1000 || reward.completedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>

                {reward.status === 'unused' && (
                  <div className="text-right shrink-0">
                    <div className="bg-gray-100 rounded-lg px-3 py-2">
                      <p className="text-xs text-gray-500 mb-0.5">Code</p>
                      <p className="font-mono font-bold text-emerald-700 tracking-wider text-sm">{reward.code}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(reward.code, reward.id)}
                      className="mt-1.5 text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                    >
                      {copiedId === reward.id ? 'Copied!' : 'Copy code'}
                    </button>
                    <p className="text-xs text-gray-400 mt-1">Show to staff at {reward.businessName}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

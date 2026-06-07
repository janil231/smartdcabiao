import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, getDocs, query, where, limit } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { getMyBusinessQuestRewards } from '../../services/businessQuestRewards.service'
import QuestDetailsPanel from './QuestDetailsPanel'

export default function MyQuestsSection({ user }) {
  const [participations, setParticipations] = useState([])
  const [quests, setQuests] = useState({})
  const [businesses, setBusinesses] = useState({})
  const [rewards, setRewards] = useState([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.uid) return

    const load = async () => {
      try {
        const partSnap = await getDocs(
          query(
            collection(db, 'ownerQuestParticipations'),
            where('uid', '==', user.uid)
          )
        )
        const parts = partSnap.docs.map(d => ({ id: d.id, ...d.data() }))
        setParticipations(parts)

        const questIds = [...new Set(parts.map(p => p.questId))]
        const questsMap = {}
        await Promise.all(
          questIds.map(async (qid) => {
            try {
              const qSnap = await getDocs(
                query(collection(db, 'ownerQuests'), where('__name__', '==', qid), limit(1))
              )
              if (!qSnap.empty) {
                const d = qSnap.docs[0]
                questsMap[qid] = { id: d.id, ...d.data() }
              }
            } catch {}
          })
        )
        setQuests(questsMap)

        const businessIds = [...new Set(Object.values(questsMap).map(q => q.businessId))]
        const bizMap = {}
        await Promise.all(
          businessIds.map(async (bid) => {
            try {
              const bSnap = await getDocs(
                query(collection(db, 'businesses'), where('__name__', '==', bid), limit(1))
              )
              if (!bSnap.empty) {
                const d = bSnap.docs[0]
                bizMap[bid] = { id: d.id, ...d.data() }
              }
            } catch {}
          })
        )
        setBusinesses(bizMap)

        const myRewards = await getMyBusinessQuestRewards(user.uid)
        setRewards(myRewards)
      } catch (err) {
        console.error('[MyQuests] Load failed:', err)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [user?.uid])

  if (loading) return <div className="text-center py-8 text-gray-500">Loading your quests...</div>

  if (participations.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-3">🎯</div>
        <h3 className="font-bold text-gray-900 mb-2">No quests yet</h3>
        <p className="text-sm text-gray-600 mb-4">Visit local businesses and join their quests to earn rewards!</p>
        <Link to="/businesses" className="inline-block bg-emerald-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-emerald-700">
          Browse Businesses
        </Link>
      </div>
    )
  }

  const filtered = participations.filter(p => {
    if (filter === 'all') return true
    if (filter === 'active') return p.status === 'joined' || p.status === 'active'
    if (filter === 'completed') return p.status === 'completed'
    if (filter === 'cancelled') return p.status === 'cancelled'
    return true
  })

  const grouped = {
    active: filtered.filter(p => p.status === 'joined' || p.status === 'active'),
    completed: filtered.filter(p => p.status === 'completed'),
    cancelled: filtered.filter(p => p.status === 'cancelled'),
  }

  const counts = {
    all: participations.length,
    active: participations.filter(p => p.status === 'joined' || p.status === 'active').length,
    completed: participations.filter(p => p.status === 'completed').length,
    cancelled: participations.filter(p => p.status === 'cancelled').length,
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-6">
        {['all', 'active', 'completed', 'cancelled'].map(f => (
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

      {grouped.active.length > 0 && (filter === 'all' || filter === 'active') && (
        <div className="mb-6">
          <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
            Active ({grouped.active.length})
          </h3>
          <div className="space-y-3">
            {grouped.active.map(p => (
              <MyQuestRow
                key={p.id}
                participation={p}
                quest={quests[p.questId]}
                business={businesses[quests[p.questId]?.businessId]}
                reward={null}
              />
            ))}
          </div>
        </div>
      )}

      {grouped.completed.length > 0 && (filter === 'all' || filter === 'completed') && (
        <div className="mb-6">
          <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
            Completed ({grouped.completed.length})
          </h3>
          <div className="space-y-3">
            {grouped.completed.map(p => (
              <MyQuestRow
                key={p.id}
                participation={p}
                quest={quests[p.questId]}
                business={businesses[quests[p.questId]?.businessId]}
                reward={rewards.find(r => r.questId === p.questId)}
              />
            ))}
          </div>
        </div>
      )}

      {grouped.cancelled.length > 0 && (filter === 'all' || filter === 'cancelled') && (
        <div className="mb-6">
          <h3 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
            Cancelled ({grouped.cancelled.length})
          </h3>
          <div className="space-y-3">
            {grouped.cancelled.map(p => (
              <MyQuestRow
                key={p.id}
                participation={p}
                quest={quests[p.questId]}
                business={businesses[quests[p.questId]?.businessId]}
                reward={null}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function MyQuestRow({ participation, quest, business, reward }) {
  if (!quest || !business) return null

  const rewardText = (() => {
    if (quest.rewardType === 'discount_percent') return `${quest.rewardValue}% off ${quest.rewardItemName || 'items'}`
    if (quest.rewardType === 'discount_fixed') return `₱${quest.rewardValue} off ${quest.rewardItemName || 'items'}`
    if (quest.rewardType === 'free_item') return `Free ${quest.rewardItemName || 'item'}`
    if (quest.rewardType === 'bogo') return `Buy 1 Get 1 on ${quest.rewardItemName || 'items'}`
    return 'Reward'
  })()

  const statusBadge = (() => {
    if (participation.status === 'active' && participation.timerStatus === 'running')
      return <span className="text-xs font-bold text-emerald-700">Running</span>
    if (participation.status === 'active' && participation.timerStatus === 'paused')
      return <span className="text-xs font-bold text-amber-700">Paused</span>
    if (participation.status === 'joined' || participation.status === 'active')
      return <span className="text-xs font-bold text-gray-600">Not started</span>
    if (participation.status === 'completed')
      return <span className="text-xs font-bold text-emerald-700">Completed</span>
    if (participation.status === 'cancelled')
      return <span className="text-xs font-bold text-gray-500">Cancelled</span>
    return null
  })()

  const handleCopy = () => {
    if (reward?.code) {
      navigator.clipboard.writeText(reward.code)
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="flex items-start justify-between gap-2 mb-1">
        <h4 className="font-bold text-gray-900 text-sm">{quest.title}</h4>
        {statusBadge}
      </div>
      <div className="text-xs text-gray-500 mb-2">{business.name}</div>
      <div className="text-xs font-bold text-amber-700 mb-3">{rewardText}</div>

      <div className="mb-3">
        <QuestDetailsPanel quest={quest} compact={true} />
      </div>

      {reward?.code && (
        <div className="flex items-center gap-2 mb-3 p-2 bg-amber-50 rounded-lg">
          <div className="font-mono text-sm font-bold text-amber-900 flex-1">{reward.code}</div>
          <button
            onClick={handleCopy}
            className="text-xs bg-emerald-600 text-white px-2 py-1 rounded hover:bg-emerald-700"
          >
            Copy
          </button>
        </div>
      )}

      <Link
        to={`/businesses/${business.id}`}
        className="block text-center text-xs font-semibold text-emerald-700 hover:underline"
      >
        Go to Business →
      </Link>
    </div>
  )
}

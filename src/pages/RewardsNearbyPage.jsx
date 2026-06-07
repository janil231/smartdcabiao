import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { collection, getDocs, doc, getDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { getFirstValidImage } from '../utils/imageUrl'
import QuestDetailsPanel from '../components/owner/QuestDetailsPanel'

const FILTER_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'visit', label: '🏃 Visit' },
  { value: 'buy', label: '🛍️ Buy' },
]

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'reward', label: 'Best Reward' },
]

function formatRewardValue(quest) {
  if (quest.rewardType === 'discount_percent') return `${quest.rewardValue}%`
  if (quest.rewardType === 'discount_fixed') return `₱${quest.rewardValue}`
  if (quest.rewardType === 'free_item') return 'Free'
  if (quest.rewardType === 'bogo') return 'BOGO'
  return ''
}

function getRewardSortValue(quest) {
  if (quest.rewardType === 'discount_percent') return quest.rewardValue * 10
  if (quest.rewardType === 'discount_fixed') return quest.rewardValue
  if (quest.rewardType === 'free_item') return 50
  if (quest.rewardType === 'bogo') return 40
  return 0
}

function RewardListCard({ quest }) {
  return (
    <Link
      to={`/businesses/${quest.businessId}`}
      className="group block relative overflow-hidden rounded-xl shadow-md hover:shadow-xl transition min-h-[160px]"
    >
      {quest.businessImage ? (
        <div
          className="absolute inset-0 bg-cover bg-center group-hover:scale-105 transition-transform duration-500"
          style={{ backgroundImage: `url(${quest.businessImage})` }}
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 via-emerald-600 to-amber-500" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/55 to-black/25" />

      <div className="relative z-10 p-4 h-full flex items-start gap-4 min-h-[160px]">
        <div className="hidden sm:flex w-14 h-14 rounded-xl bg-white/20 backdrop-blur items-center justify-center text-2xl shrink-0 shadow-sm">
          🎁
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-white group-hover:text-amber-300 transition drop-shadow-sm">
              {quest.title}
            </h3>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              quest.questType === 'visit'
                ? 'bg-blue-400/20 text-blue-100'
                : 'bg-purple-400/20 text-purple-100'
            }`}>
              {quest.questType === 'visit' ? '🏃 Visit' : '🛍️ Buy'}
            </span>
          </div>
          <p className="mt-1 text-sm text-white/80 line-clamp-1">{quest.description}</p>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            <span className="inline-flex items-center gap-1 rounded-full bg-white/95 backdrop-blur px-2.5 py-0.5 font-semibold text-gray-900">
              🎁 {formatRewardValue(quest)} {quest.rewardItemName || 'Reward'}
            </span>
            <span className="text-white/90">
              at <span className="font-semibold text-white">{quest.businessName}</span>
            </span>
            {quest.questType === 'visit' && quest.requiredDurationMinutes > 0 && (
              <span className="text-white/70 text-xs">
                {quest.requiredDurationMinutes} min stay
              </span>
            )}
          </div>
          {(quest.itemPhotoUrl || quest.itemDetails || quest.minimumPurchase > 0 || quest.conditions || quest.questInstructions) && (
            <div className="mt-2">
              <QuestDetailsPanel quest={quest} compact={true} />
            </div>
          )}
        </div>
        <svg className="w-5 h-5 text-white/50 group-hover:text-white transition shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </Link>
  )
}

export default function RewardsNearbyPage() {
  const [quests, setQuests] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [sort, setSort] = useState('newest')

  useEffect(() => {
    let mounted = true
    async function load() {
      setLoading(true)
      try {
        const snap = await getDocs(collection(db, 'ownerQuests'))
        const all = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(q => q.isActive !== false && q.businessId && q.businessName)

        const active = all

        const enriched = await Promise.all(
          active.map(async (q) => {
            try {
              const bizSnap = await getDoc(doc(db, 'businesses', String(q.businessId)))
              const biz = bizSnap.exists() ? { id: bizSnap.id, ...bizSnap.data() } : null
              return {
                ...q,
                businessImage: biz ? getFirstValidImage(biz.images) || null : null,
              }
            } catch {
              return { ...q, businessImage: null }
            }
          })
        )

        if (mounted) setQuests(enriched)
      } catch {
        if (mounted) setQuests([])
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [])

  const displayQuests = useMemo(() => {
    let list = quests

    if (filter === 'visit') list = list.filter(q => q.questType === 'visit')
    else if (filter === 'buy') list = list.filter(q => q.questType === 'buy')

    if (sort === 'reward') {
      list = [...list].sort((a, b) => getRewardSortValue(b) - getRewardSortValue(a))
    } else {
      list = [...list].sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() || a.createdAt?._seconds * 1000 || 0
        const bTime = b.createdAt?.toMillis?.() || b.createdAt?._seconds * 1000 || 0
        return bTime - aTime
      })
    }

    return list
  }, [quests, filter, sort])

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 pb-mobile-nav">
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="text-center sm:text-left">
            <span className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-4 py-1.5 text-sm font-semibold text-amber-800">
              🎁 Rewards Near You
            </span>
            <h1 className="mt-4 text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
              Earn Rewards at Local Businesses
            </h1>
            <p className="mt-2 text-gray-600">
              Complete quick quests — visit a store, stay a while, or make a purchase — to earn discounts, free items, and more.
            </p>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            {FILTER_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setFilter(opt.value)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition h-11 ${
                  filter === opt.value
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
            <div className="w-px h-8 bg-gray-200 self-center" />
            <select
              value={sort}
              onChange={e => setSort(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 h-11"
            >
              {SORT_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {loading ? (
            <div className="mt-8 space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse rounded-xl border border-gray-200 bg-white p-4">
                  <div className="flex gap-4">
                    <div className="w-14 h-14 rounded-xl bg-gray-200 hidden sm:block" />
                    <div className="flex-1 space-y-3">
                      <div className="h-5 bg-gray-200 rounded w-48" />
                      <div className="h-4 bg-gray-200 rounded w-full" />
                      <div className="h-4 bg-gray-200 rounded w-32" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : displayQuests.length > 0 ? (
            <div className="mt-8 space-y-3">
              {displayQuests.map(quest => (
                <RewardListCard key={quest.id} quest={quest} />
              ))}
            </div>
          ) : (
            <div className="mt-12 text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-3xl">
                🎁
              </div>
              <h3 className="mt-4 text-lg font-semibold text-gray-900">No rewards found</h3>
              <p className="mt-2 text-sm text-gray-500">
                {filter !== 'all'
                  ? 'Try changing the filter to see more results.'
                  : 'No active rewards available right now. Check back later!'}
              </p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}

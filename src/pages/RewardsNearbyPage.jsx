import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { collection, getDocs, doc, getDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { getFirstValidImage } from '../utils/imageUrl'
import OwnerQuestCompactCard from '../components/owner/OwnerQuestCompactCard'

const FILTER_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'visit', label: '🏃 Visit' },
  { value: 'buy', label: '🛍️ Buy' },
]

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'reward', label: 'Best Reward' },
]

function getRewardSortValue(quest) {
  if (quest.rewardType === 'discount_percent') return quest.rewardValue * 10
  if (quest.rewardType === 'discount_fixed') return quest.rewardValue
  if (quest.rewardType === 'free_item') return 50
  if (quest.rewardType === 'bogo') return 40
  return 0
}

function formatRewardValue(quest) {
  if (quest.rewardType === 'discount_percent') return `${quest.rewardValue}%`
  if (quest.rewardType === 'discount_fixed') return `₱${quest.rewardValue}`
  if (quest.rewardType === 'free_item') return 'Free'
  if (quest.rewardType === 'bogo') return 'BOGO'
  return ''
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
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse rounded-xl border border-gray-200 bg-white overflow-hidden">
                  <div className="h-10 bg-gray-100" />
                  <div className="p-4 space-y-3">
                    <div className="h-5 bg-gray-200 rounded w-3/4" />
                    <div className="h-4 bg-gray-200 rounded w-full" />
                    <div className="h-4 bg-gray-200 rounded w-1/2" />
                    <div className="h-6 bg-gray-100 rounded w-1/3" />
                    <div className="h-px bg-gray-100" />
                    <div className="h-4 bg-gray-200 rounded w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : displayQuests.length > 0 ? (
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayQuests.map(quest => (
                <OwnerQuestCompactCard
                  key={quest.id}
                  quest={quest}
                  businessId={quest.businessId}
                  businessName={quest.businessName}
                  businessImage={quest.businessImage}
                />
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

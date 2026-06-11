import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { collection, getDocs, doc, getDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { getFirstValidImage } from '../utils/imageUrl'
import { formatRewardLabelShort } from '../utils/rewardFormat'

function shuffleArray(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function RewardCard({ quest }) {
  return (
    <Link
      to={`/businesses/${quest.businessId}`}
      className="block relative overflow-hidden rounded-xl shadow-md hover:shadow-xl transition group min-h-[220px]"
    >
      {quest.businessImage ? (
        <div
          className="absolute inset-0 bg-cover bg-center group-hover:scale-105 transition-transform duration-500"
          style={{ backgroundImage: `url(${quest.businessImage})` }}
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 via-emerald-600 to-amber-500" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/60 to-black/20" />

      <div className="relative z-10 p-4 h-full flex flex-col justify-end text-white min-h-[220px]">
        <div className="text-[10px] font-bold uppercase tracking-wide text-amber-300 mb-1">
          {quest.businessName}
        </div>
        <h3 className="font-bold text-base mb-2 drop-shadow-sm">
          {quest.title}
        </h3>
        <div className="bg-white/95 backdrop-blur text-gray-900 rounded-lg p-2.5 mb-2">
          <div className="text-[10px] font-bold text-amber-700 uppercase">🎁 Reward</div>
          <div className="text-sm font-bold">{formatRewardLabelShort(quest)}</div>
          {quest.questType === 'buy' && quest.rewardItemName && (
            <div className="mt-1 flex items-center gap-2">
              {quest.itemPhotoUrl && (
                <img src={quest.itemPhotoUrl} className="w-8 h-8 rounded object-cover" alt={quest.rewardItemName} />
              )}
              <div className="text-[10px] text-gray-800 font-semibold truncate">
                {quest.rewardItemName}
                {quest.minimumPurchase > 0 && (
                  <span className="text-amber-700 ml-1">· ₱{quest.minimumPurchase}+</span>
                )}
              </div>
            </div>
          )}
          {quest.questType === 'buy' && !quest.itemPhotoUrl && quest.minimumPurchase > 0 && (
            <div className="text-[10px] text-amber-700 mt-1 font-medium">
              💰 ₱{quest.minimumPurchase} minimum
            </div>
          )}
        </div>
        <div className="text-xs font-semibold flex items-center gap-1">
          {quest.questType === 'visit'
            ? `🏃 Visit for ${quest.requiredDurationMinutes} min →`
            : '🛍️ Buy at counter →'}
        </div>
      </div>
    </Link>
  )
}

export default function MerchantRewardsCarousel() {
  const [rewards, setRewards] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        const snap = await getDocs(collection(db, 'ownerQuests'))
        const all = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(q => q.isActive !== false && q.businessId && q.businessName)

        const shuffled = shuffleArray(all).slice(0, 6)

        const enriched = await Promise.all(
          shuffled.map(async (q) => {
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

        if (mounted) setRewards(enriched)
      } catch {
        if (mounted) setRewards([])
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [])

  if (loading || rewards.length === 0) return null

  return (
    <section className="bg-gradient-to-b from-white to-emerald-50/30 py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-4 py-1.5 text-sm font-semibold text-amber-800">
            🎁 Rewards Near You
          </span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Earn Rewards at Local Businesses
          </h2>
          <p className="mt-4 max-w-2xl mx-auto text-lg text-gray-600">
            Complete quick quests to earn discounts, free items, and special offers at Cabiao&apos;s finest spots.
          </p>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {rewards.map(quest => (
            <RewardCard key={quest.id} quest={quest} />
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link
            to="/rewards-nearby"
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 transition"
          >
            View All Rewards
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  )
}

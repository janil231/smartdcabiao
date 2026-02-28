import { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { useAuth } from '../contexts/AuthContext'
import { getUserRewards } from '../api/participation'
import { participation as mockParticipation, rewardTotals as mockRewardTotals, REWARD_STATUS } from '../data'

const STATUS_STYLES = {
  [REWARD_STATUS.points]: 'bg-amber-500/10 text-amber-800 border-amber-200',
  [REWARD_STATUS.voucher]: 'bg-emerald-500/10 text-emerald-800 border-emerald-200',
  [REWARD_STATUS.completed]: 'bg-sky-500/10 text-sky-800 border-sky-200',
}

const STATUS_ICONS = {
  [REWARD_STATUS.points]: (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  [REWARD_STATUS.voucher]: (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
    </svg>
  ),
  [REWARD_STATUS.completed]: (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
}

function RewardCard({ entry }) {
  const statusStyle = STATUS_STYLES[entry.rewardStatus] || STATUS_STYLES[REWARD_STATUS.completed]
  const icon = STATUS_ICONS[entry.rewardStatus] || STATUS_ICONS[REWARD_STATUS.completed]

  return (
    <article className="flex flex-col rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md">
      <h2 className="text-lg font-semibold text-gray-900">{entry.activityName}</h2>
      <p className="mt-1 text-sm text-gray-500">{entry.date}</p>
      <div className="mt-4 flex flex-wrap items-start gap-3">
        <span
          className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium ${statusStyle}`}
        >
          {icon}
          {entry.rewardLabel}
        </span>
      </div>
      {entry.rewardDetail && (
        <p className="mt-3 text-sm text-gray-600">{entry.rewardDetail}</p>
      )}
    </article>
  )
}

export default function RewardsPreviewPage() {
  const { user } = useAuth()
  const [rewards, setRewards] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!user) {
      setRewards(null)
      return
    }
    setLoading(true)
    getUserRewards(user.uid)
      .then(setRewards)
      .catch(() => setRewards(null))
      .finally(() => setLoading(false))
  }, [user])

  const participation = rewards?.participationHistory ?? mockParticipation
  const totalPoints = rewards?.rewardPoints ?? mockRewardTotals.totalPoints
  const voucherCount = rewards?.voucherCount ?? mockRewardTotals.voucherCount
  const isRealData = !!user && !!rewards

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 pb-20 md:pb-0">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-10">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Rewards & Participation
            </h1>
            <p className="mt-3 max-w-2xl text-lg text-gray-600">
              Your community actions support city improvement and local businesses.
              {user ? (isRealData ? ' Here are your participation and earned rewards.' : ' Loading…') : ' Sign in to see your rewards and participation.'}
            </p>
          </div>

          {!user && (
            <div className="mb-10 rounded-xl border border-amber-200 bg-amber-50 p-5 text-amber-800">
              <p className="font-medium">Preview mode</p>
              <p className="mt-1 text-sm">Below is sample data. Log in to see your real points and vouchers from joined activities.</p>
            </div>
          )}

          {/* Summary */}
          <div className="mb-10 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-amber-50 to-orange-50 p-5">
              <p className="text-sm font-medium text-amber-800">Total points</p>
              <p className="mt-1 text-2xl font-bold text-amber-900 sm:text-3xl">{loading && user ? '…' : totalPoints}</p>
              <p className="mt-1 text-xs text-amber-700">Earned from activities</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-emerald-50 to-teal-50 p-5">
              <p className="text-sm font-medium text-emerald-800">Vouchers</p>
              <p className="mt-1 text-2xl font-bold text-emerald-900 sm:text-3xl">{loading && user ? '…' : voucherCount}</p>
              <p className="mt-1 text-xs text-emerald-700">Redeem at local businesses</p>
            </div>
          </div>

          {/* Participation cards */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Your participation</h2>
            <p className="mt-1 text-sm text-gray-600">
              Activities you’ve joined and rewards earned. Community actions → city improvement → local business support.
            </p>
            {loading && user ? (
              <p className="mt-6 text-gray-500">Loading…</p>
            ) : (
              <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {participation.length === 0 ? (
                  <p className="text-gray-500">No participation yet. Join activities on the Events page.</p>
                ) : (
                  participation.map((entry, index) => (
                    <RewardCard key={`${entry.activityId ?? index}-${entry.activityName}`} entry={entry} />
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}

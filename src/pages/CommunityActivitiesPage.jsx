import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { useAuth } from '../contexts/AuthContext'
import { getJoinedActivityIds, joinActivity, leaveActivity } from '../api/participation'
import { activities, ACTIVITY_TYPES } from '../data'

const TYPE_STYLES = {
  [ACTIVITY_TYPES.cleanup]: 'bg-sky-500/10 text-sky-700 border-sky-200',
  [ACTIVITY_TYPES.treePlanting]: 'bg-emerald-500/10 text-emerald-700 border-emerald-200',
  [ACTIVITY_TYPES.event]: 'bg-amber-500/10 text-amber-700 border-amber-200',
}

const TYPE_LABELS = {
  [ACTIVITY_TYPES.cleanup]: 'Clean-up',
  [ACTIVITY_TYPES.treePlanting]: 'Tree planting',
  [ACTIVITY_TYPES.event]: 'Event',
}

function ActivityCard({ activity, isJoined, onJoin }) {
  const typeStyle = TYPE_STYLES[activity.type] || 'bg-gray-100 text-gray-700 border-gray-200'
  const typeLabel = TYPE_LABELS[activity.type] || 'Activity'

  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition hover:shadow-md">
      <div className="flex flex-1 flex-col p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-block w-fit rounded border px-2 py-0.5 text-xs font-medium uppercase tracking-wider ${typeStyle}`}
          >
            {typeLabel}
          </span>
          {isJoined && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
              Joined
            </span>
          )}
        </div>
        <h2 className="mt-3 text-lg font-semibold text-gray-900">{activity.name}</h2>
        <p className="mt-2 flex-1 text-sm text-gray-600 line-clamp-3">{activity.description}</p>
        <dl className="mt-4 flex flex-col gap-1.5 text-sm text-gray-500">
          <div className="flex items-start gap-2">
            <dt className="shrink-0 font-medium text-gray-600">Date</dt>
            <dd>{activity.date}</dd>
          </div>
          <div className="flex items-start gap-2">
            <dt className="shrink-0 font-medium text-gray-600">Location</dt>
            <dd>{activity.location}</dd>
          </div>
        </dl>
        <button
          type="button"
          onClick={() => onJoin(activity)}
          disabled={isJoined}
          className={`mt-4 inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
            isJoined
              ? 'cursor-default bg-gray-100 text-gray-500'
              : 'bg-emerald-600 text-white hover:bg-emerald-700'
          }`}
        >
          {isJoined ? (
            <>
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              Joined
            </>
          ) : (
            <>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                />
              </svg>
              Join
            </>
          )}
        </button>
      </div>
    </article>
  )
}

export default function CommunityActivitiesPage() {
  const { user } = useAuth()
  const [joinedIds, setJoinedIds] = useState(() => new Set())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!user) {
      setJoinedIds(new Set())
      return
    }
    setLoading(true)
    getJoinedActivityIds(user.uid)
      .then((ids) => setJoinedIds(new Set(ids)))
      .catch(() => setJoinedIds(new Set()))
      .finally(() => setLoading(false))
  }, [user])

  const toggleJoin = async (activity) => {
    if (!user) return
    const isJoined = joinedIds.has(activity.id)
    setError(null)
    try {
      if (isJoined) {
        await leaveActivity(user.uid, activity.id)
        setJoinedIds((prev) => {
          const next = new Set(prev)
          next.delete(activity.id)
          return next
        })
      } else {
        await joinActivity(user.uid, activity)
        setJoinedIds((prev) => new Set([...prev, activity.id]))
      }
    } catch (err) {
      setError(err.message ?? 'Something went wrong')
    }
  }

  const joinedCount = joinedIds.size

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 pb-20 md:pb-0">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                Community Activities
              </h1>
              <p className="mt-3 max-w-2xl text-lg text-gray-600">
                Clean-up drives, tree planting, and local events that improve Cabiao. Join activities
                {user ? ' — your participation is saved to your account.' : ' — sign in to save your participation.'}
              </p>
            </div>
            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
                {error}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-3">
              {joinedCount > 0 && (
                <p className="text-sm font-medium text-emerald-700">
                  You’ve joined {joinedCount} {joinedCount === 1 ? 'activity' : 'activities'}
                </p>
              )}
              <Link
                to="/rewards"
                className="text-sm font-medium text-emerald-600 hover:text-emerald-700"
              >
                View rewards preview →
              </Link>
            </div>
          </div>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {loading ? (
              <p className="col-span-full text-center text-gray-500">Loading your participation…</p>
            ) : (
              activities.map((activity) => (
                <ActivityCard
                  key={activity.id}
                  activity={activity}
                  isJoined={joinedIds.has(activity.id)}
                  onJoin={toggleJoin}
                />
              ))
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}

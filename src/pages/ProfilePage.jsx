import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import MyRewardsSection from '../components/owner/MyRewardsSection'
import MyQuestsSection from '../components/owner/MyQuestsSection'
import { useAuth } from '../contexts/AuthContext'
import { useFavorites } from '../contexts/FavoritesContext'
import { useLanguage } from '../contexts/LanguageContext'
import BadgeCard from '../components/badges/BadgeCard'
import { getMySeasonStats, getUserSeasonWithActive, IMPACT_UNIT_CONFIG } from '../services/profileStats.service'
import { computeBadges } from '../features/badges/badgesEngine'
import { BADGE_CATALOG } from '../features/badges/badgesCatalog'
import { getUserSeasonStats, updateUserLeaderboardSettings } from '../services/leaderboard.service'
import { getMyBusinessSubmissions, getMyDestinationSubmissions } from '../services/submissions.service'

function StatusBadge({ status }) {
  const styles = {
    new: 'bg-blue-100 text-blue-800',
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    needs_info: 'bg-yellow-100 text-yellow-800'
  }
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
      {status?.replace('_', ' ').toUpperCase() || 'UNKNOWN'}
    </span>
  )
}

function ImpactStat({ unit, amount }) {
  const config = IMPACT_UNIT_CONFIG[unit]
  if (!config) return null
  
  return (
    <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
      <span className="text-xl">{config.icon}</span>
      <div>
        <p className="text-sm font-medium text-gray-900">{amount} {config.short}</p>
        <p className="text-xs text-gray-500">{config.label}</p>
      </div>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-emerald-600 border-t-transparent"></div>
        <p className="text-gray-600 mt-2">Loading...</p>
      </div>
    </div>
  )
}

function LoginPrompt() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="flex-1 flex items-center justify-center px-4 py-20">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Sign In Required</h1>
          <p className="text-gray-600 mb-6">Please sign in to view your profile, track your progress, and earn badges.</p>
          <Link
            to="/"
            className="inline-flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium"
          >
            Go to Home
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default function ProfilePage() {
  const { user, logout, loading: authLoading } = useAuth()
  const { favorites = [] } = useFavorites()
  const { t } = useLanguage()
  
  const [submissions, setSubmissions] = useState([])
  const [businessSubmissions, setBusinessSubmissions] = useState([])
  const [destinationSubmissions, setDestinationSubmissions] = useState([])
  const [businessSubmissionLoading, setBusinessSubmissionLoading] = useState(true)
  const [destinationSubmissionLoading, setDestinationSubmissionLoading] = useState(true)
  const [showAllBusinessSubmissions, setShowAllBusinessSubmissions] = useState(false)
  const [showAllDestinationSubmissions, setShowAllDestinationSubmissions] = useState(false)
  const [loading, setLoading] = useState(true)
  const [statsLoading, setStatsLoading] = useState(true)
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = searchParams.get('tab') || 'overview'
  const [season, setSeason] = useState(null)
  const [seasonStats, setSeasonStats] = useState({
    pointsTotal: 0,
    completedQuestsCount: 0,
    impactTotalsByUnit: {},
    approvedReviewsCount: 0
  })
  const [earnedBadges, setEarnedBadges] = useState([])
  const [badgeProgress, setBadgeProgress] = useState({})
  const [showOnLeaderboard, setShowOnLeaderboard] = useState(true)
  const [leaderboardSettingsLoading, setLeaderboardSettingsLoading] = useState(false)
  useEffect(() => {
    if (authLoading) return
    
    if (!user) return
    
    let mounted = true
    
    async function loadData() {
      setLoading(true)
      try {
        const { getUserSubmissions } = await import('../services/user.service')
        const data = await getUserSubmissions(user.uid)
        if (mounted) {
          setSubmissions(data || [])
        }

        const bizSubs = await getMyBusinessSubmissions(user.uid)
        if (mounted) {
          setBusinessSubmissions(bizSubs)
        }

        const destSubs = await getMyDestinationSubmissions(user.uid)
        if (mounted) {
          setDestinationSubmissions(destSubs)
        }
      } catch (error) {
        console.error('Error loading submissions:', error)
        if (mounted) {
          setSubmissions([])
          setBusinessSubmissions([])
          setDestinationSubmissions([])
        }
      } finally {
        if (mounted) {
          setLoading(false)
          setBusinessSubmissionLoading(false)
          setDestinationSubmissionLoading(false)
        }
      }
    }
    
    loadData()
    
    return () => {
      mounted = false
    }
  }, [user, authLoading])

  useEffect(() => {
    if (authLoading) return
    if (!user) return

    let mounted = true
    
    async function loadData() {
      setLoading(true)
      try {
        const { season: activeSeason, seasonId } = await getUserSeasonWithActive()
        
        if (!mounted) return
        
        if (activeSeason) {
          setSeason(activeSeason)
          
          const stats = await getMySeasonStats(user.uid, seasonId)
          
          if (!mounted) return
          
          setSeasonStats(stats || {
            pointsTotal: 0,
            completedQuestsCount: 0,
            impactTotalsByUnit: {},
            approvedReviewsCount: 0
          })
          
          const { earned, progress } = computeBadges({
            pointsTotal: stats?.pointsTotal || 0,
            completedCount: stats?.completedQuestsCount || 0,
            impactTotalsByUnit: stats?.impactTotalsByUnit || {},
            reviewsCount: stats?.approvedReviewsCount || 0,
            favoritesCount: favorites?.length || 0
          })
          
          setEarnedBadges(earned || [])
          setBadgeProgress(progress || {})

          const userSeasonStats = await getUserSeasonStats(user.uid, seasonId)
          if (mounted && userSeasonStats) {
            setShowOnLeaderboard(userSeasonStats.showOnLeaderboard ?? true)
          }
        }
      } catch (error) {
        console.error('Error loading season stats:', error)
        if (mounted) {
          setSeasonStats({
            pointsTotal: 0,
            completedQuestsCount: 0,
            impactTotalsByUnit: {},
            approvedReviewsCount: 0
          })
        }
      } finally {
        if (mounted) {
          setStatsLoading(false)
        }
      }
    }
    
    loadData()
    
    return () => {
      mounted = false
    }
  }, [user, authLoading, favorites?.length])

  const handleLogout = async () => {
    await logout()
  }

  const handleToggleLeaderboard = async () => {
    if (!season) return
    setLeaderboardSettingsLoading(true)
    try {
      await updateUserLeaderboardSettings(user.uid, season.id, { showOnLeaderboard: !showOnLeaderboard })
      setShowOnLeaderboard(!showOnLeaderboard)
    } catch (error) {
      console.error('Error updating leaderboard settings:', error)
    } finally {
      setLeaderboardSettingsLoading(false)
    }
  }

  if (authLoading) {
    return <LoadingSkeleton />
  }

  if (!user) {
    return <LoginPrompt />
  }

  const memberSince = user.metadata?.creationTime 
    ? new Date(user.metadata.creationTime).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })
    : 'Unknown'

  const favoriteBusinesses = favorites?.filter(f => f.type !== 'destination') || []
  const favoriteDestinations = favorites?.filter(f => f.type === 'destination') || []

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <main className="flex-1 pb-mobile-nav">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
                <span className="text-2xl font-bold text-emerald-600">
                  {user.email?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1">
                <h1 className="text-xl font-bold text-gray-900">{user.email}</h1>
                <p className="text-sm text-gray-500">Member since {memberSince}</p>
              </div>
              <button
                onClick={handleLogout}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium text-sm"
              >
                Sign Out
              </button>
            </div>
          </div>

          <div className="flex gap-2 mb-6 overflow-x-auto">
            <button
              onClick={() => setSearchParams({ tab: 'overview' })}
              className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition ${
                activeTab === 'overview' 
                  ? 'bg-emerald-600 text-white' 
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setSearchParams({ tab: 'stats' })}
              className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition ${
                activeTab === 'stats' 
                  ? 'bg-emerald-600 text-white' 
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              Season Stats
            </button>
            <button
              onClick={() => setSearchParams({ tab: 'badges' })}
              className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition ${
                activeTab === 'badges' 
                  ? 'bg-emerald-600 text-white' 
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              Badges ({earnedBadges?.length ?? 0})
            </button>
            <button
              onClick={() => setSearchParams({ tab: 'submissions' })}
              className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition ${
                activeTab === 'submissions' 
                  ? 'bg-emerald-600 text-white' 
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              My Submissions
            </button>
            <button
              onClick={() => setSearchParams({ tab: 'rewards' })}
              className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition ${
                activeTab === 'rewards' 
                  ? 'bg-emerald-600 text-white' 
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              My Rewards
            </button>
            <button
              onClick={() => setSearchParams({ tab: 'quests' })}
              className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition ${
                activeTab === 'quests' 
                  ? 'bg-emerald-600 text-white' 
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              My Quests
            </button>
          </div>

          {activeTab === 'overview' && (
            <>
              <div className="grid gap-6 md:grid-cols-2 mb-6">
                <Link 
                  to="/favorites"
                  className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:border-emerald-300 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                      </svg>
                    </div>
                    <div>
                      <h2 className="font-semibold text-gray-900">My Favorites</h2>
                      <p className="text-sm text-gray-500">
                        {(favorites?.length ?? 0)} saved places
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-4 text-sm">
                    <span className="text-gray-600">{favoriteBusinesses.length} businesses</span>
                    <span className="text-gray-600">{favoriteDestinations.length} destinations</span>
                  </div>
                </Link>

                <Link 
                  to="/my-businesses"
                  className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:border-emerald-300 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="font-semibold text-gray-900">My Business</h2>
                      <p className="text-sm text-gray-500">Manage quests and rewards for your business</p>
                    </div>
                  </div>
                </Link>

                <Link 
                  to="/suggest-destination"
                  className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:border-emerald-300 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
                      </svg>
                    </div>
                    <div>
                      <h2 className="font-semibold text-gray-900">Suggest a Destination</h2>
                      <p className="text-sm text-gray-500">Add a new destination to Cabiao</p>
                    </div>
                  </div>
                </Link>
              </div>

              {season && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">This Season: {season.name}</h2>
                      <p className="text-sm text-gray-500">
                        {new Date(season.startAt).toLocaleDateString()} - {new Date(season.endAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-emerald-600">{seasonStats?.pointsTotal ?? 0}</p>
                      <p className="text-sm text-gray-500">points earned</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                      <p className="text-xl font-bold text-gray-900">{seasonStats?.completedQuestsCount ?? 0}</p>
                      <p className="text-xs text-gray-500">quests completed</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                      <p className="text-xl font-bold text-gray-900">{seasonStats?.approvedReviewsCount ?? 0}</p>
                      <p className="text-xs text-gray-500">reviews approved</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                      <p className="text-xl font-bold text-gray-900">{favorites?.length ?? 0}</p>
                      <p className="text-xs text-gray-500">favorites</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                      <p className="text-xl font-bold text-gray-900">{earnedBadges?.length ?? 0}</p>
                      <p className="text-xs text-gray-500">badges earned</p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-gray-200 pt-4">
                    <div>
                      <p className="text-sm font-medium text-gray-900">Leaderboard visibility</p>
                      <p className="text-xs text-gray-500">
                        Control whether your name appears on season leaderboards.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleToggleLeaderboard}
                      disabled={leaderboardSettingsLoading}
                      className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                        showOnLeaderboard
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-gray-50 text-gray-600 border-gray-200'
                      }`}
                    >
                      <span
                        className={`mr-2 inline-block h-4 w-7 rounded-full transition ${
                          showOnLeaderboard ? 'bg-emerald-500' : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`block h-4 w-4 rounded-full bg-white shadow transform transition ${
                            showOnLeaderboard ? 'translate-x-3' : 'translate-x-0'
                          }`}
                        />
                      </span>
                      {leaderboardSettingsLoading
                        ? 'Saving...'
                        : showOnLeaderboard
                        ? 'Visible on leaderboard'
                        : 'Hidden from leaderboard'}
                    </button>
                  </div>
                </div>
              )}

              {!season && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6 text-center">
                  <div className="w-12 h-12 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-3">
                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1">No Active Season</h3>
                  <p className="text-sm text-gray-500">Check back later for the next tourism season!</p>
                </div>
              )}
            </>
          )}

          {activeTab === 'stats' && season && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Quest Progress</h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-emerald-50 rounded-lg p-4 text-center">
                    <p className="text-3xl font-bold text-emerald-600">{seasonStats?.pointsTotal ?? 0}</p>
                    <p className="text-sm text-emerald-700">Points Earned</p>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-4 text-center">
                    <p className="text-3xl font-bold text-blue-600">{seasonStats?.completedQuestsCount ?? 0}</p>
                    <p className="text-sm text-blue-700">Quests Completed</p>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-4 text-center">
                    <p className="text-3xl font-bold text-purple-600">{seasonStats?.approvedReviewsCount ?? 0}</p>
                    <p className="text-sm text-purple-700">Reviews Approved</p>
                  </div>
                  <div className="bg-amber-50 rounded-lg p-4 text-center">
                    <p className="text-3xl font-bold text-amber-600">{favorites?.length ?? 0}</p>
                    <p className="text-sm text-amber-700">Places Saved</p>
                  </div>
                </div>
              </div>

              {(seasonStats?.impactTotalsByUnit && Object.keys(seasonStats.impactTotalsByUnit).length > 0) && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Environmental Impact</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {Object.entries(seasonStats.impactTotalsByUnit).map(([unit, amount]) => (
                      <ImpactStat key={unit} unit={unit} amount={amount} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'stats' && !season && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center">
              <p className="text-gray-500">No active season to display stats for.</p>
            </div>
          )}

          {activeTab === 'badges' && (
            <div className="space-y-6">
              {season ? (
                <>
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-2">Season: {season.name}</h2>
                    <p className="text-sm text-gray-500">
                      Complete quests and make an impact to earn badges!
                    </p>
                  </div>

                  {(earnedBadges && earnedBadges.length > 0) && (
                    <div>
                      <h3 className="text-md font-semibold text-gray-900 mb-3">Earned Badges ({earnedBadges.length})</h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {earnedBadges.map(badge => (
                          <BadgeCard 
                            key={badge.id} 
                            badge={badge} 
                            earned={true}
                            progress={null}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <h3 className="text-md font-semibold text-gray-900 mb-3">All Badges</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {BADGE_CATALOG.map(badge => {
                        const isEarned = earnedBadges?.some(e => e.id === badge.id)
                        return (
                          <BadgeCard 
                            key={badge.id} 
                            badge={badge} 
                            earned={isEarned}
                            progress={isEarned ? null : (badgeProgress?.[badge.id] || null)}
                          />
                        )
                      })}
                    </div>
                  </div>
                </>
              ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center">
                  <div className="w-12 h-12 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-3">
                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                    </svg>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1">No Active Season</h3>
                  <p className="text-sm text-gray-500">Badges are earned during active tourism seasons.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'submissions' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="border-b border-gray-200 px-6 py-4">
                <h2 className="text-lg font-semibold text-gray-900">My Submissions</h2>
                <p className="text-sm text-gray-500">Places you've suggested for review</p>
              </div>

              {loading ? (
                <div className="p-8 text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-emerald-600 border-t-transparent"></div>
                </div>
              ) : (!submissions || submissions.length === 0) ? (
                <div className="p-8 text-center">
                  <p className="text-gray-500 mb-4">You haven't submitted any places yet.</p>
                  <Link 
                    to="/suggest-destination"
                    className="text-emerald-600 hover:underline font-medium"
                  >
                    Suggest your first place
                  </Link>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Name</th>
                        <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Type</th>
                        <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Category</th>
                        <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Submitted</th>
                        <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {submissions.map(sub => (
                        <tr key={sub.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 font-medium text-gray-900">{sub.name}</td>
                          <td className="px-6 py-4 text-gray-600">{sub.entryType || 'business'}</td>
                          <td className="px-6 py-4 text-gray-600">{sub.category || '-'}</td>
                          <td className="px-6 py-4 text-gray-600 text-sm">
                            {sub.createdAt ? new Date(sub.createdAt).toLocaleDateString() : '-'}
                          </td>
                          <td className="px-6 py-4">
                            <StatusBadge status={sub.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'rewards' && (
            <MyRewardsSection uid={user?.uid} />
          )}

          {activeTab === 'quests' && (
            <MyQuestsSection user={user} />
          )}
        </div>

        <div className="max-w-4xl mx-auto px-4 pb-8 space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-6">
            <div className="flex items-start gap-4">
              <div className="text-3xl shrink-0">🏪</div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-semibold text-gray-900">{t('registerBusiness.businessOwnerQuestion')}</h2>
                <p className="text-sm text-gray-600 mt-1">{t('registerBusiness.businessOwnerCTA')}</p>

                {businessSubmissionLoading ? (
                  <p className="text-sm text-gray-500 mt-4">{t('common.loading')}</p>
                ) : businessSubmissions.length > 0 ? (
                  <div className="mt-5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">
                      — {t('registerBusiness.yourBusinessSubmissions')} —
                    </p>
                    <ul className="space-y-3">
                      {(showAllBusinessSubmissions
                        ? businessSubmissions
                        : businessSubmissions.slice(0, 3)
                      ).map((sub) => (
                        <li
                          key={sub.id}
                          className="rounded-xl bg-gray-50 p-4 border border-gray-100"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-medium text-gray-900 truncate">
                                • {sub.businessName || sub.name || 'Business'}
                              </p>
                              <div className="mt-2 flex flex-wrap items-center gap-2">
                                {sub.status === 'approved' ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
                                    ✅ {t('registerBusiness.statusListed')}
                                  </span>
                                ) : sub.status === 'rejected' ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700">
                                    ❌ {t('registerBusiness.statusNotApproved')}
                                    {sub.rejectionReason && (
                                      <span className="font-normal"> · &ldquo;{sub.rejectionReason}&rdquo;</span>
                                    )}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700">
                                    ⏳ {t('registerBusiness.statusUnderReview')}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="shrink-0">
                              {sub.status === 'approved' && sub.approvedBusinessId ? (
                                <Link
                                  to={`/businesses/${sub.approvedBusinessId}`}
                                  className="text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
                                >
                                  {t('registerBusiness.viewListing')} →
                                </Link>
                              ) : sub.status === 'rejected' ? (
                                <Link
                                  to="/register-business"
                                  className="text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
                                >
                                  {t('registerBusiness.submitAgain')} →
                                </Link>
                              ) : null}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                    {businessSubmissions.length > 3 && (
                      <button
                        type="button"
                        onClick={() => setShowAllBusinessSubmissions((v) => !v)}
                        className="mt-3 text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
                      >
                        {showAllBusinessSubmissions
                          ? 'Show less'
                          : `${t('registerBusiness.showAll')} (${businessSubmissions.length})`}
                      </button>
                    )}
                    <div className="border-t border-gray-200 my-5" />
                  </div>
                ) : null}

                <Link
                  to="/register-business"
                  className="inline-flex items-center justify-center gap-2 w-full sm:w-auto min-h-[44px] mt-4 px-6 py-3 bg-emerald-600 text-white rounded-xl text-sm font-semibold shadow-sm hover:bg-emerald-700 transition-all duration-200"
                >
                  <span aria-hidden>+</span>
                  {businessSubmissions.length > 0
                    ? t('registerBusiness.addAnotherBusiness')
                    : `+ ${t('registerBusiness.listMyBusiness')}`}
                </Link>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6">
            <div className="flex items-start gap-4">
              <div className="text-3xl shrink-0">🌴</div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-semibold text-gray-900">{t('suggestDestination.title')}</h2>
                <p className="text-sm text-gray-600 mt-1">{t('suggestDestination.subtitle')}</p>

                {destinationSubmissionLoading ? (
                  <p className="text-sm text-gray-500 mt-4">{t('common.loading')}</p>
                ) : destinationSubmissions.length > 0 ? (
                  <div className="mt-5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">
                      — {t('suggestDestination.yourDestinationSubmissions')} —
                    </p>
                    <ul className="space-y-3">
                      {(showAllDestinationSubmissions
                        ? destinationSubmissions
                        : destinationSubmissions.slice(0, 3)
                      ).map((sub) => (
                        <li
                          key={sub.id}
                          className="rounded-xl bg-gray-50 p-4 border border-gray-100"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-medium text-gray-900 truncate">
                                • {sub.name || 'Destination'}
                              </p>
                              <div className="mt-2 flex flex-wrap items-center gap-2">
                                {sub.status === 'approved' ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
                                    ✅ {t('registerBusiness.statusListed')}
                                  </span>
                                ) : sub.status === 'rejected' ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700">
                                    ❌ {t('registerBusiness.statusNotApproved')}
                                    {sub.rejectionReason && (
                                      <span className="font-normal"> · &ldquo;{sub.rejectionReason}&rdquo;</span>
                                    )}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700">
                                    ⏳ {t('registerBusiness.statusUnderReview')}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="shrink-0">
                              {sub.status === 'rejected' ? (
                                <Link
                                  to="/suggest-destination"
                                  className="text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
                                >
                                  {t('registerBusiness.submitAgain')} →
                                </Link>
                              ) : null}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                    {destinationSubmissions.length > 3 && (
                      <button
                        type="button"
                        onClick={() => setShowAllDestinationSubmissions((v) => !v)}
                        className="mt-3 text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
                      >
                        {showAllDestinationSubmissions
                          ? 'Show less'
                          : `${t('suggestDestination.showAll')} (${destinationSubmissions.length})`}
                      </button>
                    )}
                    <div className="border-t border-gray-200 my-5" />
                  </div>
                ) : null}

                <Link
                  to="/suggest-destination"
                  className="inline-flex items-center justify-center gap-2 w-full sm:w-auto min-h-[44px] mt-4 px-6 py-3 bg-emerald-600 text-white rounded-xl text-sm font-semibold shadow-sm hover:bg-emerald-700 transition-all duration-200"
                >
                  <span aria-hidden>+</span>
                  {destinationSubmissions.length > 0
                    ? t('suggestDestination.submitAnother')
                    : `+ ${t('suggestDestination.title')}`}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}

import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { useAuth } from '../contexts/AuthContext'
import { useFavorites } from '../contexts/FavoritesContext'
import { getUserSubmissions } from '../services/user.service'

function StatusBadge({ status }) {
  const styles = {
    new: 'bg-blue-100 text-blue-800',
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

export default function ProfilePage() {
  const { user, logout } = useAuth()
  const { favorites, getFavoriteBusinesses, getFavoriteDestinations } = useFavorites()
  const navigate = useNavigate()
  
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('submissions')

  useEffect(() => {
    if (!user) {
      navigate('/')
      return
    }
    
    async function loadData() {
      setLoading(true)
      const data = await getUserSubmissions(user.uid)
      setSubmissions(data)
      setLoading(false)
    }
    loadData()
  }, [user])

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  if (!user) return null

  const favoriteBusinesses = getFavoriteBusinesses()
  const favoriteDestinations = getFavoriteDestinations()

  const memberSince = user.metadata?.creationTime 
    ? new Date(user.metadata.creationTime).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })
    : 'Unknown'

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <main className="flex-1 pb-20 md:pb-0">
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
                    {favorites.length} saved places
                  </p>
                </div>
              </div>
              <div className="mt-4 flex gap-4 text-sm">
                <span className="text-gray-600">{favoriteBusinesses.length} businesses</span>
                <span className="text-gray-600">{favoriteDestinations.length} destinations</span>
              </div>
            </Link>

            <Link 
              to="/suggest"
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:border-emerald-300 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
                  </svg>
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900">Suggest a Place</h2>
                  <p className="text-sm text-gray-500">Add a new business or destination</p>
                </div>
              </div>
            </Link>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">My Submissions</h2>
              <p className="text-sm text-gray-500">Places you've suggested for review</p>
            </div>

            {loading ? (
              <div className="p-8 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-emerald-600 border-t-transparent"></div>
              </div>
            ) : submissions.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-gray-500 mb-4">You haven't submitted any places yet.</p>
                <Link 
                  to="/suggest"
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
        </div>
      </main>

      <Footer />
    </div>
  )
}

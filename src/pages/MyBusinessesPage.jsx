import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { useAuth } from '../contexts/AuthContext'
import { getMyApprovedBusinesses } from '../services/businesses.service'

export default function MyBusinessesPage() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [businesses, setBusinesses] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      navigate('/')
      return
    }

    let mounted = true
    async function load() {
      setLoading(true)
      try {
        const data = await getMyApprovedBusinesses(user.uid)
        if (mounted) setBusinesses(data)
      } catch (err) {
        if (mounted) setBusinesses([])
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [user, authLoading, navigate])

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-emerald-600 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="flex-1 pb-mobile-nav">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">My Businesses</h1>
              <p className="text-sm text-gray-500 mt-1">Manage quests and rewards for your businesses</p>
            </div>
            <Link
              to="/register-business"
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
            >
              <span aria-hidden>+</span>
              Register New Business
            </Link>
          </div>

          {loading ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-emerald-600 border-t-transparent" />
              <p className="text-gray-500 mt-3">Loading your businesses...</p>
            </div>
          ) : businesses.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">No approved businesses yet</h2>
              <p className="text-gray-500 mb-6">You don't have any approved businesses yet. Register your business and wait for LGU approval to start creating quests.</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  to="/register-business"
                  className="inline-flex items-center justify-center px-6 py-3 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700"
                >
                  Register Your Business
                </Link>
                <Link
                  to="/businesses"
                  className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50"
                >
                  Browse Businesses
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {businesses.map((biz) => (
                <div key={biz.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                  {biz.images && biz.images.length > 0 && (
                    <div className="h-40 overflow-hidden bg-gray-100">
                      <img
                        src={biz.images[0]}
                        alt={biz.name}
                        className="w-full h-full object-cover"
                        onError={(e) => { e.target.style.display = 'none' }}
                      />
                    </div>
                  )}
                  <div className="p-5">
                    <h3 className="font-semibold text-gray-900 text-lg">{biz.name}</h3>
                    <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                      <span>{biz.category}</span>
                      {biz.barangay && (
                        <>
                          <span aria-hidden>·</span>
                          <span>{biz.barangay}</span>
                        </>
                      )}
                    </div>
                    <Link
                      to={`/my-businesses/${biz.id}/quests`}
                      className="mt-4 inline-flex items-center gap-2 w-full justify-center px-4 py-2.5 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-medium hover:bg-emerald-100 transition-colors"
                    >
                      Manage Quests
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}

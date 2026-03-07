import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'
import { useAuth } from '../../contexts/AuthContext'
import { isAdmin } from '../../services/adminRole.service'
import { getActiveSeason } from '../../services/seasons.service'
import { findRedemptionByCode, adminMarkVoucherUsed } from '../../services/voucherRedemptions.service'
import { logAudit } from '../../services/audit.service'

export default function LGUVoucherVerifyPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [season, setSeason] = useState(null)
  
  const [codeInput, setCodeInput] = useState('')
  const [searching, setSearching] = useState(false)
  const [redemption, setRedemption] = useState(null)
  const [searchError, setSearchError] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    async function checkAuth() {
      if (!user) {
        setCheckingAuth(false)
        return
      }
      try {
        const adminStatus = await isAdmin(user.uid)
        setAuthorized(adminStatus)
      } catch {
        setAuthorized(false)
      }
      setCheckingAuth(false)
    }
    checkAuth()
  }, [user])

  useEffect(() => {
    async function loadSeason() {
      const active = await getActiveSeason()
      setSeason(active)
      setLoading(false)
    }
    if (authorized) {
      loadSeason()
    }
  }, [authorized])

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const handleLookup = async (e) => {
    e.preventDefault()
    if (!codeInput.trim() || !season) return

    setSearching(true)
    setSearchError(null)
    setRedemption(null)

    try {
      await logAudit({
        action: 'voucher_verified_lookup',
        targetType: 'voucher_redemption',
        targetId: codeInput.trim(),
        adminUid: user.uid,
        adminEmail: user.email,
        meta: { code: codeInput.trim(), seasonId: season.id },
      })

      const result = await findRedemptionByCode({ 
        seasonId: season.id, 
        code: codeInput.trim() 
      })
      
      if (!result) {
        setSearchError('No voucher found with that code.')
      } else {
        setRedemption(result)
      }
    } catch (err) {
      setSearchError(err.message || 'Failed to lookup voucher')
    } finally {
      setSearching(false)
    }
  }

  const handleMarkUsed = async () => {
    if (!redemption || !season) return
    
    setActionLoading(true)
    try {
      await adminMarkVoucherUsed({
        seasonId: season.id,
        redemptionId: redemption.id,
        adminUser: user,
      })
      
      const updated = await findRedemptionByCode({ 
        seasonId: season.id, 
        code: redemption.code 
      })
      setRedemption(updated)
      showToast('Voucher marked as used!')
    } catch (err) {
      showToast(err.message || 'Failed to mark voucher as used', 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const getDisplayStatus = () => {
    if (!redemption) return null
    if (redemption.status === 'used') return 'used'
    
    const expiresAt = redemption.voucherSnapshot?.expiresAt
    const isExpired = expiresAt && (expiresAt.toDate ? expiresAt.toDate() : new Date(expiresAt)) < new Date()
    if (isExpired) return 'expired'
    
    return 'unused'
  }

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-emerald-600 border-t-transparent"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-600 mb-4">Please sign in to access the voucher verification page.</p>
            <Link to="/" className="text-emerald-600 hover:underline">Go Home</Link>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  if (!authorized) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-600 mb-4">You are not authorized to access the voucher verification page.</p>
            <Link to="/" className="text-emerald-600 hover:underline">Go Home</Link>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  const displayStatus = getDisplayStatus()
  const isExpired = displayStatus === 'expired'

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 pb-20 md:pb-0">
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="mb-6">
            <Link to="/lgu" className="text-emerald-600 hover:underline text-sm mb-2 inline-block">
              ← Back to LGU Dashboard
            </Link>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Verify Voucher</h1>
            <p className="text-gray-600 mt-1">Look up a voucher by code and mark it as used</p>
            {season && (
              <p className="text-sm text-gray-500 mt-1">Season: {season.name}</p>
            )}
          </div>

          {!season && !loading && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
              No active season found. Please activate a season first.
            </div>
          )}

          {season && (
            <div className="space-y-6">
              <form onSubmit={handleLookup} className="bg-white rounded-xl border border-gray-200 p-4">
                <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-2">
                  Enter Voucher Code
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    id="code"
                    value={codeInput}
                    onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                    placeholder="e.g., ABC-123-XYZ"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-mono text-lg"
                    disabled={searching}
                  />
                  <button
                    type="submit"
                    disabled={!codeInput.trim() || searching}
                    className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    {searching ? 'Searching...' : 'Lookup'}
                  </button>
                </div>
              </form>

              {searchError && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
                  {searchError}
                </div>
              )}

              {redemption && (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                    <h2 className="font-semibold text-gray-900">Voucher Details</h2>
                  </div>
                  
                  <div className="p-4 space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">
                          {redemption.voucherSnapshot?.title || 'Voucher'}
                        </h3>
                        {redemption.voucherSnapshot?.partnerName && (
                          <p className="text-sm text-gray-500">{redemption.voucherSnapshot.partnerName}</p>
                        )}
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        displayStatus === 'used' ? 'bg-gray-100 text-gray-700' :
                        displayStatus === 'expired' ? 'bg-red-100 text-red-700' :
                        'bg-emerald-100 text-emerald-700'
                      }`}>
                        {displayStatus === 'expired' ? 'EXPIRED' : displayStatus?.toUpperCase()}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Voucher Code</p>
                        <p className="font-mono font-bold text-lg">{redemption.code}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Points Cost</p>
                        <p className="font-semibold">{redemption.pointsCost ?? 0} pts</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Redeemed By</p>
                        <p className="text-gray-900">{redemption.userEmail || redemption.uid}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Redeemed At</p>
                        <p className="text-gray-900">
                          {redemption.redeemedAt?.toDate 
                            ? redemption.redeemedAt.toDate().toLocaleString() 
                            : '—'}
                        </p>
                      </div>
                      {redemption.usedAt && (
                        <div>
                          <p className="text-gray-500">Used At</p>
                          <p className="text-gray-900">
                            {redemption.usedAt.toDate().toLocaleString()}
                          </p>
                        </div>
                      )}
                      {redemption.usedByEmail && (
                        <div>
                          <p className="text-gray-500">Used By</p>
                          <p className="text-gray-900">{redemption.usedByEmail}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-gray-500">Expires</p>
                        <p className="text-gray-900">
                          {redemption.voucherSnapshot?.expiresAt?.toDate
                            ? redemption.voucherSnapshot.expiresAt.toDate().toLocaleDateString()
                            : 'No expiry'}
                        </p>
                      </div>
                    </div>

                    {displayStatus === 'unused' && !isExpired && (
                      <div className="pt-4 border-t border-gray-200">
                        <button
                          onClick={handleMarkUsed}
                          disabled={actionLoading}
                          className="w-full px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
                        >
                          {actionLoading ? 'Marking...' : 'Mark as Used'}
                        </button>
                      </div>
                    )}

                    {displayStatus === 'used' && (
                      <div className="pt-4 border-t border-gray-200">
                        <div className="rounded-lg bg-gray-100 p-3 text-center text-gray-600">
                          Already used on {redemption.usedAt?.toDate?.toLocaleString() || 'unknown date'}
                          {redemption.usedByEmail && ` by ${redemption.usedByEmail}`}
                        </div>
                      </div>
                    )}

                    {isExpired && (
                      <div className="pt-4 border-t border-gray-200">
                        <div className="rounded-lg bg-red-100 p-3 text-center text-red-800">
                          Expired — cannot use
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
      <Footer />
      
      {toast && (
        <div className={`fixed bottom-4 right-4 px-4 py-3 rounded-lg shadow-lg z-50 ${
          toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'
        }`}>
          {toast.message}
        </div>
      )}
    </div>
  )
}

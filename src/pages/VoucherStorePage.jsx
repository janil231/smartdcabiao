import { useEffect, useState } from 'react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { useAuth } from '../contexts/AuthContext'
import { getActiveSeason } from '../services/seasons.service'
import { listSeasonVouchers } from '../services/vouchers.service'
import { getOrCreateSeasonBalance, rebuildSeasonBalanceFromLedger } from '../services/seasonBalances.service'
import { listMyRedemptions, redeemVoucher } from '../services/voucherRedemptions.service'

function VoucherDetailsModal({ redemption, seasonId, onClose, onCopyCode }) {
  const status = redemption.status || 'unused'
  const expiryDate = redemption.voucherSnapshot?.expiresAt
  const isExpired = expiryDate && (expiryDate.toDate ? expiryDate.toDate() : new Date(expiryDate)) < new Date()
  const displayStatus = status === 'used' ? 'used' : (isExpired ? 'expired' : 'unused')
  
  const qrData = `SMARTDCABIAO|VOUCHER|${seasonId}|${redemption.code}`
  const encodedQrData = encodeURIComponent(qrData)
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodedQrData}`
  
  const expiryStr = expiryDate
    ? (expiryDate.toDate ? expiryDate.toDate().toLocaleDateString() : new Date(expiryDate).toLocaleDateString())
    : 'No expiry'
  
  const redeemedAtStr = redemption.redeemedAt?.toDate
    ? redemption.redeemedAt.toDate().toLocaleString()
    : '—'
  
  const usedAtStr = redemption.usedAt?.toDate
    ? redemption.usedAt.toDate().toLocaleString()
    : null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900">
              {redemption.voucherSnapshot?.title || 'Voucher'}
            </h3>
            {redemption.voucherSnapshot?.partnerName && (
              <p className="text-sm text-gray-500">{redemption.voucherSnapshot.partnerName}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="flex justify-center mb-4">
          <img src={qrImageUrl} alt="QR Code" className="rounded-lg border border-gray-200" />
        </div>

        <div className="text-center mb-4">
          <p className="text-xs text-gray-500 mb-1">Voucher Code</p>
          <div className="font-mono text-xl bg-gray-100 px-4 py-3 rounded-lg border border-gray-200 font-bold tracking-wider">
            {redemption.code}
          </div>
        </div>

        <div className="flex justify-center gap-2 mb-4">
          <button
            type="button"
            onClick={() => onCopyCode(redemption.code)}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium text-sm"
          >
            Copy Code
          </button>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Status</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
              displayStatus === 'used' ? 'bg-gray-100 text-gray-700' :
              displayStatus === 'expired' ? 'bg-red-100 text-red-700' :
              'bg-emerald-100 text-emerald-700'
            }`}>
              {displayStatus === 'expired' ? 'EXPIRED' : displayStatus.toUpperCase()}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Redeemed</span>
            <span className="text-gray-900">{redeemedAtStr}</span>
          </div>
          {usedAtStr && (
            <div className="flex justify-between">
              <span className="text-gray-500">Used</span>
              <span className="text-gray-900">{usedAtStr}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-gray-500">Expires</span>
            <span className="text-gray-900">{expiryStr}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Points Cost</span>
            <span className="text-gray-900">{redemption.pointsCost ?? 0} pts</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function VoucherStorePage() {
  const { user } = useAuth()
  const [season, setSeason] = useState(null)
  const [loading, setLoading] = useState(true)
  const [vouchers, setVouchers] = useState([])
  const [balance, setBalance] = useState(null)
  const [redemptions, setRedemptions] = useState([])
  const [redeemingId, setRedeemingId] = useState(null)
  const [toast, setToast] = useState(null)
  const [redeemSuccessCode, setRedeemSuccessCode] = useState(null)
  const [selectedRedemption, setSelectedRedemption] = useState(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const active = await getActiveSeason()
        if (!cancelled) setSeason(active || null)
      } catch (err) {
        console.error('[VoucherStore] Failed to fetch active season:', err)
      }
    })()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!season) return
    let cancelled = false
    ;(async () => {
      try {
        const list = await listSeasonVouchers(season.id)
        if (!cancelled) setVouchers(list)
      } catch (err) {
        console.error('[VoucherStore] Failed to fetch vouchers:', err)
        if (!cancelled) setVouchers([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [season])

  useEffect(() => {
    if (!user?.uid || !season) {
      setBalance(null)
      setRedemptions([])
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        let userBalance = await getOrCreateSeasonBalance(season.id, user).catch(() => null)

        const needsRebuild = !userBalance ||
          (userBalance.pointsEarned === 0 && userBalance.pointsSpent === 0 && userBalance.pointsBalance === 0)

        if (needsRebuild) {
          await rebuildSeasonBalanceFromLedger({
            seasonId: season.id,
            uid: user.uid,
            userEmail: user.email,
          }).catch((err) => {
            console.warn('[VoucherStore] Balance rebuild failed (non-fatal):', err)
          })
          userBalance = await getOrCreateSeasonBalance(season.id, user).catch(() => null)
        }

        const redemptions = await listMyRedemptions(season.id, user.uid).catch(() => [])

        if (!cancelled) {
          setBalance(userBalance)
          setRedemptions(redemptions)
        }
      } catch (err) {
        console.warn('[VoucherStore] User data fetch failed (non-fatal):', err)
        if (!cancelled) {
          setBalance(null)
          setRedemptions([])
        }
      }
    })()
    return () => { cancelled = true }
  }, [user, season])

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const handleRedeem = async (voucher) => {
    if (!user || !season || !voucher) return
    setRedeemingId(voucher.id)
    try {
      const result = await redeemVoucher({ seasonId: season.id, voucherId: voucher.id, user })
      setRedeemSuccessCode(result.code)
      showToast('Voucher redeemed!')
      Promise.all([
        getOrCreateSeasonBalance(season.id, user).catch(() => null),
        listMyRedemptions(season.id, user.uid).catch(() => []),
        listSeasonVouchers(season.id).catch(() => []),
      ]).then(([userBalance, userRedemptions, voucherList]) => {
        setBalance(userBalance)
        setRedemptions(userRedemptions)
        setVouchers(voucherList)
      })
    } catch (error) {
      showToast(error.message || 'Failed to redeem voucher', 'error')
    } finally {
      setRedeemingId(null)
    }
  }

  const handleCopyCode = async (code) => {
    try {
      await navigator.clipboard.writeText(code)
      showToast('Code copied to clipboard')
    } catch {
      showToast('Failed to copy code', 'error')
    }
  }

  const availablePoints = balance?.pointsBalance ?? 0
  const earnedPoints = balance?.pointsEarned ?? 0
  const spentPoints = balance?.pointsSpent ?? 0

  const getRedemptionDisplayStatus = (r) => {
    if (r.status === 'used') return 'used'
    const expiresAt = r.voucherSnapshot?.expiresAt
    const expired = expiresAt && (expiresAt.toDate ? expiresAt.toDate() : new Date(expiresAt)) < new Date()
    if (r.status === 'unused' && expired) return 'expired'
    return r.status || 'unused'
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 pb-mobile-nav">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Voucher Store
            </h1>
            <p className="mt-2 text-gray-600 max-w-2xl">
              Spend your seasonal points on partner vouchers. Balances reset each season.
            </p>
          </div>

          {!season && !loading && (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 text-center">
              <p className="text-gray-600">No active season at the moment. Check back soon for new vouchers.</p>
            </div>
          )}

          {season && (
            <div className="mb-6 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-emerald-800 font-medium">Season: </span>
                  <strong className="text-emerald-900">{season.name}</strong>
                  {season.startAt && season.endAt && (
                    <span className="text-emerald-600 ml-2">
                      ({new Date(season.startAt).toLocaleDateString()} - {new Date(season.endAt).toLocaleDateString()})
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {season && (
            <div className="mb-8 grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 p-4">
                <p className="text-sm font-medium text-emerald-800">Available Points</p>
                <p className="mt-1 text-3xl font-bold text-emerald-900">{availablePoints}</p>
              </div>
              <div className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
                <p className="text-sm font-medium text-blue-800">Earned This Season</p>
                <p className="mt-1 text-2xl font-bold text-blue-900">{earnedPoints}</p>
              </div>
              <div className="rounded-xl border border-amber-200 bg-gradient-to-br from-yellow-50 to-amber-50 p-4">
                <p className="text-sm font-medium text-amber-800">Spent on Vouchers</p>
                <p className="mt-1 text-2xl font-bold text-amber-900">{spentPoints}</p>
              </div>
            </div>
          )}

          {season && (
            <div className="grid gap-8 lg:grid-cols-3">
              <section className="lg:col-span-2">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-semibold text-gray-900">Available Vouchers</h2>
                  {!user && (
                    <p className="text-xs text-gray-500">Login to redeem vouchers.</p>
                  )}
                </div>
                {loading ? (
                  <p className="text-gray-500">Loading vouchers…</p>
                ) : vouchers.length === 0 ? (
                  <p className="text-gray-500">No vouchers available for this season yet.</p>
                ) : (
                  <div className="space-y-4">
                    {vouchers.map((voucher) => {
                      const stockRemaining = voucher.stockRemaining ?? voucher.stockTotal ?? 0
                      const isOutOfStock = stockRemaining <= 0
                      const isExpired =
                        voucher.expiresAt && voucher.expiresAt.toDate
                          ? voucher.expiresAt.toDate() < new Date()
                          : false
                      const canAfford = availablePoints >= (voucher.pointsCost || 0)
                      const disabled =
                        !user || isOutOfStock || isExpired || !voucher.isActive || !canAfford || redeemingId === voucher.id
                      return (
                        <article
                          key={voucher.id}
                          className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm flex flex-col gap-2"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <h3 className="text-base font-semibold text-gray-900">{voucher.title}</h3>
                              {voucher.partnerName && (
                                <p className="text-xs text-gray-500">Partner: {voucher.partnerName}</p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-bold text-emerald-700">
                                {voucher.pointsCost || 0} pts
                              </p>
                              <p className="text-xs text-gray-500">
                                {stockRemaining} left
                              </p>
                            </div>
                          </div>
                          {voucher.description && (
                            <p className="text-sm text-gray-600">{voucher.description}</p>
                          )}
                          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                            {voucher.expiresAt && voucher.expiresAt.toDate && (
                              <span>
                                Expires:{' '}
                                {voucher.expiresAt.toDate().toLocaleDateString()}
                              </span>
                            )}
                            {!voucher.isActive && (
                              <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-[11px] font-medium">
                                Inactive
                              </span>
                            )}
                            {isOutOfStock && (
                              <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[11px] font-medium">
                                Out of stock
                              </span>
                            )}
                            {isExpired && (
                              <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[11px] font-medium">
                                Expired
                              </span>
                            )}
                          </div>
                          {voucher.terms && (
                            <p className="mt-1 text-xs text-gray-500">
                              Terms: {voucher.terms}
                            </p>
                          )}
                          <div className="mt-2 flex justify-end">
                            <button
                              type="button"
                              disabled={disabled}
                              onClick={() => handleRedeem(voucher)}
                              className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium ${
                                disabled
                                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                  : 'bg-emerald-600 text-white hover:bg-emerald-700'
                              }`}
                            >
                              {redeemingId === voucher.id ? 'Redeeming…' : 'Redeem'}
                            </button>
                          </div>
                        </article>
                      )
                    })}
                  </div>
                )}
              </section>

              <section>
                <h2 className="text-lg font-semibold text-gray-900 mb-3">My Vouchers</h2>
                {!user && (
                  <p className="text-sm text-gray-500">
                    Login to view your redeemed vouchers.
                  </p>
                )}
                {user && (
                  <>
                    {loading ? (
                      <p className="text-gray-500">Loading your vouchers…</p>
                    ) : redemptions.length === 0 ? (
                      <p className="text-gray-500">
                        You haven&apos;t redeemed any vouchers this season yet.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {redemptions.map((r) => {
                          const displayStatus = getRedemptionDisplayStatus(r)
                          const expiryDate = r.voucherSnapshot?.expiresAt
                          const expiryStr = expiryDate
                            ? (expiryDate.toDate ? expiryDate.toDate() : new Date(expiryDate)).toLocaleDateString()
                            : '—'
                          return (
                            <div
                              key={r.id}
                              className="rounded-lg border border-gray-200 bg-white p-3 text-sm"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <p className="font-semibold text-gray-900">
                                    {r.voucherSnapshot?.title || 'Voucher'}
                                  </p>
                                  {r.voucherSnapshot?.partnerName && (
                                    <p className="text-xs text-gray-500">
                                      Partner: {r.voucherSnapshot.partnerName}
                                    </p>
                                  )}
                                  <p className="mt-1 text-xs text-gray-500">
                                    Redeemed:{' '}
                                    {r.redeemedAt?.toDate
                                      ? r.redeemedAt.toDate().toLocaleString()
                                      : '—'}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    Expires: {expiryStr} · {r.pointsCost ?? 0} pts
                                  </p>
                                </div>
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[11px] font-medium shrink-0 ${
                                    displayStatus === 'used'
                                      ? 'bg-gray-100 text-gray-700'
                                      : displayStatus === 'expired'
                                      ? 'bg-red-100 text-red-700'
                                      : 'bg-emerald-100 text-emerald-700'
                                  }`}
                                >
                                  {displayStatus === 'expired' ? 'EXPIRED' : displayStatus.toUpperCase()}
                                </span>
                              </div>
                              <div className="mt-2 flex items-center justify-between gap-2">
                                <div className="font-mono text-xs bg-gray-50 px-2 py-1 rounded border border-dashed border-gray-300">
                                  {r.code}
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedRedemption(r)}
                                    className="text-xs font-medium text-emerald-600 hover:text-emerald-700"
                                  >
                                    View
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleCopyCode(r.code)}
                                    className="text-xs font-medium text-emerald-600 hover:text-emerald-700"
                                  >
                                    Copy
                                  </button>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </>
                )}
              </section>
            </div>
          )}
        </div>
      </main>
      <Footer />
      {redeemSuccessCode && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 text-center">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Voucher redeemed</h3>
            <p className="text-gray-600 text-sm mb-4">Your code:</p>
            <div className="font-mono text-lg bg-gray-100 px-4 py-3 rounded-lg border border-gray-200 mb-4">
              {redeemSuccessCode}
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  handleCopyCode(redeemSuccessCode)
                  setRedeemSuccessCode(null)
                }}
                className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium"
              >
                Copy code
              </button>
              <button
                type="button"
                onClick={() => setRedeemSuccessCode(null)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`fixed bottom-4 right-4 px-4 py-3 rounded-lg shadow-lg z-50 ${
          toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'
        }`}>
          {toast.message}
        </div>
      )}

      {selectedRedemption && season && (
        <VoucherDetailsModal
          redemption={selectedRedemption}
          seasonId={season.id}
          onClose={() => setSelectedRedemption(null)}
          onCopyCode={(code) => {
            handleCopyCode(code)
            showToast('Code copied!')
          }}
        />
      )}
    </div>
  )
}


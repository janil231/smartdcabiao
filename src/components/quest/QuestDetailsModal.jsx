import { useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { formatDate, formatDateTime } from '../../utils/dateHelpers'

function StatusBadge({ status }) {
  const styles = {
    joined: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    expired: 'bg-red-100 text-red-800',
  }
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
      {status?.toUpperCase() || 'UNKNOWN'}
    </span>
  )
}

export default function QuestDetailsModal({ quest, participations, impactForQuest, isMaster, questDetails, onClose }) {
  const [participationSearch, setParticipationSearch] = useState('')

  const filteredParticipations = useMemo(() => {
    if (!participationSearch.trim()) return participations
    const q = participationSearch.trim().toLowerCase()
    return participations.filter((p) => {
      const email = (p.userEmail || '').toLowerCase()
      const uid = (p.uid || '').toLowerCase()
      return email.includes(q) || uid.includes(q)
    })
  }, [participations, participationSearch])

  const isActive = quest.isActive || quest.status === 'active'
  const reservedCount = quest.reservedCount || 0
  const slotsLeft = (quest.capacity || 0) - reservedCount
  const isFull = slotsLeft <= 0

  const getQRImageURL = (payload, size = 400) => {
    const encoded = encodeURIComponent(payload)
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encoded}`
  }

  const handleDownloadQR = async () => {
    try {
      const url = getQRImageURL(quest.qrPayload, 800)
      const response = await fetch(url)
      const blob = await response.blob()
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `quest-${quest.id}-qr.png`
      link.click()
      URL.revokeObjectURL(link.href)
    } catch {
      alert('Download failed. Try again.')
    }
  }

  const handlePrintQR = () => {
    const win = window.open('', '_blank')
    win.document.write(`
      <html>
        <head>
          <title>QR Poster - ${quest.title}</title>
          <style>
            body { font-family: sans-serif; text-align: center; padding: 40px; }
            h1 { color: #047857; margin-bottom: 8px; }
            h2 { color: #374151; margin-top: 0; }
            .qr { margin: 30px auto; }
            .instructions { font-size: 18px; color: #4b5563; margin-top: 20px; }
            .footer { margin-top: 40px; font-size: 14px; color: #9ca3af; }
          </style>
        </head>
        <body>
          <h1>SMARTDCABIAO Quest</h1>
          <h2>${quest.title}</h2>
          <img class="qr" src="${getQRImageURL(quest.qrPayload, 600)}" />
          <p class="instructions">📱 Scan this QR code with the SMARTDCABIAO app to verify your quest!</p>
          <p class="footer">Earn ${quest.points} QP · Cabiao Tourism</p>
        </body>
      </html>
    `)
    win.document.close()
    setTimeout(() => win.print(), 500)
  }

  const getVerificationIcon = (method) => {
    if (method === 'qr') return '📱'
    if (method === 'code') return '🔢'
    return '✍️'
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="fixed inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl my-8 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
          <h3 className="font-semibold text-lg text-gray-900">Quest Details</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition" aria-label="Close">✕</button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{quest.title}</h2>
            {quest.description && (
              <p className="text-sm text-gray-500 mt-1">{quest.description}</p>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-500 font-medium">Category</p>
              <p className="text-sm font-semibold text-gray-900 capitalize mt-0.5">{quest.category || '-'}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-500 font-medium">Points</p>
              <p className="text-sm font-semibold text-gray-900 mt-0.5">{quest.points ?? '-'}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-500 font-medium">Capacity</p>
              <p className="text-sm font-semibold text-gray-900 mt-0.5">{quest.capacity ?? '-'}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-500 font-medium">Reserved</p>
              <p className={`text-sm font-semibold mt-0.5 ${quest.reservedCount < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                {reservedCount}
                {quest.reservedCount < 0 && <span className="ml-1 text-xs">⚠️</span>}
              </p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-500 font-medium">Slots Left</p>
              <p className={`text-sm font-semibold mt-0.5 ${isFull ? 'text-red-600' : 'text-gray-900'}`}>
                {isFull ? 'Full' : slotsLeft}
              </p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-500 font-medium">Completed</p>
              <p className="text-sm font-semibold text-gray-900 mt-0.5">{quest.completedCount || 0}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-500 font-medium">Status</p>
              <div className="mt-1">
                <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
                  isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                  {isActive ? 'LIVE' : 'DRAFT'}
                </span>
              </div>
            </div>
          </div>

          {/* Verification */}
          <div>
            <p className="text-sm font-medium text-gray-500 mb-2">
              <span className="mr-1">{getVerificationIcon(quest.verificationMethod)}</span>
              Verification
            </p>

            {quest.verificationMethod === 'qr' && quest.qrPayload ? (
              <div className="space-y-3">
                <div className="flex flex-col items-center gap-3 p-4 bg-gray-50 rounded-xl">
                  <img
                    src={getQRImageURL(quest.qrPayload)}
                    alt="Quest QR Code"
                    className="w-48 sm:w-56 h-auto"
                  />
                  <p className="text-sm text-gray-500 text-center">
                    Print and post this QR code at the venue. Users scan it to verify.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleDownloadQR}
                      className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition"
                    >
                      Download PNG
                    </button>
                    <button
                      onClick={handlePrintQR}
                      className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-800 text-white text-sm font-medium transition"
                    >
                      Print Poster
                    </button>
                  </div>
                </div>
                <details className="text-sm text-gray-500">
                  <summary className="cursor-pointer hover:text-gray-700 font-medium">QR Payload</summary>
                  <div className="mt-2 flex gap-2">
                    <code className="flex-1 bg-gray-100 rounded-lg px-3 py-2 text-xs break-all font-mono">
                      {quest.qrPayload}
                    </code>
                    <button
                      onClick={() => navigator.clipboard.writeText(quest.qrPayload)}
                      className="px-3 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-medium transition shrink-0"
                    >
                      Copy
                    </button>
                  </div>
                </details>
              </div>
            ) : quest.verificationMethod === 'code' && quest.eventCode ? (
              <div className="space-y-2">
                <p className="text-sm text-gray-500">Share this code with users to verify their participation:</p>
                <div className="flex items-center gap-2">
                  <code className="text-lg bg-emerald-50 text-emerald-700 px-4 py-2 rounded-lg font-mono font-bold">
                    {quest.eventCode}
                  </code>
                  <button
                    onClick={() => navigator.clipboard.writeText(quest.eventCode)}
                    className="px-3 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-medium transition"
                  >
                    Copy
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                Users manually confirm their participation. No QR or code required.
              </p>
            )}
          </div>

          {impactForQuest && (
            <div>
              <p className="text-sm font-medium text-gray-500 mb-2">Impact Totals</p>
              <div className="flex flex-wrap gap-2">
                {impactForQuest.byUnit && Object.entries(impactForQuest.byUnit).map(([unit, amount]) => (
                  <div key={unit} className="bg-amber-50 rounded-lg px-3 py-2 border border-amber-200">
                    <p className="text-xs text-amber-700 font-medium capitalize">{unit}</p>
                    <p className="font-semibold text-amber-900">{amount}</p>
                  </div>
                ))}
                {(!impactForQuest.byUnit || Object.keys(impactForQuest.byUnit).length === 0) && (
                  <p className="text-sm text-gray-500">No impact data.</p>
                )}
              </div>
            </div>
          )}

          {quest.deadline && (
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Deadline</p>
              <p className="text-sm text-gray-900">{formatDateTime(quest.deadline)}</p>
            </div>
          )}

          {quest.createdAt && (
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Created</p>
              <p className="text-sm text-gray-900">{formatDateTime(quest.createdAt)}</p>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-gray-500">
                Participations ({participations.length})
              </p>
              <div className="relative w-64">
                <input
                  type="text"
                  value={participationSearch}
                  onChange={(e) => setParticipationSearch(e.target.value)}
                  placeholder="Search by email or UID..."
                  className="w-full pl-3 pr-8 py-1.5 rounded-lg border border-gray-300 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 focus:outline-none"
                />
                {participationSearch && (
                  <button
                    onClick={() => setParticipationSearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
            {participations.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No participations yet.</p>
            ) : (
              <div className="overflow-x-auto border border-gray-200 rounded-xl">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase">User</th>
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase">Reward</th>
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase">Joined</th>
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase">Points</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredParticipations.map((p) => (
                      <tr key={p.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5 font-medium text-gray-900">
                          {p.userEmail || (p.uid ? `${p.uid.substring(0, 8)}...` : '-')}
                        </td>
                        <td className="px-4 py-2.5">
                          <StatusBadge status={p.status} />
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            p.rewardStatus === 'released' ? 'bg-green-100 text-green-800' :
                            p.rewardStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            p.rewardStatus === 'expired' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {p.rewardStatus?.toUpperCase() || 'PENDING'}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-gray-600 text-sm">
                          {formatDate(p.joinedAt)}
                        </td>
                        <td className="px-4 py-2.5 text-gray-600">{quest.points || 0} pts</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex items-center justify-end rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

import { useEffect, useState } from 'react'
import { listBusinessRewards } from '../../services/businessQuestRewards.service'
import { formatDate } from '../../utils/dateHelpers'

export default function RedemptionHistorySection({ businessId }) {
  const [rewards, setRewards] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    if (!businessId || !expanded) return
    let cancelled = false
    setLoading(true)
    listBusinessRewards(businessId)
      .then(data => { if (!cancelled) { setRewards(data); setLoading(false) } })
      .catch(err => { if (!cancelled) { console.warn(err); setLoading(false) } })
    return () => { cancelled = true }
  }, [businessId, expanded])

  const filtered = rewards.filter(r => {
    if (filter === 'all') return true
    return r.status === filter
  })

  const stats = {
    total: rewards.length,
    used: rewards.filter(r => r.status === 'used').length,
    unused: rewards.filter(r => r.status === 'unused').length,
  }

  return (
    <section className="mt-8 border-t border-gray-200 pt-6">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between text-left"
      >
        <h2 className="text-lg font-semibold text-gray-900">
          📊 Reward Redemption History
        </h2>
        <span className="text-gray-400 text-lg">{expanded ? '▾' : '▸'}</span>
      </button>

      {expanded && (
        <div className="mt-4">
          {loading && <p className="text-sm text-gray-500">Loading...</p>}

          {!loading && rewards.length === 0 && (
            <p className="text-sm text-gray-500 py-4 text-center">No rewards earned yet.</p>
          )}

          {!loading && rewards.length > 0 && (
            <>
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
                  <div className="text-xs text-gray-500">Total Earned</div>
                </div>
                <div className="bg-emerald-50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-emerald-700">{stats.used}</div>
                  <div className="text-xs text-emerald-600">Redeemed</div>
                </div>
                <div className="bg-amber-50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-amber-700">{stats.unused}</div>
                  <div className="text-xs text-amber-600">Outstanding</div>
                </div>
              </div>

              <div className="flex gap-2 mb-3">
                {['all', 'unused', 'used'].map(f => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      filter === f
                        ? 'bg-emerald-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left p-2">Code</th>
                      <th className="text-left p-2">Customer</th>
                      <th className="text-left p-2">Earned</th>
                      <th className="text-left p-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(r => (
                      <tr key={r.id} className="border-b border-gray-100">
                        <td className="p-2 font-mono text-xs">{r.code}</td>
                        <td className="p-2 truncate max-w-[140px]" title={r.userEmail}>{r.userEmail}</td>
                        <td className="p-2 text-xs text-gray-600">{formatDate(r.completedAt)}</td>
                        <td className="p-2">
                          {r.status === 'used' ? (
                            <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-1 rounded-full whitespace-nowrap">
                              ✓ Used {formatDate(r.usedAt)}
                            </span>
                          ) : (
                            <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-full">
                              Unused
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </section>
  )
}

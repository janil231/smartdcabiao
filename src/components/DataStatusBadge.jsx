export default function DataStatusBadge({ source, lastSyncedAt, onRefresh }) {
  const formatTime = (timestamp) => {
    if (!timestamp) return ''
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)
    
    if (diffMins < 1) return 'just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  if (source === 'live') {
    return (
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-xs font-medium text-emerald-700">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          Live data
        </span>
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            className="text-xs text-gray-500 hover:text-gray-700 underline"
          >
            Refresh
          </button>
        )}
      </div>
    )
  }

  if (source === 'cache') {
    return (
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-1 text-xs font-medium text-amber-700">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" />
          </svg>
          Offline (cached)
        </span>
        {lastSyncedAt && (
          <span className="text-xs text-amber-600">
            Last synced: {formatTime(lastSyncedAt)}
          </span>
        )}
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            className="text-xs text-amber-700 hover:text-amber-900 underline font-medium"
          >
            Refresh
          </button>
        )}
      </div>
    )
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-50 border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600">
      Sample data
    </span>
  )
}

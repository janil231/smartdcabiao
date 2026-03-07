export default function BadgeCard({ badge, earned = false, progress = null }) {
  const percentage = progress 
    ? Math.min(100, Math.round((progress.current / progress.target) * 100))
    : earned ? 100 : 0

  return (
    <div 
      className={`relative overflow-hidden rounded-xl border-2 p-4 transition-all ${
        earned 
          ? 'border-yellow-400 bg-gradient-to-br from-yellow-50 to-amber-50' 
          : 'border-gray-200 bg-gray-50'
      }`}
    >
      <div className="flex flex-col items-center text-center">
        <div 
          className={`text-4xl mb-2 ${earned ? '' : 'grayscale opacity-40'}`}
        >
          {badge.icon}
        </div>
        
        <h3 className={`font-semibold text-sm ${earned ? 'text-gray-900' : 'text-gray-500'}`}>
          {badge.title}
        </h3>
        
        <p className={`text-xs mt-1 ${earned ? 'text-gray-600' : 'text-gray-400'}`}>
          {badge.description}
        </p>

        {!earned && progress && (
          <div className="mt-3 w-full">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>{progress.current}</span>
              <span>{progress.target}</span>
            </div>
            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        )}

        {earned && (
          <div className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-yellow-700">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Earned
          </div>
        )}
      </div>
    </div>
  )
}

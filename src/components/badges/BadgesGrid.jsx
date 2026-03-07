import BadgeCard from './BadgeCard'

export default function BadgesGrid({ earnedBadges = [], progress = {}, loading = false }) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="rounded-xl border border-gray-200 p-4">
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 bg-gray-200 rounded-full mb-2" />
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-1" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  const allBadges = [
    ...earnedBadges,
    ...earnedBadges.map(e => e.id)
  ]

  return (
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
  )
}

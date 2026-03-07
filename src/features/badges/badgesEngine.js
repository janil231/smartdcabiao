import { BADGE_CATALOG } from './badgesCatalog'

export function computeBadges({ 
  pointsTotal = 0, 
  completedCount = 0, 
  impactTotalsByUnit = {}, 
  reviewsCount = 0, 
  favoritesCount = 0 
}) {
  const earnedBadges = []
  const lockedBadges = []
  const progress = {}

  for (const badge of BADGE_CATALOG) {
    const { criteria } = badge
    let current = 0
    let target = criteria.min
    let earned = false

    switch (criteria.type) {
      case 'completedQuests':
        current = completedCount
        earned = current >= criteria.min
        break

      case 'points':
        current = pointsTotal
        earned = current >= criteria.min
        break

      case 'impact':
        current = impactTotalsByUnit[criteria.unit] || 0
        earned = current >= criteria.min
        break

      case 'reviews':
        current = reviewsCount
        earned = current >= criteria.min
        break

      case 'favorites':
        current = favoritesCount
        earned = current >= criteria.min
        break

      default:
        earned = false
    }

    progress[badge.id] = { current, target }

    if (earned) {
      earnedBadges.push(badge)
    } else {
      lockedBadges.push(badge)
    }
  }

  return { earnedBadges, lockedBadges, progress }
}

export function getBadgeProgress(badgeId, progress) {
  return progress[badgeId] || { current: 0, target: 1 }
}

export function getBadgePercentage(badgeId, progress) {
  const { current, target } = getBadgeProgress(badgeId, progress)
  if (target === 0) return 0
  return Math.min(100, Math.round((current / target) * 100))
}

export function isBadgeEarned(badgeId, earnedBadges) {
  return earnedBadges.some(badge => badge.id === badgeId)
}

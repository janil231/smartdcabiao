export const BADGE_CATALOG = [
  {
    id: 'eco_starter',
    title: 'Eco Starter',
    description: 'Complete your first quest this season',
    icon: '🌱',
    criteria: { type: 'completedQuests', min: 1 }
  },
  {
    id: 'community_helper',
    title: 'Community Helper',
    description: 'Complete 3 quests this season',
    icon: '🤝',
    criteria: { type: 'completedQuests', min: 3 }
  },
  {
    id: 'climate_champion',
    title: 'Climate Champion',
    description: 'Complete 5 quests this season',
    icon: '🏆',
    criteria: { type: 'completedQuests', min: 5 }
  },
  {
    id: 'quest_master',
    title: 'Quest Master',
    description: 'Complete 10 quests this season',
    icon: '🌟',
    criteria: { type: 'completedQuests', min: 10 }
  },
  {
    id: 'tree_planter',
    title: 'Tree Planter',
    description: 'Plant 3 or more trees this season',
    icon: '🌳',
    criteria: { type: 'impact', unit: 'trees', min: 3 }
  },
  {
    id: 'clean_up_crew',
    title: 'Clean-Up Crew',
    description: 'Collect 10kg or more of trash this season',
    icon: '🧹',
    criteria: { type: 'impact', unit: 'kg_trash', min: 10 }
  },
  {
    id: 'volunteer_hero',
    title: 'Volunteer Hero',
    description: 'Volunteer 5 or more hours this season',
    icon: '⏰',
    criteria: { type: 'impact', unit: 'hours', min: 5 }
  },
  {
    id: 'plastic_free',
    title: 'Plastic-Free Supporter',
    description: 'Help remove 5kg or more of plastic this season',
    icon: '♻️',
    criteria: { type: 'impact', unit: 'kg_plastic', min: 5 }
  },
  {
    id: 'carbon_fighter',
    title: 'Carbon Fighter',
    description: 'Help reduce 10kg or more CO₂ this season',
    icon: '💨',
    criteria: { type: 'impact', unit: 'co2_kg', min: 10 }
  },
  {
    id: 'local_explorer',
    title: 'Local Explorer',
    description: 'Save 5 or more places to favorites',
    icon: '🗺️',
    criteria: { type: 'favorites', min: 5 }
  },
  {
    id: 'trusted_reviewer',
    title: 'Trusted Reviewer',
    description: 'Get 1 or more reviews approved',
    icon: '📝',
    criteria: { type: 'reviews', min: 1 }
  },
  {
    id: 'point_collector',
    title: 'Point Collector',
    description: 'Earn 100 or more points this season',
    icon: '💎',
    criteria: { type: 'points', min: 100 }
  },
  {
    id: 'point_master',
    title: 'Point Master',
    description: 'Earn 500 or more points this season',
    icon: '👑',
    criteria: { type: 'points', min: 500 }
  }
]

export const BADGE_ICONS = {
  eco_starter: '🌱',
  community_helper: '🤝',
  climate_champion: '🏆',
  quest_master: '🌟',
  tree_planter: '🌳',
  clean_up_crew: '🧹',
  volunteer_hero: '⏰',
  plastic_free: '♻️',
  carbon_fighter: '💨',
  local_explorer: '🗺️',
  trusted_reviewer: '📝',
  point_collector: '💎',
  point_master: '👑'
}

export function getBadgeById(id) {
  return BADGE_CATALOG.find(badge => badge.id === id)
}

export function getAllBadges() {
  return BADGE_CATALOG
}

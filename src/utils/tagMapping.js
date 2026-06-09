import { INTEREST_IDS } from '../constants/interests'

const BUSINESS_CATEGORY_MAP = {
  food_dining: ['food'],
  restaurant: ['food'],
  retail_shopping: ['shopping'],
  shop: ['shopping'],
  services: ['shopping'],
  tourism_recreation: ['nature', 'adventure'],
  attraction: ['culture', 'nature'],
  accommodation: ['wellness'],
  agriculture: ['eco', 'nature'],
  cafe: ['food'],
  market: ['shopping', 'food'],
}

const DESTINATION_CATEGORY_MAP = {
  park: ['nature'],
  nature: ['nature'],
  heritage: ['culture'],
  historical: ['culture'],
  cultural: ['culture'],
  church: ['culture'],
  shrine: ['culture'],
  museum: ['culture'],
  adventure: ['adventure'],
  recreation: ['adventure'],
  beach: ['nature', 'wellness'],
  river: ['nature', 'adventure'],
  waterfall: ['nature', 'adventure'],
  wellness: ['wellness'],
  spa: ['wellness'],
  shopping: ['shopping'],
  food: ['food'],
  dining: ['food'],
  event: ['events'],
  festival: ['events'],
  eco: ['eco'],
  farm: ['eco', 'nature'],
  garden: ['nature', 'wellness'],
  viewpoint: ['nature', 'adventure'],
  landmark: ['culture'],
  destination: ['culture'],
  tour: ['adventure', 'culture'],
}

const QUEST_TYPE_MAP = {
  visit: ['culture', 'nature'],
  buy: ['shopping'],
  participate: ['events'],
}

const QUEST_CATEGORY_ENRICHMENT = {
  cleanup: ['eco'],
  treePlanting: ['eco', 'nature'],
  tree_planting: ['eco', 'nature'],
  event: ['events'],
  visit: ['culture', 'nature'],
  buy: ['shopping'],
  tour: ['eco', 'nature'],
  heritage: ['culture'],
}

function normalizeTag(tag) {
  return String(tag).toLowerCase().trim()
}

function filterValid(tags) {
  const valid = new Set(INTEREST_IDS)
  return [...new Set(tags.map(normalizeTag).filter(t => valid.has(t)))]
}

export function inferBusinessTags(business) {
  if (!business) return []
  const tags = []

  const category = (business.category || '').toLowerCase()
  const type = (business.type || '').toLowerCase()

  const mapped = BUSINESS_CATEGORY_MAP[category] || BUSINESS_CATEGORY_MAP[type] || []
  tags.push(...mapped)

  if (tags.length === 0) {
    tags.push('shopping')
  }

  return filterValid(tags)
}

export function inferDestinationTags(destination) {
  if (!destination) return []
  const tags = []

  const category = (destination.category || '').toLowerCase()

  const mapped = DESTINATION_CATEGORY_MAP[category] || []
  tags.push(...mapped)

  if (tags.length === 0) {
    tags.push('culture')
  }

  return filterValid(tags)
}

export function inferQuestTags(quest, relatedBusiness) {
  if (!quest) return []
  const tags = []

  const questType = (quest.questType || '').toLowerCase()
  const category = (quest.category || '').toLowerCase()

  if (questType === 'buy' && relatedBusiness) {
    const bizTags = inferBusinessTags(relatedBusiness)
    tags.push(...bizTags)
  } else if (questType === 'buy') {
    tags.push('shopping')
  } else if (questType === 'visit') {
    tags.push('culture', 'nature')
  } else {
    const typeTags = QUEST_TYPE_MAP[questType] || []
    tags.push(...typeTags)
  }

  const enrich = QUEST_CATEGORY_ENRICHMENT[category]
  if (enrich) {
    tags.push(...enrich)
  }

  const impact = quest.impact
  if (impact) {
    const unit = (impact.unit || '').toLowerCase()
    if (['kg_trash', 'kg_plastic', 'co2_kg', 'trees', 'hours'].includes(unit)) {
      tags.push('eco')
    }
  }

  return filterValid(tags)
}

/**
 * Centralized community activities data.
 * Load activity lists and cards from here.
 * Replace with API calls when backend is ready.
 */

export const ACTIVITY_TYPES = {
  cleanup: 'cleanup',
  treePlanting: 'tree-planting',
  event: 'event',
}

export const activities = [
  {
    id: 1,
    name: 'Cabiao Riverbank Clean-up Drive',
    description: 'Join volunteers to clean the riverbank and promote a healthier environment. Gloves and bags provided.',
    date: 'Mar 15, 2025',
    location: 'Cabiao River, Barangay Polilio',
    type: ACTIVITY_TYPES.cleanup,
  },
  {
    id: 2,
    name: 'Community Tree Planting',
    description: 'Plant native trees along the municipal park. Help green Cabiao and combat climate change.',
    date: 'Mar 22, 2025',
    location: 'Cabiao Municipal Park',
    type: ACTIVITY_TYPES.treePlanting,
  },
  {
    id: 3,
    name: 'Cabiao Town Fiesta',
    description: 'Annual town fiesta with parades, food stalls, and cultural performances. All are welcome.',
    date: 'Apr 5–7, 2025',
    location: 'Cabiao Town Plaza',
    type: ACTIVITY_TYPES.event,
  },
  {
    id: 4,
    name: 'Barangay Polilio Coastal Clean-up',
    description: 'Beach and coastal area clean-up. Bring your family and help keep our shores clean.',
    date: 'Apr 12, 2025',
    location: 'Polilio Beach Area',
    type: ACTIVITY_TYPES.cleanup,
  },
  {
    id: 5,
    name: 'School Garden Tree Planting',
    description: 'Plant fruit trees and ornamentals at Cabiao Central School. Students and parents invited.',
    date: 'Apr 19, 2025',
    location: 'Cabiao Central School',
    type: ACTIVITY_TYPES.treePlanting,
  },
  {
    id: 6,
    name: 'Local Farmers Market & Bazaar',
    description: 'Support local farmers and artisans. Fresh produce, handicrafts, and live music.',
    date: 'Apr 26, 2025',
    location: 'Cabiao Public Market Grounds',
    type: ACTIVITY_TYPES.event,
  },
]

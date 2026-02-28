/**
 * Centralized businesses data.
 * Load map markers, business lists, and cards from here.
 * Replace with API calls when backend is ready.
 */

// Note: MAP_CENTER and MAP_ZOOM are now in constants/cabiaoGeo.js
import { generateCabiaoCoordinates } from '../constants/cabiaoGeo'

export const BUSINESS_TYPES = {
  restaurant: 'restaurant',
  shop: 'shop',
  attraction: 'attraction',
}

export const businesses = [
  {
    id: 1,
    name: 'Heritage Eatery',
    category: 'Restaurant',
    type: BUSINESS_TYPES.restaurant,
    description: 'Traditional Filipino dishes and local favorites in a family-friendly setting.',
    position: generateCabiaoCoordinates(0, 8),
    address: '123 Rizal Street, Poblacion, Cabiao, Nueva Ecija',
    phone: '(044) 123-4567',
    hours: 'Mon-Sun: 6:00 AM - 10:00 PM',
    priceRange: '₱₱',
    specialties: ['Kare-Kare', 'Sinigang', 'Lechon Kawali', 'Sizzling Sisig'],
    features: ['Air Conditioning', 'Family Friendly', 'Parking Available', 'Accepts Reservations'],
    images: [
      'https://picsum.photos/id/292/1200/675',
      'https://picsum.photos/id/431/1200/675',
    ],
    website: 'https://heritage-eatery-cabiao.com',
    socialMedia: {
      facebook: 'heritageeaterycabiao',
      instagram: '@heritageeaterycabiao'
    }
  },
  {
    id: 2,
    name: 'Cabiao Public Market',
    category: 'Market',
    type: BUSINESS_TYPES.shop,
    description: 'Local market offering fresh produce, handicrafts, and everyday goods.',
    position: generateCabiaoCoordinates(1, 8),
    address: 'Market Road, Poblacion, Cabiao, Nueva Ecija',
    phone: '(044) 234-5678',
    hours: 'Daily: 4:00 AM - 8:00 PM',
    priceRange: '₱',
    specialties: ['Fresh Vegetables', 'Local Fruits', 'Handicrafts', 'Fresh Fish'],
    features: ['Fresh Produce Daily', 'Local Artisans', 'Parking Available', 'Budget Friendly'],
    images: [
      'https://picsum.photos/id/1060/1200/675',
      'https://picsum.photos/id/1080/1200/675',
    ],
    website: null,
    socialMedia: {}
  },
  {
    id: 3,
    name: 'Cabiao Pasalubong Center',
    category: 'Retail',
    type: BUSINESS_TYPES.shop,
    description: 'Authentic pasalubong and souvenirs showcasing Cabiao\'s local products.',
    position: generateCabiaoCoordinates(2, 8),
    address: 'Highway 1, Poblacion, Cabiao, Nueva Ecija',
    phone: '(044) 345-6789',
    hours: 'Mon-Sun: 8:00 AM - 7:00 PM',
    priceRange: '₱₱',
    specialties: ['Longganisa', 'Tapa', 'Local Delicacies', 'Handicrafts'],
    features: ['Local Products', 'Gift Wrapping', 'Credit Cards Accepted', 'Parking'],
    images: [
      'https://picsum.photos/id/1037/1200/675',
      'https://picsum.photos/id/1040/1200/675',
    ],
    website: 'https://cabiaopasalubong.com',
    socialMedia: {
      facebook: 'cabiaopasalubong',
      instagram: '@cabiaopasalubong'
    }
  },
  {
    id: 4,
    name: 'Kusina ni Lola',
    category: 'Restaurant',
    type: BUSINESS_TYPES.restaurant,
    description: 'Home-style Filipino cooking. Try pancit and kakanin.',
    position: generateCabiaoCoordinates(3, 8),
    address: '456 Mabini Street, Poblacion, Cabiao, Nueva Ecija',
    phone: '(044) 456-7890',
    hours: 'Tue-Sun: 10:00 AM - 8:00 PM (Closed Mondays)',
    priceRange: '₱',
    specialties: ['Pancit Cabiao', 'Kakanin', 'Puto Bumbong', 'Ginataan'],
    features: ['Home-style Cooking', 'Budget Friendly', 'Takeout Available', 'Vegetarian Options'],
    images: [
      'https://picsum.photos/id/488/1200/675',
      'https://picsum.photos/id/1062/1200/675',
    ],
    website: null,
    socialMedia: {
      facebook: 'kusinanilolacabiao'
    }
  },
  {
    id: 5,
    name: 'Cabiao Town Plaza',
    category: 'Landmark',
    type: BUSINESS_TYPES.attraction,
    description: 'Central plaza and gathering place. Hosts festivals and weekend events.',
    position: generateCabiaoCoordinates(4, 8),
    address: 'Plaza Area, Poblacion, Cabiao, Nueva Ecija',
    phone: 'Municipal Hall: (044) 567-8901',
    hours: 'Open 24 hours',
    priceRange: 'Free',
    specialties: ['Historical Landmark', 'Events Venue', 'Photoshoot Location', 'Family Park'],
    features: ['Public Park', 'Events Ground', 'Historical Site', 'Family Friendly'],
    images: [
      'https://picsum.photos/id/1011/1200/675',
      'https://picsum.photos/id/1033/1200/675',
    ],
    website: null,
    socialMedia: {
      facebook: 'cabiaomunicipality'
    }
  },
  {
    id: 6,
    name: 'San Roque Parish Church',
    category: 'Attraction',
    type: BUSINESS_TYPES.attraction,
    description: 'Historic church and heritage site in heart of Cabiao.',
    position: generateCabiaoCoordinates(5, 8),
    address: 'Church Street, Poblacion, Cabiao, Nueva Ecija',
    phone: '(044) 678-9012',
    hours: 'Daily: 5:00 AM - 8:00 PM (Mass times vary)',
    priceRange: 'Free',
    specialties: ['Historical Architecture', 'Religious Services', 'Heritage Tours', 'Weddings'],
    images: [
      'https://images.unsplash.com/photo-1580996378194-e4d7b20c8b7c?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1518709594023-cb4d1f29ec68?w=800&h=600&fit=crop'
    ],
    features: ['Historic Architecture', 'Guided Tours', 'Photography Allowed', 'Accessibility'],
    website: 'https://sanroqueparishcabiao.com',
    socialMedia: {
      facebook: 'sanroqueparishcabiao'
    }
  },
  {
    id: 7,
    name: 'Sari-Sari Store & Carinderia',
    category: 'Restaurant',
    type: BUSINESS_TYPES.restaurant,
    description: 'Quick bites and merienda. Budget-friendly local meals.',
    position: generateCabiaoCoordinates(6, 8),
    address: '789 Quezon Street, Poblacion, Cabiao, Nueva Ecija',
    phone: '(044) 789-0123',
    hours: 'Mon-Sun: 7:00 AM - 9:00 PM',
    priceRange: '₱',
    specialties: ['Silog Meals', 'Pancit Canton', 'Lumpia', 'Sago at Gulaman'],
    images: [
      'https://picsum.photos/id/1040/1200/675',
      'https://picsum.photos/id/1062/1200/675',
    ],
    features: ['Budget Friendly', 'Quick Service', 'Takeout Available', 'Local Favorites'],
    website: null,
    socialMedia: {}
  },
  {
    id: 8,
    name: 'Cabiao Handicrafts',
    category: 'Shop',
    type: BUSINESS_TYPES.shop,
    description: 'Handwoven items and local crafts made by Cabiao artisans.',
    position: generateCabiaoCoordinates(7, 8),
    address: '321 Artisan Lane, Poblacion, Cabiao, Nueva Ecija',
    phone: '(044) 890-1234',
    hours: 'Mon-Sat: 9:00 AM - 6:00 PM (Closed Sundays)',
    priceRange: '₱₱',
    specialties: ['Basket Weaving', 'Native Bags', 'Wood Crafts', 'Textiles'],
    images: [
      'https://picsum.photos/id/1037/1200/675',
      'https://picsum.photos/id/1040/1200/675',
    ],
    features: ['Handmade Items', 'Local Artisans', 'Custom Orders', 'Workshops Available'],
    website: null,
    socialMedia: {
      facebook: 'cabiaohandicrafts',
      instagram: '@cabiaohandicrafts'
    }
  },
]

/** Featured business IDs for homepage; replace with featured flag or API when backend exists. */
const FEATURED_IDS = [1, 2, 3]

/**
 * Returns a subset of businesses for the homepage featured section.
 * Backend: replace with API e.g. getFeaturedBusinesses().
 */
export function getFeaturedBusinesses() {
  return businesses.filter((b) => FEATURED_IDS.includes(b.id))
}

/**
 * Returns a business by id, or undefined.
 * Backend: replace with API e.g. getBusinessById(id).
 */
export function getBusinessById(id) {
  return businesses.find((b) => b.id === id)
}

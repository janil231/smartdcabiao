import {
  collection,
  getDocs,
  query,
  where,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { listSeasonImpact, sumImpactByUnit } from './impactLedger.service'
import { listSeasonVouchers } from './vouchers.service'

/**
 * List all voucher redemptions for a given partner business in a season.
 * Prefers matching by stable partnerBusinessId; falls back to partnerName when needed.
 */
export async function listPartnerRedemptions(seasonId, businessId, partnerName) {
  if (!seasonId) return []

  const redemptionsRef = collection(db, 'seasons', seasonId, 'voucherRedemptions')

  let partnerRedemptions = []

  if (businessId) {
    const q = query(redemptionsRef, where('voucherSnapshot.partnerBusinessId', '==', String(businessId)))
    const snapshot = await getDocs(q)
    partnerRedemptions = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }))
  }

  // Fallback: filter by partnerName if no matches or no businessId provided
  if (partnerRedemptions.length === 0 && partnerName) {
    const snapshot = await getDocs(redemptionsRef)
    const all = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }))
    const lowerName = partnerName.toLowerCase()
    partnerRedemptions = all.filter(r => (r.voucherSnapshot?.partnerName || '').toLowerCase() === lowerName)
  }

  return partnerRedemptions
}

/**
 * Optionally list vouchers for a partner within a season.
 */
export async function listPartnerVouchers(seasonId, businessId, partnerName) {
  if (!seasonId) return []
  const vouchers = await listSeasonVouchers(seasonId)
  if (!vouchers || vouchers.length === 0) return []

  if (businessId) {
    const byId = vouchers.filter(v => String(v.partnerBusinessId) === String(businessId))
    if (byId.length > 0) return byId
  }

  if (partnerName) {
    const lower = partnerName.toLowerCase()
    return vouchers.filter(v => (v.partnerName || '').toLowerCase() === lower)
  }

  return []
}

export function summarizePartnerRedemptions(redemptions) {
  const totalRedeemed = redemptions.length
  let totalUsed = 0
  let totalUnused = 0

  redemptions.forEach(r => {
    if (r.status === 'used') {
      totalUsed += 1
    } else {
      // treat any non-used status as "not yet used" for this summary
      totalUnused += 1
    }
  })

  return { totalRedeemed, totalUsed, totalUnused }
}

export function estimatePartnerImpact({ seasonImpactTotalsByUnit, partnerRedemptionsCount, seasonTotalRedemptionsCount }) {
  const impactTotals = seasonImpactTotalsByUnit || {}
  if (!seasonTotalRedemptionsCount || seasonTotalRedemptionsCount <= 0 || !partnerRedemptionsCount) {
    const zeroed = {}
    Object.keys(impactTotals).forEach(unit => {
      zeroed[unit] = 0
    })
    return zeroed
  }

  const partnerShare = partnerRedemptionsCount / seasonTotalRedemptionsCount
  const partnerImpact = {}

  Object.entries(impactTotals).forEach(([unit, total]) => {
    const amount = typeof total === 'number' ? total : 0
    partnerImpact[unit] = amount * partnerShare
  })

  return partnerImpact
}

/**
 * High-level helper that returns partner redemptions, season totals, and estimated impact.
 */
export async function getPartnerInsights({ seasonId, businessId, partnerName }) {
  if (!seasonId) {
    return {
      partnerRedemptions: [],
      seasonTotalRedemptionsCount: 0,
      seasonImpactTotalsByUnit: {},
      partnerImpactTotalsByUnit: {},
    }
  }

  const redemptionsRef = collection(db, 'seasons', seasonId, 'voucherRedemptions')
  const snapshot = await getDocs(redemptionsRef)
  const allRedemptions = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }))

  const partnerRedemptions = await listPartnerRedemptions(seasonId, businessId, partnerName)

  const seasonImpactEntries = await listSeasonImpact(seasonId)
  const seasonImpactTotalsByUnit = sumImpactByUnit(seasonImpactEntries)

  const partnerImpactTotalsByUnit = estimatePartnerImpact({
    seasonImpactTotalsByUnit,
    partnerRedemptionsCount: partnerRedemptions.length,
    seasonTotalRedemptionsCount: allRedemptions.length,
  })

  return {
    partnerRedemptions,
    seasonTotalRedemptionsCount: allRedemptions.length,
    seasonImpactTotalsByUnit,
    partnerImpactTotalsByUnit,
  }
}


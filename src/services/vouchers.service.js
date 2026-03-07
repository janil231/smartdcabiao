import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { logAudit } from './audit.service'
import { getActiveSeason } from './seasons.service'

export async function listSeasonVouchers(seasonId) {
  if (!seasonId) return []

  const vouchersRef = collection(db, 'seasons', seasonId, 'vouchers')
  const snapshot = await getDocs(vouchersRef)
  return snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }))
}

export async function createVoucher(seasonId, payload, adminUser) {
  if (!seasonId) throw new Error('Season ID is required')

  const voucherId = `voucher_${Date.now()}`
  const voucherRef = doc(db, 'seasons', seasonId, 'vouchers', voucherId)

  const now = serverTimestamp()

  const data = {
    title: payload.title,
    description: payload.description || '',
    partnerBusinessId: payload.partnerBusinessId || null,
    partnerName: payload.partnerName || '',
    terms: payload.terms || '',
    pointsCost: Number(payload.pointsCost || 0),
    expiresAt: payload.expiresAt || null,
    stockTotal: Number(payload.stockTotal || 0),
    stockRemaining: Number(payload.stockRemaining ?? payload.stockTotal ?? 0),
    isActive: payload.isActive ?? true,
    createdAt: now,
    updatedAt: now,
    createdByEmail: adminUser?.email || null,
  }

  await setDoc(voucherRef, data)

  await logAudit({
    action: 'voucher_created',
    targetType: 'voucher',
    targetId: voucherId,
    adminUid: adminUser?.uid,
    adminEmail: adminUser?.email,
    meta: { seasonId, title: payload.title },
  })

  return { id: voucherId, success: true }
}

export async function updateVoucher(seasonId, voucherId, payload, adminUser) {
  if (!seasonId || !voucherId) throw new Error('Missing IDs')

  const voucherRef = doc(db, 'seasons', seasonId, 'vouchers', voucherId)
  const snapshot = await getDoc(voucherRef)

  if (!snapshot.exists()) {
    throw new Error('Voucher not found')
  }

  const current = snapshot.data()

  const updateData = {
    ...payload,
    pointsCost: payload.pointsCost != null ? Number(payload.pointsCost) : current.pointsCost,
    stockTotal: payload.stockTotal != null ? Number(payload.stockTotal) : current.stockTotal,
    stockRemaining:
      payload.stockRemaining != null
        ? Number(payload.stockRemaining)
        : current.stockRemaining,
    partnerBusinessId:
      payload.partnerBusinessId !== undefined
        ? payload.partnerBusinessId
        : current.partnerBusinessId || null,
    updatedAt: serverTimestamp(),
  }

  await updateDoc(voucherRef, updateData)

  await logAudit({
    action: 'voucher_updated',
    targetType: 'voucher',
    targetId: voucherId,
    adminUid: adminUser?.uid,
    adminEmail: adminUser?.email,
    meta: { seasonId, ...updateData },
  })

  return { success: true }
}

const SAMPLE_VOUCHERS = [
  { title: '₱50 Off – Bring Your Own Container Discount', description: 'Discount when you bring your own container at partner stores.', pointsCost: 80, partnerName: 'Eco Partners', terms: 'One per user. Present at checkout.', stockTotal: 100 },
  { title: 'Free Cold Water Refill (Reusable Bottle)', description: 'Free refill at participating stations when you use a reusable bottle.', pointsCost: 30, partnerName: 'Water Refill Network', terms: 'Reusable bottle required.', stockTotal: 200 },
  { title: '₱30 Off Local Pasalubong (Buy Local)', description: 'Discount on local pasalubong at designated stores.', pointsCost: 50, partnerName: 'Local Pasalubong Hub', terms: 'Minimum purchase may apply.', stockTotal: 80 },
  { title: 'Eco-Transport Bonus (Bike/Walk Incentive Voucher)', description: 'Reward for choosing bike or walk for short trips.', pointsCost: 60, partnerName: 'Green Mobility', terms: 'Proof of eco-transport may be required.', stockTotal: 120 },
  { title: 'Free Seedling / Plant Kit', description: 'One free seedling or small plant kit from partner nurseries.', pointsCost: 100, partnerName: 'Community Garden', terms: 'While supplies last.', stockTotal: 50 },
  { title: 'Discount on Local Meal (Sustainable Dining Promo)', description: 'Discount at participating sustainable dining partners.', pointsCost: 120, partnerName: 'Farm-to-Table Partners', terms: 'Dine-in only. One per visit.', stockTotal: 60 },
  { title: 'Reusable Eco Bag Voucher', description: 'One free or discounted reusable eco bag at partner stores.', pointsCost: 70, partnerName: 'Zero Waste Store', terms: 'One per user per season.', stockTotal: 90 },
  { title: 'Community Event Snack Pack', description: 'Snack pack at selected community events.', pointsCost: 45, partnerName: 'Community Events', terms: 'Valid at designated events only.', stockTotal: 150 },
  { title: 'Tourism Info Kit / Souvenir Voucher', description: 'Free tourism info kit or small souvenir from visitor center.', pointsCost: 40, partnerName: 'Tourism Office', terms: 'One per visitor.', stockTotal: 200 },
  { title: 'Trash-to-Points Bonus Voucher', description: 'Symbolic bonus voucher for trash-to-points participation.', pointsCost: 35, partnerName: 'Clean-up Program', terms: 'Participate in clean-up to redeem.', stockTotal: 180 },
  { title: 'Local Handicraft Discount', description: 'Discount on locally made handicrafts.', pointsCost: 90, partnerName: 'Artisan Collective', terms: 'At participating artisans.', stockTotal: 70 },
  { title: 'Market Fresh Produce Discount', description: 'Discount on fresh produce at local market.', pointsCost: 65, partnerName: 'Local Market', terms: 'Minimum purchase may apply.', stockTotal: 110 }
]

export async function seedSampleVouchersForActiveSeason(adminUser) {
  const season = await getActiveSeason()
  if (!season?.id) throw new Error('No active season found')
  const seasonId = season.id
  const endAt = season.endAt ? new Date(season.endAt) : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
  let expiresAt = new Date(endAt)
  if (expiresAt > endAt) expiresAt = new Date(endAt.getTime())
  const expiresAtTimestamp = Timestamp.fromDate(expiresAt)
  const now = serverTimestamp()
  const createdByEmail = adminUser?.email || ''

  for (let i = 1; i <= 12; i++) {
    const id = `seed_v${i}`
    const ref = doc(db, 'seasons', seasonId, 'vouchers', id)
    const snapshot = await getDoc(ref)
    const sample = SAMPLE_VOUCHERS[i - 1]

    if (snapshot.exists()) {
      await updateDoc(ref, {
        title: sample.title,
        description: sample.description,
        pointsCost: sample.pointsCost,
        partnerBusinessId: snapshot.data().partnerBusinessId || null,
        partnerName: sample.partnerName,
        terms: sample.terms,
        expiresAt: expiresAtTimestamp,
        stockTotal: sample.stockTotal,
        isActive: true,
        updatedAt: now
      })
    } else {
      await setDoc(ref, {
        title: sample.title,
        description: sample.description,
        pointsCost: sample.pointsCost,
        partnerBusinessId: null,
        partnerName: sample.partnerName,
        terms: sample.terms,
        expiresAt: expiresAtTimestamp,
        stockTotal: sample.stockTotal,
        stockRemaining: sample.stockTotal,
        isActive: true,
        createdAt: now,
        updatedAt: now,
        createdByEmail
      }, { merge: true })
    }
  }

  await logAudit({
    action: 'seed_sample_vouchers',
    targetType: 'season',
    targetId: seasonId,
    adminUid: adminUser?.uid,
    adminEmail: adminUser?.email,
    meta: { seasonId, count: 12 }
  })
  return { seasonId, count: 12 }
}

import { collection, doc, getDocs, setDoc, deleteDoc, Timestamp, query, where } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { sanitizeForFirestore } from '../utils/firestoreSanitize'
import { logAudit } from './audit.service'
import { listBusinesses } from './businesses.service'

const VOUCHER_TEMPLATES = [
  { title: '10% Off Single Item', description: 'Get 10% off any single item.', terms: 'Valid for one transaction. Cannot combine with other promos.', pointsCost: 100, stockTotal: 50 },
  { title: 'Free Drink Upgrade', description: 'Upgrade your drink size for free.', terms: 'One per visit. Subject to availability.', pointsCost: 75, stockTotal: 30 },
  { title: '₱50 Off Coupon', description: 'Get ₱50 off your purchase.', terms: 'Minimum spend ₱200. One per customer.', pointsCost: 150, stockTotal: 40 },
  { title: 'Free Add-On', description: 'Get a free add-on or topping.', terms: 'Choose from listed add-ons. One per visit.', pointsCost: 80, stockTotal: 25 },
  { title: '15% Off Total Bill', description: 'Save 15% on your entire bill.', terms: 'Minimum spend ₱500. Excludes promos.', pointsCost: 400, stockTotal: 25 },
  { title: '₱200 Off Voucher', description: 'Get ₱200 off your purchase.', terms: 'Minimum spend ₱800. Valid for 30 days.', pointsCost: 500, stockTotal: 20 },
  { title: 'Buy 1 Get 1 Free', description: 'Buy any item and get a second one free.', terms: 'Equal or lesser value. One per visit.', pointsCost: 600, stockTotal: 15 },
  { title: 'Free Appetizer', description: 'Get a complimentary appetizer.', terms: 'Dine-in only. With main course order.', pointsCost: 350, stockTotal: 30 },
  { title: '25% Off Entire Bill', description: 'Massive 25% off your entire bill.', terms: 'No minimum. One per customer per month.', pointsCost: 1200, stockTotal: 10 },
  { title: '₱500 Off Voucher', description: '₱500 off any purchase over ₱1500.', terms: 'Minimum spend ₱1500. Valid for 60 days.', pointsCost: 1500, stockTotal: 999 },
  { title: 'VIP Experience Package', description: 'Premium experience with reserved seating and welcome treat.', terms: 'Reservation required 24h in advance.', pointsCost: 1000, stockTotal: 5 },
]

function randomDaysAgo(maxDays = 90) {
  const ms = Math.floor(Math.random() * maxDays * 24 * 60 * 60 * 1000)
  return new Date(Date.now() - ms)
}

function randomDaysFromNow(maxDays = 60) {
  const ms = Math.floor(Math.random() * maxDays * 24 * 60 * 60 * 1000)
  return new Date(Date.now() + ms)
}

export async function seedRealisticVouchers({ onProgress } = {}) {
  const seasonsSnap = await getDocs(collection(db, 'seasons'))
  const allSeasons = seasonsSnap.docs.map(d => ({ id: d.id, ...d.data() }))

  let existingCount = 0
  for (const season of allSeasons) {
    const vSnap = await getDocs(
      query(collection(db, 'seasons', String(season.id), 'vouchers'), where('_seeded', '==', true))
    )
    existingCount += vSnap.size
  }

  if (existingCount > 0) {
    return {
      skipped: true,
      reason: `${existingCount} seeded vouchers already exist. Run "Reset Seeded Data" first.`,
      created: 0,
    }
  }

  if (allSeasons.length === 0) {
    return { skipped: true, reason: 'No seasons found.', created: 0 }
  }

  const { data: allBusinesses } = await listBusinesses({ forceRefresh: true })
  const realBusinesses = (allBusinesses ?? []).filter(b => b.isActive !== false && b._source !== 'static')

  const activeBusinesses = realBusinesses.length > 0 ? realBusinesses : [{ id: 'default', name: 'Cabiao Partner Business' }]

  const results = { created: 0, errors: [], perSeason: {} }

  for (const season of allSeasons) {
    let seasonCreated = 0

    for (let bIdx = 0; bIdx < activeBusinesses.length; bIdx++) {
      const business = activeBusinesses[bIdx]
      const voucherCount = 1 + Math.floor(Math.random() * 3)

      for (let vIdx = 0; vIdx < voucherCount; vIdx++) {
        try {
          const templateIdx = (bIdx * 3 + vIdx) % VOUCHER_TEMPLATES.length
          const template = VOUCHER_TEMPLATES[templateIdx]

          const createdAt = randomDaysAgo(90)
          const expiresAt = randomDaysFromNow(60)

          const voucherId = `seeded_voucher_${Date.now()}_${bIdx}_${vIdx}`

          const payload = sanitizeForFirestore({
            title: template.title,
            description: template.description,
            terms: template.terms,
            pointsCost: template.pointsCost,
            stockTotal: template.stockTotal,
            stockRemaining: template.stockTotal,
            partnerBusinessId: String(business.id),
            partnerName: business.name,
            expiresAt: Timestamp.fromDate(expiresAt),
            isActive: season.isActive === true,
            createdAt: Timestamp.fromDate(createdAt),
            updatedAt: Timestamp.fromDate(createdAt),
            createdByEmail: 'seed@smartdcabiao.local',
            _seeded: true,
          })

          await setDoc(
            doc(db, 'seasons', String(season.id), 'vouchers', String(voucherId)),
            payload
          )

          results.created++
          seasonCreated++

          onProgress?.({
            current: results.created,
            season: season.name,
            voucher: template.title,
          })
        } catch (err) {
          results.errors.push({ business: business.name, error: err.message })
        }
      }
    }

    results.perSeason[season.name] = seasonCreated
  }

  try {
    await logAudit({
      action: 'seed_realistic_vouchers',
      targetType: 'vouchers',
      meta: { total: results.created, perSeason: results.perSeason },
    })
  } catch (err) {
    console.warn('logAudit failed:', err)
  }

  return results
}

export async function deleteSeededVouchers() {
  const seasonsSnap = await getDocs(collection(db, 'seasons'))
  let deleted = 0

  for (const seasonDoc of seasonsSnap.docs) {
    const vSnap = await getDocs(
      query(
        collection(db, 'seasons', String(seasonDoc.id), 'vouchers'),
        where('_seeded', '==', true)
      )
    )

    for (const vDoc of vSnap.docs) {
      try {
        await deleteDoc(vDoc.ref)
        deleted++
      } catch (err) {
        console.warn(`Failed to delete voucher ${vDoc.id}:`, err)
      }
    }
  }

  return { deleted }
}

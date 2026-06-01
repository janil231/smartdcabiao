import {
  collection,
  doc,
  getDoc,
  getDocs,
  runTransaction,
  serverTimestamp,
  updateDoc,
  query,
  where,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { logAudit } from './audit.service'
import { ensureBalanceDoc } from './seasonBalances.service'
import { generateVoucherCode } from '../utils/voucherCode'
import { addPointsEntry } from './pointsLedger.service'

export async function listMyRedemptions(seasonId, uid) {
  if (!seasonId || !uid) return []

  const redemptionsRef = collection(db, 'seasons', seasonId, 'voucherRedemptions')
  const q = query(redemptionsRef, where('uid', '==', uid))
  const snapshot = await getDocs(q)

  return snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }))
}

/**
 * List recent redemptions for a season (e.g. for admin panel). Limit 50.
 */
export async function listSeasonRedemptions(seasonId, limitCount = 50) {
  if (!seasonId) return []

  const redemptionsRef = collection(db, 'seasons', seasonId, 'voucherRedemptions')
  const snapshot = await getDocs(redemptionsRef)

  const list = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }))
  list.sort((a, b) => {
    const at = a.redeemedAt?.toDate?.() ?? new Date(0)
    const bt = b.redeemedAt?.toDate?.() ?? new Date(0)
    return bt - at
  })
  return list.slice(0, limitCount)
}

export async function findRedemptionByCode({ seasonId, code }) {
  if (!seasonId || !code) {
    throw new Error('Missing seasonId or code')
  }

  const redemptionsRef = collection(db, 'seasons', seasonId, 'voucherRedemptions')
  const q = query(redemptionsRef, where('code', '==', code))
  const snapshot = await getDocs(q)

  if (snapshot.empty) {
    return null
  }

  const docSnap = snapshot.docs[0]
  return { id: docSnap.id, ...docSnap.data() }
}

export async function redeemVoucher({ seasonId, voucherId, user }) {
  if (!seasonId || !voucherId || !user?.uid) {
    throw new Error('Missing seasonId, voucherId, or user')
  }

  const voucherRef = doc(db, 'seasons', seasonId, 'vouchers', voucherId)
  const redemptionId = `${voucherId}_${user.uid}`
  const redemptionRef = doc(db, 'seasons', seasonId, 'voucherRedemptions', redemptionId)

  const balanceId = `${seasonId}_${user.uid}`
  const balanceRef = doc(db, 'seasonBalances', balanceId)

  await ensureBalanceDoc(seasonId, user)

  const result = await runTransaction(db, async (transaction) => {
    const voucherSnap = await transaction.get(voucherRef)
    if (!voucherSnap.exists()) {
      throw new Error('Voucher not found')
    }
    const voucher = voucherSnap.data()

    const now = new Date()
    if (!voucher.isActive) throw new Error('Voucher is not active')
    if (voucher.expiresAt && voucher.expiresAt.toDate && voucher.expiresAt.toDate() < now) {
      throw new Error('Voucher has expired')
    }
    if ((voucher.stockRemaining || 0) <= 0) {
      throw new Error('Voucher is out of stock')
    }

    const redemptionSnap = await transaction.get(redemptionRef)
    if (redemptionSnap.exists()) {
      throw new Error('You already redeemed this voucher')
    }

    const balanceSnap = await transaction.get(balanceRef)
    if (!balanceSnap.exists()) {
      throw new Error('Balance not found')
    }
    const balance = balanceSnap.data()
    const pointsCost = voucher.pointsCost || 0
    if ((balance.pointsBalance || 0) < pointsCost) {
      throw new Error('Insufficient points')
    }

    const newStockRemaining = (voucher.stockRemaining || 0) - 1
    transaction.update(voucherRef, {
      stockRemaining: newStockRemaining,
      updatedAt: serverTimestamp(),
    })

    transaction.update(balanceRef, {
      pointsSpent: (balance.pointsSpent || 0) + pointsCost,
      pointsBalance: (balance.pointsBalance || 0) - pointsCost,
      updatedAt: serverTimestamp(),
    })

    const code = generateVoucherCode()
    const redemptionData = {
      voucherId,
      seasonId,
      uid: user.uid,
      userEmail: user.email || null,
      code,
      status: 'unused',
      redeemedAt: serverTimestamp(),
      usedAt: null,
      usedByEmail: null,
      pointsCost,
      voucherSnapshot: {
        title: voucher.title || '',
        partnerName: voucher.partnerName || '',
        partnerBusinessId: voucher.partnerBusinessId || null,
        pointsCost,
        expiresAt: voucher.expiresAt || null,
      },
    }

    transaction.set(redemptionRef, redemptionData)

    return { code, redemptionData }
  })

  await logAudit({
    action: 'voucher_redeemed',
    targetType: 'voucher',
    targetId: voucherId,
    adminUid: null,
    adminEmail: null,
    meta: {
      seasonId,
      voucherId,
      uid: user.uid,
      userEmail: user.email || null,
      code: result.code,
      pointsCost: result.redemptionData?.pointsCost ?? 0,
    },
  })

  await addPointsEntry({
    uid: user.uid,
    seasonId,
    questId: null,
    points: -result.redemptionData.pointsCost,
    reason: `voucher_redeemed: ${result.redemptionData.voucherSnapshot.title || voucherId}`,
    voucherId,
  })

  return { success: true, code: result.code }
}

/**
 * Mark a voucher redemption as used. Accepts either redemptionId or (voucherId + uid).
 */
export async function adminMarkVoucherUsed({ seasonId, redemptionId, voucherId, uid, adminUser }) {
  if (!seasonId || !adminUser) {
    throw new Error('Missing seasonId or adminUser')
  }

  let docId
  if (redemptionId) {
    docId = redemptionId
  } else if (voucherId && uid) {
    docId = `${voucherId}_${uid}`
  } else {
    throw new Error('Provide either redemptionId or (voucherId and uid)')
  }

  const redemptionRef = doc(db, 'seasons', seasonId, 'voucherRedemptions', docId)
  const snapshot = await getDoc(redemptionRef)

  if (!snapshot.exists()) {
    throw new Error('Redemption not found')
  }

  const redemption = snapshot.data()
  if (redemption.status === 'used') {
    throw new Error('Voucher already marked as used')
  }

  await updateDoc(redemptionRef, {
    status: 'used',
    usedAt: serverTimestamp(),
    usedByEmail: adminUser?.email || null,
  })

  await logAudit({
    action: 'voucher_used',
    targetType: 'voucher_redemption',
    targetId: docId,
    adminUid: adminUser?.uid,
    adminEmail: adminUser?.email,
    meta: {
      seasonId,
      voucherId: redemption.voucherId,
      uid: redemption.uid,
    },
  })

  return { success: true }
}


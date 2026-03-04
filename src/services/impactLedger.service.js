import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  doc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { logAudit } from './audit.service'

const IMPACT_LEDGER_COLLECTION = 'impactLedger'

export async function addImpactEntry({
  uid,
  userEmail,
  seasonId,
  questId,
  questTitle,
  unit,
  amount,
  adminUser,
}) {
  if (!uid || !seasonId || !questId || !unit || !amount) {
    throw new Error('Missing required impact entry fields')
  }

  const entryId = `impact_${questId}_${uid}`
  const entryRef = doc(db, IMPACT_LEDGER_COLLECTION, entryId)
  const existing = await getDoc(entryRef)

  if (existing.exists()) {
    return { id: entryId, alreadyExists: true, success: true }
  }

  await setDoc(entryRef, {
    uid,
    userEmail: userEmail || null,
    seasonId,
    questId,
    questTitle: questTitle || null,
    unit,
    amount,
    createdAt: serverTimestamp(),
    reason: 'quest_completed',
    createdByUid: adminUser?.uid || null,
    createdByEmail: adminUser?.email || null,
  })

  await logAudit({
    action: 'IMPACT_RELEASED',
    targetType: 'impact',
    targetId: entryId,
    details: {
      uid,
      seasonId,
      questId,
      questTitle,
      unit,
      amount,
      adminUid: adminUser?.uid,
      adminEmail: adminUser?.email,
    },
  })

  return { id: entryId, success: true }
}

export async function listUserImpact({ uid, seasonId }) {
  if (!uid) return []

  const ledgerRef = collection(db, IMPACT_LEDGER_COLLECTION)
  const q = query(ledgerRef, where('uid', '==', uid))
  const snapshot = await getDocs(q)

  const entries = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }))

  if (!seasonId) return entries

  return entries.filter(entry => entry.seasonId === seasonId)
}

export async function listSeasonImpact(seasonId) {
  if (!seasonId) return []

  const ledgerRef = collection(db, IMPACT_LEDGER_COLLECTION)
  const q = query(ledgerRef, where('seasonId', '==', seasonId))
  const snapshot = await getDocs(q)

  return snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }))
}

export function sumImpactByUnit(entries) {
  const totals = {}

  entries.forEach(entry => {
    if (!entry || !entry.unit) return
    const unit = entry.unit
    const amount = typeof entry.amount === 'number' ? entry.amount : 0
    if (!totals[unit]) {
      totals[unit] = 0
    }
    totals[unit] += amount
  })

  return totals
}


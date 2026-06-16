import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  limit,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { auth } from '../lib/firebase'
import { sanitizeForFirestore } from '../utils/firestoreSanitize'
import { logAudit } from './audit.service'
import { pauseAllOwnerQuestsForSeasonEnd } from './ownerQuests.service'
import { listSeasonImpact, sumImpactByUnit } from './impactLedger.service'

const SEASONS_COLLECTION = 'seasons'

export async function getActiveSeason() {
  const seasonsRef = collection(db, SEASONS_COLLECTION)
  const q = query(seasonsRef, where('isActive', '==', true), limit(1))
  const snapshot = await getDocs(q)
  
  if (!snapshot.empty) {
    const seasonDoc = snapshot.docs[0]
    return { id: seasonDoc.id, ...seasonDoc.data() }
  }
  
  return null
}

export async function getSeasonById(seasonId) {
  const seasonRef = doc(db, SEASONS_COLLECTION, seasonId)
  const snapshot = await getDoc(seasonRef)
  
  if (snapshot.exists()) {
    return { id: snapshot.id, ...snapshot.data() }
  }
  
  return null
}

export async function listSeasons() {
  const seasonsRef = collection(db, SEASONS_COLLECTION)
  const q = query(seasonsRef, orderBy('startAt', 'desc'))
  const snapshot = await getDocs(q)
  
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
}

export async function createSeason({ name, startAt, endAt }, adminUser) {
  const seasonId = `season_${Date.now()}`
  const seasonRef = doc(db, SEASONS_COLLECTION, seasonId)
  
  await setDoc(seasonRef, {
    name,
    startAt,
    endAt,
    isActive: false,
    createdAt: new Date().toISOString(),
  })
  
  await logAudit({
    action: 'SEASON_CREATED',
    targetType: 'season',
    targetId: seasonId,
    details: { name, startAt, endAt, adminUid: adminUser.uid, adminEmail: adminUser.email },
  })
  
  return { id: seasonId, success: true }
}

export async function activateSeason(seasonId, adminUser) {
  const seasonRef = doc(db, SEASONS_COLLECTION, seasonId)
  const season = await getSeasonById(seasonId)
  
  if (!season) {
    throw new Error('Season not found')
  }
  
  const allSeasons = await listSeasons()
  const updates = []
  
  for (const s of allSeasons) {
    if (s.isActive) {
      updates.push(updateDoc(doc(db, SEASONS_COLLECTION, s.id), { isActive: false }))
    }
  }
  
  updates.push(updateDoc(seasonRef, { isActive: true }))
  
  await Promise.all(updates)
  
  await logAudit({
    action: 'SEASON_ACTIVATED',
    targetType: 'season',
    targetId: seasonId,
    details: { name: season.name, adminUid: adminUser.uid, adminEmail: adminUser.email },
  })
  
  return { success: true }
}

export async function closeSeason(seasonId, adminUser) {
  const seasonRef = doc(db, SEASONS_COLLECTION, seasonId)
  const season = await getSeasonById(seasonId)
  
  if (!season) {
    throw new Error('Season not found')
  }
  
  await updateDoc(seasonRef, { isActive: false })

  try { await pauseAllOwnerQuestsForSeasonEnd() } catch (err) { console.warn('[closeSeason] pauseAllOwnerQuestsForSeasonEnd failed:', err) }
  
  await logAudit({
    action: 'SEASON_CLOSED',
    targetType: 'season',
    targetId: seasonId,
    details: { name: season.name, adminUid: adminUser.uid, adminEmail: adminUser.email },
  })
  
  return { success: true }
}

export async function updateSeason(seasonId, data, adminUser) {
  const seasonRef = doc(db, SEASONS_COLLECTION, seasonId)
  const season = await getSeasonById(seasonId)
  
  if (!season) {
    throw new Error('Season not found')
  }
  
  await updateDoc(seasonRef, data)
  
  await logAudit({
    action: 'SEASON_UPDATED',
    targetType: 'season',
    targetId: seasonId,
    details: { ...data, adminUid: adminUser.uid, adminEmail: adminUser.email },
  })
  
  return { success: true }
}

// ============ TIMESTAMP HELPERS ============

export function toJSDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value?.toDate === 'function') return value.toDate();
  if (typeof value === 'string') {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof value === 'number') {
    return new Date(value);
  }
  if (typeof value?.seconds === 'number') {
    return new Date(value.seconds * 1000);
  }
  return null;
}

export function formatSeasonDate(value, fallback = '\u2014') {
  const d = toJSDate(value);
  if (!d || isNaN(d.getTime())) return fallback;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// ============ NEW LIFECYCLE FUNCTIONS ============

export function getSeasonStatus(season, now = new Date()) {
  if (!season) return 'draft';
  const start = toJSDate(season.startAt);
  const end = toJSDate(season.endAt);

  if (season.isActive === true) return 'active';
  if (season.endedAt) return 'ended';
  if (start > now) return 'scheduled';
  if (end < now) return 'ended';
  return 'draft';
}

export function getSeasonStatusConfig(status) {
  switch (status) {
    case 'active':    return { label: 'Active',    bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' };
    case 'scheduled': return { label: 'Scheduled', bg: 'bg-blue-100',    text: 'text-blue-700',    dot: 'bg-blue-500' };
    case 'ended':     return { label: 'Ended',     bg: 'bg-gray-100',    text: 'text-gray-700',    dot: 'bg-gray-500' };
    case 'draft':     return { label: 'Draft',     bg: 'bg-amber-100',   text: 'text-amber-700',   dot: 'bg-amber-500' };
    default:          return { label: 'Unknown',   bg: 'bg-gray-100',    text: 'text-gray-700',    dot: 'bg-gray-400' };
  }
}

export async function updateSeasonDetails(seasonId, updates, currentSeason) {
  const status = getSeasonStatus(currentSeason);
  const allowed = status === 'active'
    ? ['name', 'description', 'endAt']
    : ['name', 'description', 'startAt', 'endAt'];

  const payload = {};
  for (const key of allowed) {
    if (updates[key] !== undefined) payload[key] = updates[key];
  }
  payload.updatedAt = serverTimestamp();

  await setDoc(
    doc(db, 'seasons', String(seasonId)),
    sanitizeForFirestore(payload),
    { merge: true }
  );

  await logAudit({
    action: 'season_updated',
    targetType: 'season',
    targetId: String(seasonId),
    meta: { updatedFields: Object.keys(payload) },
  });

  return { success: true };
}

export async function activateSeasonStrict(seasonId) {
  const sid = String(seasonId);
  const adminUid = auth.currentUser?.uid ?? 'system';

  const activeQuery = query(collection(db, 'seasons'), where('isActive', '==', true));
  const activeSnap = await getDocs(activeQuery);

  for (const docSnap of activeSnap.docs) {
    if (String(docSnap.id) === sid) continue;
    await endSeasonWithExpiry(String(docSnap.id), {
      reason: 'replaced_by_activation',
      endedBy: adminUid,
    });
  }

  await setDoc(
    doc(db, 'seasons', sid),
    sanitizeForFirestore({
      isActive: true,
      activatedAt: serverTimestamp(),
      endedAt: null,
      updatedAt: serverTimestamp(),
    }),
    { merge: true }
  );

  await logAudit({
    action: 'season_activated',
    targetType: 'season',
    targetId: sid,
    meta: { activatedBy: adminUid },
  });

  return { success: true };
}

export async function endSeasonWithExpiry(seasonId, { reason = 'manual', endedBy = null } = {}) {
  const sid = String(seasonId);
  const adminUid = endedBy ?? auth.currentUser?.uid ?? 'unknown';

  const questsQuery = query(
    collection(db, 'quests'),
    where('seasonId', '==', sid)
  );
  const questsSnap = await getDocs(questsQuery);
  let questsExpired = 0;
  const expiredQuestIds = [];

  for (const qSnap of questsSnap.docs) {
    const qData = qSnap.data();
    if (qData.isActive === false) continue;
    await setDoc(
      doc(db, 'quests', String(qSnap.id)),
      sanitizeForFirestore({
        isActive: false,
        expiredAt: serverTimestamp(),
        expiredBy: adminUid,
        expiredReason: 'season_ended',
        updatedAt: serverTimestamp(),
      }),
      { merge: true }
    );
    expiredQuestIds.push(String(qSnap.id));
    questsExpired++;
  }

  let participationsExpired = 0;
  if (expiredQuestIds.length > 0) {
    const BATCH_SIZE = 30;
    for (let i = 0; i < expiredQuestIds.length; i += BATCH_SIZE) {
      const batch = expiredQuestIds.slice(i, i + BATCH_SIZE);
      const partsQuery = query(
        collection(db, 'participations'),
        where('questId', 'in', batch),
        where('status', '==', 'joined')
      );
      const partsSnap = await getDocs(partsQuery);
      for (const pSnap of partsSnap.docs) {
        await setDoc(
          doc(db, 'participations', String(pSnap.id)),
          sanitizeForFirestore({
            status: 'expired',
            expiredAt: serverTimestamp(),
            expiredReason: 'season_ended',
          }),
          { merge: true }
        );
        participationsExpired++;
      }
    }
  }

  await setDoc(
    doc(db, 'seasons', sid),
    sanitizeForFirestore({
      isActive: false,
      endedAt: serverTimestamp(),
      endedBy: adminUid,
      endedReason: reason,
      questsExpiredCount: questsExpired,
      participationsExpiredCount: participationsExpired,
      updatedAt: serverTimestamp(),
    }),
    { merge: true }
  );

  try { await pauseAllOwnerQuestsForSeasonEnd() } catch (err) { console.warn('[endSeasonWithExpiry] pauseAllOwnerQuestsForSeasonEnd failed:', err) }

  await logAudit({
    action: 'season_ended',
    targetType: 'season',
    targetId: sid,
    meta: { reason, questsExpired, participationsExpired, endedBy: adminUid },
  });

  return { questsExpired, participationsExpired };
}

export async function expireAllQuestsForSeason(seasonId) {
  const sid = String(seasonId);
  const adminUid = auth.currentUser?.uid ?? 'unknown';

  const questsQuery = query(
    collection(db, 'quests'),
    where('seasonId', '==', sid)
  );
  const questsSnap = await getDocs(questsQuery);
  let questsExpired = 0;
  const expiredQuestIds = [];

  for (const qSnap of questsSnap.docs) {
    const qData = qSnap.data();
    if (qData.isActive === false) continue;
    await setDoc(
      doc(db, 'quests', String(qSnap.id)),
      sanitizeForFirestore({
        isActive: false,
        expiredAt: serverTimestamp(),
        expiredBy: adminUid,
        expiredReason: 'season_ended',
        updatedAt: serverTimestamp(),
      }),
      { merge: true }
    );
    expiredQuestIds.push(String(qSnap.id));
    questsExpired++;
  }

  let participationsExpired = 0;
  if (expiredQuestIds.length > 0) {
    const BATCH_SIZE = 30;
    for (let i = 0; i < expiredQuestIds.length; i += BATCH_SIZE) {
      const batch = expiredQuestIds.slice(i, i + BATCH_SIZE);
      const partsQuery = query(
        collection(db, 'participations'),
        where('questId', 'in', batch),
        where('status', '==', 'joined')
      );
      const partsSnap = await getDocs(partsQuery);
      for (const pSnap of partsSnap.docs) {
        await setDoc(
          doc(db, 'participations', String(pSnap.id)),
          sanitizeForFirestore({
            status: 'expired',
            expiredAt: serverTimestamp(),
            expiredReason: 'season_ended',
          }),
          { merge: true }
        );
        participationsExpired++;
      }
    }
  }

  await logAudit({
    action: 'season_expire_all_quests',
    targetType: 'season',
    targetId: sid,
    meta: { questsExpired, participationsExpired, expiredBy: adminUid },
  });

  return { questsExpired, participationsExpired };
}

export async function deleteSeasonIfEmpty(seasonId) {
  const sid = String(seasonId);

  const questsQuery = query(collection(db, 'quests'), where('seasonId', '==', sid));
  const questsSnap = await getDocs(questsQuery);
  if (questsSnap.size > 0) {
    throw new Error(`Cannot delete: season has ${questsSnap.size} quest(s). End the season first to expire quests, then archive instead of delete.`);
  }

  const partsQuery = query(collection(db, 'participations'), where('seasonId', '==', sid));
  const partsSnap = await getDocs(partsQuery);
  if (partsSnap.size > 0) {
    throw new Error(`Cannot delete: season has ${partsSnap.size} participation(s). Cannot delete seasons with user data.`);
  }

  const ledgerQuery = query(collection(db, 'pointsLedger'), where('seasonId', '==', sid));
  const ledgerSnap = await getDocs(ledgerQuery);
  if (ledgerSnap.size > 0) {
    throw new Error(`Cannot delete: season has ${ledgerSnap.size} point ledger entry/entries.`);
  }

  await deleteDoc(doc(db, 'seasons', sid));

  await logAudit({
    action: 'season_deleted',
    targetType: 'season',
    targetId: sid,
  });

  return { success: true };
}

export async function autoEndStaleSeasons() {
  const now = new Date();
  const activeQuery = query(collection(db, 'seasons'), where('isActive', '==', true));
  const activeSnap = await getDocs(activeQuery);

  const endedSeasons = [];
  for (const docSnap of activeSnap.docs) {
    const data = docSnap.data();
    const endAt = data.endAt?.toDate?.() ?? new Date(data.endAt);
    if (endAt < now) {
      console.log(`[autoEndStaleSeasons] Auto-ending stale season: ${data.name} (ended ${endAt.toISOString()})`);
      const result = await endSeasonWithExpiry(String(docSnap.id), {
        reason: 'auto_past_endAt',
        endedBy: 'auto',
      });
      endedSeasons.push({
        seasonId: String(docSnap.id),
        seasonName: data.name,
        ...result,
      });
    }
  }
  return endedSeasons;
}

export async function getLastEndedSeason() {
  const seasons = await listSeasons()
  const ended = seasons
    .filter(s => {
      const status = getSeasonStatus(s)
      return status === 'ended'
    })
    .sort((a, b) => {
      const aEnd = toJSDate(a.endAt)
      const bEnd = toJSDate(b.endAt)
      return (bEnd?.getTime() || 0) - (aEnd?.getTime() || 0)
    })
  return ended[0] || null
}

export async function getSeasonSummaryStats(seasonId) {
  if (!seasonId) return { totalQuestsCompleted: 0, totalParticipants: 0, impactByUnit: {} }

  const statsRef = collection(db, 'seasonUserStats')
  const statsQ = query(statsRef, where('seasonId', '==', seasonId))
  const statsSnap = await getDocs(statsQ)

  let totalQuestsCompleted = 0
  statsSnap.docs.forEach(d => {
    const data = d.data()
    totalQuestsCompleted += data.completedQuestsCount || 0
  })

  const impactEntries = await listSeasonImpact(seasonId)
  const impactByUnit = sumImpactByUnit(impactEntries)

  return {
    totalQuestsCompleted,
    totalParticipants: statsSnap.size,
    impactByUnit,
  }
}

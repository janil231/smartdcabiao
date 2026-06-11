import {
  collection, doc, getDocs, setDoc, deleteDoc, Timestamp, query, where,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { sanitizeForFirestore } from '../utils/firestoreSanitize'
import { logAudit } from './audit.service'
import { getSeededUserIds } from './seedFakeUsers.service'

const STATUS_WEIGHTS = {
  completed: 60,
  joined: 20,
  cancelled: 10,
  expired: 10,
}

function pickWeightedStatus(forceTerminal = false) {
  const weights = forceTerminal
    ? { completed: 70, expired: 20, cancelled: 10 }
    : STATUS_WEIGHTS

  const total = Object.values(weights).reduce((a, b) => a + b, 0)
  let rand = Math.random() * total

  for (const [status, weight] of Object.entries(weights)) {
    rand -= weight
    if (rand <= 0) return status
  }
  return 'completed'
}

function randomDateBetween(startMs, endMs) {
  const ms = startMs + Math.random() * (endMs - startMs)
  return new Date(ms)
}

function pickRandom(arr, count) {
  const shuffled = [...arr].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, Math.min(count, arr.length))
}

export async function seedQuestActivity({ onProgress } = {}) {
  const existingQuery = query(collection(db, 'participations'), where('_seeded', '==', true))
  const existingSnap = await getDocs(existingQuery)

  if (existingSnap.size > 0) {
    return {
      skipped: true,
      reason: `${existingSnap.size} seeded participations already exist. Run "Reset Phase 2 Data" first.`,
      created: 0,
    }
  }

  const userIds = await getSeededUserIds()
  if (userIds.length === 0) {
    return {
      skipped: true,
      reason: 'No seeded users found. Run "Seed Fake Users" first.',
      created: 0,
    }
  }

  const [questsSnap, seasonsSnap, ownerQuestsSnap, usersSnap] = await Promise.all([
    getDocs(collection(db, 'quests')),
    getDocs(collection(db, 'seasons')),
    getDocs(collection(db, 'ownerQuests')),
    getDocs(query(collection(db, 'users'), where('_seeded', '==', true))),
  ])

  const allQuests = questsSnap.docs.map(d => ({ id: d.id, ...d.data() }))
  const allSeasons = seasonsSnap.docs.map(d => ({ id: d.id, ...d.data() }))
  const allOwnerQuests = ownerQuestsSnap.docs.map(d => ({ id: d.id, ...d.data() }))
  const fakeUsers = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }))

  const seasonMap = new Map(allSeasons.map(s => [s.id, s]))

  const results = {
    participations: 0,
    ownerParticipations: 0,
    pointsLedger: 0,
    impactLedger: 0,
    seasonBalances: 0,
    seasonUserStats: 0,
    errors: [],
  }

  const userSeasonStats = new Map()

  function addToUserSeasonStats(uid, seasonId, points, completedDelta, impactUnit, impactAmount) {
    const key = `${seasonId}_${uid}`
    if (!userSeasonStats.has(key)) {
      userSeasonStats.set(key, { uid, seasonId, points: 0, completedQuests: 0, impactByUnit: {} })
    }
    const stats = userSeasonStats.get(key)
    stats.points += points
    stats.completedQuests += completedDelta
    if (impactUnit && impactAmount > 0) {
      stats.impactByUnit[impactUnit] = (stats.impactByUnit[impactUnit] || 0) + impactAmount
    }
  }

  // PART 1: LGU Quest Participations
  let userIdx = 0
  for (const user of fakeUsers) {
    userIdx++
    onProgress?.({ phase: 'LGU participations', current: userIdx, total: fakeUsers.length })

    const joinCount = 3 + Math.floor(Math.random() * 6)
    const selectedQuests = pickRandom(allQuests, joinCount)

    for (const quest of selectedQuests) {
      try {
        const season = seasonMap.get(quest.seasonId)
        const seasonEnded = season && season.isActive === false
        const status = pickWeightedStatus(seasonEnded)

        const questCreatedMs = quest.createdAt?.toMillis?.() || Date.now() - 90 * 24 * 60 * 60 * 1000
        const nowMs = Date.now()
        const joinedAt = randomDateBetween(questCreatedMs, nowMs)
        const completedAt = (status === 'completed')
          ? randomDateBetween(joinedAt.getTime(), nowMs)
          : null

        const participationId = `${user.id}_${quest.id}`

        const payload = sanitizeForFirestore({
          uid: user.id,
          questId: quest.id,
          seasonId: quest.seasonId,
          status,
          joinedAt: Timestamp.fromDate(joinedAt),
          completedAt: completedAt ? Timestamp.fromDate(completedAt) : null,
          verificationMethod: quest.verificationMethod || 'manual',
          adminVerifiedBy: status === 'completed' ? 'seeded@smartdcabiao.local' : null,
          adminVerifiedAt: completedAt ? Timestamp.fromDate(completedAt) : null,
          _seeded: true,
        })

        await setDoc(doc(db, 'participations', String(participationId)), payload)
        results.participations++

        if (status === 'completed') {
          const pointsValue = quest.points || 100

          const pointsEntryId = `seeded_pts_${user.id}_${quest.id}`
          await setDoc(doc(db, 'pointsLedger', String(pointsEntryId)), sanitizeForFirestore({
            uid: user.id,
            seasonId: quest.seasonId,
            questId: quest.id,
            points: pointsValue,
            reason: 'quest_completed',
            createdAt: Timestamp.fromDate(completedAt),
            _seeded: true,
          }))
          results.pointsLedger++

          if (quest.impactUnit && quest.impactAmount > 0) {
            const impactEntryId = `seeded_imp_${user.id}_${quest.id}`
            await setDoc(doc(db, 'impactLedger', String(impactEntryId)), sanitizeForFirestore({
              uid: user.id,
              userEmail: user.email,
              seasonId: quest.seasonId,
              questId: quest.id,
              questTitle: quest.title,
              unit: quest.impactUnit,
              amount: quest.impactAmount,
              reason: 'quest_completed',
              createdAt: Timestamp.fromDate(completedAt),
              _seeded: true,
            }))
            results.impactLedger++
          }

          addToUserSeasonStats(
            user.id,
            quest.seasonId,
            pointsValue,
            1,
            quest.impactUnit,
            quest.impactAmount || 0,
          )
        }
      } catch (err) {
        results.errors.push({ phase: 'lgu_participation', user: user.displayName, quest: quest.title, error: err.message })
      }
    }
  }

  // PART 2: Owner Quest Participations
  userIdx = 0
  for (const user of fakeUsers) {
    userIdx++
    onProgress?.({ phase: 'Owner participations', current: userIdx, total: fakeUsers.length })

    const joinCount = 1 + Math.floor(Math.random() * 5)
    const selectedQuests = pickRandom(allOwnerQuests, joinCount)

    for (const quest of selectedQuests) {
      try {
        const status = pickWeightedStatus(false)

        const questCreatedMs = quest.createdAt?.toMillis?.() || Date.now() - 90 * 24 * 60 * 60 * 1000
        const nowMs = Date.now()
        const joinedAt = randomDateBetween(questCreatedMs, nowMs)
        const completedAt = (status === 'completed')
          ? randomDateBetween(joinedAt.getTime(), nowMs)
          : null

        const participationId = `seeded_${user.id}_${quest.id}`

        const payload = sanitizeForFirestore({
          uid: user.id,
          questId: quest.id,
          businessId: quest.businessId,
          businessName: quest.businessName,
          status,
          joinedAt: Timestamp.fromDate(joinedAt),
          completedAt: completedAt ? Timestamp.fromDate(completedAt) : null,
          rewardClaimed: status === 'completed',
          _seeded: true,
        })

        await setDoc(doc(db, 'ownerQuestParticipations', String(participationId)), payload)
        results.ownerParticipations++
      } catch (err) {
        results.errors.push({ phase: 'owner_participation', user: user.displayName, quest: quest.title, error: err.message })
      }
    }
  }

  // PART 3: Season Balances + Season User Stats
  onProgress?.({ phase: 'Aggregating stats', current: 0, total: userSeasonStats.size })

  let aggIdx = 0
  for (const [key, stats] of userSeasonStats.entries()) {
    aggIdx++
    onProgress?.({ phase: 'Aggregating stats', current: aggIdx, total: userSeasonStats.size })

    try {
      const user = fakeUsers.find(u => u.id === stats.uid)
      const displayName = user?.displayName || 'Anonymous'

      const balanceId = `${stats.seasonId}_${stats.uid}`
      await setDoc(doc(db, 'seasonBalances', String(balanceId)), sanitizeForFirestore({
        seasonId: stats.seasonId,
        uid: stats.uid,
        userEmail: user?.email || '',
        pointsEarned: stats.points,
        pointsSpent: 0,
        pointsBalance: stats.points,
        updatedAt: Timestamp.now(),
        _seeded: true,
      }))
      results.seasonBalances++

      const statsId = `${stats.seasonId}_${stats.uid}`
      await setDoc(doc(db, 'seasonUserStats', String(statsId)), sanitizeForFirestore({
        uid: stats.uid,
        seasonId: stats.seasonId,
        points: stats.points,
        completedQuests: stats.completedQuests,
        impactByUnit: stats.impactByUnit,
        showOnLeaderboard: true,
        publicName: displayName,
        updatedAt: Timestamp.now(),
        _seeded: true,
      }))
      results.seasonUserStats++
    } catch (err) {
      results.errors.push({ phase: 'aggregation', key, error: err.message })
    }
  }

  try {
    await logAudit({
      action: 'seed_quest_activity',
      targetType: 'activity',
      meta: results,
    })
  } catch (err) {
    console.warn('logAudit failed:', err)
  }

  return results
}

export async function deleteSeededQuestActivity() {
  const collections = [
    'participations',
    'ownerQuestParticipations',
    'pointsLedger',
    'impactLedger',
    'seasonBalances',
    'seasonUserStats',
  ]

  const results = {}

  for (const collName of collections) {
    try {
      const q = query(collection(db, collName), where('_seeded', '==', true))
      const snap = await getDocs(q)

      let deleted = 0
      for (const docSnap of snap.docs) {
        try {
          await deleteDoc(docSnap.ref)
          deleted++
        } catch (err) {
          console.warn(`Failed to delete ${collName}/${docSnap.id}:`, err)
        }
      }
      results[collName] = deleted
    } catch (err) {
      console.warn(`Failed to query ${collName}:`, err)
      results[collName] = 0
    }
  }

  return results
}

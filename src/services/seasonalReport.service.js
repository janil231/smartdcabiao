import {
  collection, query, where, getDocs, orderBy, Timestamp
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { toJSDate } from './seasons.service'

function startOfWeek(date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function bucketDate(date, granularity) {
  const d = new Date(date)
  if (granularity === 'weekly') return startOfWeek(d)
  d.setHours(0, 0, 0, 0)
  return d
}

function buildBuckets(seasonStart, seasonEnd, granularity) {
  const buckets = []
  const cursor = new Date(seasonStart)
  if (granularity === 'weekly') cursor.setDate(cursor.getDate() - cursor.getDay() + 1)
  else cursor.setHours(0, 0, 0, 0)

  while (cursor <= seasonEnd) {
    const label = granularity === 'weekly'
      ? cursor.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      : cursor.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    buckets.push({
      label,
      dateKey: cursor.getTime(),
      participants: 0,
      questsFinished: 0,
      rewardsTaken: 0,
    })
    if (granularity === 'weekly') cursor.setDate(cursor.getDate() + 7)
    else cursor.setDate(cursor.getDate() + 1)
  }
  return buckets
}

export async function getSeasonReportSummary(seasonId) {
  if (!seasonId) return null

  let season = null
  try {
    const snap = await getDocs(query(collection(db, 'seasons'), where('__name__', '==', seasonId)))
    if (!snap.empty) season = { id: snap.docs[0].id, ...snap.docs[0].data() }
  } catch {}
  if (!season) return null

  const seasonStart = toJSDate(season.startAt)
  const seasonEnd = toJSDate(season.endAt)
  const result = {
    rewardsCount: 0,
    participatingBusinessesCount: 0,
    questsCount: { total: 0, lgu: 0, owner: 0, byType: {} },
    claimsCount: { total: 0, voucherRedemptions: 0, rewardClaims: 0 },
    participationsByStatus: { joined: 0, completed: 0, cancelled: 0, expired: 0, pending: 0, total: 0 },
  }

  /* LGU quests */
  try {
    const lguQ = query(collection(db, 'quests'), where('seasonId', '==', seasonId))
    const lguSnap = await getDocs(lguQ)
    result.questsCount.lgu = lguSnap.size
    const typeCounts = {}
    lguSnap.docs.forEach(d => {
      const data = d.data()
      const t = data.questType || data.category || 'other'
      typeCounts[t] = (typeCounts[t] || 0) + 1
    })
    result.questsCount.byType = typeCounts
  } catch {}

  /* Owner quests */
  try {
    const ownerQ = query(collection(db, 'ownerQuests'), orderBy('createdAt', 'desc'))
    const ownerSnap = await getDocs(ownerQ)
    const ownerInSeason = ownerSnap.docs.filter(d => {
      const c = toJSDate(d.data().createdAt)
      return c && c >= seasonStart && c <= seasonEnd
    })
    result.questsCount.owner = ownerInSeason.length
    result.questsCount.total = result.questsCount.lgu + result.questsCount.owner
    const bizIds = new Set()
    ownerInSeason.forEach(d => { if (d.data().businessId) bizIds.add(d.data().businessId) })

    /* Participating businesses from LGU quests */
    lguSnap?.docs?.forEach(d => {
      const pbi = d.data().partnerBusinessId
      if (pbi) bizIds.add(pbi)
    })
    result.participatingBusinessesCount = bizIds.size
  } catch {}

  /* Participations */
  try {
    const partsQ = query(collection(db, 'participations'), where('seasonId', '==', seasonId))
    const partsSnap = await getDocs(partsQ)
    partsSnap.docs.forEach(d => {
      const s = d.data().status || 'joined'
      if (result.participationsByStatus[s] !== undefined) result.participationsByStatus[s]++
    })
    result.participationsByStatus.total = partsSnap.size
  } catch {}

  /* Voucher redemptions */
  try {
    const vrRef = collection(db, 'seasons', String(seasonId), 'voucherRedemptions')
    const vrSnap = await getDocs(vrRef)
    result.claimsCount.voucherRedemptions = vrSnap.size
  } catch {}

  /* Business quest rewards */
  try {
    const rQ = query(collection(db, 'businessQuestRewards'), orderBy('createdAt', 'desc'))
    const rSnap = await getDocs(rQ)
    const rewardsInSeason = rSnap.docs.filter(d => {
      const c = toJSDate(d.data().createdAt)
      return c && c >= seasonStart && c <= seasonEnd
    })
    result.rewardsCount = rewardsInSeason.length
    const claimed = rewardsInSeason.filter(d => d.data().status === 'used')
    result.claimsCount.rewardClaims = claimed.length
    result.claimsCount.total = result.claimsCount.voucherRedemptions + result.claimsCount.rewardClaims
  } catch {}

  return result
}

export async function getSeasonReportTimeSeries(seasonId, { granularity = 'daily' } = {}) {
  if (!seasonId) return []

  let season = null
  try {
    const snap = await getDocs(query(collection(db, 'seasons'), where('__name__', '==', seasonId)))
    if (!snap.empty) season = { id: snap.docs[0].id, ...snap.docs[0].data() }
  } catch {}
  if (!season) return []

  const seasonStart = toJSDate(season.startAt)
  const seasonEnd = toJSDate(season.endAt)
  if (!seasonStart || !seasonEnd) return []

  const buckets = buildBuckets(seasonStart, seasonEnd, granularity)

  /* Participations */
  try {
    const partsQ = query(collection(db, 'participations'), where('seasonId', '==', seasonId))
    const partsSnap = await getDocs(partsQ)
    partsSnap.docs.forEach(d => {
      const data = d.data()
      const joined = toJSDate(data.joinedAt)
      const completed = toJSDate(data.completedAt)
      if (joined) {
        const bk = bucketDate(joined, granularity).getTime()
        const b = buckets.find(b => b.dateKey === bk)
        if (b) b.participants++
      }
      if (completed) {
        const bk = bucketDate(completed, granularity).getTime()
        const b = buckets.find(b => b.dateKey === bk)
        if (b) b.questsFinished++
      }
    })
  } catch {}

  /* Voucher redemptions */
  try {
    const vrRef = collection(db, 'seasons', String(seasonId), 'voucherRedemptions')
    const vrSnap = await getDocs(vrRef)
    vrSnap.docs.forEach(d => {
      const redeemed = toJSDate(d.data().redeemedAt)
      if (redeemed) {
        const bk = bucketDate(redeemed, granularity).getTime()
        const b = buckets.find(b => b.dateKey === bk)
        if (b) b.rewardsTaken++
      }
    })
  } catch {}

  /* Business quest reward claims */
  try {
    const rQ = query(collection(db, 'businessQuestRewards'), orderBy('createdAt', 'desc'))
    const rSnap = await getDocs(rQ)
    rSnap.docs
      .filter(d => d.data().status === 'used')
      .forEach(d => {
        const claimed = toJSDate(d.data().createdAt)
        if (claimed && claimed >= seasonStart && claimed <= seasonEnd) {
          const bk = bucketDate(claimed, granularity).getTime()
          const b = buckets.find(b => b.dateKey === bk)
          if (b) b.rewardsTaken++
        }
      })
  } catch {}

  return buckets
}

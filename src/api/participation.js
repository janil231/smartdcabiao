/**
 * User participation API (Firestore).
 * Join/leave activities and read joined state + rewards.
 */
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  increment,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { REWARD_STATUS } from '../data'

const POINTS_PER_JOIN = 50
const ACTIVITIES_BEFORE_VOUCHER = 2

/**
 * Build a reward entry for a joined activity.
 */
function buildRewardEntry(activity, index) {
  const isVoucher = (index + 1) % ACTIVITIES_BEFORE_VOUCHER === 0
  return {
    activityId: activity.id,
    activityName: activity.name,
    date: activity.date,
    rewardStatus: isVoucher ? REWARD_STATUS.voucher : REWARD_STATUS.points,
    rewardLabel: isVoucher ? 'Voucher unlocked' : `${POINTS_PER_JOIN} points earned`,
    rewardDetail: isVoucher
      ? 'Redeem at a participating local business.'
      : 'Earned for participating.',
  }
}

/**
 * Get current user's joined activity IDs from Firestore.
 * @param {string} uid - Firebase Auth UID
 * @returns {Promise<string[]>} array of activity IDs (as numbers, stored as numbers)
 */
export async function getJoinedActivityIds(uid) {
  const userRef = doc(db, 'users', uid)
  const snap = await getDoc(userRef)
  const data = snap.data()
  const ids = data?.joinedActivityIds ?? []
  return ids.map(Number)
}

/**
 * Get full user participation and rewards (for Rewards page).
 * @param {string} uid
 * @returns {Promise<{ joinedActivityIds: number[], participationHistory: object[], rewardPoints: number, voucherCount: number }>}
 */
export async function getUserRewards(uid) {
  const userRef = doc(db, 'users', uid)
  const snap = await getDoc(userRef)
  const data = snap.data()
  return {
    joinedActivityIds: (data?.joinedActivityIds ?? []).map(Number),
    participationHistory: data?.participationHistory ?? [],
    rewardPoints: data?.rewardPoints ?? 0,
    voucherCount: data?.voucherCount ?? 0,
  }
}

/**
 * Join an activity: add to joinedActivityIds, append to participationHistory, update points/vouchers.
 * @param {string} uid
 * @param {object} activity - { id, name, date, ... }
 */
export async function joinActivity(uid, activity) {
  const userRef = doc(db, 'users', uid)
  const snap = await getDoc(userRef)
  const history = snap.data()?.participationHistory ?? []
  const newEntry = buildRewardEntry(activity, history.length)
  const isVoucher = newEntry.rewardStatus === REWARD_STATUS.voucher

  if (!snap.exists()) {
    await setDoc(userRef, {
      joinedActivityIds: [activity.id],
      participationHistory: [newEntry],
      rewardPoints: POINTS_PER_JOIN,
      voucherCount: isVoucher ? 1 : 0,
    })
    return
  }

  await updateDoc(userRef, {
    joinedActivityIds: arrayUnion(activity.id),
    participationHistory: arrayUnion(newEntry),
    rewardPoints: increment(POINTS_PER_JOIN),
    voucherCount: increment(isVoucher ? 1 : 0),
  })
}

/**
 * Leave an activity: remove from joinedActivityIds only (history kept for record).
 * @param {string} uid
 * @param {number} activityId
 */
export async function leaveActivity(uid, activityId) {
  const userRef = doc(db, 'users', uid)
  await updateDoc(userRef, {
    joinedActivityIds: arrayRemove(activityId),
  })
}

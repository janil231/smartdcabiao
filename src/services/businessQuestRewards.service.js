import {
  collection, doc, getDoc, getDocs, query, where, orderBy,
  serverTimestamp, addDoc, updateDoc
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { sanitizeForFirestore } from '../utils/firestoreSanitize'
import { generateBusinessRewardCode } from '../utils/voucherCode'

const REWARDS_COLLECTION = 'businessQuestRewards'

function assembleRewardDescription(rewardType, rewardValue, rewardItemName) {
  const item = rewardItemName || 'selected items'
  if (rewardType === 'discount_percent') return `${rewardValue}% off ${item}`
  if (rewardType === 'discount_fixed') return `₱${rewardValue} off ${item}`
  if (rewardType === 'free_item') return `Free ${item}`
  if (rewardType === 'bogo') return `Buy 1 Get 1 on ${item}`
  return `${rewardValue} off ${item}`
}

function normalizeReward(docSnap) {
  const data = docSnap.data()
  return {
    id: docSnap.id,
    uid: data.uid || '',
    userEmail: data.userEmail || '',
    questId: data.questId || '',
    questTitle: data.questTitle || '',
    businessId: data.businessId || '',
    businessName: data.businessName || '',
    ownerUid: data.ownerUid || '',
    rewardType: data.rewardType || '',
    rewardValue: data.rewardValue || 0,
    rewardItemName: data.rewardItemName || '',
    rewardDescription: data.rewardDescription || '',
    code: data.code || '',
    status: data.status || 'unused',
    completedAt: data.completedAt || null,
    usedAt: data.usedAt || null,
    usedByOwnerUid: data.usedByOwnerUid || null,
  }
}

export async function createBusinessQuestReward(uid, userEmail, quest, participation) {
  if (!uid) throw new Error('Missing uid')
  if (!quest) throw new Error('Missing quest data')

  const code = generateBusinessRewardCode()

  let rewardValue = quest.rewardValue
  let rewardItemName = quest.rewardItemName || ''
  let rewardDescription

  if (quest.rewardType === 'other') {
    rewardDescription = quest.rewardDescription || ''
    rewardValue = undefined
    rewardItemName = ''
  } else {
    rewardDescription = assembleRewardDescription(quest.rewardType, quest.rewardValue, quest.rewardItemName)
  }

  const rewardData = sanitizeForFirestore({
    uid,
    userEmail: userEmail || '',
    questId: quest.id,
    questTitle: quest.title || '',
    businessId: quest.businessId,
    businessName: quest.businessName,
    ownerUid: quest.ownerUid,
    rewardType: quest.rewardType,
    rewardValue,
    rewardItemName,
    rewardDescription,
    code,
    status: 'unused',
    completedAt: serverTimestamp(),
    usedAt: null,
    usedByOwnerUid: null,
  })

  const docRef = await addDoc(collection(db, REWARDS_COLLECTION), rewardData)
  return { id: docRef.id, ...rewardData }
}

export async function getMyBusinessQuestRewards(uid) {
  if (!uid) return []
  try {
    const q = query(
      collection(db, REWARDS_COLLECTION),
      where('uid', '==', uid),
      orderBy('completedAt', 'desc')
    )
    const snapshot = await getDocs(q)
    return snapshot.docs.map(normalizeReward)
  } catch (error) {
    if (import.meta.env.DEV) console.warn('[rewards] getMy failed:', error)
    return []
  }
}

export async function getBusinessRewardsForOwner(businessId, ownerUid) {
  if (!businessId || !ownerUid) return []
  try {
    const q = query(
      collection(db, REWARDS_COLLECTION),
      where('businessId', '==', businessId),
      where('ownerUid', '==', ownerUid),
      orderBy('completedAt', 'desc')
    )
    const snapshot = await getDocs(q)
    return snapshot.docs.map(normalizeReward)
  } catch (error) {
    if (import.meta.env.DEV) console.warn('[rewards] getForOwner failed:', error)
    return []
  }
}

export async function markRewardAsUsed(rewardId, ownerUid) {
  if (!rewardId || !ownerUid) throw new Error('Missing rewardId or ownerUid')
  const idStr = String(rewardId)
  const ref = doc(db, REWARDS_COLLECTION, idStr)
  const snap = await getDoc(ref)
  if (!snap.exists()) throw new Error('Reward not found')
  if (snap.data().ownerUid !== ownerUid) throw new Error('Only the business owner can mark rewards as used')

  await updateDoc(ref, {
    status: 'used',
    usedAt: serverTimestamp(),
    usedByOwnerUid: ownerUid,
  })

  return { success: true }
}

export { assembleRewardDescription }

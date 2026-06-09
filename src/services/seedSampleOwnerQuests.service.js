import { collection, getDocs, query, where, addDoc, doc, deleteDoc, serverTimestamp, Timestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { auth } from '../lib/firebase'
import { listBusinesses, isStaticBusiness } from './businesses.service'
import { createOwnerQuest } from './ownerQuests.service'
import { sanitizeForFirestore } from '../utils/firestoreSanitize'
import { logAudit } from './audit.service'
import { inferQuestTags } from '../utils/tagMapping'

const QUEST_TEMPLATES = [
  {
    title: 'Drop By & Check Us Out',
    description: 'Visit this local business and stay for at least 15 minutes to explore what they offer. Great way to discover something new in Cabiao!',
    questType: 'visit',
    visitDurationMinutes: 15,
    points: 30,
    reward: {
      title: '₱20 Off Your Next Visit',
      description: 'Get ₱20 off on your next purchase at this business',
      terms: 'Valid for 90 days. One redemption per customer. Cannot be combined with other offers.',
    },
  },
  {
    title: 'Make a Purchase',
    description: 'Buy something from this business (minimum ₱100) to support local entrepreneurship. Show the staff the QR code at checkout to verify.',
    questType: 'buy',
    buyVerificationMethod: 'qr',
    minimumPurchase: 100,
    quantityRequired: 1,
    points: 50,
    autoRotateDaily: false,
    itemDetails: 'Any item from the menu or store. Staff will scan QR at checkout.',
    conditions: 'Minimum ₱100 purchase required. Show QR before payment.',
    reward: {
      title: '10% Off Voucher',
      description: 'Save 10% on your next purchase at this business',
      terms: 'Valid for 90 days. Minimum ₱100 purchase. One redemption per customer.',
    },
  },
  {
    title: 'Try Something New',
    description: 'Try a featured item from this business (minimum ₱200 purchase). Staff will give you a daily code to enter to verify your purchase.',
    questType: 'buy',
    buyVerificationMethod: 'code',
    minimumPurchase: 200,
    quantityRequired: 1,
    points: 75,
    autoRotateDaily: true,
    itemDetails: 'Any featured or signature item. Ask staff for today\'s code after purchase.',
    conditions: 'Minimum ₱200 purchase. Daily code rotates each day.',
    reward: {
      title: 'Free Item Voucher',
      description: 'Redeem for one complimentary item from this business',
      terms: 'Valid for 90 days. Subject to item availability. One redemption per customer.',
    },
  },
  {
    title: 'Stay & Experience',
    description: 'Spend at least 30 minutes at this business to truly experience what they have to offer. Perfect for slow-paced exploration.',
    questType: 'visit',
    visitDurationMinutes: 30,
    points: 60,
    reward: {
      title: '15% Off Voucher',
      description: 'Get 15% off your next purchase at this business',
      terms: 'Valid for 90 days. One redemption per customer. Cannot be combined with other offers.',
    },
  },
  {
    title: 'Support Local — Big Spender',
    description: 'Make a substantial purchase (minimum ₱500) to strongly support this local business. Show the QR code at checkout for verification.',
    questType: 'buy',
    buyVerificationMethod: 'qr',
    minimumPurchase: 500,
    quantityRequired: 1,
    points: 120,
    autoRotateDaily: false,
    itemDetails: 'Any combination of items totaling at least ₱500. Staff will scan QR at checkout.',
    conditions: 'Minimum ₱500 purchase required. Single transaction.',
    reward: {
      title: '₱100 Off Voucher',
      description: 'Save ₱100 on your next purchase at this business',
      terms: 'Valid for 90 days. Minimum ₱500 purchase. One redemption per customer.',
    },
  },
]

const REWARD_TYPES = ['discount_fixed', 'discount_percent', 'free_item', 'discount_percent', 'discount_fixed']

function getRewardType(index) {
  return REWARD_TYPES[index] || 'discount_percent'
}

function getRewardValue(template) {
  const index = QUEST_TEMPLATES.indexOf(template)
  if (index === 0) return 20
  if (index === 1) return 10
  if (index === 2) return 0
  if (index === 3) return 15
  if (index === 4) return 100
  return 0
}

function getRewardItemName(template) {
  const index = QUEST_TEMPLATES.indexOf(template)
  if (index === 2) return 'Complimentary Item'
  return ''
}

export async function seedSampleQuestsForAllBusinesses({ onProgress } = {}) {
  const user = auth.currentUser
  if (!user) throw new Error('Must be signed in')

  const result = {
    businessesScanned: 0,
    businessesSeeded: 0,
    businessesSkipped: [],
    businessesSeededList: [],
    questsCreated: 0,
    rewardsCreated: 0,
    errors: [],
  }

  const { data: allBusinesses } = await listBusinesses({ forceRefresh: true })
  console.log('[SeedQuests] Fetched businesses:', allBusinesses?.length, 'total')

  const afterStatic = (allBusinesses ?? []).filter(b => !isStaticBusiness(b))
  console.log('[SeedQuests] After static filter:', afterStatic.length)

  const realBusinesses = afterStatic.filter(b => b.isActive !== false)
  console.log('[SeedQuests] After active filter:', realBusinesses.length)
  console.log('[SeedQuests] Will process:', realBusinesses.map(b => ({ id: b.id, name: b.name, _source: b._source })))

  result.businessesScanned = realBusinesses.length

  for (let bi = 0; bi < realBusinesses.length; bi++) {
    const business = realBusinesses[bi]
    const businessId = String(business.id)
    const businessName = business.name || 'Unknown'

    const existingQuery = query(
      collection(db, 'ownerQuests'),
      where('businessId', '==', businessId)
    )
    const existingSnap = await getDocs(existingQuery)

    if (!existingSnap.empty) {
      result.businessesSkipped.push({
        businessId,
        businessName,
        reason: 'Already has quests',
      })
      continue
    }

    const perQuestErrors = []
    let questsCreatedForThisBusiness = 0
    let rewardsCreatedForThisBusiness = 0

    for (let qi = 0; qi < QUEST_TEMPLATES.length; qi++) {
      const template = QUEST_TEMPLATES[qi]

      if (onProgress) {
        onProgress({
          businessIndex: bi + 1,
          totalBusinesses: realBusinesses.length,
          businessName,
          questIndex: qi + 1,
          totalQuests: QUEST_TEMPLATES.length,
        })
      }

      try {
        const questForTags = { questType: template.questType, category: template.questType, impact: null }
        const questTags = inferQuestTags(questForTags, business)

        const questData = sanitizeForFirestore({
          title: template.title,
          description: template.description,
          questType: template.questType,
          requiredDurationMinutes: template.visitDurationMinutes || 0,
          verificationMethod: template.questType === 'visit' ? 'location' : (template.buyVerificationMethod === 'code' ? 'code' : 'qr'),
          rewardType: getRewardType(qi),
          rewardValue: getRewardValue(template),
          rewardItemName: getRewardItemName(template),
          isActive: true,
          buyVerificationMethod: template.questType === 'buy' ? (template.buyVerificationMethod || 'qr') : null,
          minimumPurchase: template.minimumPurchase || 0,
          quantityRequired: template.quantityRequired || 1,
          itemDetails: template.itemDetails || null,
          conditions: template.conditions || null,
          autoRotateDaily: template.questType === 'buy' ? (template.autoRotateDaily || false) : null,
          itemPhotoUrl: null,
          questInstructions: null,
          tags: questTags,
        })

        const quest = await createOwnerQuest(business.ownerUid || user.uid, businessId, businessName, questData)
        questsCreatedForThisBusiness++

        await logAudit({
          action: 'seed_sample_owner_quest',
          targetType: 'ownerQuests',
          targetId: quest.id,
          adminUid: user.uid,
          adminEmail: user.email,
          meta: { businessId, businessName, questTitle: template.title, templateIndex: qi },
        })

        try {
          const rewardPayload = sanitizeForFirestore({
            businessId,
            businessName,
            questId: quest.id,
            questTitle: template.title,
            rewardTitle: template.reward.title,
            rewardDescription: template.reward.description,
            rewardTerms: template.reward.terms,
            stockTotal: 50,
            stockRemaining: 50,
            expiresAt: Timestamp.fromDate(new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)),
            isActive: true,
            createdAt: serverTimestamp(),
            createdBy: user.uid,
            createdByEmail: user.email,
          })

          const rewardRef = await addDoc(collection(db, 'businessQuestRewards'), rewardPayload)
          rewardsCreatedForThisBusiness++

          await logAudit({
            action: 'seed_sample_owner_reward',
            targetType: 'businessQuestRewards',
            targetId: rewardRef.id,
            adminUid: user.uid,
            adminEmail: user.email,
            meta: { businessId, businessName, questId: quest.id, rewardTitle: template.reward.title },
          })
        } catch (rewardError) {
          perQuestErrors.push({
            questIndex: qi + 1,
            questTitle: template.title,
            questType: template.questType,
            stage: 'reward',
            error: rewardError.message || String(rewardError),
            code: rewardError.code || null,
          })
        }
      } catch (questError) {
        perQuestErrors.push({
          questIndex: qi + 1,
          questTitle: template.title,
          questType: template.questType,
          stage: 'quest',
          error: questError.message || String(questError),
          code: questError.code || null,
        })
        console.error(`[SeedQuests] Quest ${qi + 1}/${QUEST_TEMPLATES.length} for ${businessName} FAILED:`, questError)
      }
    }

    if (questsCreatedForThisBusiness > 0) {
      result.businessesSeededList.push({
        businessId: String(business.id),
        businessName: business.name,
        questsCreated: questsCreatedForThisBusiness,
        rewardsCreated: rewardsCreatedForThisBusiness,
        questErrors: perQuestErrors,
      })
      result.businessesSeeded++
    }

    if (perQuestErrors.length > 0) {
      result.errors.push({
        businessId: String(business.id),
        businessName: business.name,
        error: `${perQuestErrors.length} of ${QUEST_TEMPLATES.length} quests failed`,
        details: perQuestErrors,
      })
    }

    result.questsCreated += questsCreatedForThisBusiness
    result.rewardsCreated += rewardsCreatedForThisBusiness
  }

  await logAudit({
    action: 'seed_sample_owner_quests_all_businesses',
    targetType: 'ownerQuests',
    targetId: 'batch',
    adminUid: user.uid,
    adminEmail: user.email,
    meta: {
      businessesScanned: result.businessesScanned,
      businessesSeeded: result.businessesSeeded,
      businessesSkipped: result.businessesSkipped.length,
      questsCreated: result.questsCreated,
      rewardsCreated: result.rewardsCreated,
      errors: result.errors.length,
    },
  })

  return result
}

export async function deleteAllSeededQuestsAndRewards() {
  const user = auth.currentUser
  if (!user) throw new Error('Must be signed in')

  const questsSnap = await getDocs(collection(db, 'ownerQuests'))
  const rewardsSnap = await getDocs(collection(db, 'businessQuestRewards'))

  let deletedQuests = 0
  let deletedRewards = 0

  for (const docSnap of questsSnap.docs) {
    try {
      await deleteDoc(doc(db, 'ownerQuests', String(docSnap.id)))
      deletedQuests++
    } catch (e) {
      console.error('[SeedQuests] Failed to delete quest', docSnap.id, e)
    }
  }

  for (const docSnap of rewardsSnap.docs) {
    try {
      await deleteDoc(doc(db, 'businessQuestRewards', String(docSnap.id)))
      deletedRewards++
    } catch (e) {
      console.error('[SeedQuests] Failed to delete reward', docSnap.id, e)
    }
  }

  await logAudit({
    action: 'delete_all_seeded_quests',
    targetType: 'ownerQuests',
    targetId: 'batch',
    adminUid: user.uid,
    adminEmail: user.email,
    meta: { deletedQuests, deletedRewards },
  })

  return { deletedQuests, deletedRewards }
}

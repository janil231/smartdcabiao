import { collection, getDocs, query, where, addDoc, doc, deleteDoc, serverTimestamp, Timestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { auth } from '../lib/firebase'
import { listBusinesses, isStaticBusiness } from './businesses.service'
import { createOwnerQuest } from './ownerQuests.service'
import { sanitizeForFirestore } from '../utils/firestoreSanitize'
import { logAudit } from './audit.service'
import { inferQuestTags } from '../utils/tagMapping'

const OWNER_QUEST_TEMPLATES = [
  { questType: 'visit', title: 'Discover Our Spot', description: 'Visit us and explore what makes our business special. Take a photo with our staff!', reward: '5% off your next visit', duration: 30 },
  { questType: 'visit', title: 'First-Time Visitor Welcome', description: 'New to our place? Drop by and enjoy a complimentary welcome treat.', reward: 'Free welcome drink/snack', duration: 15 },
  { questType: 'visit', title: 'Loyalty Check-In', description: 'Visit us once a week for a month and earn a special loyalty reward.', reward: '20% off your 4th visit', duration: 20 },
  { questType: 'buy', title: 'Support Local — Big Spender', description: 'Make a substantial purchase (minimum ₱500) to strongly support this local business.', reward: '₱100 off items', duration: null, minimumPurchase: 500 },
  { questType: 'buy', title: 'Quick Treat Quest', description: 'Try our most popular item! Small purchase, big experience.', reward: 'Free upgrade or topping', duration: null, minimumPurchase: 100 },
  { questType: 'buy', title: 'Family Bundle Buyer', description: 'Buy a family-sized order to share the love.', reward: '15% off bundle', duration: null, minimumPurchase: 800 },
  { questType: 'buy', title: 'Try Something New', description: 'Try a featured item from this business. Staff will give you a daily code to enter to verify.', reward: 'Free Complimentary Item', duration: null, minimumPurchase: 200 },
  { questType: 'visit', title: 'Stay & Experience', description: 'Spend at least 30 minutes here to truly experience what we offer. Perfect for slow-paced exploration.', reward: '15% off items', duration: 30 },
  { questType: 'buy', title: 'Bring a Friend', description: 'Bring a friend who has never visited before and both enjoy a discount.', reward: 'Buy 1 get 1 50% off', duration: null, minimumPurchase: 300 },
  { questType: 'visit', title: 'Photo Op Quest', description: 'Take a selfie at our signature spot and tag us on social media.', reward: 'Free small item', duration: 10 },
]

const REWARD_META = [
  { type: 'discount_percent', value: 5, itemName: '' },
  { type: 'free_item', value: 0, itemName: 'Welcome Drink/Snack' },
  { type: 'discount_percent', value: 20, itemName: '' },
  { type: 'discount_fixed', value: 100, itemName: '' },
  { type: 'free_item', value: 0, itemName: 'Free Upgrade or Topping' },
  { type: 'discount_percent', value: 15, itemName: '' },
  { type: 'free_item', value: 0, itemName: 'Complimentary Item' },
  { type: 'discount_percent', value: 15, itemName: '' },
  { type: 'discount_percent', value: 50, itemName: '' },
  { type: 'free_item', value: 0, itemName: 'Free Small Item' },
]

const REWARD_DETAILS = [
  { title: '5% Off Your Next Visit', description: 'Save 5% on your next visit to this business', terms: 'Valid for 90 days. One redemption per customer. Cannot be combined with other offers.' },
  { title: 'Free Welcome Drink/Snack', description: 'Enjoy a complimentary welcome drink or snack on us', terms: 'One per customer. Available with any visit.' },
  { title: '20% Off Your 4th Visit', description: 'Get 20% off on your 4th visit as a loyalty reward', terms: 'Valid for 90 days. Must complete 3 prior visits. Cannot be combined.' },
  { title: '₱100 Off Items', description: 'Get ₱100 off on your next purchase at this business', terms: 'Valid for 90 days. Minimum ₱500 purchase. One redemption per customer.' },
  { title: 'Free Upgrade or Topping', description: 'Upgrade your order or add a topping for free', terms: 'One per visit. Subject to availability.' },
  { title: '15% Off Bundle', description: 'Save 15% on family-sized bundle orders', terms: 'Valid for 90 days. Minimum ₱800 purchase. One redemption per customer.' },
  { title: 'Free Complimentary Item', description: 'Redeem for one complimentary item from this business', terms: 'Valid for 90 days. Subject to item availability. One redemption per customer.' },
  { title: '15% Off Items', description: 'Get 15% off your next purchase at this business', terms: 'Valid for 90 days. One redemption per customer. Cannot be combined.' },
  { title: 'Buy 1 Get 1 50% Off', description: 'Buy one item and get a second one at 50% off', terms: 'Equal or lesser value. One per visit.' },
  { title: 'Free Small Item', description: 'Get a complimentary small item from this business', terms: 'One per customer. Available with any visit.' },
]

function getQuestsForBusiness(business, businessIndex) {
  const startIdx = (businessIndex * 3) % OWNER_QUEST_TEMPLATES.length
  const selected = []
  for (let i = 0; i < 5; i++) {
    selected.push(OWNER_QUEST_TEMPLATES[(startIdx + i) % OWNER_QUEST_TEMPLATES.length])
  }
  return selected
}

function getRewardType(index, businessIndex) {
  const globalIdx = (businessIndex * 3 + index) % REWARD_META.length
  return REWARD_META[globalIdx].type || 'discount_percent'
}

function getRewardValue(index, businessIndex) {
  const globalIdx = (businessIndex * 3 + index) % REWARD_META.length
  return REWARD_META[globalIdx].value || 0
}

function getRewardItemName(index, businessIndex) {
  const globalIdx = (businessIndex * 3 + index) % REWARD_META.length
  return REWARD_META[globalIdx].itemName || ''
}

function getRewardDetails(index, businessIndex) {
  const globalIdx = (businessIndex * 3 + index) % REWARD_DETAILS.length
  return REWARD_DETAILS[globalIdx]
}

function randomDaysAgo(maxDays = 90) {
  const ms = Math.floor(Math.random() * maxDays * 24 * 60 * 60 * 1000)
  return new Date(Date.now() - ms)
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

    const templatesForBusiness = getQuestsForBusiness(business, bi)

    const perQuestErrors = []
    let questsCreatedForThisBusiness = 0
    let rewardsCreatedForThisBusiness = 0

    for (let qi = 0; qi < templatesForBusiness.length; qi++) {
      const template = templatesForBusiness[qi]
      const createdAt = randomDaysAgo(90)

      if (onProgress) {
        onProgress({
          businessIndex: bi + 1,
          totalBusinesses: realBusinesses.length,
          businessName,
          questIndex: qi + 1,
          totalQuests: templatesForBusiness.length,
        })
      }

      try {
        const questForTags = { questType: template.questType, category: template.questType, impact: null }
        const questTags = inferQuestTags(questForTags, business)

        const rewardMeta = getRewardDetails(qi, bi)

        const questData = sanitizeForFirestore({
          title: template.title,
          description: template.description,
          questType: template.questType,
          requiredDurationMinutes: template.duration || 0,
          verificationMethod: template.questType === 'visit' ? 'location' : 'qr',
          rewardType: getRewardType(qi, bi),
          rewardValue: getRewardValue(qi, bi),
          rewardItemName: getRewardItemName(qi, bi),
          isActive: true,
          buyVerificationMethod: template.questType === 'buy' ? 'qr' : null,
          minimumPurchase: template.minimumPurchase || 0,
          quantityRequired: 1,
          itemDetails: template.questType === 'buy' ? (template.description || null) : null,
          conditions: template.questType === 'buy' ? (`Minimum ₱${template.minimumPurchase || 100} purchase required.`) : null,
          autoRotateDaily: template.questType === 'buy' ? false : null,
          itemPhotoUrl: null,
          questInstructions: template.questType === 'visit' ? (`Spend at least ${template.duration || 15} minutes here.`) : null,
          tags: questTags,
          createdAt: Timestamp.fromDate(createdAt),
          updatedAt: Timestamp.fromDate(createdAt),
          _seeded: true,
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
            rewardTitle: rewardMeta.title,
            rewardDescription: rewardMeta.description,
            rewardTerms: rewardMeta.terms,
            stockTotal: 50,
            stockRemaining: 50,
            expiresAt: Timestamp.fromDate(new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)),
            isActive: true,
            createdAt: Timestamp.fromDate(createdAt),
            createdBy: user.uid,
            createdByEmail: user.email,
            _seeded: true,
          })

          const rewardRef = await addDoc(collection(db, 'businessQuestRewards'), rewardPayload)
          rewardsCreatedForThisBusiness++

          await logAudit({
            action: 'seed_sample_owner_reward',
            targetType: 'businessQuestRewards',
            targetId: rewardRef.id,
            adminUid: user.uid,
            adminEmail: user.email,
            meta: { businessId, businessName, questId: quest.id, rewardTitle: rewardMeta.title },
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
        console.error(`[SeedQuests] Quest ${qi + 1}/${templatesForBusiness.length} for ${businessName} FAILED:`, questError)
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
        error: `${perQuestErrors.length} of ${templatesForBusiness.length} quests failed`,
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

  const questsQuery = query(collection(db, 'ownerQuests'), where('_seeded', '==', true))
  const rewardsQuery = query(collection(db, 'businessQuestRewards'), where('_seeded', '==', true))

  const questsSnap = await getDocs(questsQuery)
  const rewardsSnap = await getDocs(rewardsQuery)

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

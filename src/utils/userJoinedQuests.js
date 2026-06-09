import { getUserParticipations } from '../services/participations.service'
import { getUserOwnerQuestParticipations } from '../services/ownerQuests.service'

export async function getUserJoinedQuestIds(uid) {
  if (!uid) return { lguIds: new Set(), ownerIds: new Set() }

  try {
    const [lguParticipations, ownerParticipations] = await Promise.all([
      getUserParticipations(uid).catch(() => []),
      getUserOwnerQuestParticipations(uid).catch(() => []),
    ])

    const activeStatuses = ['joined', 'active', 'paused', 'pending', 'completed']

    const lguIds = new Set(
      lguParticipations
        .filter(p => activeStatuses.includes(p.status))
        .map(p => p.questId)
    )

    const ownerIds = new Set(
      ownerParticipations
        .filter(p => activeStatuses.includes(p.status))
        .map(p => p.questId)
    )

    return { lguIds, ownerIds }
  } catch (err) {
    console.warn('[getUserJoinedQuestIds] Failed:', err)
    return { lguIds: new Set(), ownerIds: new Set() }
  }
}

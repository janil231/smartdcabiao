/**
 * Quest capacity / reservedCount helpers.
 * reservedCount in Firestore can drift above capacity; use clamped display and
 * count active "joined" participations for join eligibility.
 */
export function getQuestSlotInfo(quest) {
  const capacity = Math.max(0, Number(quest?.capacity) || 0)
  const reserved = Math.max(0, Number(quest?.reservedCount) || 0)
  const slotsLeft = Math.max(0, capacity - reserved)
  const isFull = capacity > 0 && reserved >= capacity

  return { capacity, reserved, slotsLeft, isFull }
}

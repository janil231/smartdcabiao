export function formatRewardLabel(reward) {
  if (!reward || typeof reward !== 'object') return 'Reward available'

  const type = reward.rewardType
  const itemName = (reward.rewardItemName || '').trim()

  if (type === 'other') {
    const desc = (reward.rewardDescription || '').trim()
    return desc || 'Special reward'
  }

  if (type === 'discount_percent') {
    const value = Number(reward.rewardValue) || 0
    return itemName ? `${value}% off ${itemName}` : `${value}% off`
  }

  if (type === 'discount_fixed') {
    const value = Number(reward.rewardValue) || 0
    return itemName ? `₱${value} off ${itemName}` : `₱${value} off`
  }

  if (type === 'free_item') {
    return `Free ${itemName || 'item'}`
  }

  if (type === 'bogo') {
    return `Buy 1 Get 1 on ${itemName || 'items'}`
  }

  const desc = (reward.rewardDescription || '').trim()
  if (desc) return desc
  if (itemName) return itemName

  return 'Reward available'
}

export function formatRewardLabelShort(reward, maxLen = 40) {
  const full = formatRewardLabel(reward)
  if (full.length <= maxLen) return full
  return full.slice(0, maxLen - 1).trimEnd() + '\u2026'
}

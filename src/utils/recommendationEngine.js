export function scoreByInterestMatch(userInterests, itemTags) {
  if (!userInterests || !Array.isArray(userInterests) || userInterests.length === 0) return 0
  if (!itemTags || !Array.isArray(itemTags)) return 0

  const interestSet = new Set(userInterests.map(t => t.toLowerCase().trim()))
  let matchCount = 0
  for (const tag of itemTags) {
    if (interestSet.has(tag.toLowerCase().trim())) {
      matchCount++
    }
  }
  return matchCount
}

export function sortByInterestScore(items, userInterests) {
  if (!items || !Array.isArray(items)) return []
  if (!userInterests || !Array.isArray(userInterests) || userInterests.length === 0) {
    return [...items]
  }

  const scored = items.map(item => ({
    item,
    score: scoreByInterestMatch(userInterests, item.tags || []),
  }))

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    return 0
  })

  return scored.map(s => s.item)
}

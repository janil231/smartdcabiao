/**
 * Centralized rewards / participation data (mock).
 * Ties community actions → city improvement → local business support.
 * Replace with API when backend is ready.
 */

export const REWARD_STATUS = {
  points: 'points',
  voucher: 'voucher',
  completed: 'completed',
}

export const participation = [
  {
    id: 1,
    activityName: 'Cabiao Riverbank Clean-up Drive',
    date: 'Mar 15, 2025',
    rewardStatus: REWARD_STATUS.points,
    rewardLabel: '50 points earned',
    rewardDetail: 'Earned for participating in the clean-up drive.',
  },
  {
    id: 2,
    activityName: 'Community Tree Planting',
    date: 'Mar 22, 2025',
    rewardStatus: REWARD_STATUS.voucher,
    rewardLabel: 'Voucher unlocked',
    rewardDetail: '10% off at Heritage Eatery — support a local business.',
  },
  {
    id: 3,
    activityName: 'Cabiao Town Fiesta',
    date: 'Apr 5–7, 2025',
    rewardStatus: REWARD_STATUS.points,
    rewardLabel: '75 points earned',
    rewardDetail: 'Participated in town fiesta activities.',
  },
  {
    id: 4,
    activityName: 'Barangay Polilio Coastal Clean-up',
    date: 'Apr 12, 2025',
    rewardStatus: REWARD_STATUS.voucher,
    rewardLabel: 'Voucher unlocked',
    rewardDetail: 'Free merienda at Kusina ni Lola (one-time).',
  },
  {
    id: 5,
    activityName: 'School Garden Tree Planting',
    date: 'Apr 19, 2025',
    rewardStatus: REWARD_STATUS.completed,
    rewardLabel: 'Completed',
    rewardDetail: 'Thank you for helping green Cabiao.',
  },
]

/** Mock totals for summary. Backend: replace with user-specific totals. */
export const rewardTotals = {
  totalPoints: 200,
  voucherCount: 2,
}

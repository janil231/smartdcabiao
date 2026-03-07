import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { useAuth } from '../contexts/AuthContext'
import { isAdmin } from '../services/adminRole.service'
import { 
  listSubmissions, 
  approveSubmissionAndPublish, 
  rejectSubmission,
  requestMoreInfoSubmission 
} from '../services/adminSubmissions.service'
import { 
  listReports, 
  markReportInProgress, 
  markReportResolved 
} from '../services/adminReports.service'
import { 
  getActiveSeason, 
  listSeasons, 
  createSeason, 
  activateSeason, 
  closeSeason 
} from '../services/seasons.service'
import { 
  listActiveQuests, 
  listQuestsBySeason,
  createQuest,
  updateQuest,
  activateQuest,
  deactivateQuest,
  seedSampleQuestsForActiveSeason
} from '../services/quests.service'
import { getQuestParticipations, adminMarkCompleted, expireAllStaleParticipations } from '../services/participations.service'
import { listPendingReviews, setReviewStatus } from '../services/reviews.service'
import { listTopByPoints, listTopByImpact, IMPACT_UNITS } from '../services/leaderboard.service'
import { isWithinCabiaoBounds, CABIAO_BOUNDS } from '../constants/cabiaoGeo'
import { listSeasonImpact, sumImpactByUnit } from '../services/impactLedger.service'
import { seedSampleVouchersForActiveSeason } from '../services/vouchers.service'
import { listSeasonRedemptions, adminMarkVoucherUsed } from '../services/voucherRedemptions.service'

const TABS = {
  SUBMISSIONS: 'submissions',
  REPORTS: 'reports',
  REVIEWS: 'reviews',
  SEASONS: 'seasons',
  QUESTS: 'quests',
  QUEST_VERIFICATIONS: 'quest_verifications',
  VOUCHERS: 'vouchers',
  PLACES: 'places'
}

function StatusBadge({ status }) {
  const styles = {
    new: 'bg-blue-100 text-blue-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    needs_info: 'bg-yellow-100 text-yellow-800',
    in_progress: 'bg-orange-100 text-orange-800',
    resolved: 'bg-green-100 text-green-800'
  }
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
      {status?.replace('_', ' ').toUpperCase() || 'UNKNOWN'}
    </span>
  )
}

function SubmissionModal({ submission, onClose, onApprove, onReject, onNeedsInfo, isLoading }) {
  if (!submission) return null

  const position = submission.position
  let isOutOfBounds = false
  if (position) {
    const [lat, lng] = Array.isArray(position) ? position : [position.lat, position.lng]
    isOutOfBounds = lat && lng && !isWithinCabiaoBounds(lat, lng)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-bold text-gray-900">{submission.name}</h2>
              <div className="flex gap-2 mt-2">
                <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                  {submission.entryType?.toUpperCase() || 'BUSINESS'}
                </span>
                <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                  {submission.category?.toUpperCase() || 'OTHER'}
                </span>
                <StatusBadge status={submission.status} />
              </div>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {submission.barangay && (
            <div>
              <p className="text-sm font-medium text-gray-500">Barangay</p>
              <p className="text-gray-900">{submission.barangay}</p>
            </div>
          )}
          {submission.address && (
            <div>
              <p className="text-sm font-medium text-gray-500">Address</p>
              <p className="text-gray-900">{submission.address}</p>
            </div>
          )}
          <div>
            <p className="text-sm font-medium text-gray-500">Description</p>
            <p className="text-gray-900">{submission.description}</p>
          </div>
          {submission.contact && (
            <div>
              <p className="text-sm font-medium text-gray-500">Contact</p>
              <p className="text-gray-900">{submission.contact}</p>
            </div>
          )}
          {submission.website && (
            <div>
              <p className="text-sm font-medium text-gray-500">Website</p>
              <a href={submission.website} target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline">
                {submission.website}
              </a>
            </div>
          )}
          {submission.images?.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-500 mb-2">Images ({submission.images.length})</p>
              <div className="flex flex-wrap gap-2">
                {submission.images.map((img, i) => (
                  <a key={i} href={img} target="_blank" rel="noopener noreferrer" className="text-sm text-emerald-600 hover:underline">
                    Image {i + 1}
                  </a>
                ))}
              </div>
            </div>
          )}
          {position && (
            <div>
              <p className="text-sm font-medium text-gray-500">Location</p>
              <p className="text-gray-900">
                Lat: {Array.isArray(position) ? position[0] : position.lat}, 
                Lng: {Array.isArray(position) ? position[1] : position.lng}
              </p>
              {isOutOfBounds && (
                <p className="text-red-600 text-sm mt-1">
                  Warning: Location is outside Cabiao bounds!
                </p>
              )}
            </div>
          )}
          <div>
            <p className="text-sm font-medium text-gray-500">Submitted</p>
            <p className="text-gray-900">
              {submission.createdAt ? new Date(submission.createdAt).toLocaleString() : 'Unknown'}
              {submission.createdByEmail && ` by ${submission.createdByEmail}`}
            </p>
          </div>
          {submission.notes && (
            <div>
              <p className="text-sm font-medium text-gray-500">Notes</p>
              <p className="text-gray-900">{submission.notes}</p>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 bg-gray-50 flex flex-wrap gap-3">
          <button
            onClick={onApprove}
            disabled={isLoading || isOutOfBounds}
            className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
          >
            {isLoading ? 'Processing...' : 'Approve & Publish'}
          </button>
          <button
            onClick={onNeedsInfo}
            disabled={isLoading}
            className="flex-1 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:bg-gray-300 font-medium"
          >
            Needs More Info
          </button>
          <button
            onClick={onReject}
            disabled={isLoading}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300 font-medium"
          >
            Reject
          </button>
        </div>
      </div>
    </div>
  )
}

function ReportModal({ report, onClose, onMarkInProgress, onMarkResolved, isLoading }) {
  if (!report) return null

  const targetLink = report.targetType === 'business' 
    ? `/businesses/${report.targetId}` 
    : `/destinations/${report.targetId}`

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Report Details</h2>
              <div className="flex gap-2 mt-2">
                <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                  {report.targetType?.toUpperCase() || 'UNKNOWN'}
                </span>
                <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-medium">
                  {report.issueType?.toUpperCase() || 'ISSUE'}
                </span>
                <StatusBadge status={report.status} />
              </div>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <p className="text-sm font-medium text-gray-500">Issue Type</p>
            <p className="text-gray-900">{report.issueType}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Message</p>
            <p className="text-gray-900">{report.message}</p>
          </div>
          {report.targetId && (
            <div>
              <p className="text-sm font-medium text-gray-500">Target ID</p>
              <Link to={targetLink} className="text-emerald-600 hover:underline">
                {report.targetId}
              </Link>
            </div>
          )}
          {report.pageUrl && (
            <div>
              <p className="text-sm font-medium text-gray-500">Page URL</p>
              <a href={report.pageUrl} target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline">
                {report.pageUrl}
              </a>
            </div>
          )}
          <div>
            <p className="text-sm font-medium text-gray-500">Reported</p>
            <p className="text-gray-900">
              {report.createdAt ? new Date(report.createdAt).toLocaleString() : 'Unknown'}
            </p>
          </div>
          {report.reporterEmail && (
            <div>
              <p className="text-sm font-medium text-gray-500">Reporter</p>
              <p className="text-gray-900">{report.reporterEmail}</p>
            </div>
          )}
          {report.notes && (
            <div>
              <p className="text-sm font-medium text-gray-500">Review Notes</p>
              <p className="text-gray-900">{report.notes}</p>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 bg-gray-50 flex flex-wrap gap-3">
          {report.status === 'new' && (
            <button
              onClick={onMarkInProgress}
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:bg-gray-300 font-medium"
            >
              Mark In Progress
            </button>
          )}
          {report.status !== 'resolved' && (
            <button
              onClick={onMarkResolved}
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 font-medium"
            >
              Mark Resolved
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function ReviewModal({ review, onClose, onApprove, onReject, isLoading }) {
  if (!review) return null

  const targetLink = review.targetType === 'business' 
    ? `/businesses/${review.targetId}` 
    : `/destinations/${review.targetId}`

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Review Details</h2>
              <div className="flex gap-2 mt-2">
                <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                  {review.targetType?.toUpperCase() || 'BUSINESS'}
                </span>
                <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-medium flex items-center gap-1">
                  <span>★</span> {review.rating}/5
                </span>
              </div>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <p className="text-sm font-medium text-gray-500">Reviewer</p>
            <p className="text-gray-900">{review.userDisplayName || review.userEmail || 'Anonymous'}</p>
          </div>
          {review.title && (
            <div>
              <p className="text-sm font-medium text-gray-500">Title</p>
              <p className="text-gray-900 font-medium">{review.title}</p>
            </div>
          )}
          <div>
            <p className="text-sm font-medium text-gray-500">Review</p>
            <p className="text-gray-900">{review.text}</p>
          </div>
          {review.sustainabilityNote && (
            <div>
              <p className="text-sm font-medium text-gray-500">Sustainability Note</p>
              <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-lg">
                <p className="text-emerald-800">{review.sustainabilityNote}</p>
              </div>
            </div>
          )}
          {review.targetId && (
            <div>
              <p className="text-sm font-medium text-gray-500">Target</p>
              <Link to={targetLink} className="text-emerald-600 hover:underline">
                View {review.targetType}: {review.targetId}
              </Link>
            </div>
          )}
          <div>
            <p className="text-sm font-medium text-gray-500">Submitted</p>
            <p className="text-gray-900">
              {review.createdAt ? new Date(review.createdAt).toLocaleString() : 'Unknown'}
            </p>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 bg-gray-50 flex flex-wrap gap-3">
          <button
            onClick={onApprove}
            disabled={isLoading}
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 font-medium"
          >
            {isLoading ? 'Processing...' : 'Approve'}
          </button>
          <button
            onClick={onReject}
            disabled={isLoading}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300 font-medium"
          >
            {isLoading ? 'Processing...' : 'Reject'}
          </button>
        </div>
      </div>
    </div>
  )
}

function QuestVerificationModal({ participation, quest, onClose, onMarkCompleted, isLoading }) {
  if (!participation) return null

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A'
    return new Date(dateStr).toLocaleString()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Quest Participation</h2>
              <div className="flex gap-2 mt-2">
                <span className="px-2 py-1 bg-emerald-100 text-emerald-800 rounded text-xs font-medium">
                  {quest?.title || 'Quest'}
                </span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  participation.status === 'joined' ? 'bg-blue-100 text-blue-800' :
                  participation.status === 'completed' ? 'bg-green-100 text-green-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {participation.status?.toUpperCase() || 'JOINED'}
                </span>
              </div>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <p className="text-sm font-medium text-gray-500">User ID</p>
            <p className="text-gray-900 font-mono text-sm">{participation.uid}</p>
          </div>
          {participation.userEmail && (
            <div>
              <p className="text-sm font-medium text-gray-500">Email</p>
              <p className="text-gray-900">{participation.userEmail}</p>
            </div>
          )}
          <div>
            <p className="text-sm font-medium text-gray-500">Points</p>
            <p className="text-gray-900">{quest?.points || 0} pts</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Joined At</p>
            <p className="text-gray-900">{formatDate(participation.joinedAt)}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Expires At</p>
            <p className="text-gray-900">{formatDate(participation.expiresAt)}</p>
          </div>
          {participation.completedAt && (
            <div>
              <p className="text-sm font-medium text-gray-500">Completed At</p>
              <p className="text-gray-900">{formatDate(participation.completedAt)}</p>
            </div>
          )}
          <div>
            <p className="text-sm font-medium text-gray-500">Reward Status</p>
            <p className={`font-medium ${
              participation.rewardStatus === 'released' ? 'text-green-600' :
              participation.rewardStatus === 'pending' ? 'text-yellow-600' :
              'text-gray-600'
            }`}>
              {participation.rewardStatus?.toUpperCase() || 'PENDING'}
            </p>
          </div>
        </div>

        {participation.status === 'joined' && (
          <div className="p-6 border-t border-gray-200 bg-gray-50 flex flex-wrap gap-3">
            <button
              onClick={onMarkCompleted}
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:bg-gray-300 font-medium"
            >
              {isLoading ? 'Processing...' : 'Mark Completed & Release Reward'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function SeasonFormModal({ onClose, onSubmit, isLoading }) {
  const [name, setName] = useState('')
  const [startAt, setStartAt] = useState('')
  const [endAt, setEndAt] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!name || !startAt || !endAt) return
    onSubmit({ name, startAt, endAt })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl max-w-md w-full" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Create New Season</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Season Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
            <input
              type="date"
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date *</label>
            <input
              type="date"
              value={endAt}
              onChange={(e) => setEndAt(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              required
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !name || !startAt || !endAt}
              className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:bg-gray-300"
            >
              {isLoading ? 'Creating...' : 'Create Season'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function QuestFormModal({ quest, onClose, onSubmit, isLoading }) {
  const [title, setTitle] = useState(quest?.title || '')
  const [description, setDescription] = useState(quest?.description || '')
  const [category, setCategory] = useState(quest?.category || 'event')
  const [points, setPoints] = useState(quest?.points || 50)
  const [capacity, setCapacity] = useState(quest?.capacity || 20)
  const [startAt, setStartAt] = useState(quest?.startAt ? quest.startAt.split('T')[0] : '')
  const [endAt, setEndAt] = useState(quest?.endAt ? quest.endAt.split('T')[0] : '')
  const [gracePeriodHours, setGracePeriodHours] = useState(quest?.gracePeriodHours || 24)
  const [capacityError, setCapacityError] = useState('')
  const [impactUnit, setImpactUnit] = useState(quest?.impact?.unit || '')
  const [impactAmount, setImpactAmount] = useState(quest?.impact?.amountPerCompletion || '')
  const [impactLabel, setImpactLabel] = useState(quest?.impact?.label || '')

  const reservedCount = quest?.reservedCount || 0

  const handleCapacityChange = (e) => {
    const value = e.target.value
    setCapacity(value)
    
    if (value && reservedCount > 0) {
      const capacityNum = parseInt(value, 10)
      if (capacityNum < reservedCount) {
        setCapacityError(`Capacity cannot be lower than reserved slots (${reservedCount})`)
      } else {
        setCapacityError('')
      }
    } else {
      setCapacityError('')
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!title || !description || !startAt || !endAt) return
    
    if (capacityError) return
    
    const impact = impactUnit && impactAmount && impactLabel
      ? {
          unit: impactUnit,
          amountPerCompletion: Number(impactAmount),
          label: impactLabel,
        }
      : null

    onSubmit({
      title,
      description,
      category,
      points: parseInt(points, 10),
      capacity: parseInt(capacity, 10),
      startAt: new Date(startAt).toISOString(),
      endAt: new Date(endAt).toISOString(),
      gracePeriodHours: parseInt(gracePeriodHours, 10),
      impact,
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">{quest ? 'Edit Quest' : 'Create New Quest'}</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              rows={3}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="event">Event</option>
              <option value="cleanup">Clean-up</option>
              <option value="treePlanting">Tree Planting</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Points *</label>
              <input
                type="number"
                value={points}
                onChange={(e) => setPoints(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                min="1"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Capacity *
                {quest && reservedCount > 0 && (
                  <span className="ml-1 text-xs text-gray-500">(reserved: {reservedCount})</span>
                )}
              </label>
              <input
                type="number"
                value={capacity}
                onChange={handleCapacityChange}
                className={`w-full px-3 py-2 border rounded-lg ${capacityError ? 'border-red-500' : 'border-gray-300'}`}
                min="1"
                required
              />
              {capacityError && (
                <p className="text-xs text-red-600 mt-1">{capacityError}</p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
              <input
                type="date"
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date *</label>
              <input
                type="date"
                value={endAt}
                onChange={(e) => setEndAt(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Grace Period (hours)</label>
            <input
              type="number"
              value={gracePeriodHours}
              onChange={(e) => setGracePeriodHours(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              min="1"
            />
          </div>
          <div className="border-t border-gray-200 pt-4 mt-2">
            <p className="text-sm font-medium text-gray-900 mb-1">Sustainability Impact (optional)</p>
            <p className="text-xs text-gray-500 mb-3">
              Define the environmental impact for each completed participation in this quest.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Unit</label>
                <select
                  value={impactUnit}
                  onChange={(e) => setImpactUnit(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="">Select unit</option>
                  <option value="kg_trash">Kg of trash</option>
                  <option value="trees">Trees</option>
                  <option value="hours">Volunteer hours</option>
                  <option value="kg_plastic">Kg of plastic</option>
                  <option value="co2_kg">Kg CO₂</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Amount per completion</label>
                <input
                  type="number"
                  value={impactAmount}
                  onChange={(e) => setImpactAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  min="0"
                  step="0.1"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Label</label>
                <input
                  type="text"
                  value={impactLabel}
                  onChange={(e) => setImpactLabel(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  placeholder="e.g. Kg of waste collected"
                />
              </div>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !title || !description || !startAt || !endAt || !!capacityError}
              className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:bg-gray-300"
            >
              {isLoading ? 'Saving...' : quest ? 'Update Quest' : 'Create Quest'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function NotAuthorized() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="flex-1 flex items-center justify-center px-4 py-20">
        <div className="text-center max-w-md">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-6">
            You are not authorized to access the LGU Dashboard. Please contact your administrator.
          </p>
          <Link
            to="/"
            className="inline-flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium"
          >
            Back to Home
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  )
}

function TabButton({ active, onClick, count, children }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-3 px-4 font-medium text-sm rounded-lg transition-colors ${
        active 
          ? 'bg-emerald-600 text-white' 
          : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
      }`}
    >
      {children}
      {count !== undefined && (
        <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
          active ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-600'
        }`}>
          {count}
        </span>
      )}
    </button>
  )
}

export default function LGUDashboardPage() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState(TABS.SUBMISSIONS)
  const [submissions, setSubmissions] = useState([])
  const [reports, setReports] = useState([])
  const [seasons, setSeasons] = useState([])
  const [quests, setQuests] = useState([])
  const [activeSeason, setActiveSeason] = useState(null)
  const [selectedSeasonFilter, setSelectedSeasonFilter] = useState('')
  const [questParticipations, setQuestParticipations] = useState([])
  const [questDetails, setQuestDetails] = useState({})
  const [loading, setLoading] = useState(true)
  const [checkingAdmin, setCheckingAdmin] = useState(true)
  const [isUserAdmin, setIsUserAdmin] = useState(false)
  const [selectedSubmission, setSelectedSubmission] = useState(null)
  const [selectedReport, setSelectedReport] = useState(null)
  const [selectedReview, setSelectedReview] = useState(null)
  const [selectedParticipation, setSelectedParticipation] = useState(null)
  const [selectedQuest, setSelectedQuest] = useState(null)
  const [showSeasonModal, setShowSeasonModal] = useState(false)
  const [showQuestModal, setShowQuestModal] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [toast, setToast] = useState(null)
  const [expandedQuestStats, setExpandedQuestStats] = useState({})
  const [loadingQuestStats, setLoadingQuestStats] = useState(null)
  const [seasonImpactTotals, setSeasonImpactTotals] = useState({})
  const [questImpactTotals, setQuestImpactTotals] = useState({})
  const [leaderboardTab, setLeaderboardTab] = useState('points')
  const [leaderboardUnit, setLeaderboardUnit] = useState('trees')
  const [leaderboardData, setLeaderboardData] = useState([])
  const [pendingReviews, setPendingReviews] = useState([])
  const [seasonRedemptions, setSeasonRedemptions] = useState([])
  const [redemptionStatusFilter, setRedemptionStatusFilter] = useState('all')
  const [markingVoucherUsedId, setMarkingVoucherUsedId] = useState(null)

  useEffect(() => {
    async function checkAdminStatus() {
      if (!user) {
        setCheckingAdmin(false)
        setIsUserAdmin(false)
        return
      }
      const adminStatus = await isAdmin(user.uid)
      setIsUserAdmin(adminStatus)
      setCheckingAdmin(false)
    }
    checkAdminStatus()
  }, [user])

  useEffect(() => {
    if (!user || !isUserAdmin) return

    async function fetchData() {
      setLoading(true)
      try {
        if (activeTab === TABS.SUBMISSIONS) {
          const data = await listSubmissions({ status: null })
          setSubmissions(data)
        } else if (activeTab === TABS.REPORTS) {
          const data = await listReports({ status: null })
          setReports(data)
        } else if (activeTab === TABS.REVIEWS) {
          const data = await listPendingReviews({ limit: 50 })
          setPendingReviews(data)
        } else if (activeTab === TABS.SEASONS) {
          const seasonList = await listSeasons()
          setSeasons(seasonList)
          const active = await getActiveSeason()
          setActiveSeason(active)
          if (active && !selectedSeasonFilter) {
            setSelectedSeasonFilter(active.id)
          }
        } else if (activeTab === TABS.QUESTS) {
          const seasonList = await listSeasons()
          setSeasons(seasonList)
          const active = await getActiveSeason()
          setActiveSeason(active)
          const filterId = selectedSeasonFilter || active?.id
          if (filterId) {
            const questList = await listQuestsBySeason(filterId)
            setQuests(questList)

            const impactEntries = await listSeasonImpact(filterId)
            const seasonTotals = sumImpactByUnit(impactEntries)
            const questTotals = {}

            impactEntries.forEach(entry => {
              if (!entry.questId || !entry.unit) return
              if (!questTotals[entry.questId]) {
                questTotals[entry.questId] = {
                  totalCompletions: 0,
                  byUnit: {},
                }
              }
              questTotals[entry.questId].totalCompletions += 1
              const amount = typeof entry.amount === 'number' ? entry.amount : 0
              if (!questTotals[entry.questId].byUnit[entry.unit]) {
                questTotals[entry.questId].byUnit[entry.unit] = 0
              }
              questTotals[entry.questId].byUnit[entry.unit] += amount
            })

            setSeasonImpactTotals(seasonTotals)
            setQuestImpactTotals(questTotals)
          } else {
            setQuests([])
            setSeasonImpactTotals({})
            setQuestImpactTotals({})
          }
        } else if (activeTab === TABS.QUEST_VERIFICATIONS) {
          const season = await getActiveSeason()
          if (season) {
            const quests = await listActiveQuests(season.id)
            const questTitles = {}
            quests.forEach(q => {
              questTitles[q.id] = q
            })
            setQuestDetails(questTitles)
            
            const allParticipations = []
            for (const quest of quests) {
              const participations = await getQuestParticipations(quest.id)
              allParticipations.push(...participations)
            }
            setQuestParticipations(allParticipations)
          } else {
            setQuestParticipations([])
          }
        } else if (activeTab === TABS.VOUCHERS) {
          const active = await getActiveSeason()
          setActiveSeason(active)
          if (active) {
            const list = await listSeasonRedemptions(active.id, 50)
            setSeasonRedemptions(list)
          } else {
            setSeasonRedemptions([])
          }
        }
      } catch {
        // Error loading data - handled silently
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user, activeTab, isUserAdmin, selectedSeasonFilter])

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  async function loadData() {
    setLoading(true)
    try {
      if (activeTab === TABS.SUBMISSIONS) {
        const data = await listSubmissions({ status: null })
        setSubmissions(data)
      } else if (activeTab === TABS.REPORTS) {
        const data = await listReports({ status: null })
        setReports(data)
      } else if (activeTab === TABS.REVIEWS) {
        const data = await listPendingReviews({ limit: 50 })
        setPendingReviews(data)
      } else if (activeTab === TABS.SEASONS) {
        const seasonList = await listSeasons()
        setSeasons(seasonList)
        const active = await getActiveSeason()
        setActiveSeason(active)
        if (active && !selectedSeasonFilter) {
          setSelectedSeasonFilter(active.id)
        }
        if (active) {
          const lbData = await listTopByPoints(active.id, 10)
          setLeaderboardData(lbData)
        }
      } else if (activeTab === TABS.QUESTS) {
        const seasonList = await listSeasons()
        setSeasons(seasonList)
        const active = await getActiveSeason()
        setActiveSeason(active)
        const filterId = selectedSeasonFilter || active?.id
        if (filterId) {
          const questList = await listQuestsBySeason(filterId)
          setQuests(questList)

          const impactEntries = await listSeasonImpact(filterId)
          const seasonTotals = sumImpactByUnit(impactEntries)
          const questTotals = {}

          impactEntries.forEach(entry => {
            if (!entry.questId || !entry.unit) return
            if (!questTotals[entry.questId]) {
              questTotals[entry.questId] = {
                totalCompletions: 0,
                byUnit: {},
              }
            }
            questTotals[entry.questId].totalCompletions += 1
            const amount = typeof entry.amount === 'number' ? entry.amount : 0
            if (!questTotals[entry.questId].byUnit[entry.unit]) {
              questTotals[entry.questId].byUnit[entry.unit] = 0
            }
            questTotals[entry.questId].byUnit[entry.unit] += amount
          })

          setSeasonImpactTotals(seasonTotals)
          setQuestImpactTotals(questTotals)
        } else {
          setQuests([])
          setSeasonImpactTotals({})
          setQuestImpactTotals({})
        }
      } else if (activeTab === TABS.QUEST_VERIFICATIONS) {
        const season = await getActiveSeason()
        if (season) {
          const quests = await listActiveQuests(season.id)
          const questTitles = {}
          quests.forEach(q => {
            questTitles[q.id] = q
          })
          setQuestDetails(questTitles)
          
          const allParticipations = []
          for (const quest of quests) {
            const participations = await getQuestParticipations(quest.id)
            allParticipations.push(...participations)
          }
          setQuestParticipations(allParticipations)
        } else {
          setQuestParticipations([])
        }
      } else if (activeTab === TABS.VOUCHERS) {
        const active = await getActiveSeason()
        setActiveSeason(active)
        if (active) {
          const list = await listSeasonRedemptions(active.id, 50)
          setSeasonRedemptions(list)
        } else {
          setSeasonRedemptions([])
        }
      }
    } catch {
      // Error loading data - handled silently
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async () => {
    if (!selectedSubmission) return
    setActionLoading(true)
    try {
      const result = await approveSubmissionAndPublish(selectedSubmission.id, {
        reviewedBy: user?.uid,
        reviewedByEmail: user?.email
      })
      if (result.success) {
        showToast('Successfully published!')
        setSelectedSubmission(null)
        loadData()
      } else {
        showToast(result.error || 'Failed to publish', 'error')
      }
    } catch (error) {
      showToast(error.message, 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const handleReject = async () => {
    if (!selectedSubmission) return
    setActionLoading(true)
    try {
      const result = await rejectSubmission(selectedSubmission.id, {
        reviewedBy: user?.uid,
        reviewedByEmail: user?.email,
        notes: 'Rejected by admin'
      })
      if (result.success) {
        showToast('Submission rejected')
        setSelectedSubmission(null)
        loadData()
      } else {
        showToast(result.error || 'Failed to reject', 'error')
      }
    } catch (error) {
      showToast(error.message, 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const handleNeedsInfo = async () => {
    if (!selectedSubmission) return
    setActionLoading(true)
    try {
      const result = await requestMoreInfoSubmission(selectedSubmission.id, {
        reviewedBy: user?.uid,
        reviewedByEmail: user?.email,
        notes: 'Need more information'
      })
      if (result.success) {
        showToast('Marked as needs more info')
        setSelectedSubmission(null)
        loadData()
      } else {
        showToast(result.error || 'Failed', 'error')
      }
    } catch (error) {
      showToast(error.message, 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const handleMarkInProgress = async () => {
    if (!selectedReport) return
    setActionLoading(true)
    try {
      const result = await markReportInProgress(selectedReport.id, {
        reviewedBy: user?.uid,
        reviewedByEmail: user?.email
      })
      if (result.success) {
        showToast('Marked as in progress')
        setSelectedReport(null)
        loadData()
      } else {
        showToast(result.error || 'Failed', 'error')
      }
    } catch (error) {
      showToast(error.message, 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const handleMarkResolved = async () => {
    if (!selectedReport) return
    setActionLoading(true)
    try {
      const result = await markReportResolved(selectedReport.id, {
        reviewedBy: user?.uid,
        reviewedByEmail: user?.email
      })
      if (result.success) {
        showToast('Marked as resolved')
        setSelectedReport(null)
        loadData()
      } else {
        showToast(result.error || 'Failed', 'error')
      }
    } catch (error) {
      showToast(error.message, 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const handleApproveReview = async () => {
    if (!selectedReview) return
    setActionLoading(true)
    try {
      const result = await setReviewStatus({
        reviewId: selectedReview.id,
        status: 'approved',
        adminUser: { uid: user.uid, email: user.email }
      })
      if (result.success) {
        showToast('Review approved!')
        setSelectedReview(null)
        loadData()
      } else {
        showToast(result.error || 'Failed to approve', 'error')
      }
    } catch (error) {
      showToast(error.message, 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const handleRejectReview = async () => {
    if (!selectedReview) return
    setActionLoading(true)
    try {
      const result = await setReviewStatus({
        reviewId: selectedReview.id,
        status: 'rejected',
        adminUser: { uid: user.uid, email: user.email }
      })
      if (result.success) {
        showToast('Review rejected')
        setSelectedReview(null)
        loadData()
      } else {
        showToast(result.error || 'Failed to reject', 'error')
      }
    } catch (error) {
      showToast(error.message, 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const handleMarkQuestCompleted = async () => {
    if (!selectedParticipation) return
    setActionLoading(true)
    try {
      const result = await adminMarkCompleted({
        uid: selectedParticipation.uid,
        questId: selectedParticipation.questId,
        adminUser: { uid: user.uid, email: user.email }
      })
      if (result.success) {
        showToast('Quest marked as completed! Reward released.')
        setSelectedParticipation(null)
        loadData()
      } else {
        showToast(result.error || 'Failed to complete', 'error')
      }
    } catch (error) {
      showToast(error.message, 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const handleCreateSeason = async (formData) => {
    setActionLoading(true)
    try {
      await createSeason(formData, { uid: user.uid, email: user.email })
      showToast('Season created successfully!')
      setShowSeasonModal(false)
      loadData()
    } catch (error) {
      showToast(error.message, 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const handleActivateSeason = async (seasonId) => {
    setActionLoading(true)
    try {
      await activateSeason(seasonId, { uid: user.uid, email: user.email })
      showToast('Season activated!')
      loadData()
    } catch (error) {
      showToast(error.message, 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const handleCloseSeason = async (seasonId) => {
    setActionLoading(true)
    try {
      await closeSeason(seasonId, { uid: user.uid, email: user.email })
      showToast('Season closed!')
      loadData()
    } catch (error) {
      showToast(error.message, 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const handleCreateQuest = async (formData) => {
    setActionLoading(true)
    try {
      const seasonId = selectedSeasonFilter || activeSeason?.id
      if (!seasonId) {
        throw new Error('No active season selected')
      }
      await createQuest({ ...formData, seasonId }, { uid: user.uid, email: user.email })
      showToast('Quest created successfully!')
      setShowQuestModal(false)
      loadData()
    } catch (error) {
      showToast(error.message, 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const handleUpdateQuest = async (questId, formData) => {
    setActionLoading(true)
    try {
      await updateQuest(questId, formData, { uid: user.uid, email: user.email })
      showToast('Quest updated successfully!')
      setSelectedQuest(null)
      loadData()
    } catch (error) {
      showToast(error.message, 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const handleToggleQuestStatus = async (questId, currentStatus) => {
    setActionLoading(true)
    try {
      if (currentStatus === 'active') {
        await deactivateQuest(questId, { uid: user.uid, email: user.email })
        showToast('Quest deactivated!')
      } else {
        await activateQuest(questId, { uid: user.uid, email: user.email })
        showToast('Quest activated!')
      }
      loadData()
    } catch (error) {
      showToast(error.message, 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const [showSeedConfirm, setShowSeedConfirm] = useState(false)
  const [seedLoading, setSeedLoading] = useState(false)
  const [showSeedVouchersConfirm, setShowSeedVouchersConfirm] = useState(false)
  const [seedVouchersLoading, setSeedVouchersLoading] = useState(false)

  const handleSeedSampleQuests = async () => {
    setSeedLoading(true)
    try {
      const result = await seedSampleQuestsForActiveSeason()
      showToast(`Seeded ${result.count} sample quests!`)
      setShowSeedConfirm(false)
      loadData()
    } catch (error) {
      showToast(error.message, 'error')
    } finally {
      setSeedLoading(false)
    }
  }

  const handleSeedSampleVouchers = async () => {
    setSeedVouchersLoading(true)
    try {
      const result = await seedSampleVouchersForActiveSeason({ uid: user?.uid, email: user?.email })
      showToast(`Seeded ${result.count} vouchers.`)
      setShowSeedVouchersConfirm(false)
      loadData()
    } catch (error) {
      showToast(error.message, 'error')
    } finally {
      setSeedVouchersLoading(false)
    }
  }

  const handleMarkVoucherUsed = async (redemptionId) => {
    if (!activeSeason?.id || !user) return
    setMarkingVoucherUsedId(redemptionId)
    try {
      await adminMarkVoucherUsed({
        seasonId: activeSeason.id,
        redemptionId,
        adminUser: { uid: user.uid, email: user.email },
      })
      showToast('Voucher marked as used.')
      loadData()
    } catch (error) {
      showToast(error.message, 'error')
    } finally {
      setMarkingVoucherUsedId(null)
    }
  }

  const handleToggleQuestStats = async (questId) => {
    if (expandedQuestStats[questId]) {
      const newStats = { ...expandedQuestStats }
      delete newStats[questId]
      setExpandedQuestStats(newStats)
      return
    }

    setLoadingQuestStats(questId)
    try {
      const participations = await getQuestParticipations(questId)
      const now = new Date()
      
      let pendingCount = 0
      let completedCount = 0
      let expiredCount = 0
      let cancelledCount = 0

      participations.forEach(p => {
        if (p.status === 'completed') {
          completedCount++
        } else if (p.status === 'cancelled') {
          cancelledCount++
        } else if (p.status === 'expired') {
          expiredCount++
        } else if (p.status === 'joined') {
          if (p.expiresAt && new Date(p.expiresAt) < now) {
            expiredCount++
          } else {
            pendingCount++
          }
        }
      })

      setExpandedQuestStats({
        ...expandedQuestStats,
        [questId]: {
          pendingCount,
          completedCount,
          expiredCount,
          cancelledCount,
          total: participations.length
        }
      })
    } catch {
      showToast('Error loading stats', 'error')
    } finally {
      setLoadingQuestStats(null)
    }
  }

  const [showCleanupConfirm, setShowCleanupConfirm] = useState(false)
  const [cleanupLoading, setCleanupLoading] = useState(false)

  const handleRunCleanup = async () => {
    setCleanupLoading(true)
    try {
      const result = await expireAllStaleParticipations()
      showToast(`Expired ${result.expiredCount} participations, freed ${result.freedSlots} slots`)
      setShowCleanupConfirm(false)
      loadData()
    } catch (error) {
      showToast('Error running cleanup: ' + error.message, 'error')
    } finally {
      setCleanupLoading(false)
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="flex-1 flex items-center justify-center px-4 py-20">
          <div className="text-center">
            <p className="text-gray-600 mb-4">Please sign in to access the LGU Dashboard.</p>
            <Link to="/" className="text-emerald-600 hover:underline">Go to Home</Link>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  if (checkingAdmin) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="flex-1 flex items-center justify-center px-4 py-20">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-emerald-600 border-t-transparent"></div>
            <p className="text-gray-600 mt-2">Checking admin access...</p>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  if (!isUserAdmin) {
    return <NotAuthorized />
  }

  const newSubmissions = submissions.filter(s => s.status === 'new').length
  const newReports = reports.filter(r => r.status === 'new').length
  const pendingQuests = questParticipations.filter(p => p.status === 'joined').length

  const IMPACT_UNIT_CONFIG = {
    kg_trash: { label: 'Kg of waste collected', short: 'kg trash' },
    trees: { label: 'Trees planted', short: 'trees' },
    hours: { label: 'Volunteer hours', short: 'hours' },
    kg_plastic: { label: 'Kg of plastic avoided', short: 'kg plastic' },
    co2_kg: { label: 'Kg of CO₂ avoided', short: 'kg CO₂' },
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <main className="flex-1 pb-20 md:pb-0">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">LGU Dashboard</h1>
            <p className="text-gray-600 mt-1">Manage submissions and reports for SMARTDCABIAO</p>
            <p className="text-sm text-gray-500 mt-1">Signed in as: {user.email}</p>
          </div>

          <div className="flex gap-2 mb-6 flex-wrap">
            <TabButton 
              active={activeTab === TABS.SUBMISSIONS} 
              onClick={() => setActiveTab(TABS.SUBMISSIONS)}
              count={newSubmissions}
            >
              Submissions
            </TabButton>
            <TabButton 
              active={activeTab === TABS.REPORTS} 
              onClick={() => setActiveTab(TABS.REPORTS)}
              count={newReports}
            >
              Reports
            </TabButton>
            <TabButton 
              active={activeTab === TABS.REVIEWS} 
              onClick={() => setActiveTab(TABS.REVIEWS)}
              count={pendingReviews.length}
            >
              Reviews
            </TabButton>
            <TabButton 
              active={activeTab === TABS.SEASONS} 
              onClick={() => setActiveTab(TABS.SEASONS)}
            >
              Seasons
            </TabButton>
            <TabButton 
              active={activeTab === TABS.QUESTS} 
              onClick={() => setActiveTab(TABS.QUESTS)}
            >
              Quests
            </TabButton>
            <TabButton 
              active={activeTab === TABS.QUEST_VERIFICATIONS} 
              onClick={() => setActiveTab(TABS.QUEST_VERIFICATIONS)}
              count={pendingQuests}
            >
              Verifications
            </TabButton>
            <TabButton 
              active={activeTab === TABS.VOUCHERS} 
              onClick={() => setActiveTab(TABS.VOUCHERS)}
            >
              Vouchers
            </TabButton>
            <Link
              to="/lgu/places"
              className="flex-1 py-3 px-4 font-medium text-sm rounded-lg transition-colors bg-white text-gray-600 hover:bg-gray-100 border border-gray-200 text-center"
            >
              Places
            </Link>
            <Link
              to="/lgu/checkin"
              className="flex-1 py-3 px-4 font-medium text-sm rounded-lg transition-colors bg-emerald-600 text-white hover:bg-emerald-700 text-center"
            >
              Check-in
            </Link>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-emerald-600 border-t-transparent"></div>
              <p className="text-gray-600 mt-2">Loading...</p>
            </div>
          ) : activeTab === TABS.SUBMISSIONS ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              {submissions.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  No submissions found
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Name</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Type</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Category</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Barangay</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Date</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {submissions.map(sub => (
                        <tr 
                          key={sub.id} 
                          onClick={() => setSelectedSubmission(sub)}
                          className="hover:bg-gray-50 cursor-pointer"
                        >
                          <td className="px-4 py-3 font-medium text-gray-900">{sub.name}</td>
                          <td className="px-4 py-3 text-gray-600">{sub.entryType || 'business'}</td>
                          <td className="px-4 py-3 text-gray-600">{sub.category || '-'}</td>
                          <td className="px-4 py-3 text-gray-600">{sub.barangay || '-'}</td>
                          <td className="px-4 py-3 text-gray-600 text-sm">
                            {sub.createdAt ? new Date(sub.createdAt).toLocaleDateString() : '-'}
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge status={sub.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : activeTab === TABS.REVIEWS ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              {pendingReviews.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  No pending reviews to review
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Place</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Type</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">User</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Rating</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Review</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {pendingReviews.map(review => (
                        <tr 
                          key={review.id} 
                          onClick={() => setSelectedReview(review)}
                          className="hover:bg-gray-50 cursor-pointer"
                        >
                          <td className="px-4 py-3 font-medium text-gray-900">{review.targetId}</td>
                          <td className="px-4 py-3 text-gray-600 capitalize">{review.targetType}</td>
                          <td className="px-4 py-3 text-gray-600 text-sm">
                            {review.userDisplayName || review.userEmail || 'Anonymous'}
                          </td>
                          <td className="px-4 py-3">
                            <span className="flex items-center gap-1">
                              <span className="text-yellow-400">★</span>
                              <span className="font-medium">{review.rating}</span>
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-600 text-sm max-w-xs truncate">
                            {review.text}
                          </td>
                          <td className="px-4 py-3 text-gray-600 text-sm">
                            {review.createdAt ? new Date(review.createdAt).toLocaleDateString() : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : activeTab === TABS.SEASONS ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                <h3 className="text-lg font-semibold">Seasons</h3>
                <button
                  onClick={() => setShowSeasonModal(true)}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium"
                >
                  + Create Season
                </button>
              </div>
              {seasons.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  No seasons found. Create one to get started.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Name</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Start</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">End</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {seasons.map(season => (
                        <tr key={season.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-900">{season.name}</td>
                          <td className="px-4 py-3 text-gray-600 text-sm">
                            {season.startAt ? new Date(season.startAt).toLocaleDateString() : '-'}
                          </td>
                          <td className="px-4 py-3 text-gray-600 text-sm">
                            {season.endAt ? new Date(season.endAt).toLocaleDateString() : '-'}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              season.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {season.isActive ? 'ACTIVE' : 'INACTIVE'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              {!season.isActive && (
                                <button
                                  onClick={() => handleActivateSeason(season.id)}
                                  disabled={actionLoading}
                                  className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                                >
                                  Activate
                                </button>
                              )}
                              {season.isActive && (
                                <button
                                  onClick={() => handleCloseSeason(season.id)}
                                  disabled={actionLoading}
                                  className="px-3 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
                                >
                                  Close
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {Object.keys(seasonImpactTotals).length > 0 && activeSeason && activeSeason.id === (selectedSeasonFilter || activeSeason.id) && (
                    <div className="border-t border-gray-200 px-4 py-4 bg-gray-50">
                      <h4 className="text-sm font-semibold text-gray-900 mb-2">Season Impact Summary (selected season)</h4>
                      <div className="flex flex-wrap gap-3">
                        {Object.entries(seasonImpactTotals).map(([unit, amount]) => {
                          const config = IMPACT_UNIT_CONFIG[unit] || { label: unit, short: unit }
                          return (
                            <div key={unit} className="bg-white rounded-lg px-3 py-2 shadow-sm text-sm">
                              <p className="text-gray-500 text-xs uppercase">{config.label}</p>
                              <p className="text-gray-900 font-semibold">{amount}</p>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeSeason && (
                <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="border-b border-gray-200 px-6 py-4">
                    <h3 className="text-lg font-semibold">Leaderboard - {activeSeason.name}</h3>
                    <p className="text-sm text-gray-500">Top performers this season</p>
                  </div>

                  <div className="border-b border-gray-200 px-4 py-3">
                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={() => setLeaderboardTab('points')}
                        className={`px-3 py-1.5 rounded font-medium text-sm transition ${
                          leaderboardTab === 'points'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        Points
                      </button>
                      {IMPACT_UNITS.slice(0, 3).map(unit => (
                        <button
                          key={unit.value}
                          onClick={() => {
                            setLeaderboardTab('impact')
                            setLeaderboardUnit(unit.value)
                          }}
                          className={`px-3 py-1.5 rounded font-medium text-sm transition ${
                            leaderboardTab === 'impact' && leaderboardUnit === unit.value
                              ? 'bg-emerald-600 text-white'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {unit.icon} {unit.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="p-4">
                    {leaderboardData.length === 0 ? (
                      <p className="text-center text-gray-500 py-4">No leaderboard data yet</p>
                    ) : (
                      <div className="space-y-2">
                        {leaderboardData.slice(0, 5).map(entry => (
                          <div key={entry.uid} className="flex items-center gap-3 p-2 rounded hover:bg-gray-50">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                              entry.rank <= 3 ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-600'
                            }`}>
                              {entry.rank}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 truncate">{entry.name}</p>
                              <p className="text-xs text-gray-500">{entry.completedQuestsCount} quests</p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-gray-900">
                                {leaderboardTab === 'points' ? `${entry.pointsTotal} pts` : entry.impact}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : activeTab === TABS.QUESTS ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <h3 className="text-lg font-semibold">Quests</h3>
                <div className="flex gap-2 w-full sm:w-auto flex-wrap">
                  <select
                    value={selectedSeasonFilter || activeSeason?.id || ''}
                    onChange={(e) => setSelectedSeasonFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="">Select Season</option>
                    {seasons.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => setShowSeedConfirm(true)}
                    className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
                  >
                    Seed 10 Sample Quests
                  </button>
                  <button
                    onClick={() => setShowCleanupConfirm(true)}
                    className="px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm font-medium"
                  >
                    Run Cleanup
                  </button>
                  <button
                    onClick={() => setShowQuestModal(true)}
                    disabled={!selectedSeasonFilter && !activeSeason}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium disabled:bg-gray-300"
                  >
                    + Create Quest
                  </button>
                </div>
              </div>
              {quests.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  No quests found for this season.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Title</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Category</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Points</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Capacity</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Reserved</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Slots Left</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Completions</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Total Impact</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {quests.map(quest => {
                        const reservedCount = quest.reservedCount || 0
                        const slotsLeft = (quest.capacity || 0) - reservedCount
                        const isFull = slotsLeft <= 0
                        const isExpanded = expandedQuestStats[quest.id]
                        const stats = expandedQuestStats[quest.id]
                        const isLoadingStats = loadingQuestStats === quest.id
                        const impactForQuest = questImpactTotals[quest.id]

                        return (
                          <>
                            <tr key={quest.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 font-medium text-gray-900">{quest.title}</td>
                              <td className="px-4 py-3 text-gray-600 text-sm">{quest.category || '-'}</td>
                              <td className="px-4 py-3 text-gray-600">{quest.points}</td>
                              <td className="px-4 py-3 text-gray-600">{quest.capacity}</td>
                              <td className="px-4 py-3 text-gray-600">{reservedCount}</td>
                              <td className="px-4 py-3">
                                {isFull ? (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                    Full
                                  </span>
                                ) : (
                                  <span className={slotsLeft <= 2 ? 'text-orange-600 font-medium' : ''}>
                                    {slotsLeft}
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-gray-600">
                                {impactForQuest?.totalCompletions || 0}
                              </td>
                              <td className="px-4 py-3 text-gray-600 text-sm">
                                {impactForQuest && impactForQuest.byUnit
                                  ? Object.entries(impactForQuest.byUnit).map(([unit, amount]) => {
                                      const config = IMPACT_UNIT_CONFIG[unit] || { short: unit }
                                      return `${amount} ${config.short}`
                                    }).join(', ')
                                  : '—'}
                              </td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  quest.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {quest.status?.toUpperCase() || 'ACTIVE'}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex gap-2 flex-wrap">
                                  <button
                                    onClick={() => handleToggleQuestStats(quest.id)}
                                    disabled={isLoadingStats}
                                    className="px-3 py-1 bg-purple-600 text-white rounded text-xs hover:bg-purple-700 disabled:bg-gray-300"
                                  >
                                    {isLoadingStats ? 'Loading...' : isExpanded ? 'Hide Stats' : 'View Stats'}
                                  </button>
                                  <button
                                    onClick={() => setSelectedQuest(quest)}
                                    className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleToggleQuestStatus(quest.id, quest.status)}
                                    disabled={actionLoading}
                                    className={`px-3 py-1 rounded text-xs ${
                                      quest.status === 'active' 
                                        ? 'bg-gray-200 text-gray-700 hover:bg-gray-300' 
                                        : 'bg-green-600 text-white hover:bg-green-700'
                                    }`}
                                  >
                                    {quest.status === 'active' ? 'Deactivate' : 'Activate'}
                                  </button>
                                </div>
                              </td>
                            </tr>
                            {isExpanded && (
                              <tr key={`${quest.id}-stats`} className="bg-purple-50">
                                <td colSpan={8} className="px-4 py-4">
                                  <div className="flex flex-wrap gap-4">
                                    <div className="bg-white rounded-lg px-4 py-2 shadow-sm">
                                      <p className="text-xs text-gray-500 uppercase">Total</p>
                                      <p className="text-lg font-bold text-gray-900">{stats?.total || 0}</p>
                                    </div>
                                    <div className="bg-white rounded-lg px-4 py-2 shadow-sm">
                                      <p className="text-xs text-gray-500 uppercase">Pending</p>
                                      <p className="text-lg font-bold text-blue-600">{stats?.pendingCount || 0}</p>
                                    </div>
                                    <div className="bg-white rounded-lg px-4 py-2 shadow-sm">
                                      <p className="text-xs text-gray-500 uppercase">Completed</p>
                                      <p className="text-lg font-bold text-green-600">{stats?.completedCount || 0}</p>
                                    </div>
                                    <div className="bg-white rounded-lg px-4 py-2 shadow-sm">
                                      <p className="text-xs text-gray-500 uppercase">Expired</p>
                                      <p className="text-lg font-bold text-red-600">{stats?.expiredCount || 0}</p>
                                    </div>
                                    <div className="bg-white rounded-lg px-4 py-2 shadow-sm">
                                      <p className="text-xs text-gray-500 uppercase">Cancelled</p>
                                      <p className="text-lg font-bold text-gray-600">{stats?.cancelledCount || 0}</p>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : activeTab === TABS.QUEST_VERIFICATIONS ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              {questParticipations.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  No quest participations found
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Quest</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">User</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Points</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Joined</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Reward</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {questParticipations.map(part => (
                        <tr 
                          key={part.id} 
                          onClick={() => setSelectedParticipation(part)}
                          className="hover:bg-gray-50 cursor-pointer"
                        >
                          <td className="px-4 py-3 font-medium text-gray-900">
                            {questDetails[part.questId]?.title || part.questId}
                          </td>
                          <td className="px-4 py-3 text-gray-600 text-sm">
                            {part.userEmail || (part.uid ? part.uid.substring(0, 8) + '...' : '-')}
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {questDetails[part.questId]?.points || 0} pts
                          </td>
                          <td className="px-4 py-3 text-gray-600 text-sm">
                            {part.joinedAt ? new Date(part.joinedAt).toLocaleDateString() : '-'}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              part.status === 'joined' ? 'bg-blue-100 text-blue-800' :
                              part.status === 'completed' ? 'bg-green-100 text-green-800' :
                              part.status === 'expired' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {part.status?.toUpperCase() || 'UNKNOWN'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              part.rewardStatus === 'released' ? 'bg-green-100 text-green-800' :
                              part.rewardStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              part.rewardStatus === 'expired' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {part.rewardStatus?.toUpperCase() || 'PENDING'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : activeTab === TABS.VOUCHERS ? (
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">Voucher Store (Active Season)</h2>
                <p className="text-gray-600 text-sm mb-6">
                  Seed 12 sample vouchers for the active season so the Voucher Store page shows available vouchers.
                </p>
                {isUserAdmin ? (
                  <button
                    type="button"
                    onClick={() => setShowSeedVouchersConfirm(true)}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
                  >
                    Seed Sample Vouchers
                  </button>
                ) : (
                  <p className="text-gray-500 text-sm">Admin access required to seed vouchers.</p>
                )}
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="border-b border-gray-200 px-6 py-4 flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold text-gray-900">Redemptions</h2>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Filter:</span>
                    <select
                      value={redemptionStatusFilter}
                      onChange={(e) => setRedemptionStatusFilter(e.target.value)}
                      className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
                    >
                      <option value="all">All</option>
                      <option value="unused">Unused</option>
                      <option value="used">Used</option>
                    </select>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  {!activeSeason ? (
                    <div className="p-6 text-center text-gray-500">No active season.</div>
                  ) : seasonRedemptions.length === 0 ? (
                    <div className="p-6 text-center text-gray-500">No redemptions for this season yet.</div>
                  ) : (
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Code</th>
                          <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">User</th>
                          <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Voucher</th>
                          <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Redeemed</th>
                          <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                          <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {seasonRedemptions
                          .filter((r) => redemptionStatusFilter === 'all' || r.status === redemptionStatusFilter)
                          .map((r) => (
                            <tr key={r.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 font-mono text-sm">{r.code}</td>
                              <td className="px-4 py-3 text-sm text-gray-600">{r.userEmail || r.uid || '—'}</td>
                              <td className="px-4 py-3 text-sm">
                                {r.voucherSnapshot?.title || r.voucherId || '—'}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600">
                                {r.redeemedAt?.toDate ? r.redeemedAt.toDate().toLocaleString() : '—'}
                              </td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                  r.status === 'used' ? 'bg-gray-100 text-gray-700' : 'bg-emerald-100 text-emerald-700'
                                }`}>
                                  {r.status === 'used' ? 'Used' : 'Unused'}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                {r.status === 'unused' ? (
                                  <button
                                    type="button"
                                    disabled={markingVoucherUsedId === r.id}
                                    onClick={() => handleMarkVoucherUsed(r.id)}
                                    className="text-sm font-medium text-indigo-600 hover:text-indigo-700 disabled:opacity-50"
                                  >
                                    {markingVoucherUsedId === r.id ? '…' : 'Mark Used'}
                                  </button>
                                ) : (
                                  '—'
                                )}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </main>

      <Footer />

      {selectedSubmission && (
        <SubmissionModal
          submission={selectedSubmission}
          onClose={() => setSelectedSubmission(null)}
          onApprove={handleApprove}
          onReject={handleReject}
          onNeedsInfo={handleNeedsInfo}
          isLoading={actionLoading}
        />
      )}

      {selectedReport && (
        <ReportModal
          report={selectedReport}
          onClose={() => setSelectedReport(null)}
          onMarkInProgress={handleMarkInProgress}
          onMarkResolved={handleMarkResolved}
          isLoading={actionLoading}
        />
      )}

      {selectedReview && (
        <ReviewModal
          review={selectedReview}
          onClose={() => setSelectedReview(null)}
          onApprove={handleApproveReview}
          onReject={handleRejectReview}
          isLoading={actionLoading}
        />
      )}

      {selectedParticipation && (
        <QuestVerificationModal
          participation={selectedParticipation}
          quest={questDetails[selectedParticipation.questId]}
          onClose={() => setSelectedParticipation(null)}
          onMarkCompleted={handleMarkQuestCompleted}
          isLoading={actionLoading}
        />
      )}

      {showSeasonModal && (
        <SeasonFormModal
          onClose={() => setShowSeasonModal(false)}
          onSubmit={handleCreateSeason}
          isLoading={actionLoading}
        />
      )}

      {showQuestModal && (
        <QuestFormModal
          onClose={() => setShowQuestModal(false)}
          onSubmit={handleCreateQuest}
          isLoading={actionLoading}
        />
      )}

      {selectedQuest && (
        <QuestFormModal
          quest={selectedQuest}
          onClose={() => setSelectedQuest(null)}
          onSubmit={(data) => handleUpdateQuest(selectedQuest.id, data)}
          isLoading={actionLoading}
        />
      )}

      {showSeedVouchersConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Seed Sample Vouchers</h3>
            <p className="text-gray-600 mb-4">
              This will create 12 sample vouchers for the currently active season (seed_v1 … seed_v12).
              Existing vouchers will be updated without resetting stock remaining.
            </p>
            <p className="text-sm text-yellow-600 mb-6">
              Running this again is safe and will not create duplicates.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowSeedVouchersConfirm(false)}
                disabled={seedVouchersLoading}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSeedSampleVouchers}
                disabled={seedVouchersLoading}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-300"
              >
                {seedVouchersLoading ? 'Seeding...' : 'Seed 12 Vouchers'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showSeedConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Seed Sample Quests</h3>
            <p className="text-gray-600 mb-4">
              This will create 10 sample quests for the currently active season. 
              If quests with IDs seed-q1 through seed-q10 already exist, they will be updated.
            </p>
            <p className="text-sm text-yellow-600 mb-6">
              Running this again is safe - it will not create duplicates.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowSeedConfirm(false)}
                disabled={seedLoading}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSeedSampleQuests}
                disabled={seedLoading}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-300"
              >
                {seedLoading ? 'Seeding...' : 'Seed 10 Quests'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCleanupConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Run Expiration Cleanup</h3>
            <p className="text-gray-600 mb-4">
              This will check all participations and expire any that have passed their deadline. 
              Slots will be freed for expired participations.
            </p>
            <p className="text-sm text-yellow-600 mb-6">
              This action will be logged for audit purposes.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCleanupConfirm(false)}
                disabled={cleanupLoading}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRunCleanup}
                disabled={cleanupLoading}
                className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-300"
              >
                {cleanupLoading ? 'Running...' : 'Run Cleanup'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`fixed bottom-4 right-4 px-4 py-3 rounded-lg shadow-lg z-50 ${
          toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'
        }`}>
          {toast.message}
        </div>
      )}
    </div>
  )
}

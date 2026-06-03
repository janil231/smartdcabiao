import { useState, useEffect, useMemo, Fragment } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Marker } from 'react-leaflet'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { useAuth } from '../contexts/AuthContext'
import { getUserRole } from '../services/adminRole.service'
import ManageAdminsPanel from './lgu/panels/ManageAdminsPanel'
import { 
  listSubmissions, 
  approveSubmissionAndPublish, 
  approveBusinessSubmission,
  rejectSubmission,
  requestMoreInfoSubmission 
} from '../services/adminSubmissions.service'
import { getCategoryLabel } from '../constants/cabiaoBarangays'
import 'leaflet/dist/leaflet.css'
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
  updateQuestActive,
  repairQuestReservedCounts,
} from '../services/quests.service'
import { expireAllStaleParticipations } from '../services/participations.service'
import { repairAllBusinessImages } from '../services/businesses.service'
import { repairAllDestinationImages } from '../services/destinations.service'
import { listPendingReviews, setReviewStatus } from '../services/reviews.service'
import { listTopByPoints, listTopByImpact, IMPACT_UNITS } from '../services/leaderboard.service'
import { isWithinCabiaoBounds, CABIAO_BOUNDS } from '../constants/cabiaoGeo'
import { listSeasonImpact, sumImpactByUnit } from '../services/impactLedger.service'
import { listSeasonRedemptions, findRedemptionByCode, adminMarkVoucherUsed } from '../services/voucherRedemptions.service'
import { logAudit } from '../services/audit.service'
import { rotateEventCode } from '../services/questVerification.service'
import CheckInModal from '../components/quest/CheckInModal'
import QRDisplayModal from '../components/quest/QRDisplayModal'
import QuestDetailsModal from '../components/quest/QuestDetailsModal'

const TABS = {
  SUBMISSIONS: 'submissions',
  REPORTS: 'reports',
  REVIEWS: 'reviews',
  SEASONS: 'seasons',
  QUESTS: 'quests',
  VOUCHERS: 'vouchers',
  MANAGE_ADMINS: 'manage-admins',
  DATA_TOOLS: 'data-tools',
}

const MODERATION_ITEMS = [
  { key: TABS.SUBMISSIONS, icon: '📥', label: 'Submissions' },
  { key: TABS.REPORTS, icon: '🚩', label: 'Reports' },
  { key: TABS.REVIEWS, icon: '⭐', label: 'Reviews' },
]

const TOURISM_ITEMS = [
  { key: TABS.SEASONS, icon: '🗓️', label: 'Seasons' },
  { key: TABS.QUESTS, icon: '🎯', label: 'Quests' },
  { key: TABS.VOUCHERS, icon: '🎟️', label: 'Vouchers' },
]

function StatusBadge({ status }) {
  const styles = {
    new: 'bg-blue-100 text-blue-800',
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    needs_info: 'bg-yellow-100 text-yellow-800',
    in_progress: 'bg-orange-100 text-orange-800',
    resolved: 'bg-green-100 text-green-800',
  }
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
      {status?.replace('_', ' ').toUpperCase() || 'UNKNOWN'}
    </span>
  )
}

function getSubmissionDisplayName(submission) {
  if (submission?.type === 'business') return submission.businessName || 'Business Registration'
  return submission?.name || 'Untitled'
}

function SidebarSection({ title, items, activeKey, onSelect, navigate }) {
  return (
    <div className="mb-6">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2 px-3">
        {title}
      </h3>
      <div className="space-y-1">
        {items.map((item) => {
          const isLink = !!item.href

          if (isLink) {
            return (
              <button
                key={item.key}
                onClick={() => navigate(item.href)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-100 transition text-left group"
              >
                <span className="text-lg">{item.icon}</span>
                <span className="flex-1 font-medium text-gray-700 text-sm group-hover:text-gray-900">
                  {item.label}
                </span>
                <span className="text-gray-400 text-sm">→</span>
              </button>
            )
          }

          const isActive = activeKey === item.key
          return (
            <button
              key={item.key}
              onClick={() => onSelect(item.key)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition text-left ${
                isActive
                  ? 'bg-emerald-50 text-emerald-700 border-l-4 border-emerald-600 -ml-1 pl-3.5'
                  : 'hover:bg-gray-100 text-gray-700'
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              <span className="flex-1 font-medium text-sm">{item.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function MobileTabSelector({ activeTab, onChange, moderationItems, tourismItems, settingsItems, navigate, counts }) {
  const [open, setOpen] = useState(false)

  const allItems = [...moderationItems, ...tourismItems, ...(settingsItems || [])]
  const activeItem = allItems.find((t) => t.key === activeTab)

  return (
    <div className="relative mb-4">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-white border border-gray-200 rounded-xl shadow-sm"
      >
        <span className="flex items-center gap-2 font-semibold text-gray-800">
          <span className="text-lg">{activeItem?.icon}</span>
          {activeItem?.label}
        </span>
        <span className={`transition-transform ${open ? 'rotate-180' : ''}`}>▼</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute z-40 left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-200 p-3 max-h-[70vh] overflow-y-auto">
            <p className="text-xs font-semibold uppercase text-gray-500 mb-2 px-2">Moderation</p>
            {moderationItems.map((item) => (
              <button
                key={item.key}
                onClick={() => { onChange(item.key); setOpen(false) }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1 text-left ${
                  activeTab === item.key ? 'bg-emerald-50 text-emerald-700' : 'hover:bg-gray-100'
                }`}
              >
                <span>{item.icon}</span>
                <span className="flex-1 font-medium text-sm">{item.label}</span>
              </button>
            ))}

            <p className="text-xs font-semibold uppercase text-gray-500 mt-3 mb-2 px-2">Tourism Program</p>
            {tourismItems.map((item) => (
              <button
                key={item.key}
                onClick={() => { onChange(item.key); setOpen(false) }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1 text-left ${
                  activeTab === item.key ? 'bg-emerald-50 text-emerald-700' : 'hover:bg-gray-100'
                }`}
              >
                <span>{item.icon}</span>
                <span className="flex-1 font-medium text-sm">{item.label}</span>
              </button>
            ))}

            {settingsItems && settingsItems.length > 0 && (
              <>
                <p className="text-xs font-semibold uppercase text-gray-500 mt-3 mb-2 px-2">Settings</p>
                {settingsItems.map((item) => (
                  <button
                    key={item.key}
                    onClick={() => { onChange(item.key); setOpen(false) }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1 text-left ${
                      activeTab === item.key ? 'bg-emerald-50 text-emerald-700' : 'hover:bg-gray-100'
                    }`}
                  >
                    <span>{item.icon}</span>
                    <span className="flex-1 font-medium text-sm">{item.label}</span>
                  </button>
                ))}
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function BusinessSubmissionPhotoGallery({ urls, alt }) {
  const [lightboxIndex, setLightboxIndex] = useState(null)

  return (
    <div>
      <p className="text-sm font-medium text-gray-500 mb-2">
        Business Photos ({urls.length})
      </p>
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
        {urls.map((url, i) => (
          <button
            key={`${url}-${i}`}
            type="button"
            onClick={() => setLightboxIndex(i)}
            className="relative shrink-0 rounded-lg overflow-hidden border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <img
              src={url}
              alt={`${alt} ${i + 1}`}
              className="h-28 w-28 sm:h-32 sm:w-32 object-cover"
            />
            {i === 0 && (
              <span className="absolute bottom-1 left-1 px-1.5 py-0.5 text-[10px] font-semibold bg-emerald-600 text-white rounded">
                Cover
              </span>
            )}
          </button>
        ))}
      </div>
      {lightboxIndex != null && (
        <div
          className="fixed inset-0 z-[3000] bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightboxIndex(null)}
          role="presentation"
        >
          <button
            type="button"
            className="absolute top-4 right-4 text-white text-2xl hover:opacity-80"
            onClick={() => setLightboxIndex(null)}
            aria-label="Close"
          >
            ✕
          </button>
          <img
            src={urls[lightboxIndex]}
            alt={alt}
            className="max-h-[90vh] max-w-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}

function BusinessLocationPreview({ location }) {
  if (!location?.lat || !location?.lng) return null
  return (
    <div className="h-48 rounded-lg overflow-hidden border border-gray-200">
      <MapContainer
        center={[location.lat, location.lng]}
        zoom={15}
        className="h-full w-full"
        scrollWheelZoom={false}
        dragging={false}
        zoomControl={false}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Marker position={[location.lat, location.lng]} />
      </MapContainer>
    </div>
  )
}

function SubmissionModal({ submission, onClose, onApprove, onReject, onNeedsInfo, isLoading }) {
  if (!submission) return null

  const isBusinessRegistration = submission.type === 'business'
  const isDestination = submission.type === 'destination'
  const displayName = getSubmissionDisplayName(submission)
  const position = isBusinessRegistration ? submission.location : submission.position
  let isOutOfBounds = false
  if (position) {
    const lat = Array.isArray(position) ? position[0] : position.lat
    const lng = Array.isArray(position) ? position[1] : position.lng
    isOutOfBounds = lat && lng && !isWithinCabiaoBounds(lat, lng)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className={`rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto ${
          isBusinessRegistration ? 'bg-emerald-50 border border-emerald-200' : isDestination ? 'bg-blue-50 border border-blue-200' : 'bg-white'
        }`}
        onClick={e => e.stopPropagation()}
      >
        <div className={`p-6 border-b ${isBusinessRegistration ? 'border-emerald-200' : isDestination ? 'border-blue-200' : 'border-gray-200'}`}>
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-bold text-gray-900">{displayName}</h2>
              <div className="flex flex-wrap gap-2 mt-2">
                {isBusinessRegistration && (
                  <span className="px-2 py-1 bg-emerald-100 text-emerald-800 rounded text-xs font-medium">
                    🏪 Business Registration
                  </span>
                )}
                {isDestination && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                    🌴 Destination Suggestion
                  </span>
                )}
                <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                  {(isBusinessRegistration ? 'business' : isDestination ? 'destination' : submission.entryType)?.toUpperCase() || 'OTHER'}
                </span>
                <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                  {(isBusinessRegistration ? getCategoryLabel(submission.category) : submission.category)?.toUpperCase() || 'OTHER'}
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

        <div className="p-6 space-y-4 bg-white rounded-b-xl">
          {isBusinessRegistration && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-sm font-semibold text-amber-900">Owner / Representative</p>
              <p className="text-gray-900 font-medium">{submission.ownerName}</p>
              <p className="text-sm text-gray-700 mt-1">{submission.ownerContact}</p>
              {submission.isOwner && (
                <p className="text-xs text-emerald-700 mt-2">✓ Confirmed as owner or authorized representative</p>
              )}
            </div>
          )}

          {isDestination && submission.tagline && (
            <div>
              <p className="text-sm font-medium text-gray-500">Tagline</p>
              <p className="text-gray-900">{submission.tagline}</p>
            </div>
          )}

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
          {isDestination && submission.landmark && (
            <div>
              <p className="text-sm font-medium text-gray-500">Landmark</p>
              <p className="text-gray-900">{submission.landmark}</p>
            </div>
          )}
          <div>
            <p className="text-sm font-medium text-gray-500">Description</p>
            <p className="text-gray-900">{submission.description}</p>
          </div>

          {isDestination && submission.bestTime && (
            <div>
              <p className="text-sm font-medium text-gray-500">Best Time to Visit</p>
              <p className="text-gray-900">{submission.bestTime}</p>
            </div>
          )}

          {isDestination && submission.activities && (
            <div>
              <p className="text-sm font-medium text-gray-500">Activities</p>
              <p className="text-gray-900">{submission.activities}</p>
            </div>
          )}

          {isDestination && submission.entranceFee && (
            <div>
              <p className="text-sm font-medium text-gray-500">Entrance Fee</p>
              <p className="text-gray-900 capitalize">{submission.entranceFee}</p>
            </div>
          )}

          {isBusinessRegistration && submission.contactNumber && (
            <div>
              <p className="text-sm font-medium text-gray-500">Contact Number</p>
              <p className="text-gray-900">{submission.contactNumber}</p>
            </div>
          )}

          {(submission.contact && !isBusinessRegistration) && (
            <div>
              <p className="text-sm font-medium text-gray-500">Contact</p>
              <p className="text-gray-900">{submission.contact}</p>
            </div>
          )}

          {submission.facebook && (
            <div>
              <p className="text-sm font-medium text-gray-500">Facebook</p>
              <p className="text-gray-900">{submission.facebook}</p>
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

          {isBusinessRegistration && (() => {
            const galleryUrls =
              Array.isArray(submission.photoURLs) && submission.photoURLs.length > 0
                ? submission.photoURLs.filter(Boolean)
                : submission.photoURL
                  ? [submission.photoURL]
                  : []
            if (galleryUrls.length === 0) return null
            return (
              <BusinessSubmissionPhotoGallery urls={galleryUrls} alt={displayName} />
            )
          })()}

          {isDestination && submission.photoURLs?.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-500 mb-2">Photos ({submission.photoURLs.length})</p>
              <div className="grid grid-cols-3 gap-2">
                {submission.photoURLs.filter(Boolean).map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                    <img src={url} alt="" className="w-full h-24 object-cover rounded-lg border border-gray-200" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {position && (
            <div>
              <p className="text-sm font-medium text-gray-500 mb-2">Location</p>
              {isBusinessRegistration ? (
                <BusinessLocationPreview location={submission.location} />
              ) : null}
              <p className="text-gray-900 mt-2">
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
              {(submission.submitterEmail || submission.createdByEmail) &&
                ` by ${submission.submitterEmail || submission.createdByEmail}`}
            </p>
          </div>

          {(submission.rejectionReason || submission.notes) && (
            <div>
              <p className="text-sm font-medium text-gray-500">Notes / Rejection Reason</p>
              <p className="text-gray-900">{submission.rejectionReason || submission.notes}</p>
            </div>
          )}

          {submission.approvedBusinessId && (
            <div>
              <p className="text-sm font-medium text-gray-500">Published Business</p>
              <Link to={`/businesses/${submission.approvedBusinessId}`} className="text-emerald-600 hover:underline">
                View business listing →
              </Link>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 bg-gray-50 flex flex-wrap gap-3 rounded-b-xl">
          <button
            onClick={onApprove}
            disabled={isLoading || isOutOfBounds || submission.status === 'approved'}
            className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
          >
            {isLoading ? 'Processing...' : isBusinessRegistration ? 'Approve & Add to Directory' : 'Approve & Publish'}
          </button>
          {!isBusinessRegistration && (
            <button
              onClick={onNeedsInfo}
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:bg-gray-300 font-medium"
            >
              Needs More Info
            </button>
          )}
          <button
            onClick={onReject}
            disabled={isLoading || submission.status === 'rejected'}
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
              <h2 className="text-xl font-bold text-gray-900">{report.reporterEmail || 'Anonymous Report'}</h2>
              <div className="flex flex-wrap gap-2 mt-2">
                <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                  {report.targetType?.toUpperCase()}
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
            <p className="text-sm font-medium text-gray-500">Reason</p>
            <p className="text-gray-900">{report.reason}</p>
          </div>
          {report.details && (
            <div>
              <p className="text-sm font-medium text-gray-500">Details</p>
              <p className="text-gray-900">{report.details}</p>
            </div>
          )}
          <div>
            <p className="text-sm font-medium text-gray-500">Target</p>
            <Link to={targetLink} className="text-emerald-600 hover:underline text-sm">
              View reported {report.targetType} →
            </Link>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Reported</p>
            <p className="text-gray-900">
              {report.createdAt ? new Date(report.createdAt).toLocaleString() : 'Unknown'}
            </p>
          </div>
        </div>
        <div className="p-6 border-t border-gray-200 bg-gray-50 flex gap-3 rounded-b-xl">
          {report.status !== 'resolved' && (
            <>
              <button
                onClick={onMarkInProgress}
                disabled={isLoading || report.status === 'in_progress'}
                className="flex-1 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:bg-gray-300 font-medium"
              >
                {isLoading ? 'Processing...' : 'Mark In Progress'}
              </button>
              <button
                onClick={onMarkResolved}
                disabled={isLoading}
                className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:bg-gray-300 font-medium"
              >
                Mark Resolved
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function ReviewModal({ review, onClose, onApprove, onReject, isLoading }) {
  if (!review) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {review.userDisplayName || review.userEmail || 'Anonymous'}
              </h2>
              <div className="flex items-center gap-2 mt-2">
                <span className="flex items-center gap-1 text-yellow-500">
                  {'★'.repeat(review.rating)}{'☆'.repeat(5 - (review.rating || 0))}
                </span>
                <span className="text-sm text-gray-500">({review.rating})</span>
                <span className="text-xs text-gray-400">
                  {review.createdAt ? new Date(review.createdAt).toLocaleDateString() : ''}
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
            <p className="text-sm font-medium text-gray-500">Review</p>
            <p className="text-gray-900">{review.text || review.review}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Target Type</p>
            <p className="text-gray-900 capitalize">{review.targetType}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Target ID</p>
            <p className="text-gray-900 text-sm font-mono">{review.targetId}</p>
          </div>
        </div>
        <div className="p-6 border-t border-gray-200 bg-gray-50 flex gap-3 rounded-b-xl">
          <button
            onClick={onApprove}
            disabled={isLoading}
            className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:bg-gray-300 font-medium"
          >
            Approve Review
          </button>
          <button
            onClick={onReject}
            disabled={isLoading}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300 font-medium"
          >
            Reject Review
          </button>
        </div>
      </div>
    </div>
  )
}

function SeasonFormModal({ onClose, onSubmit, isLoading }) {
  const [form, setForm] = useState({ name: '', startAt: '', endAt: '' })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.name.trim() || !form.startAt || !form.endAt) return
    onSubmit({
      name: form.name.trim(),
      startAt: new Date(form.startAt),
      endAt: new Date(form.endAt),
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-gray-900 mb-4">Create Season</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="e.g. Summer 2026"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              value={form.startAt}
              onChange={(e) => setForm({ ...form, startAt: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              value={form.endAt}
              onChange={(e) => setForm({ ...form, endAt: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              required
            />
          </div>
          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !form.name.trim() || !form.startAt || !form.endAt}
              className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:bg-gray-300 font-medium"
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
  const [form, setForm] = useState({
    title: quest?.title || '',
    category: quest?.category || 'eco_challenge',
    description: quest?.description || '',
    points: quest?.points || 10,
    capacity: quest?.capacity || 50,
    deadline: quest?.deadline ? (quest.deadline.toDate ? quest.deadline.toDate().toISOString().split('T')[0] : quest.deadline) : '',
    verificationMethod: quest?.verificationMethod || 'auto',
  })

  useEffect(() => {
    if (onClose) {
      document.body.style.overflow = 'hidden'
    }
    return () => { document.body.style.overflow = '' }
  }, [onClose])

  useEffect(() => {
    if (!onClose) return
    const handler = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.title.trim()) return
    onSubmit({
      ...form,
      title: form.title.trim(),
      description: form.description.trim(),
      points: Number(form.points),
      capacity: Number(form.capacity),
      deadline: form.deadline ? new Date(form.deadline) : null,
    })
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="fixed inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl my-8 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
          <h3 className="font-semibold text-lg text-gray-900">{quest ? 'Edit Quest' : 'Create Quest'}</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition" aria-label="Close">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="eco_challenge">Eco Challenge</option>
              <option value="community">Community</option>
              <option value="tourism">Tourism</option>
              <option value="culture">Culture</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Points</label>
              <input
                type="number"
                value={form.points}
                onChange={(e) => setForm({ ...form, points: e.target.value })}
                min={1}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Capacity</label>
              <input
                type="number"
                value={form.capacity}
                onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                min={1}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Deadline</label>
            <input
              type="date"
              value={form.deadline}
              onChange={(e) => setForm({ ...form, deadline: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Verification Method</label>
            <select
              value={form.verificationMethod}
              onChange={(e) => setForm({ ...form, verificationMethod: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="auto">Auto (geofence)</option>
              <option value="qr">QR Code</option>
              <option value="code">Event Code + Photo</option>
            </select>
          </div>
        </form>
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3 rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-5 py-2.5 rounded-xl border border-gray-300 bg-white text-gray-700 font-semibold hover:bg-gray-50 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isLoading || !form.title.trim()}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {isLoading ? 'Saving...' : quest ? 'Update Quest' : 'Create Quest'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

function DataToolsPanel({ user }) {
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState(null)
  const [report, setReport] = useState(null)
  const [log, setLog] = useState([])
  const [mode, setMode] = useState(null)

  const addLog = (entry) => setLog(prev => [...prev, entry])

  const runRepair = async (type) => {
    setRunning(true)
    setProgress({ current: 0, total: 0, currentName: '', status: 'starting' })
    setReport(null)
    setLog([])
    setMode(type)

    try {
      addLog({ time: new Date().toLocaleTimeString(), msg: `Starting ${type} repair...` })
      const fn = type === 'business' ? repairAllBusinessImages : repairAllDestinationImages
      const result = await fn((p) => {
        setProgress(p)
        if (p.status === 'processing') {
          addLog({ time: new Date().toLocaleTimeString(), msg: `[${p.current}/${p.total}] Processing ${p.currentName}...` })
        }
      })
      setReport(result)
      addLog({ time: new Date().toLocaleTimeString(), msg: `Done. Repaired: ${result.repaired}, Skipped: ${result.skipped}, Failed: ${result.failed}` })
    } catch (err) {
      addLog({ time: new Date().toLocaleTimeString(), msg: `❌ Error: ${err.message}` })
    } finally {
      setRunning(false)
      setProgress(null)
    }
  }

  const progressPct = progress && progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0

  return (
    <div className="h-full flex flex-col min-h-0">
      <div className="shrink-0">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xl">🛠️</span>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Data Tools</h2>
            <p className="text-sm text-gray-500">Repair and maintain data integrity</p>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4 text-xs text-blue-800">
          💡 These bulk tools replace the per-card re-sync buttons. Use them to repair photos across many items at once.
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => runRepair('business')}
            disabled={running}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold disabled:opacity-50 transition text-sm"
          >
            🔧 Repair All Business Images
          </button>
          <button
            onClick={() => runRepair('destination')}
            disabled={running}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold disabled:opacity-50 transition text-sm"
          >
            🔧 Repair All Destination Images
          </button>
        </div>

        {running && progress && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-sm font-medium text-blue-800 mb-2">
              {progress.status === 'starting' ? 'Starting...' : `Processing ${progress.current}/${progress.total}: ${progress.currentName}`}
            </p>
            <div className="w-full bg-blue-200 rounded-full h-3">
              <div
                className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <p className="text-xs text-blue-600 mt-1">{progressPct}%</p>
          </div>
        )}

        {report && !running && (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
            <h3 className="font-semibold text-gray-800 mb-2">Repair Summary</h3>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-green-100 rounded-lg p-3">
                <p className="text-2xl font-bold text-green-700">{report.repaired}</p>
                <p className="text-xs text-green-600">Repaired</p>
              </div>
              <div className="bg-yellow-100 rounded-lg p-3">
                <p className="text-2xl font-bold text-yellow-700">{report.skipped}</p>
                <p className="text-xs text-yellow-600">Skipped</p>
              </div>
              <div className="bg-red-100 rounded-lg p-3">
                <p className="text-2xl font-bold text-red-700">{report.failed}</p>
                <p className="text-xs text-red-600">Failed</p>
              </div>
            </div>
          </div>
        )}

        {report && !running && report.details?.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-semibold text-gray-800 text-sm">Details</h3>
              <span className="text-xs text-gray-500">{report.details.length} item(s)</span>
            </div>
            <div className="divide-y divide-gray-100 max-h-64 overflow-y-auto">
              {report.details.map((d, i) => (
                <div key={i} className="flex items-start gap-2 px-4 py-2.5 text-xs">
                  <span className="font-mono w-5 text-gray-400 shrink-0">{i + 1}.</span>
                  <span className={`font-semibold w-16 shrink-0 ${
                    d.status === "repaired" ? "text-emerald-700" :
                    d.status === "skipped" ? "text-amber-700" :
                    "text-red-700"
                  }`}>
                    {d.status.toUpperCase()}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-gray-900 truncate font-medium">{d.name}</div>
                    {d.reason && (
                      <div className="text-gray-500 italic mt-0.5">
                        {d.reason}
                        {d.hint && <span className="text-blue-600 not-italic ml-1">&rarr; {d.hint}</span>}
                      </div>
                    )}
                    {d.source && (
                      <div className="text-emerald-600 mt-0.5">via {d.source}</div>
                    )}
                  </div>
                  {d.syncedCount !== undefined && (
                    <span className="text-emerald-600 shrink-0 font-semibold">+{d.syncedCount} photos</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {log.length > 0 && (
          <div className="bg-gray-900 text-gray-100 rounded-xl p-4 font-mono text-xs max-h-48 overflow-y-auto">
            {log.map((entry, i) => (
              <div key={i} className="leading-relaxed">
                {entry.time && <span className="text-gray-500">[{entry.time}] </span>}
                {entry.msg}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function LGUDashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState(TABS.SUBMISSIONS)
  const [submissions, setSubmissions] = useState([])
  const [reports, setReports] = useState([])
  const [seasons, setSeasons] = useState([])
  const [quests, setQuests] = useState([])
  const [activeSeason, setActiveSeason] = useState(null)
  const [selectedSeasonFilter, setSelectedSeasonFilter] = useState('')
  const [questDetails, setQuestDetails] = useState({})
  const [loading, setLoading] = useState(true)
  const [checkingAdmin, setCheckingAdmin] = useState(true)
  const [role, setRole] = useState(null)
  const [submissionTypeFilter, setSubmissionTypeFilter] = useState('all')
  const [selectedSubmission, setSelectedSubmission] = useState(null)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [selectedReport, setSelectedReport] = useState(null)
  const [selectedReview, setSelectedReview] = useState(null)
  const [selectedQuest, setSelectedQuest] = useState(null)
  const [showSeasonModal, setShowSeasonModal] = useState(false)
  const [showQuestModal, setShowQuestModal] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [toast, setToast] = useState(null)

  const [seasonImpactTotals, setSeasonImpactTotals] = useState({})
  const [questImpactTotals, setQuestImpactTotals] = useState({})
  const [leaderboardTab, setLeaderboardTab] = useState('points')
  const [leaderboardUnit, setLeaderboardUnit] = useState('trees')
  const [leaderboardData, setLeaderboardData] = useState([])
  const [pendingReviews, setPendingReviews] = useState([])
  const [seasonRedemptions, setSeasonRedemptions] = useState([])
  const [redemptionStatusFilter, setRedemptionStatusFilter] = useState('all')
  const [markingVoucherUsedId, setMarkingVoucherUsedId] = useState(null)
  const [showCleanupConfirm, setShowCleanupConfirm] = useState(false)
  const [cleanupLoading, setCleanupLoading] = useState(false)
  const [confirmToggle, setConfirmToggle] = useState(null)
  const [repairLoading, setRepairLoading] = useState(false)
  const [verifyCode, setVerifyCode] = useState('')
  const [verifySearching, setVerifySearching] = useState(false)
  const [verifyResult, setVerifyResult] = useState(null)
  const [verifyError, setVerifyError] = useState(null)
  const [verifyMarkLoading, setVerifyMarkLoading] = useState(false)
  const [checkInQuest, setCheckInQuest] = useState(null)
  const [qrModalQuest, setQrModalQuest] = useState(null)
  const [questSearchQuery, setQuestSearchQuery] = useState('')
  const [selectedQuestDetails, setSelectedQuestDetails] = useState(null)

  const filteredQuests = useMemo(() => {
    if (!questSearchQuery.trim()) return quests
    const q = questSearchQuery.trim().toLowerCase()
    return quests.filter((quest) => {
      return (
        (quest.title || '').toLowerCase().includes(q) ||
        (quest.category || '').toLowerCase().includes(q) ||
        (quest.eventCode || '').toLowerCase().includes(q) ||
        (quest.verificationMethod || '').toLowerCase().includes(q)
      )
    })
  }, [quests, questSearchQuery])

  useEffect(() => {
    async function checkAdminStatus() {
      if (!user) {
        setCheckingAdmin(false)
        setRole(null)
        return
      }
      const r = await getUserRole(user.uid)
      setRole(r)
      if (r === 'admin') setActiveTab(TABS.QUESTS)
      setCheckingAdmin(false)
    }
    checkAdminStatus()
  }, [user])

  const isMaster = role === 'master'

  useEffect(() => {
    if (!user || !role) {
      setLoading(false)
      return
    }

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
  }, [user, activeTab, role, selectedSeasonFilter])

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
      let result
      if (selectedSubmission.type === 'business') {
        result = await approveBusinessSubmission(
          selectedSubmission.id,
          selectedSubmission,
          user?.uid,
          user?.email
        )
        if (result.success) {
          showToast('Business approved and added to the directory!')
        }
      } else {
        result = await approveSubmissionAndPublish(selectedSubmission.id, {
          reviewedBy: user?.uid,
          reviewedByEmail: user?.email
        })
        if (result.success) {
          showToast('Successfully published!')
        }
      }

      if (result.success) {
        setSelectedSubmission(null)
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

  const handleRejectClick = () => {
    setRejectReason('')
    setShowRejectModal(true)
  }

  const handleConfirmReject = async () => {
    if (!selectedSubmission) return
    if (!rejectReason.trim()) {
      showToast('Please provide a rejection reason', 'error')
      return
    }

    setActionLoading(true)
    try {
      const result = await rejectSubmission(selectedSubmission.id, {
        reviewedBy: user?.uid,
        reviewedByEmail: user?.email,
        rejectionReason: rejectReason.trim(),
        notes: rejectReason.trim(),
      })
      if (result.success) {
        showToast('Submission rejected')
        setShowRejectModal(false)
        setSelectedSubmission(null)
        setRejectReason('')
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

  const handleToggleClick = (quest) => {
    setConfirmToggle(quest)
  }

  const confirmToggleAction = async () => {
    if (!confirmToggle) return
    const quest = confirmToggle
    const isActive = quest.status === 'active'
    setConfirmToggle(null)
    setActionLoading(true)
    try {
      await updateQuestActive(quest.id, !isActive)
      showToast(!isActive ? `"${quest.title}" is now LIVE!` : `"${quest.title}" moved to Draft.`)
      loadData()
    } catch (error) {
      showToast(error.message, 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const getQuestIsActive = (quest) => {
    return quest.isActive || quest.status === 'active'
  }

  const handleRepairCounts = async () => {
    const seasonId = selectedSeasonFilter || activeSeason?.id
    if (!seasonId) {
      showToast('No season selected.', 'error')
      return
    }
    const confirmed = window.confirm(
      'This will recalculate reserved counts for all quests in this season based on actual joined participations. Continue?'
    )
    if (!confirmed) return
    setRepairLoading(true)
    try {
      const { repairedCount } = await repairQuestReservedCounts(seasonId)
      if (repairedCount === 0) {
        showToast('All quest counts are already accurate.')
      } else {
        showToast(`Repaired ${repairedCount} quest(s).`)
      }
      loadData()
    } catch (err) {
      showToast(`Repair failed: ${err.message}`, 'error')
    } finally {
      setRepairLoading(false)
    }
  }

  const handleMarkVoucherUsed = async (redemptionId) => {
    setMarkingVoucherUsedId(redemptionId)
    try {
      const result = await adminMarkVoucherUsed(redemptionId, {
        uid: user?.uid,
        email: user?.email,
      })
      if (result.success) {
        showToast('Voucher marked as used.')
        loadData()
      } else {
        showToast(result.error || 'Failed to mark voucher as used', 'error')
      }
    } catch (error) {
      showToast(error.message, 'error')
    } finally {
      setMarkingVoucherUsedId(null)
    }
  }

  const handleVerifyLookup = async () => {
    if (!verifyCode.trim() || !activeSeason) return

    setVerifySearching(true)
    setVerifyError(null)
    setVerifyResult(null)

    try {
      await logAudit({
        action: 'voucher_verified_lookup',
        targetType: 'voucher_redemption',
        targetId: verifyCode.trim(),
        adminUid: user.uid,
        adminEmail: user.email,
        meta: { code: verifyCode.trim(), seasonId: activeSeason.id },
      })

      const result = await findRedemptionByCode({
        seasonId: activeSeason.id,
        code: verifyCode.trim()
      })

      if (!result) {
        setVerifyError('No voucher found with that code.')
      } else {
        setVerifyResult(result)
      }
    } catch (err) {
      setVerifyError(err.message || 'Failed to lookup voucher')
    } finally {
      setVerifySearching(false)
    }
  }

  const handleVerifyMarkUsed = async () => {
    if (!verifyResult || !activeSeason) return

    setVerifyMarkLoading(true)
    try {
      await adminMarkVoucherUsed({
        seasonId: activeSeason.id,
        redemptionId: verifyResult.id,
        adminUser: user,
      })

      const updated = await findRedemptionByCode({
        seasonId: activeSeason.id,
        code: verifyResult.code
      })
      setVerifyResult(updated)
      showToast('Voucher marked as used!')
    } catch (err) {
      showToast(err.message || 'Failed to mark voucher as used', 'error')
    } finally {
      setVerifyMarkLoading(false)
    }
  }

  const getVerifyDisplayStatus = () => {
    if (!verifyResult) return null
    if (verifyResult.status === 'used') return 'used'

    const expiresAt = verifyResult.voucherSnapshot?.expiresAt
    const isExpired = expiresAt && (expiresAt.toDate ? expiresAt.toDate() : new Date(expiresAt)) < new Date()
    if (isExpired) return 'expired'

    return 'unused'
  }

  const handleRunCleanup = async () => {
    setCleanupLoading(true)
    try {
      const result = await expireAllStaleParticipations()
      showToast(`Expired ${result?.expiredCount || 0} stale participations.`)
      setShowCleanupConfirm(false)
      loadData()
    } catch (error) {
      showToast(error.message, 'error')
    } finally {
      setCleanupLoading(false)
    }
  }

  if (checkingAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-emerald-600 border-t-transparent" />
      </div>
    )
  }

  if (!user || !role) {
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

  const newSubmissions = submissions.filter(s => s.status === 'new' || s.status === 'pending').length
  const newReports = reports.filter(r => r.status === 'new').length

  const moderationItems = MODERATION_ITEMS.map(item => ({
    ...item,
    count: item.key === TABS.SUBMISSIONS ? newSubmissions : item.key === TABS.REPORTS ? newReports : pendingReviews.length,
  }))

  const settingsItems = isMaster ? [{ key: TABS.MANAGE_ADMINS, icon: '🛡️', label: 'Manage Admins' }, { key: TABS.DATA_TOOLS, icon: '🛠️', label: 'Data Tools' }] : []
  const allItemsFlat = [...moderationItems, ...TOURISM_ITEMS, ...settingsItems]
  const activeItemMeta = allItemsFlat.find(t => t.key === activeTab)

  const EMPTY_STATES = {
    [TABS.SUBMISSIONS]: { icon: '📭', title: 'No submissions yet', desc: 'User-submitted businesses and destinations will appear here for review.' },
    [TABS.REPORTS]: { icon: '🚩', title: 'No reports', desc: 'User-submitted issue reports will appear here.' },
    [TABS.REVIEWS]: { icon: '⭐', title: 'No pending reviews', desc: 'User reviews waiting for moderation will appear here.' },
    [TABS.SEASONS]: { icon: '🗓️', title: 'No seasons yet', desc: 'Create a season to start the tourism program.' },
    [TABS.QUESTS]: { icon: '🎯', title: 'No quests found', desc: 'Quests for the selected season will appear here.' },
    [TABS.VOUCHERS]: { icon: '🎟️', title: 'No active season', desc: 'Activate a season to manage vouchers and redemptions.' },
    [TABS.DATA_TOOLS]: { icon: '🛠️', title: 'Data Tools', desc: 'Repair and maintain data integrity.' },
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="h-[calc(100vh-64px)] bg-gray-50 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 h-full flex flex-col">
          <header className="shrink-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">LGU Dashboard</h1>
            <p className="text-sm text-gray-500 mt-1">
              {isMaster ? 'Full access — manage everything' : 'Admin (Event Helper) — view quests and run check-ins'}
            </p>
            <p className="text-xs text-gray-400 mt-2">
              Signed in as: <span className="font-mono">{user?.email}</span>
              {' · '}
              <span className={`font-semibold ${isMaster ? 'text-emerald-600' : 'text-blue-600'}`}>
                {isMaster ? '🛡️ Master Admin' : '👤 Admin (Event Helper)'}
              </span>
            </p>
          </header>

          <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0 overflow-hidden pt-4">
            <aside className="hidden lg:block w-64 shrink-0 overflow-y-auto">
              <div className="bg-white rounded-2xl border border-gray-200 p-3">
                {isMaster && (
                  <SidebarSection title="Moderation" items={moderationItems} activeKey={activeTab} onSelect={setActiveTab} />
                )}
                <SidebarSection
                  title="Tourism Program"
                  items={isMaster ? TOURISM_ITEMS : TOURISM_ITEMS.filter(i => i.key === TABS.QUESTS)}
                  activeKey={activeTab}
                  onSelect={setActiveTab}
                />
                {isMaster && settingsItems.length > 0 && (
                  <SidebarSection title="Settings" items={settingsItems} activeKey={activeTab} onSelect={setActiveTab} />
                )}
              </div>
            </aside>

            <div className="lg:hidden shrink-0">
              <MobileTabSelector
                activeTab={activeTab}
                onChange={setActiveTab}
                moderationItems={isMaster ? moderationItems : []}
                tourismItems={isMaster ? TOURISM_ITEMS : TOURISM_ITEMS.filter(i => i.key === TABS.QUESTS)}
                settingsItems={settingsItems}
                navigate={navigate}
                counts={{ newSubmissions, newReports, pendingReviews: pendingReviews.length }}
              />
            </div>

            <main className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden">
              <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 flex-1 flex flex-col min-h-0 overflow-hidden">
                {isMaster && activeTab === TABS.SUBMISSIONS && (
                  <div className="h-full flex flex-col min-h-0">
                    <div className="shrink-0">
                      <div className="flex items-center gap-2 mb-4">
                        <span className="text-xl">📥</span>
                        <div>
                          <h2 className="text-lg font-semibold text-gray-900">Submissions</h2>
                          <p className="text-sm text-gray-500">Review business and destination suggestions from users</p>
                        </div>
                      </div>
                      <div className="border-b border-gray-200 pb-4 mb-4 flex gap-2 overflow-x-auto">
                        <button
                          onClick={() => setSubmissionTypeFilter('all')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap ${
                            submissionTypeFilter === 'all'
                              ? 'bg-emerald-600 text-white'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          All ({submissions.length})
                        </button>
                        <button
                          onClick={() => setSubmissionTypeFilter('business')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap ${
                            submissionTypeFilter === 'business'
                              ? 'bg-emerald-600 text-white'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          Businesses ({submissions.filter(s => s.type === 'business').length})
                        </button>
                        <button
                          onClick={() => setSubmissionTypeFilter('destination')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap ${
                            submissionTypeFilter === 'destination'
                              ? 'bg-emerald-600 text-white'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          Destinations ({submissions.filter(s => s.type === 'destination').length})
                        </button>
                      </div>
                    </div>
                    <div className="flex-1 min-h-0 overflow-y-auto">
                    {loading ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-emerald-600 border-t-transparent" />
                      </div>
                    ) : submissions.length === 0 ? (
                      <div className="text-center py-12">
                        <div className="text-5xl mb-3">{EMPTY_STATES[TABS.SUBMISSIONS].icon}</div>
                        <h3 className="font-semibold text-gray-800">{EMPTY_STATES[TABS.SUBMISSIONS].title}</h3>
                        <p className="text-sm text-gray-500 mt-1">{EMPTY_STATES[TABS.SUBMISSIONS].desc}</p>
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
                            {submissions
                              .filter(sub => submissionTypeFilter === 'all' || sub.type === submissionTypeFilter)
                              .map(sub => (
                              <tr 
                                key={sub.id} 
                                onClick={() => setSelectedSubmission(sub)}
                                className={`hover:bg-gray-50 cursor-pointer ${
                                  sub.type === 'business' ? 'bg-emerald-50/50' : sub.type === 'destination' ? 'bg-blue-50/50' : ''
                                }`}
                              >
                                <td className="px-4 py-3 font-medium text-gray-900">
                                  <div className="flex items-center gap-2">
                                    {sub.type === 'business' && (
                                      <span className="text-xs px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded font-medium">🏪</span>
                                    )}
                                    {sub.type === 'destination' && (
                                      <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded font-medium">🌴</span>
                                    )}
                                    {getSubmissionDisplayName(sub)}
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-gray-600">
                                  {sub.type === 'business' ? 'Business Registration' : sub.type === 'destination' ? 'Destination' : (sub.entryType || 'other')}
                                </td>
                                <td className="px-4 py-3 text-gray-600">
                                  {sub.type === 'business' ? getCategoryLabel(sub.category) : (sub.category || '-')}
                                </td>
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
                  </div>
                )}

                {isMaster && activeTab === TABS.REPORTS && (
                  <div className="h-full flex flex-col min-h-0">
                    <div className="shrink-0">
                      <div className="flex items-center gap-2 mb-4">
                        <span className="text-xl">🚩</span>
                        <div>
                          <h2 className="text-lg font-semibold text-gray-900">Reports</h2>
                          <p className="text-sm text-gray-500">User-submitted issue reports about places</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex-1 min-h-0 overflow-y-auto">
                    {loading ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-emerald-600 border-t-transparent" />
                      </div>
                    ) : reports.length === 0 ? (
                      <div className="text-center py-12">
                        <div className="text-5xl mb-3">{EMPTY_STATES[TABS.REPORTS].icon}</div>
                        <h3 className="font-semibold text-gray-800">{EMPTY_STATES[TABS.REPORTS].title}</h3>
                        <p className="text-sm text-gray-500 mt-1">{EMPTY_STATES[TABS.REPORTS].desc}</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Reporter</th>
                              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Reason</th>
                              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Target</th>
                              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Date</th>
                              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {reports.map(report => (
                              <tr 
                                key={report.id} 
                                onClick={() => setSelectedReport(report)}
                                className="hover:bg-gray-50 cursor-pointer"
                              >
                                <td className="px-4 py-3 font-medium text-gray-900">{report.reporterEmail || 'Anonymous'}</td>
                                <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{report.reason}</td>
                                <td className="px-4 py-3 text-gray-600 capitalize">{report.targetType}</td>
                                <td className="px-4 py-3 text-gray-600 text-sm">
                                  {report.createdAt ? new Date(report.createdAt).toLocaleDateString() : '-'}
                                </td>
                                <td className="px-4 py-3">
                                  <StatusBadge status={report.status} />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    </div>
                  </div>
                )}

                {isMaster && activeTab === TABS.REVIEWS && (
                  <div className="h-full flex flex-col min-h-0">
                    <div className="shrink-0">
                      <div className="flex items-center gap-2 mb-4">
                        <span className="text-xl">⭐</span>
                        <div>
                          <h2 className="text-lg font-semibold text-gray-900">Reviews</h2>
                          <p className="text-sm text-gray-500">Moderate user-submitted reviews</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex-1 min-h-0 overflow-y-auto">
                    {loading ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-emerald-600 border-t-transparent" />
                      </div>
                    ) : pendingReviews.length === 0 ? (
                      <div className="text-center py-12">
                        <div className="text-5xl mb-3">{EMPTY_STATES[TABS.REVIEWS].icon}</div>
                        <h3 className="font-semibold text-gray-800">{EMPTY_STATES[TABS.REVIEWS].title}</h3>
                        <p className="text-sm text-gray-500 mt-1">{EMPTY_STATES[TABS.REVIEWS].desc}</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">User</th>
                              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Type</th>
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
                                <td className="px-4 py-3 font-medium text-gray-900">{review.userDisplayName || review.userEmail || 'Anonymous'}</td>
                                <td className="px-4 py-3 text-gray-600 capitalize">{review.targetType}</td>
                                <td className="px-4 py-3">
                                  <span className="flex items-center gap-1">
                                    <span className="text-yellow-400">★</span>
                                    <span className="font-medium">{review.rating}</span>
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-gray-600 text-sm max-w-xs truncate">{review.text || review.review}</td>
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
                  </div>
                )}

                {isMaster && activeTab === TABS.SEASONS && (
                  <div className="h-full flex flex-col min-h-0">
                    <div className="shrink-0">
                      <div className="flex items-center justify-between gap-4 mb-4">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">🗓️</span>
                          <div>
                            <h2 className="text-lg font-semibold text-gray-900">Seasons</h2>
                            <p className="text-sm text-gray-500">Create and manage tourism seasons</p>
                          </div>
                        </div>
                        <button
                          onClick={() => setShowSeasonModal(true)}
                          className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium shrink-0"
                        >
                          + Create Season
                        </button>
                      </div>
                    </div>
                    <div className="flex-1 min-h-0 overflow-y-auto">
                    {loading ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-emerald-600 border-t-transparent" />
                      </div>
                    ) : seasons.length === 0 ? (
                      <div className="text-center py-12">
                        <div className="text-5xl mb-3">{EMPTY_STATES[TABS.SEASONS].icon}</div>
                        <h3 className="font-semibold text-gray-800">{EMPTY_STATES[TABS.SEASONS].title}</h3>
                        <p className="text-sm text-gray-500 mt-1">{EMPTY_STATES[TABS.SEASONS].desc}</p>
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
                                  {season.startAt?.toDate ? season.startAt.toDate().toLocaleDateString() : (season.startAt || '-')}
                                </td>
                                <td className="px-4 py-3 text-gray-600 text-sm">
                                  {season.endAt?.toDate ? season.endAt.toDate().toLocaleDateString() : (season.endAt || '-')}
                                </td>
                                <td className="px-4 py-3">
                                  <StatusBadge status={season.status} />
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex gap-2">
                                    {season.status === 'inactive' ? (
                                      <button
                                        onClick={() => handleActivateSeason(season.id)}
                                        disabled={actionLoading}
                                        className="text-sm font-medium text-emerald-600 hover:text-emerald-700 disabled:opacity-50"
                                      >
                                        Activate
                                      </button>
                                    ) : season.status === 'active' ? (
                                      <button
                                        onClick={() => handleCloseSeason(season.id)}
                                        disabled={actionLoading}
                                        className="text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
                                      >
                                        Close
                                      </button>
                                    ) : null}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {activeSeason && (
                      <div className="mt-8 pt-8 border-t border-gray-200">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-md font-semibold text-gray-900">Leaderboard — {activeSeason.name}</h3>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setLeaderboardTab('points')}
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                                leaderboardTab === 'points' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              Points
                            </button>
                            <button
                              onClick={() => setLeaderboardTab('impact')}
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                                leaderboardTab === 'impact' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              Impact
                            </button>
                          </div>
                        </div>
                        {leaderboardData.length > 0 ? (
                          <div className="space-y-2">
                            {leaderboardData.map((entry, i) => (
                              <div key={entry.uid || i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                                  i === 0 ? 'bg-yellow-100 text-yellow-700' : i === 1 ? 'bg-gray-200 text-gray-700' : i === 2 ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'
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
                        ) : (
                          <p className="text-sm text-gray-500 text-center py-4">No leaderboard data yet.</p>
                        )}
                      </div>
                    )}
                    </div>
                  </div>
                )}

                {activeTab === TABS.QUESTS && (
                  <div className="h-full flex flex-col min-h-0">
                    <div className="shrink-0">
                      <div className="flex items-center justify-between gap-4 mb-4">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">🎯</span>
                          <div>
                            <h2 className="text-lg font-semibold text-gray-900">Quests</h2>
                            <p className="text-sm text-gray-500">Manage quests within the active season</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
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
                          {isMaster && (
                            <button
                              onClick={() => setShowQuestModal(true)}
                              disabled={!selectedSeasonFilter && !activeSeason}
                              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium disabled:bg-gray-300 shrink-0"
                            >
                              + Create Quest
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 mb-3 text-sm">
                        <p className="font-semibold text-gray-700 mb-2">Status Guide:</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-600">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> LIVE
                            </span>
                            <span>Visible to users, can be joined</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                              <span className="w-1.5 h-1.5 rounded-full bg-gray-400" /> DRAFT
                            </span>
                            <span>Hidden from users (work in progress)</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-3">
                        <div className="relative flex-1 max-w-md">
                          <input
                            type="text"
                            value={questSearchQuery}
                            onChange={(e) => setQuestSearchQuery(e.target.value)}
                            placeholder="🔍 Search by title, category, or code..."
                            className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-gray-300 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 focus:outline-none bg-white"
                          />
                          {questSearchQuery && (
                            <button
                              type="button"
                              onClick={() => setQuestSearchQuery('')}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 w-6 h-6 flex items-center justify-center"
                              aria-label="Clear search"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 shrink-0">
                          {filteredQuests.length} of {quests.length} quests
                          {questSearchQuery && ` matching "${questSearchQuery}"`}
                        </p>
                        {isMaster && (
                          <div className="flex gap-2 sm:ml-auto">
                            <button
                              onClick={() => setShowCleanupConfirm(true)}
                              className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
                            >
                              ⏰ Expire Stale
                            </button>
                            <button
                              onClick={handleRepairCounts}
                              disabled={repairLoading}
                              className="px-3 py-2 text-sm border border-amber-300 bg-amber-50 text-amber-800 rounded-lg hover:bg-amber-100 font-medium disabled:opacity-50"
                              title="Recalculates reserved counts based on actual participations. Fixes negative numbers."
                            >
                              {repairLoading ? 'Repairing...' : '🔧 Repair Counts'}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex-1 min-h-0 border border-gray-200 rounded-xl overflow-hidden flex flex-col">
                      {loading ? (
                        <div className="flex-1 flex items-center justify-center">
                          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-emerald-600 border-t-transparent" />
                        </div>
                      ) : quests.length === 0 ? (
                        <div className="flex-1 flex items-center justify-center">
                          <div className="text-center">
                            <div className="text-5xl mb-3">{EMPTY_STATES[TABS.QUESTS].icon}</div>
                            <h3 className="font-semibold text-gray-800">{EMPTY_STATES[TABS.QUESTS].title}</h3>
                            <p className="text-sm text-gray-500 mt-1">{EMPTY_STATES[TABS.QUESTS].desc}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex-1 overflow-y-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-gray-50 sticky top-0 z-10 border-b border-gray-200">
                              <tr>
                                <th className="text-left px-3 py-3 text-xs font-medium text-gray-500 uppercase">Title</th>
                                <th className="text-left px-3 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                                <th className="text-left px-3 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {filteredQuests.length === 0 ? (
                                <tr>
                                  <td colSpan={3} className="py-12 text-center">
                                    <div className="text-4xl mb-2">🔍</div>
                                    <p className="text-gray-500">No quests match "{questSearchQuery}"</p>
                                    <button
                                      onClick={() => setQuestSearchQuery('')}
                                      className="mt-2 text-sm text-emerald-600 hover:text-emerald-700 font-semibold"
                                    >
                                      Clear search
                                    </button>
                                  </td>
                                </tr>
                              ) : (
                                filteredQuests.map(quest => {
                                  const isActive = getQuestIsActive(quest)
                                  return (
                                    <tr key={quest.id} className="hover:bg-gray-50">
                                      <td className="py-3 px-3 min-w-[220px] max-w-[420px]">
                                        <div className="font-medium text-gray-900 text-sm leading-snug">{quest.title}</div>
                                        {quest.description && (
                                          <div className="text-xs text-gray-500 mt-0.5 truncate max-w-md">{quest.description}</div>
                                        )}
                                      </td>
                                      <td className="px-2 sm:px-3 py-3 whitespace-nowrap">
                                        {isMaster ? (
                                          <div className="flex items-center gap-2 group relative">
                                            <button
                                              type="button"
                                              onClick={() => handleToggleClick(quest)}
                                              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                                isActive ? 'bg-emerald-600' : 'bg-gray-300'
                                              }`}
                                              role="switch"
                                              aria-checked={isActive}
                                              aria-label={isActive ? 'Deactivate quest' : 'Activate quest'}
                                            >
                                              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                                isActive ? 'translate-x-6' : 'translate-x-1'
                                              }`} />
                                            </button>
                                            <span className={`text-xs font-semibold ${isActive ? 'text-emerald-700' : 'text-gray-500'}`}>
                                              {isActive ? 'Live' : 'Draft'}
                                            </span>
                                            <div className="invisible group-hover:visible absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 bg-gray-900 text-white text-xs rounded-lg p-2 shadow-lg z-10">
                                              {isActive
                                                ? 'Live quests are visible and joinable by all users.'
                                                : 'Draft quests are hidden from users. Toggle to publish.'}
                                              <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-gray-900 rotate-45" />
                                            </div>
                                          </div>
                                        ) : (
                                          <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
                                            isActive
                                              ? 'bg-emerald-100 text-emerald-700'
                                              : 'bg-gray-100 text-gray-600'
                                          }`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                                            {isActive ? 'LIVE' : 'DRAFT'}
                                          </span>
                                        )}
                                      </td>
                                      <td className="px-2 sm:px-3 py-3 whitespace-nowrap">
                                        <div className="flex items-center gap-1">
                                          <button
                                            onClick={() => {
                                              const impactForQuest = questImpactTotals[quest.id]
                                              setSelectedQuestDetails({ quest, impactForQuest, participations: [] })
                                            }}
                                            className="px-2 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg whitespace-nowrap"
                                          >
                                            View Details
                                          </button>
                                          <button
                                            onClick={() => setCheckInQuest(quest)}
                                            className="px-2 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg whitespace-nowrap"
                                            title="Check in participants"
                                          >
                                            ✅ Check In
                                          </button>
                                          {isMaster && (
                                            <button
                                              onClick={() => setSelectedQuest(quest)}
                                              className="px-2 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-lg"
                                            >
                                              Edit
                                            </button>
                                          )}
                                        </div>
                                      </td>
                                    </tr>
                                  )
                                })
                              )}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {isMaster && activeTab === TABS.MANAGE_ADMINS && (
                  <div className="h-full flex flex-col min-h-0">
                    <div className="flex-1 min-h-0 overflow-y-auto">
                      <ManageAdminsPanel currentUserUid={user.uid} />
                    </div>
                  </div>
                )}
                {isMaster && activeTab === TABS.DATA_TOOLS && (
                  <div className="h-full flex flex-col min-h-0">
                    <div className="flex-1 min-h-0 overflow-y-auto">
                      <DataToolsPanel user={user} />
                    </div>
                  </div>
                )}

                {isMaster && activeTab === TABS.VOUCHERS && (
                  <div className="h-full flex flex-col min-h-0">
                    <div className="shrink-0">
                      <div className="flex items-center gap-2 mb-4">
                        <span className="text-xl">🎟️</span>
                        <div>
                          <h2 className="text-lg font-semibold text-gray-900">Vouchers</h2>
                          <p className="text-sm text-gray-500 mt-1">Look up voucher codes and manage the redemption log.</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 min-h-0 overflow-y-auto">
                    {loading ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-emerald-600 border-t-transparent" />
                      </div>
                    ) : !activeSeason ? (
                      <div className="text-center py-12">
                        <div className="text-5xl mb-3">{EMPTY_STATES[TABS.VOUCHERS].icon}</div>
                        <h3 className="font-semibold text-gray-800">{EMPTY_STATES[TABS.VOUCHERS].title}</h3>
                        <p className="text-sm text-gray-500 mt-1">{EMPTY_STATES[TABS.VOUCHERS].desc}</p>
                      </div>
                    ) : (
                      <>
                        {/* ===== VERIFY VOUCHER SECTION ===== */}
                        <section className="border border-gray-200 rounded-2xl p-5 bg-gray-50">
                          <h3 className="font-semibold text-gray-800 flex items-center gap-2 mb-1">
                            🔍 Verify a Voucher
                          </h3>
                          <p className="text-sm text-gray-500 mb-4">
                            Enter a voucher code to look it up and mark it as used.
                          </p>

                          <div className="flex flex-col sm:flex-row gap-2">
                            <input
                              type="text"
                              value={verifyCode}
                              onChange={(e) => setVerifyCode(e.target.value.toUpperCase())}
                              placeholder="e.g., CAB-XYZ123ABC"
                              className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 focus:outline-none font-mono text-sm tracking-wider bg-white"
                              onKeyDown={(e) => e.key === 'Enter' && handleVerifyLookup()}
                            />
                            <button
                              onClick={handleVerifyLookup}
                              disabled={!verifyCode.trim() || verifySearching}
                              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition"
                            >
                              {verifySearching ? 'Looking up...' : 'Lookup'}
                            </button>
                          </div>

                          {verifyError && (
                            <div className="mt-3 bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">
                              {verifyError}
                            </div>
                          )}

                          {verifyResult && (() => {
                            const displayStatus = getVerifyDisplayStatus()
                            const isExpired = displayStatus === 'expired'
                            return (
                              <div className="mt-4 bg-white border border-emerald-200 rounded-xl p-4">
                                <div className="flex items-start justify-between gap-3 mb-3">
                                  <div>
                                    <p className="text-xs text-gray-500 uppercase font-semibold">Voucher</p>
                                    <p className="font-bold text-gray-900">{verifyResult.voucherSnapshot?.title || 'Voucher'}</p>
                                    {verifyResult.voucherSnapshot?.partnerName && (
                                      <p className="text-sm text-gray-500">{verifyResult.voucherSnapshot.partnerName}</p>
                                    )}
                                  </div>
                                  <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                                    displayStatus === 'used' ? 'bg-gray-100 text-gray-600' :
                                    displayStatus === 'expired' ? 'bg-red-100 text-red-700' :
                                    'bg-emerald-100 text-emerald-700'
                                  }`}>
                                    {displayStatus === 'expired' ? 'EXPIRED' : displayStatus?.toUpperCase()}
                                  </span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                                  <div>
                                    <p className="text-xs text-gray-500">Code</p>
                                    <p className="font-mono">{verifyResult.code}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-500">Points Cost</p>
                                    <p className="font-semibold">{verifyResult.pointsCost ?? 0} pts</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-500">Redeemed By</p>
                                    <p>{verifyResult.userEmail || verifyResult.uid}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-500">Redeemed</p>
                                    <p>{verifyResult.redeemedAt?.toDate?.().toLocaleString() || '\u2014'}</p>
                                  </div>
                                  {verifyResult.usedAt && (
                                    <div>
                                      <p className="text-xs text-gray-500">Used At</p>
                                      <p>{verifyResult.usedAt.toDate().toLocaleString()}</p>
                                    </div>
                                  )}
                                  {verifyResult.usedByEmail && (
                                    <div>
                                      <p className="text-xs text-gray-500">Used By</p>
                                      <p>{verifyResult.usedByEmail}</p>
                                    </div>
                                  )}
                                  <div>
                                    <p className="text-xs text-gray-500">Expires</p>
                                    <p>{verifyResult.voucherSnapshot?.expiresAt?.toDate?.().toLocaleDateString() || 'No expiry'}</p>
                                  </div>
                                </div>

                                {displayStatus === 'unused' && !isExpired && (
                                  <div className="mt-4 pt-4 border-t border-gray-100">
                                    <button
                                      onClick={handleVerifyMarkUsed}
                                      disabled={verifyMarkLoading}
                                      className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold transition"
                                    >
                                      {verifyMarkLoading ? 'Marking...' : 'Mark as Used'}
                                    </button>
                                  </div>
                                )}

                                {displayStatus === 'used' && (
                                  <p className="mt-3 text-sm text-gray-500">
                                    This voucher was already used on {verifyResult.usedAt?.toDate?.toLocaleString() || 'unknown date'}.
                                  </p>
                                )}

                                {isExpired && (
                                  <p className="mt-3 text-sm text-red-600">
                                    Expired \u2014 cannot use
                                  </p>
                                )}
                              </div>
                            )
                          })()}
                        </section>

                        {/* ===== REDEMPTION LOG SECTION ===== */}
                        <section>
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                                📋 Redemption Log
                              </h3>
                              <p className="text-sm text-gray-500 mt-1">
                                All voucher redemptions from users.
                              </p>
                            </div>

                            <div className="flex items-center gap-2 text-sm">
                              <label htmlFor="status-filter" className="text-gray-600">Filter:</label>
                              <select
                                id="status-filter"
                                value={redemptionStatusFilter}
                                onChange={(e) => setRedemptionStatusFilter(e.target.value)}
                                className="px-3 py-1.5 rounded-lg border border-gray-300 bg-white"
                              >
                                <option value="all">All</option>
                                <option value="unused">Unused</option>
                                <option value="used">Used</option>
                              </select>
                            </div>
                          </div>

                          {seasonRedemptions.length === 0 ? (
                            <div className="text-center py-8">
                              <p className="text-gray-500">No redemptions for this season yet.</p>
                            </div>
                          ) : (
                            <div className="w-full overflow-x-auto">
                              <table className="min-w-[700px] w-full text-sm">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                  <tr>
                                    <th className="text-left px-3 py-3 text-xs font-medium text-gray-500 uppercase">Code</th>
                                    <th className="text-left px-3 py-3 text-xs font-medium text-gray-500 uppercase">User</th>
                                    <th className="text-left px-3 py-3 text-xs font-medium text-gray-500 uppercase">Voucher</th>
                                    <th className="text-left px-3 py-3 text-xs font-medium text-gray-500 uppercase">Redeemed</th>
                                    <th className="text-left px-3 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                                    <th className="text-left px-3 py-3 text-xs font-medium text-gray-500 uppercase">Action</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                  {seasonRedemptions
                                    .filter((r) => redemptionStatusFilter === 'all' || r.status === redemptionStatusFilter)
                                    .map((r) => (
                                      <tr key={r.id} className="hover:bg-gray-50">
                                        <td className="px-3 py-3 font-mono text-sm">{r.code}</td>
                                        <td className="px-3 py-3 text-sm text-gray-600">{r.userEmail || r.uid || '\u2014'}</td>
                                        <td className="px-3 py-3 text-sm">
                                          {r.voucherSnapshot?.title || r.voucherId || '\u2014'}
                                        </td>
                                        <td className="px-3 py-3 text-sm text-gray-600">
                                          {r.redeemedAt?.toDate ? r.redeemedAt.toDate().toLocaleString() : '\u2014'}
                                        </td>
                                        <td className="px-3 py-3">
                                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                            r.status === 'used' ? 'bg-gray-100 text-gray-700' : 'bg-emerald-100 text-emerald-700'
                                          }`}>
                                            {r.status === 'used' ? 'Used' : 'Unused'}
                                          </span>
                                        </td>
                                        <td className="px-3 py-3">
                                          {r.status === 'unused' ? (
                                            <button
                                              type="button"
                                              disabled={markingVoucherUsedId === r.id}
                                              onClick={() => handleMarkVoucherUsed(r.id)}
                                              className="text-sm font-medium text-indigo-600 hover:text-indigo-700 disabled:opacity-50"
                                            >
                                              {markingVoucherUsedId === r.id ? '\u2026' : 'Mark Used'}
                                            </button>
                                          ) : (
                                            <span className="text-sm text-gray-400">\u2014</span>
                                          )}
                                        </td>
                                      </tr>
                                    ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                          <p className="text-xs text-gray-400 mt-4">
                            To view merchant insights, click a partner name in the voucher list from the merchant detail page.
                          </p>
                        </section>
                      </>
                    )}
                    </div>
                  </div>
                )}
              </div>
            </main>
          </div>
        </div>
      </div>

      {selectedSubmission && (
        <SubmissionModal
          submission={selectedSubmission}
          onClose={() => setSelectedSubmission(null)}
          onApprove={handleApprove}
          onReject={handleRejectClick}
          onNeedsInfo={handleNeedsInfo}
          isLoading={actionLoading}
        />
      )}

      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Reject Submission</h3>
            <p className="text-sm text-gray-600 mb-4">
              Provide a reason for rejecting this submission. The submitter will see this on their profile.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="Reason for rejection..."
            />
            <div className="flex gap-3 mt-4">
              <button
                type="button"
                onClick={() => {
                  setShowRejectModal(false)
                  setRejectReason('')
                }}
                disabled={actionLoading}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={actionLoading || !rejectReason.trim()}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300"
              >
                {actionLoading ? 'Rejecting...' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
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

      {showCleanupConfirm && createPortal(
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
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
        </div>,
        document.body
      )}

      {confirmToggle && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60" onClick={() => setConfirmToggle(null)} />
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-6">
            <div className="flex items-start gap-4 mb-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl shrink-0 ${
                confirmToggle.status !== 'active' ? 'bg-emerald-100' : 'bg-amber-100'
              }`}>
                {confirmToggle.status !== 'active' ? '🚀' : '📝'}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg text-gray-900">
                  {confirmToggle.status !== 'active' ? 'Publish this quest?' : 'Move to Draft?'}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  <strong>&ldquo;{confirmToggle.title}&rdquo;</strong>
                </p>
              </div>
            </div>
            <div className={`rounded-xl p-3 text-sm mb-5 ${
              confirmToggle.status !== 'active' ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'
            }`}>
              {confirmToggle.status !== 'active' ? (
                <>This quest will become <strong>visible to all users</strong> on the Events page and they can join it to earn points.</>
              ) : (
                <>This quest will be <strong>hidden from users</strong>. Existing participants keep their progress, but no new joins are allowed.</>
              )}
            </div>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setConfirmToggle(null)}
                className="px-5 py-2.5 rounded-xl border border-gray-300 bg-white text-gray-700 font-semibold hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmToggleAction}
                disabled={actionLoading}
                className={`px-5 py-2.5 rounded-xl text-white font-semibold transition ${
                  confirmToggle.status !== 'active'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-amber-600 hover:bg-amber-700'
                } disabled:opacity-50`}
              >
                {confirmToggle.status !== 'active' ? 'Yes, publish' : 'Yes, move to Draft'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {checkInQuest && (
        <CheckInModal
          quest={checkInQuest}
          onClose={() => setCheckInQuest(null)}
          onSuccess={loadData}
        />
      )}

      {qrModalQuest && (
        <QRDisplayModal
          quest={qrModalQuest}
          onClose={() => setQrModalQuest(null)}
        />
      )}

      {selectedQuestDetails && (
        <QuestDetailsModal
          quest={selectedQuestDetails.quest}
          participations={selectedQuestDetails.participations}
          impactForQuest={selectedQuestDetails.impactForQuest}
          isMaster={isMaster}
          questDetails={questDetails}
          onClose={() => setSelectedQuestDetails(null)}
        />
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
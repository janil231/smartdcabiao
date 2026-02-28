import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
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
import { isWithinCabiaoBounds, CABIAO_BOUNDS } from '../constants/cabiaoGeo'

const TABS = {
  SUBMISSIONS: 'submissions',
  REPORTS: 'reports'
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
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState(TABS.SUBMISSIONS)
  const [submissions, setSubmissions] = useState([])
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [checkingAdmin, setCheckingAdmin] = useState(true)
  const [isUserAdmin, setIsUserAdmin] = useState(false)
  const [selectedSubmission, setSelectedSubmission] = useState(null)
  const [selectedReport, setSelectedReport] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [toast, setToast] = useState(null)

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
    loadData()
  }, [user, activeTab, isUserAdmin])

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const loadData = async () => {
    setLoading(true)
    try {
      if (activeTab === TABS.SUBMISSIONS) {
        const data = await listSubmissions({ status: null })
        setSubmissions(data)
      } else {
        const data = await listReports({ status: null })
        setReports(data)
      }
    } catch (error) {
      console.error('Error loading data:', error)
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

          <div className="flex gap-2 mb-6">
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
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              {reports.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  No reports found
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Type</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Issue</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Message</th>
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
                          <td className="px-4 py-3 text-gray-600">{report.targetType || '-'}</td>
                          <td className="px-4 py-3 text-gray-600">{report.issueType || '-'}</td>
                          <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{report.message || '-'}</td>
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
          )}
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

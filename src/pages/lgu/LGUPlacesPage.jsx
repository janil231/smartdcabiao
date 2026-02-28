import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'
import { useAuth } from '../../contexts/AuthContext'
import { isAdmin } from '../../services/adminRole.service'
import { listPlaces, deletePlace } from '../../services/adminPlaces.service'
import { importPlacesFromRows, exportPlacesToCSV } from '../../services/adminBulkImport.service'
import { 
  parseCSV, 
  normalizeBusinessRow, 
  normalizeDestinationRow, 
  downloadCSV,
  BUSINESS_CSV_TEMPLATE,
  DESTINATION_CSV_TEMPLATE
} from '../../utils/csv'

const TABS = {
  BUSINESSES: 'businesses',
  DESTINATIONS: 'destinations'
}

function StatusBadge({ verified }) {
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${verified ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
      {verified ? 'Verified' : 'Unverified'}
    </span>
  )
}

function ConfirmModal({ isOpen, title, message, onConfirm, onCancel, confirmText = 'Delete', isDanger = true }) {
  if (!isOpen) return null
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onCancel}>
      <div className="bg-white rounded-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
        <p className="text-gray-600 mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded-lg font-medium text-white ${isDanger ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}

function ImportModal({ isOpen, onClose, type, onImportComplete }) {
  const [file, setFile] = useState(null)
  const [parsedData, setParsedData] = useState(null)
  const [mode, setMode] = useState('create')
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState(null)

  if (!isOpen) return null

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    setFile(selectedFile)
    setError(null)

    try {
      const text = await selectedFile.text()
      const { headers, rows } = parseCSV(text)

      if (rows.length === 0) {
        setError('CSV file is empty')
        return
      }

      const normalizeRow = type === 'businesses' ? normalizeBusinessRow : normalizeDestinationRow
      const validatedRows = rows.map(row => normalizeRow(row))

      setParsedData({ headers, rows: validatedRows })
    } catch (err) {
      setError('Failed to parse CSV: ' + err.message)
    }
  }

  const handleImport = async () => {
    if (!parsedData) return

    setImporting(true)
    try {
      const validRows = parsedData.rows.filter(row => !row.errors || row.errors.length === 0)
      const result = await importPlacesFromRows(type, validRows, {
        mode,
        uid: null,
        email: null
      })

      onImportComplete(result)
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setImporting(false)
    }
  }

  const validRows = parsedData?.rows.filter(r => !r.errors?.length) || []
  const invalidRows = parsedData?.rows.filter(r => r.errors?.length > 0) || []

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-bold text-gray-900">Import {type === 'businesses' ? 'Businesses' : 'Destinations'}</h3>
          <p className="text-sm text-gray-600">Upload a CSV file to import places</p>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {!parsedData ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select CSV File</label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                />
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => downloadCSV(BUSINESS_CSV_TEMPLATE, 'businesses_template.csv')}
                  className="text-sm text-emerald-600 hover:underline"
                >
                  Download Businesses Template
                </button>
                <button
                  onClick={() => downloadCSV(DESTINATION_CSV_TEMPLATE, 'destinations_template.csv')}
                  className="text-sm text-emerald-600 hover:underline"
                >
                  Download Destinations Template
                </button>
              </div>

              {error && (
                <div className="p-3 bg-red-50 text-red-700 rounded-lg">{error}</div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600">
                  {validRows.length} valid rows, {invalidRows.length} invalid rows
                </span>
                <button
                  onClick={() => { setParsedData(null); setFile(null); }}
                  className="text-sm text-emerald-600 hover:underline"
                >
                  Choose different file
                </button>
              </div>

              <div className="flex gap-4 items-center">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="mode"
                    value="create"
                    checked={mode === 'create'}
                    onChange={() => setMode('create')}
                  />
                  <span className="text-sm">Create only (new IDs)</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="mode"
                    value="upsert"
                    checked={mode === 'upsert'}
                    onChange={() => setMode('upsert')}
                  />
                  <span className="text-sm">Upsert (requires ID column)</span>
                </label>
              </div>

              {invalidRows.length > 0 && (
                <div className="p-3 bg-yellow-50 text-yellow-700 rounded-lg text-sm">
                  {invalidRows.length} row(s) have validation errors and will be skipped
                </div>
              )}

              <div className="overflow-x-auto max-h-64 border rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-2 py-1 text-left">#</th>
                      <th className="px-2 py-1 text-left">Name</th>
                      <th className="px-2 py-1 text-left">Type</th>
                      <th className="px-2 py-1 text-left">Category</th>
                      <th className="px-2 py-1 text-left">Lat</th>
                      <th className="px-2 py-1 text-left">Lng</th>
                      <th className="px-2 py-1 text-left">Errors</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedData.rows.slice(0, 20).map((row, i) => (
                      <tr key={i} className={row.errors?.length ? 'bg-red-50' : 'bg-white'}>
                        <td className="px-2 py-1">{i + 1}</td>
                        <td className="px-2 py-1">{row.data.name || '-'}</td>
                        <td className="px-2 py-1">{row.data.type || '-'}</td>
                        <td className="px-2 py-1">{row.data.category || '-'}</td>
                        <td className="px-2 py-1">{row.data.position?.[0] || '-'}</td>
                        <td className="px-2 py-1">{row.data.position?.[1] || '-'}</td>
                        <td className="px-2 py-1 text-red-600">{row.errors?.join(', ') || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {parsedData.rows.length > 20 && (
                  <p className="p-2 text-sm text-gray-500 text-center">
                    Showing first 20 of {parsedData.rows.length} rows
                  </p>
                )}
              </div>

              {error && (
                <div className="p-3 bg-red-50 text-red-700 rounded-lg">{error}</div>
              )}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
          >
            Cancel
          </button>
          {parsedData && (
            <button
              onClick={handleImport}
              disabled={importing || validRows.length === 0}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium disabled:opacity-50"
            >
              {importing ? 'Importing...' : `Import ${validRows.length} valid rows`}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function LGUPlacesPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState(TABS.BUSINESSES)
  const [places, setPlaces] = useState([])
  const [loading, setLoading] = useState(true)
  const [checkingAdmin, setCheckingAdmin] = useState(true)
  const [isUserAdmin, setIsUserAdmin] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [deleteModal, setDeleteModal] = useState(null)
  const [importModalOpen, setImportModalOpen] = useState(false)
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
    loadPlaces()
  }, [user, activeTab, isUserAdmin])

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const loadPlaces = async () => {
    setLoading(true)
    try {
      const data = await listPlaces(activeTab)
      setPlaces(data)
    } catch (error) {
      console.error('Error loading places:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (place) => {
    const result = await deletePlace(activeTab, place.id, {
      uid: user.uid,
      email: user.email
    })
    
    if (result.success) {
      showToast('Place deleted successfully')
      loadPlaces()
    } else {
      showToast(result.error || 'Failed to delete', 'error')
    }
    setDeleteModal(null)
  }

  const handleExport = async () => {
    try {
      const csv = await exportPlacesToCSV(activeTab)
      const filename = `${activeTab}_${new Date().toISOString().split('T')[0]}.csv`
      downloadCSV(csv, filename)
      showToast('Export successful!')
    } catch (error) {
      showToast('Export failed: ' + error.message, 'error')
    }
  }

  const handleImportComplete = (result) => {
    showToast(`Imported ${result.createdCount} new, updated ${result.updatedCount} rows`)
    loadPlaces()
  }

  const filteredPlaces = places.filter(place => {
    if (!searchTerm) return true
    const term = searchTerm.toLowerCase()
    return (
      place.name?.toLowerCase().includes(term) ||
      place.category?.toLowerCase().includes(term) ||
      place.barangay?.toLowerCase().includes(term)
    )
  })

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
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="flex-1 flex items-center justify-center px-4 py-20">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
            <p className="text-gray-600 mb-4">You are not authorized to access this page.</p>
            <Link to="/" className="text-emerald-600 hover:underline">Back to Home</Link>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <main className="flex-1 pb-20 md:pb-0">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Manage Places</h1>
              <p className="text-gray-600">Add, edit, or remove businesses and destinations</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleExport}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium text-sm"
              >
                Export CSV
              </button>
              <button
                onClick={() => setImportModalOpen(true)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium text-sm"
              >
                Import CSV
              </button>
              <Link
                to={`/lgu/places/${activeTab}/new`}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium"
              >
                + Add New {activeTab === 'businesses' ? 'Business' : 'Destination'}
              </Link>
            </div>
          </div>

          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setActiveTab(TABS.BUSINESSES)}
              className={`flex-1 py-3 px-4 font-medium text-sm rounded-lg transition-colors ${
                activeTab === TABS.BUSINESSES 
                  ? 'bg-emerald-600 text-white' 
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              Businesses ({places.length})
            </button>
            <button
              onClick={() => setActiveTab(TABS.DESTINATIONS)}
              className={`flex-1 py-3 px-4 font-medium text-sm rounded-lg transition-colors ${
                activeTab === TABS.DESTINATIONS 
                  ? 'bg-emerald-600 text-white' 
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              Destinations ({places.length})
            </button>
          </div>

          <div className="mb-4">
            <input
              type="text"
              placeholder="Search by name, category, or barangay..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-emerald-600 border-t-transparent"></div>
              <p className="text-gray-600 mt-2">Loading...</p>
            </div>
          ) : filteredPlaces.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <p className="text-gray-500">No places found</p>
              <Link
                to={`/lgu/places/${activeTab}/new`}
                className="text-emerald-600 hover:underline mt-2 inline-block"
              >
                Add your first {activeTab === 'businesses' ? 'business' : 'destination'}
              </Link>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Name</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Category</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Barangay</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredPlaces.map(place => (
                      <tr key={place.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">{place.name}</td>
                        <td className="px-4 py-3 text-gray-600">{place.category || '-'}</td>
                        <td className="px-4 py-3 text-gray-600">{place.barangay || '-'}</td>
                        <td className="px-4 py-3">
                          <StatusBadge verified={place.verified} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <Link
                              to={`/lgu/places/${activeTab}/${place.id}/edit`}
                              className="text-emerald-600 hover:text-emerald-800 font-medium text-sm"
                            >
                              Edit
                            </Link>
                            <button
                              onClick={() => setDeleteModal(place)}
                              className="text-red-600 hover:text-red-800 font-medium text-sm"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />

      {deleteModal && (
        <ConfirmModal
          isOpen={true}
          title="Delete Place"
          message={`Are you sure you want to delete "${deleteModal.name}"? This action cannot be undone.`}
          onConfirm={() => handleDelete(deleteModal)}
          onCancel={() => setDeleteModal(null)}
          confirmText="Delete"
          isDanger={true}
        />
      )}

      {importModalOpen && (
        <ImportModal
          isOpen={true}
          onClose={() => setImportModalOpen(false)}
          type={activeTab}
          onImportComplete={handleImportComplete}
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

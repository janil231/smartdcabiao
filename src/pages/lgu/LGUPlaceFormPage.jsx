import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'
import { useAuth } from '../../contexts/AuthContext'
import { isAdmin } from '../../services/adminRole.service'
import { getPlace, createPlace, updatePlace } from '../../services/adminPlaces.service'
import { uploadPlaceImage, deletePlaceImage, validateImageFile } from '../../services/storage.service'
import { isWithinCabiaoBounds, CABIAO_CENTER, CABIAO_BOUNDS } from '../../constants/cabiaoGeo'

const CATEGORIES = [
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'shop', label: 'Shop' },
  { value: 'attraction', label: 'Attraction' },
  { value: 'service', label: 'Service' },
  { value: 'hotel', label: 'Hotel/Resort' },
  { value: 'other', label: 'Other' }
]

const BUSINESS_TYPES = [
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'shop', label: 'Shop' },
  { value: 'market', label: 'Market' },
  { value: 'service', label: 'Service' }
]

function ImageUploader({ images, imagePaths, onImagesChange, placeId, isSubmitting }) {
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files)
    if (files.length === 0) return

    setUploading(true)
    const newImages = [...images]
    const newPaths = [...imagePaths]

    for (const file of files) {
      const validation = validateImageFile(file)
      if (!validation.valid) {
        alert(validation.error)
        continue
      }

      const tempId = placeId || `temp_${Date.now()}`
      const result = await uploadPlaceImage({ 
        file, 
        type: placeId ? (images.length > 0 ? 'business' : 'destination') : 'business', 
        placeId: tempId 
      })

      if (result.success) {
        newImages.push(result.url)
        newPaths.push(result.path)
      } else {
        alert(`Failed to upload ${file.name}: ${result.error}`)
      }
    }

    onImagesChange(newImages, newPaths)
    setUploading(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleRemove = async (index, path) => {
    const newImages = [...images]
    const newPaths = [...imagePaths]
    
    newImages.splice(index, 1)
    newPaths.splice(index, 1)
    
    if (path && !path.includes('temp_')) {
      await deletePlaceImage(path)
    }
    
    onImagesChange(newImages, newPaths)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept="image/jpeg,image/jpg,image/png,image/webp"
          multiple
          disabled={uploading || isSubmitting}
          className="hidden"
          id="image-upload"
        />
        <label
          htmlFor="image-upload"
          className={`px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 font-medium ${uploading || isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {uploading ? 'Uploading...' : 'Upload Images'}
        </label>
        <span className="text-sm text-gray-500">Max 5MB each (jpg, png, webp)</span>
      </div>

      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {images.map((url, index) => (
            <div key={index} className="relative group">
              <img
                src={url}
                alt={`Upload ${index + 1}`}
                className="w-full h-24 object-cover rounded-lg"
              />
              <button
                type="button"
                onClick={() => handleRemove(index, imagePaths[index])}
                disabled={isSubmitting}
                className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function LocationPicker({ position, onPositionChange, errors }) {
  const mapRef = useRef(null)
  const markerRef = useRef(null)
  const [lat, setLat] = useState(position?.[0] || '')
  const [lng, setLng] = useState(position?.[1] || '')

  useEffect(() => {
    if (typeof window === 'undefined' || !mapRef.current) return
    
    const initMap = async () => {
      const L = (await import('leaflet')).default
      
      if (mapRef.current && !mapRef.current._leaflet_id) {
        const map = L.map(mapRef.current).setView(
          [lat || CABIAO_CENTER[0], lng || CABIAO_CENTER[1]], 
          14
        )
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map)

        map.on('click', (e) => {
          const { lat: clickedLat, lng: clickedLng } = e.latlng
          setLat(clickedLat.toFixed(6))
          setLng(clickedLng.toFixed(6))
          onPositionChange([clickedLat, clickedLng])
          
          if (markerRef.current) {
            markerRef.current.setLatLng([clickedLat, clickedLng])
          } else {
            markerRef.current = L.marker([clickedLat, clickedLng]).addTo(map)
          }
        })

        if (lat && lng) {
          markerRef.current = L.marker([lat, lng]).addTo(map)
        }

        mapRef.current._leaflet_map = map
      }
    }

    initMap()

    return () => {
      if (mapRef.current?._leaflet_map) {
        mapRef.current._leaflet_map.remove()
        mapRef.current._leaflet_map = null
      }
    }
  }, [])

  const handleUseCenter = () => {
    setLat(CABIAO_CENTER[0].toFixed(6))
    setLng(CABIAO_CENTER[1].toFixed(6))
    onPositionChange(CABIAO_CENTER)
  }

  const handleLatChange = (value) => {
    setLat(value)
    const numLat = parseFloat(value)
    const numLng = parseFloat(lng)
    if (!isNaN(numLat) && !isNaN(numLng)) {
      onPositionChange([numLat, numLng])
    }
  }

  const handleLngChange = (value) => {
    setLng(value)
    const numLat = parseFloat(lat)
    const numLng = parseFloat(value)
    if (!isNaN(numLat) && !isNaN(numLng)) {
      onPositionChange([numLat, numLng])
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">Latitude</label>
          <input
            type="number"
            step="0.000001"
            value={lat}
            onChange={(e) => handleLatChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
            placeholder="15.2345"
          />
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">Longitude</label>
          <input
            type="number"
            step="0.000001"
            value={lng}
            onChange={(e) => handleLngChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
            placeholder="120.8397"
          />
        </div>
      </div>
      
      <button
        type="button"
        onClick={handleUseCenter}
        className="text-sm text-emerald-600 hover:underline"
      >
        Use Cabiao Center
      </button>

      {errors.position && (
        <p className="text-sm text-red-600">{errors.position}</p>
      )}

      <div ref={mapRef} className="h-64 w-full rounded-lg border border-gray-300" />

      <p className="text-sm text-gray-500">Click on the map to set the location</p>
    </div>
  )
}

export default function LGUPlaceFormPage() {
  const { type, id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const isEdit = !!id
  
  const [checkingAdmin, setCheckingAdmin] = useState(true)
  const [isUserAdmin, setIsUserAdmin] = useState(false)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState({})
  const [toast, setToast] = useState(null)

  const [formData, setFormData] = useState({
    name: '',
    category: 'restaurant',
    description: '',
    barangay: '',
    address: '',
    phone: '',
    website: '',
    position: null,
    type: 'restaurant',
    verified: true,
    images: [],
    imagePaths: []
  })

  useEffect(() => {
    async function checkAdminStatus() {
      if (!user) {
        setCheckingAdmin(false)
        return
      }
      const adminStatus = await isAdmin(user.uid)
      setIsUserAdmin(adminStatus)
      setCheckingAdmin(false)
    }
    checkAdminStatus()
  }, [user])

  useEffect(() => {
    if (!isUserAdmin || !id) return
    
    async function loadPlace() {
      setLoading(true)
      const place = await getPlace(type, id)
      if (place) {
        setFormData({
          name: place.name || '',
          category: place.category || 'restaurant',
          description: place.description || '',
          barangay: place.barangay || '',
          address: place.address || '',
          phone: place.phone || '',
          website: place.website || '',
          position: place.position || null,
          type: place.type || 'restaurant',
          verified: place.verified !== false,
          images: place.images || [],
          imagePaths: place.imagePaths || []
        })
      }
      setLoading(false)
    }
    loadPlace()
  }, [isUserAdmin, type, id])

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const validateForm = () => {
    const newErrors = {}
    
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required'
    }
    
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required'
    }
    
    if (!formData.position) {
      newErrors.position = 'Location is required'
    } else {
      const [lat, lng] = formData.position
      if (!isWithinCabiaoBounds(lat, lng)) {
        newErrors.position = 'Location must be within Cabiao bounds'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setSubmitting(true)

    const placeId = id || `new_${Date.now()}`
    const payload = {
      ...formData,
      images: formData.images,
      imagePaths: formData.imagePaths
    }

    try {
      let result
      if (isEdit) {
        result = await updatePlace(type, id, payload, {
          uid: user.uid,
          email: user.email
        })
      } else {
        result = await createPlace(type, payload, {
          uid: user.uid,
          email: user.email
        })
      }

      if (result.success) {
        showToast(isEdit ? 'Place updated successfully!' : 'Place created successfully!')
        setTimeout(() => navigate(`/lgu/places`), 1000)
      } else {
        showToast(result.error || 'Failed to save place', 'error')
      }
    } catch (error) {
      showToast(error.message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value, type: inputType, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: inputType === 'checkbox' ? checked : value
    }))
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }))
    }
  }

  const handleImagesChange = (newImages, newPaths) => {
    setFormData(prev => ({
      ...prev,
      images: newImages,
      imagePaths: newPaths
    }))
  }

  const handlePositionChange = (pos) => {
    setFormData(prev => ({ ...prev, position: pos }))
    if (errors.position) {
      setErrors(prev => ({ ...prev, position: null }))
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="flex-1 flex items-center justify-center px-4 py-20">
          <div className="text-center">
            <p className="text-gray-600 mb-4">Please sign in.</p>
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
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="mb-6">
            <Link to="/lgu/places" className="text-emerald-600 hover:underline flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Places
            </Link>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">
              {isEdit ? 'Edit' : 'Add New'} {type === 'businesses' ? 'Business' : 'Destination'}
            </h1>

            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-emerald-600 border-t-transparent"></div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    placeholder="Enter place name"
                  />
                  {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name}</p>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Category <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="category"
                      value={formData.category}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    >
                      {CATEGORIES.map(cat => (
                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                      ))}
                    </select>
                  </div>

                  {type === 'businesses' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                      <select
                        name="type"
                        value={formData.type}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                      >
                        {BUSINESS_TYPES.map(bt => (
                          <option key={bt.value} value={bt.value}>{bt.label}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    placeholder="Describe the place..."
                  />
                  {errors.description && <p className="text-sm text-red-600 mt-1">{errors.description}</p>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Barangay</label>
                    <input
                      type="text"
                      name="barangay"
                      value={formData.barangay}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                      placeholder="e.g., Poblacion"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                    <input
                      type="text"
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                      placeholder="Street address"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input
                      type="text"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                      placeholder="+63 9XX XXX XXXX"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                    <input
                      type="url"
                      name="website"
                      value={formData.website}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                      placeholder="https://..."
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Location <span className="text-red-500">*</span>
                  </label>
                  <LocationPicker
                    position={formData.position}
                    onPositionChange={handlePositionChange}
                    errors={errors}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Images</label>
                  <ImageUploader
                    images={formData.images}
                    imagePaths={formData.imagePaths}
                    onImagesChange={handleImagesChange}
                    placeId={id}
                    isSubmitting={submitting}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="verified"
                    id="verified"
                    checked={formData.verified}
                    onChange={handleInputChange}
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  <label htmlFor="verified" className="text-sm text-gray-700">
                    Verified (show checkmark on public listings)
                  </label>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium disabled:opacity-50"
                  >
                    {submitting ? 'Saving...' : isEdit ? 'Update Place' : 'Create Place'}
                  </button>
                  <Link
                    to="/lgu/places"
                    className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
                  >
                    Cancel
                  </Link>
                </div>
              </form>
            )}
          </div>
        </div>
      </main>

      <Footer />

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

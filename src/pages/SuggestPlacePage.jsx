import { useState } from 'react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import Reveal from '../components/animations/Reveal'
import { createSubmission } from '../services/submissions.service'
import { useAuth } from '../contexts/AuthContext'
import { sanitizeText, validateURL } from '../utils/sanitization'

export default function SuggestPlacePage() {
  const { user } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState(null) // 'success' | 'error' | null
  const [errors, setErrors] = useState({})

  const [formData, setFormData] = useState({
    name: '',
    entryType: 'business',
    category: 'restaurant',
    barangay: '',
    address: '',
    description: '',
    contact: '',
    website: '',
    images: '', // Comma-separated image URLs
    lat: '',
    lng: ''
  })

  const ENTRY_TYPES = [
    { value: 'business', label: 'Business' },
    { value: 'destination', label: 'Destination' }
  ]

  const CATEGORIES = [
    { value: 'restaurant', label: 'Restaurant' },
    { value: 'shop', label: 'Shop' },
    { value: 'attraction', label: 'Attraction' },
    { value: 'service', label: 'Service' },
    { value: 'other', label: 'Other' }
  ]



  const validateForm = () => {
    const newErrors = {}

    // Required fields
    if (!formData.name.trim()) {
      newErrors.name = 'Place name is required'
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required'
    }

    if (formData.description.trim().length < 20) {
      newErrors.description = 'Description must be at least 20 characters'
    }

    if (formData.description.trim().length > 1000) {
      newErrors.description = 'Description must be less than 1000 characters'
    }

    // Optional field validation
    if (formData.contact && !validatePhone(formData.contact)) {
      newErrors.contact = 'Please enter a valid contact number'
    }

    if (formData.website && !validateURL(formData.website)) {
      newErrors.website = 'Please enter a valid website URL'
    }

    // Coordinates validation
    if (formData.lat || formData.lng) {
      const lat = parseFloat(formData.lat)
      const lng = parseFloat(formData.lng)
      
      if (isNaN(lat) || lat < -90 || lat > 90) {
        newErrors.lat = 'Please enter a valid latitude (-90 to 90)'
      }
      
      if (isNaN(lng) || lng < -180 || lng > 180) {
        newErrors.lng = 'Please enter a valid longitude (-180 to 180)'
      }
    }

    // Image validation (comma-separated URLs)
    if (formData.images) {
      const imageUrls = formData.images.split(',').map(url => url.trim()).filter(url => url)
      for (const url of imageUrls) {
        if (!isValidUrl(url)) {
          newErrors.images = 'Please enter valid image URLs (comma-separated)'
          break
        }
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const isValidUrl = (string) => {
    try {
      new URL(string)
      return true
    } catch (_) {
      return false
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    setSubmitStatus(null)

    try {
      const submissionData = {
        name: sanitizeText(formData.name.trim()),
        entryType: formData.entryType,
        category: formData.category,
        barangay: sanitizeText(formData.barangay.trim()),
        address: sanitizeText(formData.address.trim()),
        description: sanitizeText(formData.description.trim()),
        contact: sanitizeText(formData.contact.trim()),
        website: formData.website.trim(),
        images: formData.images
          .split(',')
          .map(url => sanitizeText(url.trim()))
          .filter(url => url && validateURL(url)),
        position: formData.lat && formData.lng 
          ? { 
              lat: parseFloat(formData.lat), 
              lng: parseFloat(formData.lng) 
            }
          : null,
        createdByUid: user?.uid || null,
        createdByEmail: user?.email || null
      }

      const result = await createSubmission(submissionData)
      
      if (result.success) {
        setSubmitStatus('success')
        // Reset form
        setFormData({
          name: '',
          entryType: 'business',
          category: 'restaurant',
          barangay: '',
          address: '',
          description: '',
          contact: '',
          website: '',
          images: '',
          lat: '',
          lng: ''
        })
        setErrors({})
      } else {
        setSubmitStatus('error')
      }
    } catch (error) {
      setSubmitStatus('error')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <main className="flex-1 pb-20 md:pb-0">
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-8">
            <Reveal delay={0}>
              <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">
                Suggest a Place
              </h1>
              <p className="mt-4 text-lg text-gray-600">
                Help us improve SMARTDCABIAO by suggesting new businesses or destinations in Cabiao.
              </p>
            </Reveal>
          </div>

          {/* Form */}
          <Reveal delay={80}>
            <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sm:p-8">
              <div className="space-y-6">
                {/* Name */}
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                    Place Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none disabled:bg-gray-50 disabled:text-gray-500"
                    placeholder="Enter the name of the business or destination"
                    disabled={isSubmitting}
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                  )}
                </div>

                {/* Entry Type and Category */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="entryType" className="block text-sm font-medium text-gray-700 mb-2">
                      Entry Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="entryType"
                      name="entryType"
                      value={formData.entryType}
                      onChange={handleInputChange}
                      className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none disabled:bg-gray-50 disabled:text-gray-500"
                      disabled={isSubmitting}
                    >
                      {ENTRY_TYPES.map(type => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                      Category <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="category"
                      name="category"
                      value={formData.category}
                      onChange={handleInputChange}
                      className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none disabled:bg-gray-50 disabled:text-gray-500"
                      disabled={isSubmitting}
                    >
                      {CATEGORIES.map(category => (
                        <option key={category.value} value={category.value}>
                          {category.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Barangay and Address */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="barangay" className="block text-sm font-medium text-gray-700 mb-2">
                      Barangay
                    </label>
                    <input
                      type="text"
                      id="barangay"
                      name="barangay"
                      value={formData.barangay}
                      onChange={handleInputChange}
                      className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none disabled:bg-gray-50 disabled:text-gray-500"
                      placeholder="e.g., Poblacion"
                      disabled={isSubmitting}
                    />
                  </div>

                  <div>
                    <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
                      Address
                    </label>
                    <input
                      type="text"
                      id="address"
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none disabled:bg-gray-50 disabled:text-gray-500"
                      placeholder="Street address or location description"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                    Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={4}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none disabled:bg-gray-50 disabled:text-gray-500"
                    placeholder="Provide details about what makes this place special..."
                    disabled={isSubmitting}
                  />
                  {errors.description && (
                    <p className="mt-1 text-sm text-red-600">{errors.description}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    {formData.description.length}/1000 characters
                  </p>
                </div>

                {/* Contact and Website */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="contact" className="block text-sm font-medium text-gray-700 mb-2">
                      Contact Number
                    </label>
                    <input
                      type="tel"
                      id="contact"
                      name="contact"
                      value={formData.contact}
                      onChange={handleInputChange}
                      className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none disabled:bg-gray-50 disabled:text-gray-500"
                      placeholder="+63 9XX XXX XXX"
                      disabled={isSubmitting}
                    />
                    {errors.contact && (
                      <p className="mt-1 text-sm text-red-600">{errors.contact}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="website" className="block text-sm font-medium text-gray-700 mb-2">
                      Website / Facebook Page
                    </label>
                    <input
                      type="url"
                      id="website"
                      name="website"
                      value={formData.website}
                      onChange={handleInputChange}
                      className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none disabled:bg-gray-50 disabled:text-gray-500"
                      placeholder="https://facebook.com/yourpage"
                      disabled={isSubmitting}
                    />
                    {errors.website && (
                      <p className="mt-1 text-sm text-red-600">{errors.website}</p>
                    )}
                  </div>
                </div>

                {/* Images */}
                <div>
                  <label htmlFor="images" className="block text-sm font-medium text-gray-700 mb-2">
                    Image Links
                  </label>
                  <textarea
                    id="images"
                    name="images"
                    value={formData.images}
                    onChange={handleInputChange}
                    rows={2}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none disabled:bg-gray-50 disabled:text-gray-500"
                    placeholder="https://example.com/image1.jpg, https://example.com/image2.jpg"
                    disabled={isSubmitting}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Enter image URLs separated by commas (optional)
                  </p>
                  {errors.images && (
                    <p className="mt-1 text-sm text-red-600">{errors.images}</p>
                  )}
                </div>

                {/* Coordinates */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="lat" className="block text-sm font-medium text-gray-700 mb-2">
                      Latitude
                    </label>
                    <input
                      type="number"
                      id="lat"
                      name="lat"
                      value={formData.lat}
                      onChange={handleInputChange}
                      step="0.000001"
                      min="-90"
                      max="90"
                      className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none disabled:bg-gray-50 disabled:text-gray-500"
                      placeholder="15.2345"
                      disabled={isSubmitting}
                    />
                    {errors.lat && (
                      <p className="mt-1 text-sm text-red-600">{errors.lat}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="lng" className="block text-sm font-medium text-gray-700 mb-2">
                      Longitude
                    </label>
                    <input
                      type="number"
                      id="lng"
                      name="lng"
                      value={formData.lng}
                      onChange={handleInputChange}
                      step="0.000001"
                      min="-180"
                      max="180"
                      className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none disabled:bg-gray-50 disabled:text-gray-500"
                      placeholder="120.8397"
                      disabled={isSubmitting}
                    />
                    {errors.lng && (
                      <p className="mt-1 text-sm text-red-600">{errors.lng}</p>
                    )}
                  </div>
                </div>

                {/* Submit Button */}
                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full rounded-lg bg-emerald-600 px-6 py-3 text-base font-medium text-white shadow-sm transition-all duration-200 ease-out hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed active:scale-[0.98]"
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit for Review'}
                  </button>
                </div>

                {/* Success/Error Messages */}
                {submitStatus === 'success' && (
                  <div className="rounded-lg bg-green-50 border border-green-200 p-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 0l-2 2a1 1 0 001.414 1.414l2-2a1 1 0 00.00001-.00001z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-green-800">
                          Successfully Submitted!
                        </h3>
                        <p className="mt-2 text-sm text-green-700">
                          Your suggestion has been submitted to the Municipality of Cabiao for review. 
                          We'll evaluate and contact you if needed.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {submitStatus === 'error' && (
                  <div className="rounded-lg bg-red-50 border border-red-200 p-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293-1.293a1 1 0 10-1.414 1.414L10.586 11.414 11.879 10.121a1 1 0 001.414-1.414l-1.293 1.293a1 1 0 000 1.414z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-red-800">
                          Submission Failed
                        </h3>
                        <p className="mt-2 text-sm text-red-700">
                          There was an error submitting your suggestion. Please try again later.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </form>
          </Reveal>

          {/* Information Note */}
          <Reveal delay={160}>
            <div className="mt-8 rounded-lg bg-amber-50 border border-amber-200 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-amber-800">
                    Submission Review Process
                  </h3>
                  <p className="mt-2 text-sm text-amber-700">
                    All submissions are reviewed by the Municipality of Cabiao before being added to SMARTDCABIAO. 
                    This process typically takes 3-5 business days. We may contact you for additional information.
                  </p>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </main>

      <Footer />
    </div>
  )
}
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { createReport } from '../services/reports.service'
import { useAuth } from '../contexts/AuthContext'

export default function ReportIssueModal({ 
  isOpen, 
  onClose, 
  targetType, 
  targetId,
  pageUrl 
}) {
  const { user } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState(null) // 'success' | 'error' | null
  const [errors, setErrors] = useState({})

  const [formData, setFormData] = useState({
    issueType: '',
    message: ''
  })

  const ISSUE_TYPES = [
    'Information is incorrect',
    'Place is permanently closed',
    'Contact information is wrong',
    'Website/social media links not working',
    'Location coordinates are wrong',
    'Other issue'
  ]

  useEffect(() => {
    if (!isOpen) return
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const handleEsc = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [isOpen, onClose])

  const validateForm = () => {
    const newErrors = {}

    if (!formData.issueType) {
      newErrors.issueType = 'Please select an issue type'
    }

    if (!formData.message.trim()) {
      newErrors.message = 'Please provide details about the issue'
    }

    if (formData.message.trim().length < 10) {
      newErrors.message = 'Please provide more details (minimum 10 characters)'
    }

    if (formData.message.trim().length > 1000) {
      newErrors.message = 'Message must be less than 1000 characters'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
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
      const reportData = {
        targetType,
        targetId,
        issueType: formData.issueType,
        message: formData.message.trim(),
        pageUrl,
        createdByUid: user?.uid || null,
        createdByEmail: user?.email || null
      }

      const result = await createReport(reportData)
      
      if (result.success) {
        setSubmitStatus('success')
        // Reset form
        setFormData({ issueType: '', message: '' })
        setErrors({})
        // Close modal after success
        setTimeout(() => {
          onClose()
          setSubmitStatus(null)
        }, 2000)
      } else {
        setSubmitStatus('error')
      }
    } catch (error) {
      setSubmitStatus('error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      onClose()
      // Reset form and status when closing
      setTimeout(() => {
        setFormData({ issueType: '', message: '' })
        setErrors({})
        setSubmitStatus(null)
      }, 300)
    }
  }

  if (!isOpen) return null

  return createPortal(
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={(e) => { if (e.target === e.currentTarget) handleClose() }} />
        
        <div className="relative bg-white rounded-xl shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
          {/* Modal Header */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Report an Issue
              </h3>
              <p className="mt-1 text-sm text-gray-600">
                Help us keep SMARTDCABIAO information accurate
              </p>
            </div>
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="flex-shrink-0 rounded-lg bg-white p-2 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="sr-only">Close modal</span>
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Issue Type */}
            <div>
              <label htmlFor="issueType" className="block text-sm font-medium text-gray-700 mb-2">
                Issue Type <span className="text-red-500">*</span>
              </label>
              <select
                id="issueType"
                name="issueType"
                value={formData.issueType}
                onChange={handleInputChange}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none disabled:bg-gray-50 disabled:text-gray-500"
                disabled={isSubmitting}
              >
                <option value="">Select an issue type...</option>
                {ISSUE_TYPES.map(type => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              {errors.issueType && (
                <p className="mt-1 text-sm text-red-600">{errors.issueType}</p>
              )}
            </div>

            {/* Message */}
            <div>
              <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                Details <span className="text-red-500">*</span>
              </label>
              <textarea
                id="message"
                name="message"
                value={formData.message}
                onChange={handleInputChange}
                rows={4}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none disabled:bg-gray-50 disabled:text-gray-500"
                placeholder="Please describe the issue in detail..."
                disabled={isSubmitting}
              />
              {errors.message && (
                <p className="mt-1 text-sm text-red-600">{errors.message}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                {formData.message.length}/1000 characters
              </p>
            </div>

            {/* Submit Button */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-base font-medium text-gray-700 shadow-sm transition-all duration-200 ease-out hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 rounded-lg bg-emerald-600 px-4 py-2.5 text-base font-medium text-white shadow-sm transition-all duration-200 ease-out hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed active:scale-[0.98]"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Report'}
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
                    <h4 className="text-sm font-medium text-green-800">
                      Report Submitted
                    </h4>
                    <p className="text-sm text-green-700">
                      Thank you for helping improve SMARTDCABIAO. We'll review your report.
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
                    <h4 className="text-sm font-medium text-red-800">
                      Submission Failed
                    </h4>
                    <p className="text-sm text-red-700">
                      There was an error submitting your report. Please try again.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>,
    document.body
  )
}

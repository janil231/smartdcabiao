import { useState } from 'react'
import { Link } from 'react-router-dom'
import StarRating from './StarRating'
import { createOrUpdateReview } from '../../services/reviews.service'

export default function ReviewForm({ 
  targetType, 
  targetId, 
  user, 
  existingReview,
  onReviewSubmitted,
  placeName 
}) {
  const [rating, setRating] = useState(existingReview?.rating || 0)
  const [title, setTitle] = useState(existingReview?.title || '')
  const [text, setText] = useState(existingReview?.text || '')
  const [sustainabilityNote, setSustainabilityNote] = useState(existingReview?.sustainabilityNote || '')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  if (!user) {
    return (
      <div className="bg-gray-50 rounded-xl p-6 text-center">
        <div className="w-12 h-12 mx-auto bg-gray-200 rounded-full flex items-center justify-center mb-3">
          <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <p className="text-gray-600 mb-3">Sign in to write a review for {placeName}</p>
        <Link
          to="/login"
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition font-medium"
        >
          Sign In to Review
        </Link>
      </div>
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (rating === 0) {
      setError('Please select a rating')
      return
    }

    if (!text.trim() || text.trim().length < 20) {
      setError('Review must be at least 20 characters')
      return
    }

    setIsSubmitting(true)
    try {
      const result = await createOrUpdateReview({
        targetType,
        targetId,
        uid: user.uid,
        user: { email: user.email, displayName: user.displayName },
        rating,
        title: title.trim() || null,
        text: text.trim(),
        sustainabilityNote: sustainabilityNote.trim() || null
      })

      if (result.success) {
        setSuccess(true)
        if (onReviewSubmitted) {
          onReviewSubmitted()
        }
      } else {
        setError(result.error || 'Failed to submit review')
      }
    } catch (err) {
      setError(err.message || 'An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="bg-green-50 rounded-xl p-6 text-center">
        <div className="w-12 h-12 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-3">
          <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Review Submitted!</h3>
        <p className="text-gray-600 mb-3">
          Your review has been submitted for LGU approval. It will appear publicly once approved.
        </p>
        <button
          onClick={() => setSuccess(false)}
          className="text-emerald-600 hover:text-emerald-700 font-medium"
        >
          Write Another Review
        </button>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        {existingReview ? 'Update Your Review' : 'Write a Review'}
      </h3>
      
      {existingReview?.status === 'pending' && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            Your previous review is pending approval. Updating it will resubmit for review.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Your Rating <span className="text-red-500">*</span>
          </label>
          <StarRating
            rating={rating}
            onRatingChange={setRating}
            size="lg"
            interactive={true}
          />
        </div>

        <div>
          <label htmlFor="review-title" className="block text-sm font-medium text-gray-700 mb-1">
            Title (optional)
          </label>
          <input
            id="review-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Summarize your experience"
            maxLength={100}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
        </div>

        <div>
          <label htmlFor="review-text" className="block text-sm font-medium text-gray-700 mb-1">
            Your Review <span className="text-red-500">*</span>
          </label>
          <textarea
            id="review-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Share your experience at this place (minimum 20 characters)"
            rows={4}
            minLength={20}
            maxLength={1000}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
          />
          <p className="mt-1 text-xs text-gray-500">
            {text.length}/1000 characters (minimum 20)
          </p>
        </div>

        <div>
          <label htmlFor="sustainability-note" className="block text-sm font-medium text-gray-700 mb-1">
            Sustainability Note (optional)
          </label>
          <textarea
            id="sustainability-note"
            value={sustainabilityNote}
            onChange={(e) => setSustainabilityNote(e.target.value)}
            placeholder="Did you notice eco-friendly practices? (e.g., waste segregation, cleanliness, environmental initiatives)"
            rows={2}
            maxLength={500}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
          />
          <p className="mt-1 text-xs text-gray-500">
            Share observations about sustainability practices
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting || rating === 0 || text.trim().length < 20}
          className="w-full px-4 py-2.5 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
        >
          {isSubmitting ? 'Submitting...' : existingReview ? 'Update Review' : 'Submit Review'}
        </button>
      </form>
    </div>
  )
}

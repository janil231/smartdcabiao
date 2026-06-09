import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Timestamp } from 'firebase/firestore'
import { getSeasonStatus, updateSeasonDetails } from '../../services/seasons.service'
import { toJSDate } from '../../services/seasons.service'

export default function EditSeasonModal({ season, isOpen, onClose, onSaved, readOnly = false }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const status = getSeasonStatus(season)
  const canEditStart = !readOnly && (status === 'draft' || status === 'scheduled')
  const title = readOnly ? 'View Season' : 'Edit Season'

  useEffect(() => {
    if (season && isOpen) {
      setName(season.name || '')
      setDescription(season.description || '')
      const start = toJSDate(season.startAt)
      const end = toJSDate(season.endAt)
      setStartDate(formatDateForInput(start))
      setEndDate(formatDateForInput(end))
      setError('')
    }
  }, [season, isOpen])

  if (!isOpen) return null

  function formatDateForInput(date) {
    if (!date || isNaN(date.getTime())) return ''
    return date.toISOString().slice(0, 16)
  }

  const handleSave = async () => {
    setError('')

    if (!name.trim() || name.trim().length < 3) {
      setError('Name must be at least 3 characters')
      return
    }
    if (name.trim().length > 80) {
      setError('Name must be 80 characters or less')
      return
    }

    const start = new Date(startDate)
    const end = new Date(endDate)

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      setError('Please set valid start and end dates')
      return
    }
    if (end <= start) {
      setError('End date must be after start date')
      return
    }

    setSaving(true)
    try {
      const updates = {
        name: name.trim(),
        description: description.trim() || null,
        startAt: canEditStart ? Timestamp.fromDate(start) : undefined,
        endAt: Timestamp.fromDate(end),
      }
      await updateSeasonDetails(season.id, updates, season)
      if (onSaved) onSaved()
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const inputClass = (disabled) =>
    `w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
      disabled
        ? 'border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed'
        : 'border-gray-300 focus:border-emerald-500'
    }`

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-gray-900 mb-4">{title}</h3>

        {readOnly && (
          <div className="mb-4 rounded-lg bg-gray-50 border border-gray-200 p-3 text-sm text-gray-700">
            ℹ️ This season has ended and cannot be modified.
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              disabled={readOnly}
              className={inputClass(readOnly)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              disabled={readOnly}
              className={inputClass(readOnly)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            {canEditStart ? (
              <input
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={inputClass(false)}
              />
            ) : (
              <div>
                <input
                  type="datetime-local"
                  value={startDate}
                  disabled
                  className={inputClass(true)}
                />
                {!readOnly && status === 'active' && (
                  <p className="text-xs text-amber-600 mt-1">Cannot change start date of an active season</p>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="datetime-local"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              disabled={readOnly}
              className={inputClass(readOnly)}
            />
            {status === 'active' && !readOnly && (
              <p className="text-xs text-amber-600 mt-1">
                Shortening end date may auto-end the season immediately if past current time.
              </p>
            )}
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {error}
            </div>
          )}
        </div>

        <div className="flex gap-2 justify-end mt-6">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200 text-sm disabled:opacity-50"
          >
            {readOnly ? 'Close' : 'Cancel'}
          </button>
          {!readOnly && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 text-sm disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
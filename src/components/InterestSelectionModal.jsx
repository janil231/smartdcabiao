import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { INTEREST_TAGS } from '../constants/interests'

export default function InterestSelectionModal({
  isOpen,
  onClose,
  onSave,
  onSkip,
  initialSelected = [],
  title = 'What are you interested in?',
  subtitle = 'Pick at least 3 for better recommendations',
  showSkip = false,
}) {
  const [selected, setSelected] = useState([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setSelected(initialSelected)
      document.body.style.overflow = 'hidden'
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen, initialSelected])

  const toggle = (id) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave(selected)
    } finally {
      setSaving(false)
    }
  }

  const handleSkip = async () => {
    if (onSkip) {
      setSaving(true)
      try {
        await onSkip()
      } finally {
        setSaving(false)
      }
    }
  }

  if (!isOpen) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div className="absolute inset-0 bg-black/50" />
      <div
        className="relative z-10 w-full max-w-lg bg-white rounded-xl p-6 max-h-[90vh] overflow-y-auto shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <p className="text-sm text-gray-500 mb-4">{subtitle}</p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {INTEREST_TAGS.map(tag => {
            const isSelected = selected.includes(tag.id)
            return (
              <button
                key={tag.id}
                type="button"
                onClick={() => toggle(tag.id)}
                className={`flex flex-col items-center gap-1.5 rounded-xl border-2 p-3 text-center transition min-h-[80px] ${
                  isSelected
                    ? 'border-emerald-600 bg-emerald-50 ring-2 ring-emerald-200'
                    : 'border-gray-200 bg-white hover:border-emerald-300'
                }`}
              >
                <span className="text-2xl">{tag.icon}</span>
                <span className={`text-xs font-medium leading-tight ${isSelected ? 'text-emerald-800' : 'text-gray-700'}`}>
                  {tag.label}
                </span>
              </button>
            )
          })}
        </div>

        <p className="text-sm text-gray-500 mb-4 text-center">
          {selected.length} selected{subtitle ? ' — ' + subtitle : ''}
        </p>

        <div className="flex gap-3">
          {showSkip && onSkip && (
            <button
              type="button"
              onClick={handleSkip}
              disabled={saving}
              className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium disabled:opacity-50"
            >
              Skip for now
            </button>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? 'Saving...' : showSkip ? 'Save & Continue' : 'Save'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

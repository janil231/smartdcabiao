import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getUserProfile, markInterestsSkipped, updateUserInterests } from '../services/users.service'
import InterestSelectionModal from './InterestSelectionModal'

export default function InterestNudgeBanner() {
  const { user } = useAuth()
  const [showModal, setShowModal] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [profile, setProfile] = useState(null)

  useEffect(() => {
    if (!user) return
    getUserProfile(user.uid).then(p => setProfile(p)).catch(() => {})
  }, [user])

  const hasInterests = profile?.interests && profile?.interests?.length > 0
  const hasInteracted = !!profile?.interestsSetAt

  if (!user || dismissed || hasInterests || hasInteracted) return null

  const handleMaybeLater = async () => {
    try {
      await markInterestsSkipped(user.uid)
    } catch {}
    setDismissed(true)
  }

  return (
    <>
      <div className="border-l-4 border-emerald-500 bg-emerald-50 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-emerald-900">
              ✨ Get personalized recommendations
            </p>
            <p className="text-sm text-emerald-700 mt-1">
              Tell us what you&apos;re interested in to discover the best spots and quests in Cabiao.
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              type="button"
              onClick={handleMaybeLater}
              className="px-3 py-1.5 text-sm font-medium rounded-lg border border-emerald-300 bg-white text-emerald-800 hover:bg-emerald-100"
            >
              Maybe Later
            </button>
            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="px-3 py-1.5 text-sm font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
            >
              Set Interests
            </button>
          </div>
        </div>
      </div>

      <InterestSelectionModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSave={async (selected) => {
          await updateUserInterests(user.uid, selected)
          setShowModal(false)
          setDismissed(true)
          setProfile(prev => ({ ...prev, interests: selected }))
        }}
        onSkip={handleMaybeLater}
        initialSelected={[]}
        showSkip={true}
      />
    </>
  )
}

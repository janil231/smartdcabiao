import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { createOwnerQuest, updateOwnerQuest } from '../../services/ownerQuests.service'
import { uploadToCloudinary } from '../../utils/cloudinary'
import { compressImage } from '../../utils/compressImage'

const REWARD_TYPES = [
  { value: 'discount_percent', label: 'Discount (%)', unit: '%' },
  { value: 'discount_fixed', label: 'Fixed Amount (₱)', unit: '₱' },
  { value: 'free_item', label: 'Free Item', unit: '' },
  { value: 'bogo', label: 'Buy 1 Get 1', unit: '' },
]

export default function OwnerQuestForm({ businessId, businessName, quest, onSaved }) {
  const { user } = useAuth()
  const [title, setTitle] = useState(quest?.title || '')
  const [description, setDescription] = useState(quest?.description || '')
  const [questType, setQuestType] = useState(quest?.questType || 'visit')
  const [requiredDurationMinutes, setRequiredDurationMinutes] = useState(quest?.requiredDurationMinutes || 15)
  const [verificationMethod, setVerificationMethod] = useState(quest?.verificationMethod || 'qr')
  const [buyVerificationMethod, setBuyVerificationMethod] = useState(quest?.buyVerificationMethod || 'qr')
  const [eventCode, setEventCode] = useState(quest?.eventCode || '')
  const [autoRotateDaily, setAutoRotateDaily] = useState(quest?.autoRotateDaily || false)
  const [itemPhotoUrl, setItemPhotoUrl] = useState(quest?.itemPhotoUrl || '')
  const [itemDetails, setItemDetails] = useState(quest?.itemDetails || '')
  const [minimumPurchase, setMinimumPurchase] = useState(quest?.minimumPurchase || 0)
  const [quantityRequired, setQuantityRequired] = useState(quest?.quantityRequired || 1)
  const [conditions, setConditions] = useState(quest?.conditions || '')
  const [questInstructions, setQuestInstructions] = useState(quest?.questInstructions || '')
  const [photoUploading, setPhotoUploading] = useState(false)
  const [rewardType, setRewardType] = useState(quest?.rewardType || 'discount_percent')
  const [rewardValue, setRewardValue] = useState(quest?.rewardValue || '')
  const [rewardItemName, setRewardItemName] = useState(quest?.rewardItemName || '')
  const [isActive, setIsActive] = useState(quest?.isActive !== false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const isEditing = !!quest
  const isVisit = questType === 'visit'

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 3 * 1024 * 1024) {
      setError('Image must be under 3MB')
      return
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Image must be JPG, PNG, or WebP')
      return
    }

    setPhotoUploading(true)
    setError('')
    try {
      const compressed = await compressImage(file, 1024, 0.75)
      const url = await uploadToCloudinary(compressed)
      setItemPhotoUrl(url)
    } catch (err) {
      setError('Upload failed: ' + err.message)
    } finally {
      setPhotoUploading(false)
    }
  }

  const rewardLabel = REWARD_TYPES.find(r => r.value === rewardType)
  const rewardPreview = (() => {
    if (rewardType === 'discount_percent') return `${rewardValue}% off ${rewardItemName || 'selected items'}`
    if (rewardType === 'discount_fixed') return `₱${rewardValue} off ${rewardItemName || 'selected items'}`
    if (rewardType === 'free_item') return `Free ${rewardItemName || 'item'}`
    if (rewardType === 'bogo') return `Buy 1 Get 1 on ${rewardItemName || 'selected items'}`
    return ''
  })()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!title.trim()) { setError('Title is required'); return }
    if (!description.trim()) { setError('Description is required'); return }
    if (title.length > 80) { setError('Title must be 80 characters or less'); return }
    if (description.length > 300) { setError('Description must be 300 characters or less'); return }
    if (isVisit) {
      const dur = parseInt(requiredDurationMinutes, 10)
      if (isNaN(dur) || dur < 1 || dur > 60) { setError('Duration must be between 1 and 60 minutes'); return }
    }
    if (!isVisit && questType === 'buy' && buyVerificationMethod === 'code') {
    }
    if (rewardType !== 'free_item' && rewardType !== 'bogo') {
      const val = parseFloat(rewardValue)
      if (isNaN(val) || val <= 0) { setError('Please enter a valid reward value'); return }
    }

    setLoading(true)
    try {
      const questData = {
        title: title.trim(),
        description: description.trim(),
        questType,
        requiredDurationMinutes: isVisit ? parseInt(requiredDurationMinutes, 10) : 0,
        verificationMethod: isVisit ? 'location' : verificationMethod,
        rewardType,
        rewardValue: parseFloat(rewardValue) || 0,
        rewardItemName: rewardItemName.trim() || '',
        itemPhotoUrl: itemPhotoUrl || null,
        itemDetails: itemDetails?.trim() || null,
        minimumPurchase: Number(minimumPurchase) || 0,
        quantityRequired: Number(quantityRequired) || 1,
        conditions: conditions?.trim() || null,
        questInstructions: questInstructions?.trim() || null,
        isActive,
      }

      if (!isVisit && questType === 'buy') {
        questData.buyVerificationMethod = buyVerificationMethod
        if (buyVerificationMethod === 'code') {
          questData.autoRotateDaily = autoRotateDaily
        }
      }

      if (isEditing) {
        await updateOwnerQuest(quest.id, questData)
      } else {
        await createOwnerQuest(user.uid, businessId, businessName, questData)
      }
      onSaved()
    } catch (err) {
      console.error('[OwnerQuestForm] Create failed:', err)
      console.error('[OwnerQuestForm] Error code:', err.code)
      console.error('[OwnerQuestForm] Error message:', err.message)
      setError(`Failed to save quest: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-2xl">
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      <div>
        <label htmlFor="oq-title" className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
        <input
          id="oq-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={80}
          required
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          placeholder="e.g. Visit us for a free drink!"
        />
        <p className="mt-1 text-xs text-gray-500">{title.length}/80</p>
      </div>

      <div>
        <label htmlFor="oq-desc" className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
        <textarea
          id="oq-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={300}
          rows={3}
          required
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
          placeholder="Describe what customers need to do and what they'll get..."
        />
        <p className="mt-1 text-xs text-gray-500">{description.length}/300</p>
      </div>

      <fieldset>
        <legend className="text-sm font-medium text-gray-700 mb-2">Quest Type</legend>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="questType"
              value="visit"
              checked={isVisit}
              onChange={() => setQuestType('visit')}
              className="accent-emerald-600"
            />
            <span className="text-sm text-gray-700">Visit (stay for X minutes)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="questType"
              value="buy"
              checked={!isVisit}
              onChange={() => setQuestType('buy')}
              className="accent-emerald-600"
            />
            <span className="text-sm text-gray-700">Buy (purchase at counter)</span>
          </label>
        </div>
      </fieldset>

      {isVisit && (
        <div>
          <label htmlFor="oq-duration" className="block text-sm font-medium text-gray-700 mb-1">
            Minimum Visit Duration (minutes) *
          </label>
          <input
            id="oq-duration"
            type="number"
            value={requiredDurationMinutes}
            onChange={(e) => setRequiredDurationMinutes(e.target.value)}
            min={1}
            max={60}
            required
            className="w-32 rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
          <p className="mt-1 text-xs text-gray-500">Customer must stay within 150m of your business location for this duration</p>
        </div>
      )}

      {isVisit && (
        <div className="mb-4">
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Quest Instructions (Optional)
          </label>
          <textarea
            value={questInstructions}
            onChange={(e) => setQuestInstructions(e.target.value)}
            placeholder="e.g., Show this quest card to staff on arrival. No purchase required."
            maxLength={200}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none"
          />
          <p className="text-xs text-gray-500 mt-1">
            Tell customers what to do when they arrive
          </p>
        </div>
      )}

      {!isVisit && (
        <fieldset>
          <legend className="text-sm font-medium text-gray-700 mb-2">Verification Method (for Buy quests)</legend>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="buyVerificationMethod"
                value="qr"
                checked={buyVerificationMethod === 'qr'}
                onChange={() => setBuyVerificationMethod('qr')}
                className="accent-emerald-600"
              />
              <span className="text-sm text-gray-700">QR Code (staff shows QR at counter — recommended)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="buyVerificationMethod"
                value="code"
                checked={buyVerificationMethod === 'code'}
                onChange={() => setBuyVerificationMethod('code')}
                className="accent-emerald-600"
              />
              <span className="text-sm text-gray-700">Daily Code (staff gives a code to customer)</span>
            </label>
          </div>

          {buyVerificationMethod === 'code' && (
            <div className="mt-3 flex items-center gap-2">
              <input
                type="checkbox"
                id="oq-auto-rotate"
                checked={autoRotateDaily}
                onChange={(e) => setAutoRotateDaily(e.target.checked)}
                className="accent-emerald-600 rounded"
              />
              <label htmlFor="oq-auto-rotate" className="text-sm text-gray-700">
                Auto-rotate daily
              </label>
            </div>
          )}

          {buyVerificationMethod === 'qr' && (
            <p className="mt-2 text-xs text-gray-500">QR will be auto-generated on save</p>
          )}
        </fieldset>
      )}

      {!isVisit && (
        <div className="border border-emerald-200 rounded-xl p-4 bg-emerald-50/30 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-emerald-900 text-sm">📋 What to Buy Details</h3>
            <span className="text-xs text-gray-500">(Optional but recommended)</span>
          </div>

          <div className="mb-3">
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Item Photo
            </label>
            {itemPhotoUrl ? (
              <div className="relative inline-block">
                <img
                  src={itemPhotoUrl}
                  alt="Item"
                  className="w-32 h-32 rounded-lg object-cover border border-gray-300"
                />
                <button
                  type="button"
                  onClick={() => setItemPhotoUrl('')}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs font-bold hover:bg-red-600"
                >
                  ✕
                </button>
              </div>
            ) : (
              <label className="block w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-emerald-400 hover:bg-emerald-50">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handlePhotoUpload}
                  disabled={photoUploading}
                />
                {photoUploading ? (
                  <div className="text-xs text-gray-500">Uploading...</div>
                ) : (
                  <>
                    <span className="text-3xl">📷</span>
                    <span className="text-xs text-gray-500 mt-1">Add Photo</span>
                  </>
                )}
              </label>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Helps customers identify the item (max 3MB)
            </p>
          </div>

          <div className="mb-3">
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Item Details
            </label>
            <input
              type="text"
              value={itemDetails}
              onChange={(e) => setItemDetails(e.target.value)}
              placeholder="e.g., Medium size, 16oz, with whipped cream"
              maxLength={100}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              Size, variant, or other specifics
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Minimum Purchase (₱)
              </label>
              <input
                type="number"
                value={minimumPurchase}
                onChange={(e) => setMinimumPurchase(e.target.value)}
                placeholder="0"
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">0 = no minimum</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Quantity Required
              </label>
              <input
                type="number"
                value={quantityRequired}
                onChange={(e) => setQuantityRequired(e.target.value)}
                placeholder="1"
                min="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">e.g., 'Buy 2 to qualify'</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Conditions
            </label>
            <textarea
              value={conditions}
              onChange={(e) => setConditions(e.target.value)}
              placeholder="e.g., Dine-in only, one per customer, valid weekdays"
              maxLength={200}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              Any restrictions or rules customers should know
            </p>
          </div>
        </div>
      )}

      <fieldset>
        <legend className="text-sm font-medium text-gray-700 mb-2">Customer Reward</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="oq-reward-type" className="block text-sm text-gray-600 mb-1">Reward Type</label>
            <select
              id="oq-reward-type"
              value={rewardType}
              onChange={(e) => setRewardType(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              {REWARD_TYPES.map(rt => (
                <option key={rt.value} value={rt.value}>{rt.label}</option>
              ))}
            </select>
          </div>
          {rewardType !== 'free_item' && rewardType !== 'bogo' && (
            <div>
              <label htmlFor="oq-reward-val" className="block text-sm text-gray-600 mb-1">
                Value {rewardLabel?.unit && `(${rewardLabel.unit})`}
              </label>
              <input
                id="oq-reward-val"
                type="number"
                value={rewardValue}
                onChange={(e) => setRewardValue(e.target.value)}
                min={1}
                placeholder={rewardType === 'discount_percent' ? '10' : '50'}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          )}
        </div>
        <div className="mt-3">
          <label htmlFor="oq-item" className="block text-sm text-gray-600 mb-1">Applies to which item?</label>
          <input
            id="oq-item"
            type="text"
            value={rewardItemName}
            onChange={(e) => setRewardItemName(e.target.value)}
            placeholder="e.g. Iced Coffee, Any item, Whole menu"
            className="w-full max-w-xs rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
        {rewardPreview && (
          <div className="mt-2 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200">
            <p className="text-sm text-emerald-800 font-medium">
              Customer reward: {rewardPreview}
            </p>
          </div>
        )}
      </fieldset>

      {isEditing && (
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="accent-emerald-600 rounded"
          />
          <span className="text-sm text-gray-700">Active (visible to customers)</span>
        </label>
      )}

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 min-w-[120px]"
        >
          {loading ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Quest'}
        </button>
      </div>
    </form>
  )
}

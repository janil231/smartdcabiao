/**
 * Uploads a file to Cloudinary using an unsigned upload preset.
 * No SDK — uses native fetch + FormData.
 * Returns the secure_url string to store in Firestore.
 */
export async function uploadToCloudinary(file) {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

  if (!cloudName || !uploadPreset) {
    throw new Error(
      'Cloudinary environment variables are not set. Check VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET in .env.local'
    )
  }

  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', uploadPreset)
  formData.append('folder', 'smartdcabiao/business-submissions')

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    {
      method: 'POST',
      body: formData,
    }
  )

  if (!response.ok) {
    let message = 'Cloudinary upload failed'
    try {
      const error = await response.json()
      message = error.error?.message || message
    } catch {
      // ignore JSON parse errors
    }
    throw new Error(message)
  }

  const data = await response.json()
  return data.secure_url
}

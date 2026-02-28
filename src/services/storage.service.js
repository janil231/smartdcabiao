import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage'
import { storage } from '../lib/firebase'

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

export async function uploadPlaceImage({ file, type, placeId }) {
  if (!file) {
    return { success: false, error: 'No file provided' }
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return { success: false, error: 'Invalid file type. Allowed: jpg, jpeg, png, webp' }
  }

  if (file.size > MAX_FILE_SIZE) {
    return { success: false, error: 'File too large. Max size: 5MB' }
  }

  try {
    const timestamp = Date.now()
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const fileName = `${timestamp}-${sanitizedName}`
    const path = `places/${type}/${placeId}/${fileName}`
    
    const storageRef = ref(storage, path)
    const uploadTask = uploadBytesResumable(storageRef, file)

    return new Promise((resolve) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100
          console.log(`Upload progress: ${progress}%`)
        },
        (error) => {
          console.error('Upload error:', error)
          resolve({ success: false, error: error.message })
        },
        async () => {
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref)
            resolve({ 
              success: true, 
              url: downloadURL, 
              path: path 
            })
          } catch (err) {
            resolve({ success: false, error: err.message })
          }
        }
      )
    })
  } catch (error) {
    console.error('Upload error:', error)
    return { success: false, error: error.message }
  }
}

export async function deletePlaceImage(path) {
  if (!path) {
    return { success: false, error: 'No path provided' }
  }

  try {
    const storageRef = ref(storage, path)
    await deleteObject(storageRef)
    return { success: true }
  } catch (error) {
    console.error('Delete error:', error)
    if (error.code === 'storage/object-not-found') {
      return { success: true }
    }
    return { success: false, error: error.message }
  }
}

export async function uploadMultipleImages({ files, type, placeId }) {
  const results = []
  
  for (const file of files) {
    const result = await uploadPlaceImage({ file, type, placeId })
    results.push(result)
  }
  
  return results
}

export function validateImageFile(file) {
  if (!file) return { valid: false, error: 'No file' }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { valid: false, error: 'Invalid type. Allowed: jpg, jpeg, png, webp' }
  }
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: 'File too large. Max: 5MB' }
  }
  return { valid: true }
}

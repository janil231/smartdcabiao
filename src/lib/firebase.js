// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

// Environment variable validation with helpful error messages
const requiredEnvVars = [
  { key: 'VITE_FIREBASE_API_KEY', desc: 'Firebase API Key' },
  { key: 'VITE_FIREBASE_AUTH_DOMAIN', desc: 'Firebase Auth Domain' }, 
  { key: 'VITE_FIREBASE_PROJECT_ID', desc: 'Firebase Project ID' },
  { key: 'VITE_FIREBASE_STORAGE_BUCKET', desc: 'Firebase Storage Bucket' },
  { key: 'VITE_FIREBASE_MESSAGING_SENDER_ID', desc: 'Firebase Messaging Sender ID' },
  { key: 'VITE_FIREBASE_APP_ID', desc: 'Firebase App ID' },
  { key: 'VITE_FACEBOOK_APP_ID', desc: 'Facebook App ID (Optional)' }
]

const missingVars = requiredEnvVars.filter(envVar => !import.meta.env[envVar.key])

if (missingVars.length > 0) {
  throw new Error(`Missing required environment variables: ${missingVars.map(v => v.key).join(', ')}. Please check your .env.local file and ensure all required variables are set.\nGet your Firebase configuration from: https://console.firebase.google.com/project/smartdcabiao/settings/general\nCurrent detected values: ${JSON.stringify({ hasApiKey: !!import.meta.env.VITE_FIREBASE_API_KEY, hasProjectId: !!import.meta.env.VITE_FIREBASE_PROJECT_ID, hasAppId: !!import.meta.env.VITE_FIREBASE_APP_ID, hasFacebookAppId: !!import.meta.env.VITE_FACEBOOK_APP_ID }, null, 2)}`)
}

// Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)

// Initialize Firebase services
export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)

// Export the app instance for potential future use
export default app

// Optional: Initialize additional services as needed
// export const analytics = getAnalytics(app)
// export const performance = getPerformance(app)
// export const functions = getFunctions(app)
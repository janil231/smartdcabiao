import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'

const REPORTS_COLLECTION = 'reports'

export const createReport = async (reportData) => {
  try {
    const docRef = await addDoc(collection(db, REPORTS_COLLECTION), {
      ...reportData,
      createdAt: serverTimestamp(),
      status: 'new'
    })
    return { success: true, id: docRef.id }
  } catch (error) {
    console.error('Error creating report:', error)
    return { success: false, error: error.message }
  }
}
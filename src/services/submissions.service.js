import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'

const SUBMISSIONS_COLLECTION = 'submissions'

export const createSubmission = async (submissionData) => {
  try {
    const docRef = await addDoc(collection(db, SUBMISSIONS_COLLECTION), {
      ...submissionData,
      createdAt: serverTimestamp(),
      status: 'new'
    })
    return { success: true, id: docRef.id }
  } catch (error) {
    console.error('Error creating submission:', error)
    return { success: false, error: error.message }
  }
}
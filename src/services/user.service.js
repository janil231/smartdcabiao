import { collection, query, where, getDocs, orderBy } from 'firebase/firestore'
import { db } from '../lib/firebase'

export async function getUserSubmissions(uid) {
  if (!uid) return []
  
  try {
    const q = query(
      collection(db, 'submissions'),
      where('createdByUid', '==', uid),
      orderBy('createdAt', 'desc')
    )
    
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null
    }))
  } catch (error) {
    console.error('Error fetching user submissions:', error)
    return []
  }
}

export async function getUserReports(uid) {
  if (!uid) return []
  
  try {
    const q = query(
      collection(db, 'reports'),
      where('reporterUid', '==', uid),
      orderBy('createdAt', 'desc')
    )
    
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null
    }))
  } catch (error) {
    console.error('Error fetching user reports:', error)
    return []
  }
}

import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '../lib/firebase'

export async function getUserSubmissions(uid) {
  if (!uid) return []
  
  try {
    const q = query(
      collection(db, 'submissions'),
      where('createdByUid', '==', uid)
    )
    
    const snapshot = await getDocs(q)
    const items = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null
    }))
    
    return items.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0
      return dateB - dateA
    })
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
      where('reporterUid', '==', uid)
    )
    
    const snapshot = await getDocs(q)
    const items = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null
    }))
    
    return items.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0
      return dateB - dateA
    })
  } catch (error) {
    console.error('Error fetching user reports:', error)
    return []
  }
}

import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  updateDoc 
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { logAudit, AUDIT_ACTIONS } from './audit.service'

const REPORTS_COLLECTION = 'reports'

export async function listReports({ status = 'new' } = {}) {
  try {
    let q = collection(db, REPORTS_COLLECTION)
    
    if (status) {
      q = query(q, where('status', '==', status), orderBy('createdAt', 'desc'))
    } else {
      q = query(q, orderBy('createdAt', 'desc'))
    }
    
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null
    }))
  } catch (error) {
    console.error('Error listing reports:', error)
    return []
  }
}

export async function getReportById(id) {
  try {
    const docRef = doc(db, REPORTS_COLLECTION, id)
    const docSnap = await getDoc(docRef)
    if (!docSnap.exists()) return null
    return {
      id: docSnap.id,
      ...docSnap.data(),
      createdAt: docSnap.data().createdAt?.toDate?.()?.toISOString() || null
    }
  } catch (error) {
    console.error('Error getting report:', error)
    return null
  }
}

export async function updateReportStatus(id, { status, reviewedBy, reviewedByEmail, reviewedAt, notes }) {
  try {
    const docRef = doc(db, REPORTS_COLLECTION, id)
    const updateData = {
      status,
      reviewedBy: reviewedBy || null,
      reviewedByEmail: reviewedByEmail || null,
      reviewedAt: reviewedAt || serverTimestamp(),
      notes: notes || null
    }
    
    await updateDoc(docRef, updateData)
    
    return { success: true }
  } catch (error) {
    console.error('Error updating report status:', error)
    return { success: false, error: error.message }
  }
}

export async function markReportInProgress(id, { reviewedBy, reviewedByEmail, notes } = {}) {
  try {
    const report = await getReportById(id)
    const docRef = doc(db, REPORTS_COLLECTION, id)
    await updateDoc(docRef, {
      status: 'in_progress',
      reviewedBy: reviewedBy || null,
      reviewedByEmail: reviewedByEmail || null,
      reviewedAt: serverTimestamp(),
      notes: notes || null
    })
    
    await logAudit({
      action: AUDIT_ACTIONS.REPORT_IN_PROGRESS,
      targetType: 'report',
      targetId: id,
      adminUid: reviewedBy,
      adminEmail: reviewedByEmail,
      meta: {
        issueType: report?.issueType,
        previousStatus: report?.status,
        notes
      }
    })
    
    return { success: true }
  } catch (error) {
    console.error('Error marking report in progress:', error)
    return { success: false, error: error.message }
  }
}

export async function markReportResolved(id, { reviewedBy, reviewedByEmail, notes } = {}) {
  try {
    const report = await getReportById(id)
    const docRef = doc(db, REPORTS_COLLECTION, id)
    await updateDoc(docRef, {
      status: 'resolved',
      reviewedBy: reviewedBy || null,
      reviewedByEmail: reviewedByEmail || null,
      reviewedAt: serverTimestamp(),
      notes: notes || null
    })
    
    await logAudit({
      action: AUDIT_ACTIONS.REPORT_RESOLVED,
      targetType: 'report',
      targetId: id,
      adminUid: reviewedBy,
      adminEmail: reviewedByEmail,
      meta: {
        issueType: report?.issueType,
        previousStatus: report?.status,
        notes
      }
    })
    
    return { success: true }
  } catch (error) {
    console.error('Error marking report resolved:', error)
    return { success: false, error: error.message }
  }
}

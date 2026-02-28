import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'

const AUDIT_LOGS_COLLECTION = 'auditLogs'

export async function logAudit({ action, targetType, targetId, adminUid, adminEmail, meta = {} }) {
  try {
    const auditEntry = {
      action,
      targetType,
      targetId,
      adminUid: adminUid || null,
      adminEmail: adminEmail || null,
      meta,
      createdAt: serverTimestamp()
    }
    
    const docRef = await addDoc(collection(db, AUDIT_LOGS_COLLECTION), auditEntry)
    return { success: true, id: docRef.id }
  } catch (error) {
    console.error('Error logging audit:', error)
    return { success: false, error: error.message }
  }
}

export const AUDIT_ACTIONS = {
  SUBMISSION_APPROVED: 'submission_approved',
  SUBMISSION_REJECTED: 'submission_rejected',
  SUBMISSION_NEEDS_INFO: 'submission_needs_info',
  PUBLISHED_BUSINESS: 'published_business',
  PUBLISHED_DESTINATION: 'published_destination',
  REPORT_IN_PROGRESS: 'report_in_progress',
  REPORT_RESOLVED: 'report_resolved'
}

import { 
  collection, 
  doc, 
  getDoc, 
  writeBatch, 
  serverTimestamp 
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { logAudit } from './audit.service'

const TYPE_MAP = {
  business: 'businesses',
  businesses: 'businesses',
  destination: 'destinations',
  destinations: 'destinations'
}

function normalizeType(type) {
  return TYPE_MAP[type] || 'businesses'
}

export async function exportPlacesToCSV(type) {
  const { listPlaces } = await import('./adminPlaces.service')
  const { toCSVString } = await import('../utils/csv')
  
  const places = await listPlaces(type)
  return toCSVString(places)
}

export async function importPlacesFromRows(type, rows, { mode, uid, email }) {
  const collectionName = normalizeType(type)
  const batch = writeBatch(db)
  
  let createdCount = 0
  let updatedCount = 0
  let skippedCount = 0
  const errors = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    
    if (row.errors && row.errors.length > 0) {
      errors.push({ row: i + 1, errors: row.errors })
      continue
    }

    const { id, data } = row

    if (mode === 'upsert') {
      if (!id) {
        errors.push({ row: i + 1, errors: ['ID required for upsert mode'] })
        continue
      }

      const existingDoc = await getDoc(doc(db, collectionName, id))
      
      if (existingDoc.exists()) {
        batch.update(doc(db, collectionName, id), {
          ...data,
          updatedAt: serverTimestamp(),
          updatedBy: { uid, email }
        })
        updatedCount++
      } else {
        batch.set(doc(db, collectionName, id), {
          ...data,
          createdAt: serverTimestamp(),
          createdBy: { uid, email }
        })
        createdCount++
      }
    } else {
      const docId = id || `import_${Date.now()}_${i}`
      
      batch.set(doc(db, collectionName, docId), {
        ...data,
        createdAt: serverTimestamp(),
        createdBy: { uid, email }
      })
      createdCount++
    }
  }

  await batch.commit()

  await logAudit({
    action: 'bulk_import',
    targetType: collectionName,
    targetId: 'batch_import',
    adminUid: uid,
    adminEmail: email,
    meta: {
      mode,
      totalRows: rows.length,
      createdCount,
      updatedCount,
      skippedCount: errors.length
    }
  })

  return {
    success: true,
    createdCount,
    updatedCount,
    skippedCount: errors.length,
    errors
  }
}

export async function checkPlaceExists(type, id) {
  const collectionName = normalizeType(type)
  const docSnap = await getDoc(doc(db, collectionName, id))
  return docSnap.exists()
}

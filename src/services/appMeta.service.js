import { doc, getDoc, setDoc, serverTimestamp, increment } from 'firebase/firestore'
import { db } from '../lib/firebase'

export async function getDataVersion() {
  try {
    const snap = await getDoc(doc(db, 'appMeta', 'dataVersion'))
    if (!snap.exists()) return 0
    return snap.data().version || 0
  } catch (err) {
    console.warn('[getDataVersion] Failed:', err)
    return 0
  }
}

export async function bumpDataVersion() {
  try {
    await setDoc(
      doc(db, 'appMeta', 'dataVersion'),
      { version: increment(1), updatedAt: serverTimestamp() },
      { merge: true }
    )
  } catch (err) {
    console.warn('[bumpDataVersion] Failed:', err)
  }
}

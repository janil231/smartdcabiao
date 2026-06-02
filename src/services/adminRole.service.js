import { doc, getDoc, setDoc, deleteDoc, collection, getDocs, serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { logAudit } from './audit.service'

const roleCache = new Map()

export async function getUserRole(uid) {
  if (!uid) return null
  if (roleCache.has(uid)) return roleCache.get(uid)

  try {
    const snap = await getDoc(doc(db, 'admins', uid))
    if (!snap.exists()) {
      roleCache.set(uid, null)
      return null
    }
    const role = snap.data().role || 'master'
    roleCache.set(uid, role)
    return role
  } catch (err) {
    console.warn('getUserRole failed:', err)
    return null
  }
}

export async function hasLguAccess(uid) {
  const role = await getUserRole(uid)
  return role === 'master' || role === 'admin'
}

export async function isMasterAdmin(uid) {
  const role = await getUserRole(uid)
  return role === 'master'
}

export async function isAdmin(uid) {
  return hasLguAccess(uid)
}

export async function getAdminDoc(uid) {
  if (!uid) return null
  try {
    const docRef = doc(db, 'admins', uid)
    const docSnap = await getDoc(docRef)
    if (!docSnap.exists()) return null
    return { id: docSnap.id, ...docSnap.data(), role: docSnap.data().role || 'master' }
  } catch (error) {
    if (error.code === 'permission-denied' || error.code === 'firestore/permission-denied') {
      if (import.meta.env.DEV) console.warn('Permission denied getting admin doc')
    } else {
      console.error('Error getting admin doc:', error)
    }
    return null
  }
}

export function clearAdminCache(uid) {
  if (uid) {
    roleCache.delete(uid)
  } else {
    roleCache.clear()
  }
}

export async function listAllAdmins() {
  const snap = await getDocs(collection(db, 'admins'))
  return snap.docs.map((d) => ({
    uid: d.id,
    ...d.data(),
    role: d.data().role || 'master',
  }))
}

export async function grantAdminRole(targetUid, email, displayName, role, grantedByUid) {
  if (!['master', 'admin'].includes(role)) {
    throw new Error("Invalid role. Must be 'master' or 'admin'.")
  }

  await setDoc(doc(db, 'admins', targetUid), {
    role,
    email: email || '',
    displayName: displayName || '',
    grantedBy: grantedByUid,
    grantedAt: serverTimestamp(),
  })

  roleCache.delete(targetUid)

  await logAudit({
    action: 'grant_admin_role',
    targetType: 'admin',
    targetId: targetUid,
    adminUid: grantedByUid,
    meta: { role, email },
  })
}

export async function revokeAdminRole(targetUid, revokedByUid) {
  await deleteDoc(doc(db, 'admins', targetUid))
  roleCache.delete(targetUid)

  await logAudit({
    action: 'revoke_admin_role',
    targetType: 'admin',
    targetId: targetUid,
    adminUid: revokedByUid,
    meta: {},
  })
}

export async function changeAdminRole(targetUid, newRole, changedByUid) {
  if (!['master', 'admin'].includes(newRole)) {
    throw new Error('Invalid role.')
  }

  await setDoc(
    doc(db, 'admins', targetUid),
    { role: newRole, updatedAt: serverTimestamp() },
    { merge: true }
  )
  roleCache.delete(targetUid)

  await logAudit({
    action: 'change_admin_role',
    targetType: 'admin',
    targetId: targetUid,
    adminUid: changedByUid,
    meta: { newRole },
  })
}

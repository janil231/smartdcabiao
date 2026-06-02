import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import {
  listAllAdmins,
  grantAdminRole,
  revokeAdminRole,
  changeAdminRole,
} from '../../../services/adminRole.service'
import { listAllUsers } from '../../../services/users.service'

function GrantAccessModal({ onClose, currentUserUid, existingAdmins, onRefresh }) {
  const [allUsers, setAllUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [processingUid, setProcessingUid] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  useEffect(() => {
    const handler = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  useEffect(() => {
    (async () => {
      try {
        setLoading(true)
        const users = await listAllUsers()
        setAllUsers(users)
      } catch (err) {
        setError('Failed to load users. Check your permissions.')
        console.error(err)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const adminRoleByUid = useMemo(() => {
    const map = new Map()
    existingAdmins.forEach((a) => {
      map.set(a.uid, a.role || 'master')
    })
    return map
  }, [existingAdmins])

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return allUsers
    const q = searchQuery.trim().toLowerCase()
    return allUsers.filter((u) => {
      return (
        (u.emailLower || '').includes(q) ||
        (u.displayNameLower || '').includes(q) ||
        (u.uid || '').toLowerCase().includes(q)
      )
    })
  }, [allUsers, searchQuery])

  const handleRoleChange = async (user, newRole) => {
    if (user.uid === currentUserUid) {
      alert('You cannot change your own role.')
      return
    }

    const currentRole = adminRoleByUid.get(user.uid)

    if (newRole === currentRole) return

    setProcessingUid(user.uid)
    setError('')

    try {
      if (newRole === 'none') {
        if (!window.confirm(`Revoke LGU access for ${user.email}?`)) {
          setProcessingUid(null)
          return
        }
        await revokeAdminRole(user.uid, currentUserUid)
      } else if (currentRole) {
        await changeAdminRole(user.uid, newRole, currentUserUid)
      } else {
        await grantAdminRole(
          user.uid,
          user.email,
          user.displayName,
          newRole,
          currentUserUid
        )
      }
      if (onRefresh) await onRefresh()
    } catch (err) {
      setError(`Failed: ${err.message}`)
    } finally {
      setProcessingUid(null)
    }
  }

  const getInitial = (user) => {
    const name = user.displayName || user.email || '?'
    return name.charAt(0).toUpperCase()
  }

  const getAvatarColor = (uid) => {
    const colors = [
      'bg-emerald-500', 'bg-blue-500', 'bg-purple-500',
      'bg-pink-500', 'bg-amber-500', 'bg-teal-500',
      'bg-indigo-500', 'bg-rose-500',
    ]
    const hash = uid.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
    return colors[hash % colors.length]
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4">
      <div className="fixed inset-0 bg-black/60" onClick={onClose} />

      <div className="relative w-full h-full sm:h-auto sm:max-w-2xl sm:max-h-[85vh] bg-white sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        <div className="shrink-0 bg-gradient-to-r from-emerald-600 to-emerald-500 px-5 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-white font-bold text-lg">🛡️ Grant LGU Access</h3>
            <p className="text-emerald-50 text-sm mt-0.5">
              Search for a user and assign their role.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 w-9 h-9 rounded-lg flex items-center justify-center"
          >
            ✕
          </button>
        </div>

        <div className="shrink-0 p-4 border-b border-gray-200 bg-gray-50">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="🔍 Search by name or email..."
            className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 focus:outline-none"
            autoFocus
          />
          <p className="text-xs text-gray-500 mt-2">
            {filteredUsers.length} {filteredUsers.length === 1 ? 'user' : 'users'}
            {searchQuery && ` matching "${searchQuery}"`}
          </p>
        </div>

        {error && (
          <div className="mx-4 mt-3 bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">
            ⚠️ {error}
          </div>
        )}

        {!loading && allUsers.length < 5 && (
          <div className="mx-4 mt-3 bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
            💡 Users appear here after they sign in at least once. If someone isn't showing,
            ask them to log in to the app first.
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Loading users...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-2">🔍</div>
              <p className="text-gray-500">
                {searchQuery ? 'No users match your search.' : 'No users found.'}
              </p>
              {searchQuery && (
                <p className="text-xs text-gray-400 mt-2">
                  Users appear here after they sign in at least once.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredUsers.map((user) => {
                const currentRole = adminRoleByUid.get(user.uid)
                const isSelf = user.uid === currentUserUid
                const isProcessing = processingUid === user.uid

                return (
                  <div
                    key={user.uid}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition ${
                      currentRole
                        ? 'border-emerald-200 bg-emerald-50/40'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {user.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt={user.displayName || user.email}
                        className="w-10 h-10 rounded-full object-cover shrink-0"
                      />
                    ) : (
                      <div className={`w-10 h-10 rounded-full ${getAvatarColor(user.uid)} text-white flex items-center justify-center font-bold shrink-0`}>
                        {getInitial(user)}
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm text-gray-900 truncate">
                          {user.displayName || '(No name)'}
                        </p>
                        {isSelf && (
                          <span className="text-xs font-semibold bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full">
                            You
                          </span>
                        )}
                        {currentRole === 'master' && (
                          <span className="text-xs font-semibold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                            🛡️ Master
                          </span>
                        )}
                        {currentRole === 'admin' && (
                          <span className="text-xs font-semibold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                            👤 Admin
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 truncate">{user.email}</p>
                    </div>

                    <div className="shrink-0">
                      {isProcessing ? (
                        <span className="text-xs text-gray-500">Saving...</span>
                      ) : (
                        <select
                          value={currentRole || 'none'}
                          onChange={(e) => handleRoleChange(user, e.target.value)}
                          disabled={isSelf}
                          className={`text-xs font-semibold px-3 py-2 rounded-lg border cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${
                            currentRole === 'master'
                              ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                              : currentRole === 'admin'
                              ? 'bg-blue-100 text-blue-700 border-blue-200'
                              : 'bg-gray-100 text-gray-600 border-gray-300'
                          }`}
                        >
                          <option value="none">No Access</option>
                          <option value="admin">👤 Admin</option>
                          <option value="master">🛡️ Master</option>
                        </select>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="shrink-0 px-4 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          <p className="text-xs text-gray-500">
            💡 Role changes save automatically
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

export default function ManageAdminsPanel({ currentUserUid }) {
  const [admins, setAdmins] = useState([])
  const [loading, setLoading] = useState(true)
  const [showGrantModal, setShowGrantModal] = useState(false)

  const loadAdmins = async () => {
    setLoading(true)
    try {
      const list = await listAllAdmins()
      setAdmins(list)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadAdmins() }, [])

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            🛡️ Manage Admins
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Grant or revoke LGU access. Admins can help run quest events.
          </p>
        </div>
        <button
          onClick={() => setShowGrantModal(true)}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold transition"
        >
          + Manage Users
        </button>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm">
        <p className="font-semibold text-gray-700 mb-2">📋 Role Guide:</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-600">
          <div>
            <span className="inline-block bg-emerald-100 text-emerald-700 font-semibold px-2 py-0.5 rounded mr-2">🛡️ Master</span>
            Full access — manages everything
          </div>
          <div>
            <span className="inline-block bg-blue-100 text-blue-700 font-semibold px-2 py-0.5 rounded mr-2">👤 Admin</span>
            Event helper — only views Quests + runs check-ins
          </div>
        </div>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : (
        <div className="overflow-x-auto -mx-5 sm:-mx-6 px-5 sm:px-6">
          <table className="min-w-[700px] w-full text-sm">
            <thead className="border-b border-gray-200">
              <tr className="text-left">
                <th className="py-3 px-3 font-semibold">User</th>
                <th className="py-3 px-3 font-semibold">UID</th>
                <th className="py-3 px-3 font-semibold">Role</th>
                <th className="py-3 px-3 font-semibold">Granted</th>
                <th className="py-3 px-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {admins.map((a) => (
                <tr key={a.uid} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-3">
                    <div className="font-medium">{a.displayName || '—'}</div>
                    <div className="text-xs text-gray-500">{a.email || '—'}</div>
                  </td>
                  <td className="py-3 px-3 font-mono text-xs text-gray-500">{a.uid.slice(0, 12)}...</td>
                  <td className="py-3 px-3">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                      a.role === 'master' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {a.role === 'master' ? '🛡️ Master' : '👤 Admin'}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-xs text-gray-500">
                    {a.grantedAt?.toDate?.().toLocaleDateString() || '—'}
                  </td>
                  <td className="py-3 px-3">
                    <button
                      onClick={async () => {
                        if (a.uid === currentUserUid) {
                          alert('You cannot revoke your own access.')
                          return
                        }
                        if (!window.confirm(`Revoke admin access for ${a.email || a.uid}?`)) return
                        await revokeAdminRole(a.uid, currentUserUid)
                        await loadAdmins()
                      }}
                      disabled={a.uid === currentUserUid}
                      className="px-3 py-1.5 text-sm font-semibold text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Revoke
                    </button>
                  </td>
                </tr>
              ))}
              {admins.length === 0 && (
                <tr><td colSpan={5} className="py-8 text-center text-gray-500">No admins yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showGrantModal && (
        <GrantAccessModal
          onClose={() => setShowGrantModal(false)}
          currentUserUid={currentUserUid}
          existingAdmins={admins}
          onRefresh={loadAdmins}
        />
      )}
    </div>
  )
}

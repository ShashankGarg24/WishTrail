import { useEffect, useState } from 'react'
import { settingsAPI } from '../../services/api'

export default function BlockedUsersSettings() {
  const [users, setUsers] = useState(null); const [error, setError] = useState('')
  useEffect(() => { settingsAPI.getBlockedUsers({ page: 1, limit: 100 }).then(({ data }) => setUsers(data.data.users || [])).catch(() => { setUsers([]); setError('Could not load blocked users.') }) }, [])
  const unblock = async username => { try { await settingsAPI.unblockUser(username); setUsers(value => value.filter(user => user.username !== username)) } catch (e) { setError(e.response?.data?.message || 'Could not unblock this user.') } }
  return <div className="p-5 sm:p-6">{error && <p className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}{users === null ? <p className="text-sm text-slate-500">Loading…</p> : users.length === 0 ? <p className="rounded-xl border border-slate-200 p-5 text-sm text-slate-500 dark:border-gray-700">You have not blocked anyone.</p> : <div className="space-y-2">{users.map(user => <div key={user.id || user.username} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 dark:border-gray-700"><img src={user.avatar || '/api/placeholder/40/40'} alt="" className="h-10 w-10 rounded-full object-cover" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-950 dark:text-white">{user.name}</p><p className="truncate text-xs text-slate-500">@{user.username}</p></div><button onClick={() => unblock(user.username)} className="text-sm font-bold text-red-600">Unblock</button></div>)}</div>}</div>
}

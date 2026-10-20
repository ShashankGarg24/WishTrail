import { useEffect, useState } from 'react'
import { settingsAPI } from '../../services/api'

const Toggle = ({ checked, disabled, onChange }) => <label className="relative inline-flex shrink-0 cursor-pointer items-center"><input type="checkbox" className="peer sr-only" checked={checked} disabled={disabled} onChange={onChange} /><span className="h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all peer-checked:bg-blue-600 peer-checked:after:translate-x-full dark:bg-elevated" /></label>

export default function PrivacySettings() {
  const [settings, setSettings] = useState(null); const [saving, setSaving] = useState(''); const [error, setError] = useState('')
  useEffect(() => { settingsAPI.getPrivacySettings().then(({ data }) => setSettings({ isPrivate: !!data.data.isPrivate, showGoals: data.data.showGoals ?? true, showHabits: !!data.data.showHabits })).catch(() => setError('Could not load privacy settings.')) }, [])
  const update = async key => { const next = !settings[key]; setSaving(key); setError(''); try { await settingsAPI.updatePrivacySettings({ [key]: next }); setSettings(value => ({ ...value, [key]: next })) } catch (e) { setError(e.response?.data?.message || 'Could not save this setting.') } finally { setSaving('') } }
  if (!settings) return <div className="p-6 text-sm text-slate-500">{error || 'Loading…'}</div>
  return <div className="space-y-3 p-5 sm:p-6">{error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 p-4 dark:border-line"><div><p className="font-semibold text-slate-950 dark:text-white">Private profile</p><p className="mt-1 text-sm text-slate-500">{settings.isPrivate ? 'Only approved followers can view your profile and activity.' : 'Anyone can view your profile and public activity.'}</p></div><Toggle checked={settings.isPrivate} disabled={saving === 'isPrivate'} onChange={() => update('isPrivate')} /></div>
    <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 p-4 dark:border-line"><div><p className="font-semibold text-slate-950 dark:text-white">Show goals on profile</p><p className="mt-1 text-sm text-slate-500">Show your goals, goal progress, and recent goals to people who can view your profile.</p></div><Toggle checked={settings.showGoals} disabled={saving === 'showGoals'} onChange={() => update('showGoals')} /></div>
    <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 p-4 dark:border-line"><div><p className="font-semibold text-slate-950 dark:text-white">Show habits on profile</p><p className="mt-1 text-sm text-slate-500">Show your habits, habit streak metrics, and recent habits to people who can view your profile.</p></div><Toggle checked={settings.showHabits} disabled={saving === 'showHabits'} onChange={() => update('showHabits')} /></div>
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-line dark:bg-gray-800/50">
      <h3 className="text-sm font-bold text-slate-950 dark:text-white">Current privacy settings</h3>
      <ul className="mt-2 space-y-1 text-sm text-slate-600 dark:text-muted">
        <li>• {settings.isPrivate ? 'Private' : 'Public'} profile visibility</li>
        <li>• {settings.isPrivate ? 'Only approved followers' : 'Everyone'} can see your activities</li>
        <li>• {settings.showGoals ? (settings.isPrivate ? 'Only approved followers' : 'Everyone') : 'Only you'} can see your goals</li>
        <li>• {settings.showHabits ? (settings.isPrivate ? 'Only approved followers' : 'Everyone') : 'Only you'} can see your habits</li>
      </ul>
    </div>
  </div>
}

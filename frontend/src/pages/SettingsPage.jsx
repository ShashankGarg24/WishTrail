import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Bell, ChevronRight, FileText, Flag, HelpCircle, KeyRound, Link2, LockKeyhole, Mail, Moon, ShieldCheck, User, UserX } from 'lucide-react'
import PersonalInfoSection from '../components/settings/PersonalInfoSection'
import SecuritySection from '../components/settings/SecuritySection'
import NotificationsSection from '../components/settings/NotificationsSection'
import PrivacySettings from '../components/settings/PrivacySettings'
import BlockedUsersSettings from '../components/settings/BlockedUsersSettings'
import ThemeSettings from '../components/settings/ThemeSettings'
import useApiStore from '../store/apiStore'

function LinkedAccounts() {
  const user = useApiStore(state => state.user)
  const isGoogleAccount = user?.googleConnected === true || user?.hasPassword === false || /google/i.test(user?.provider || user?.authProvider || '')
  return <div className="space-y-4 p-5 sm:p-6">
    <div className="rounded-xl border border-slate-200 p-4 dark:border-gray-700"><p className="text-xs font-bold uppercase tracking-wide text-slate-400">Email account</p><p className="mt-1 break-all text-sm font-semibold text-slate-900 dark:text-white">{user?.email || 'No email address available'}</p></div>
    {isGoogleAccount && <div className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 dark:border-gray-700"><div className="grid h-9 w-9 place-items-center rounded-full bg-white text-lg font-bold text-blue-600 shadow-sm">G</div><div><p className="text-sm font-semibold text-slate-900 dark:text-white">Google account attached</p><p className="text-xs text-slate-500">{user?.email}</p></div></div>}
  </div>
}

function HelpSupport() {
  return <div className="p-5 sm:p-6"><div className="rounded-2xl border border-slate-200 p-5 dark:border-gray-700">
    <h2 className="text-lg font-bold text-slate-950 dark:text-white">How can we help?</h2>
    <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">For account, privacy, safety, or technical help, email us with your WishTrail username and a clear description of the issue. Screenshots and the steps that caused the problem help us investigate faster.</p>
    <a href="mailto:support@wishtrail.in" className="mt-4 inline-flex rounded-lg border border-blue-200 px-4 py-2.5 text-sm font-bold text-blue-700 hover:bg-blue-50 dark:border-blue-900 dark:text-blue-300">support@wishtrail.in</a>
    <div className="my-5 border-t border-slate-100 dark:border-gray-800" /><p className="text-sm text-slate-600 dark:text-slate-300">Want to suggest an improvement or share general feedback?</p>
    <button type="button" onClick={() => window.dispatchEvent(new CustomEvent('wt_open_feedback'))} className="mt-3 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700">Send feedback</button>
  </div></div>
}

const titles = { 'personal-info': 'Edit Profile', security: 'Change Password', linked: 'Linked Accounts', visibility: 'Profile Visibility', blocked: 'Blocked Users', push: 'Push Notifications', email: 'Email Notifications', theme: 'Theme', help: 'Help & Support' }

export default function SettingsPage() {
  const navigate = useNavigate(); const [params, setParams] = useSearchParams()
  const isNativeApp = typeof window !== 'undefined' && !!window.ReactNativeWebView
  const requested = params.get('section') || params.get('tab'); const initialSection = requested === 'personal' ? 'personal-info' : requested
  const [section, setSection] = useState(initialSection || ''); const [loading, setLoading] = useState(false)
  const groups = useMemo(() => [
    { title: 'Account', rows: [['personal-info', 'Edit Profile', User], ['security', 'Change Password', KeyRound], ['linked', 'Linked Accounts', Link2]] },
    { title: 'Privacy', rows: [['visibility', 'Profile Visibility', LockKeyhole], ['blocked', 'Blocked Users', UserX]] },
    { title: 'Notifications', rows: [...(isNativeApp ? [['push', 'Push Notifications', Bell]] : []), ['email', 'Email Notifications', Mail]] },
    { title: 'Appearance', rows: [['theme', 'Theme', Moon]] },
    { title: 'Guidelines', rows: [['/privacy-policy', 'Privacy Policy', ShieldCheck, true], ['/terms-of-service', 'Terms & Conditions', FileText, true], ['/community-guidelines', 'Community Guidelines', Flag, true]] },
    { title: 'Support', rows: [['help', 'Help & Support', HelpCircle]] }
  ], [isNativeApp])
  useEffect(() => setSection(initialSection || ''), [initialSection])
  const open = (id, route) => { if (route) return navigate(id); setLoading(true); setSection(id); setParams({ section: id }); window.setTimeout(() => setLoading(false), 120) }
  const back = () => { if (section) { setSection(''); setParams({}) } else navigate(-1) }
  const content = { 'personal-info': <PersonalInfoSection />, security: <SecuritySection />, linked: <LinkedAccounts />, visibility: <PrivacySettings />, blocked: <BlockedUsersSettings />, push: <NotificationsSection channel="push" />, email: <NotificationsSection channel="email" />, theme: <ThemeSettings />, help: <HelpSupport /> }[section]
  return <div className="min-h-screen bg-[#f7f9fc] font-manrope dark:bg-gray-900"><div className={`mx-auto ${section ? 'max-w-4xl' : 'max-w-2xl'} bg-white dark:bg-gray-900 sm:my-6 sm:rounded-2xl sm:border sm:border-slate-200 sm:shadow-sm dark:sm:border-gray-700`}>
    <header className="sticky top-0 z-20 flex h-14 items-center border-b border-slate-100 bg-white/95 px-4 backdrop-blur dark:border-gray-800 dark:bg-gray-900/95 sm:rounded-t-2xl"><button onClick={back} className="-ml-2 rounded-full p-2 text-slate-700 hover:bg-slate-100 dark:text-white dark:hover:bg-gray-800" aria-label="Back"><ArrowLeft className="h-5 w-5" /></button><h1 className="flex-1 text-center text-base font-extrabold text-slate-950 dark:text-white">{titles[section] || 'Settings'}</h1><span className="w-9" /></header>
    {!section ? <main className="pb-8">{groups.map(group => <section key={group.title} className="pt-5"><h2 className="px-5 pb-2 text-xs font-extrabold uppercase tracking-wide text-slate-400">{group.title}</h2><div className="mx-3 overflow-hidden rounded-xl border border-slate-100 dark:border-gray-800">{group.rows.map(([id, label, Icon, route]) => <button key={label} onClick={() => open(id, route)} className="flex w-full items-center gap-3 border-b border-slate-100 px-4 py-3.5 text-left last:border-0 hover:bg-slate-50 dark:border-gray-800 dark:hover:bg-gray-800/60"><Icon className="h-[18px] w-[18px] text-slate-700 dark:text-slate-300" /><span className="flex-1 text-sm font-semibold text-slate-900 dark:text-white">{label}</span><ChevronRight className="h-4 w-4 text-slate-300" /></button>)}</div></section>)}</main> : <main className="min-h-[420px] bg-white dark:bg-gray-900">{loading ? <div className="flex h-56 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" /></div> : content}</main>}
  </div></div>
}

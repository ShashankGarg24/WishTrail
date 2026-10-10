import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Moon, Sun } from 'lucide-react'
import useApiStore from '../../store/apiStore'
import { settingsAPI } from '../../services/api'

export default function ThemeSettings() {
  const { isDarkMode, setThemeMode, syncThemeFromServer } = useApiStore()
  const [error, setError] = useState('')
  useEffect(() => { syncThemeFromServer() }, [syncThemeFromServer])
  const toggleTheme = async () => {
    const dark = !isDarkMode; setError('')
    try { await settingsAPI.updateThemeSettings({ theme: dark ? 'dark' : 'light' }); setThemeMode(dark) }
    catch (e) { setError(e.response?.data?.message || 'Could not update the theme.') }
  }
  return <div className="p-5 sm:p-6">
    {error && <p className="mb-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">{error}</p>}
    <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 p-4 dark:border-gray-700">
      <div><p className="font-semibold text-slate-950 dark:text-white">Theme</p><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">You are using the {isDarkMode ? 'dark' : 'light'} theme.</p></div>
      <motion.button type="button" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={toggleTheme} aria-label={`Switch to ${isDarkMode ? 'light' : 'dark'} theme`} className="relative shrink-0 rounded-xl border border-slate-300 p-3 transition-colors hover:bg-slate-50 dark:border-gray-600 dark:hover:bg-gray-800">
        <span className="relative block h-5 w-5"><Sun className={`absolute inset-0 h-5 w-5 text-amber-500 transition-all ${isDarkMode ? 'rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100'}`} /><Moon className={`absolute inset-0 h-5 w-5 text-blue-400 transition-all ${isDarkMode ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-0 opacity-0'}`} /></span>
      </motion.button>
    </div>
  </div>
}

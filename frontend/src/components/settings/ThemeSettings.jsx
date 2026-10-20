import { Moon, Sun } from 'lucide-react'
import useApiStore from '../../store/apiStore'

export default function ThemeSettings() {
  const { isDarkMode, toggleTheme } = useApiStore()

  return <div className="p-5 sm:p-6">
    <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 p-4 dark:border-line">
      <div>
        <p className="font-semibold text-slate-950 dark:text-ink">Theme</p>
        <p className="mt-1 text-sm text-slate-500 dark:text-muted">You are using the {isDarkMode ? 'dark' : 'light'} theme.</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={isDarkMode}
        aria-label="Dark theme"
        title={`Switch to ${isDarkMode ? 'light' : 'dark'} theme`}
        onClick={toggleTheme}
        className="relative shrink-0 rounded-xl border border-slate-300 p-3 transition-colors duration-200 hover:bg-slate-50 dark:border-line dark:hover:bg-elevated"
      >
        <span className="relative block h-5 w-5" aria-hidden="true">
          <Sun className={`absolute inset-0 h-5 w-5 text-amber-500 transition-all duration-200 ${isDarkMode ? 'rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100'}`} />
          <Moon className={`absolute inset-0 h-5 w-5 text-blue-400 dark:text-brand transition-all duration-200 ${isDarkMode ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-0 opacity-0'}`} />
        </span>
      </button>
    </div>
  </div>
}

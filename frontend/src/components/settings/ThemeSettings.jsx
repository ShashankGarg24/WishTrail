import { useState, useEffect } from "react";
import { settingsAPI } from "../../services/api";
import { Sun, Moon, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

export default function ThemeSettings() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchThemeSettings();
  }, []);

  const fetchThemeSettings = async () => {
    try {
      const response = await settingsAPI.getThemeSettings();
      const theme = response.data.data.theme;
      setIsDarkMode(theme === 'dark');
    } catch (error) {
      console.error('Failed to fetch theme settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleTheme = async () => {
    const newTheme = isDarkMode ? 'light' : 'dark';
    setError("");
    try {
      await settingsAPI.updateThemeSettings({ theme: newTheme });
      setIsDarkMode(!isDarkMode);
      // Apply theme change immediately
      if (newTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } catch (error) {
      console.error('Failed to update theme:', error);
      setError(error.response?.data?.message || 'Failed to update theme');
    }
  };

  if (loading) {
    return <div className="text-sm text-gray-500 dark:text-gray-400">Loading…</div>;
  }

  return (
    <div className="space-y-6">
      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-800 dark:text-red-200">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Theme</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {'You are currently using the '}
            {isDarkMode ? 'dark' : 'light'}
            {' theme. Toggle to switch between them.'}
          </p>
        </div>
        {/* Theme Toggle */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={toggleTheme}
          className="relative p-3 rounded-xl bg-white/10 hover:bg-white/20 dark:hover:bg-white/10 border border-white/20 dark:border-white/10 transition-all duration-300 group"
        >
          <div className="relative w-5 h-5">
            <Sun className={`absolute inset-0 h-5 w-5 text-yellow-500 transition-all duration-300 ${
              isDarkMode ? 'opacity-0 rotate-90 scale-0' : 'opacity-100 rotate-0 scale-100'
            }`} />
            <Moon className={`absolute inset-0 h-5 w-5 text-purple-400 transition-all duration-300 ${
              isDarkMode ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-0'
            }`} />
          </div>
          {/* Glow effect */}
          <div className="absolute inset-0 rounded-xl bg-yellow-400/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </motion.button>
      </div>
    </div>
  );
}

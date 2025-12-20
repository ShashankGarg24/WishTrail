import { useState, useEffect } from "react";
import { settingsAPI } from "../../services/api";
import { AlertCircle } from "lucide-react";

export default function PrivacySettings() {
  const [isPrivate, setIsPrivate] = useState(false);
  const [areHabitsPrivate, setAreHabitsPrivate] = useState(true);
  const [loading, setLoading] = useState(false);
  const [habitsLoading, setHabitsLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchPrivacySettings();
  }, []);

  const fetchPrivacySettings = async () => {
    try {
      const response = await settingsAPI.getPrivacySettings();
      setIsPrivate(response.data.data.isPrivate);
      setAreHabitsPrivate(response.data.data.areHabitsPrivate ?? true);
    } catch (error) {
      console.error('Failed to fetch privacy settings:', error);
    } finally {
      setInitialLoading(false);
    }
  };

  const handlePrivacyToggle = async () => {
    setLoading(true);
    setError("");
    try {
      await settingsAPI.updatePrivacySettings({ isPrivate: !isPrivate });
      setIsPrivate((prev) => !prev);
    } catch (error) {
      console.error('Failed to update privacy settings:', error);
      setError(error.response?.data?.message || 'Failed to update privacy settings');
    } finally {
      setLoading(false);
    }
  };

  const handleHabitsPrivacyToggle = async () => {
    setHabitsLoading(true);
    setError("");
    try {
      await settingsAPI.updatePrivacySettings({ areHabitsPrivate: !areHabitsPrivate });
      setAreHabitsPrivate((prev) => !prev);
    } catch (error) {
      console.error('Failed to update habits privacy settings:', error);
      setError(error.response?.data?.message || 'Failed to update habits privacy settings');
    } finally {
      setHabitsLoading(false);
    }
  };

  if (initialLoading) {
    return <div className="text-center py-4">Loading...</div>;
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
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Profile Privacy</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {isPrivate
              ? "Your profile is private. Only followers can see your activities and goals."
              : "Your profile is public. Anyone can see your activities and goals."}
          </p>
        </div>
        <button
          onClick={handlePrivacyToggle}
          disabled={loading}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            isPrivate ? "bg-primary-600" : "bg-gray-200 dark:bg-gray-600"
          } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              isPrivate ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Habits Privacy</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {areHabitsPrivate
              ? "Your habits are private. Only you can see them on your profile."
              : "Your habits are visible. They follow your profile privacy settings."}
          </p>
        </div>
        <button
          onClick={handleHabitsPrivacyToggle}
          disabled={habitsLoading}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            areHabitsPrivate ? "bg-primary-600" : "bg-gray-200 dark:bg-gray-600"
          } ${habitsLoading ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              areHabitsPrivate ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 dark:text-white mb-2">Privacy Settings</h4>
        <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
          <li>• {isPrivate ? "Private" : "Public"} profile visibility</li>
          <li>• {isPrivate ? "Only followers" : "Everyone"} can see your activities</li>
          <li>• {isPrivate ? "Only followers" : "Everyone"} can see your goals</li>
          <li>• {areHabitsPrivate ? "Only you" : (isPrivate ? "Only followers" : "Everyone")} can see your habits</li>
        </ul>
      </div>
    </div>
  );
}

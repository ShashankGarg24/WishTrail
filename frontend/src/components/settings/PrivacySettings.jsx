import { useState } from "react";

export default function PrivacySettings() {
  const [isPrivate, setIsPrivate] = useState(false);
  const [loading, setLoading] = useState(false);

  const handlePrivacyToggle = async () => {
    setLoading(true);
    // 🔄 Call API to toggle privacy
    setTimeout(() => {
      setIsPrivate((prev) => !prev);
      setLoading(false);
    }, 500);
  };

  return (
    <div className="space-y-6">
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

      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 dark:text-white mb-2">Privacy Settings</h4>
        <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
          <li>• {isPrivate ? "Private" : "Public"} profile visibility</li>
          <li>• {isPrivate ? "Only followers" : "Everyone"} can see your activities</li>
          <li>• {isPrivate ? "Only followers" : "Everyone"} can see your goals</li>
        </ul>
      </div>
    </div>
  );
}

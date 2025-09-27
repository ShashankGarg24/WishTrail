import { useState } from "react";

export default function ThemeSettings() {
  const [theme, setTheme] = useState("light");

  const handleThemeChange = (val) => {
    setTheme(val);
    // 🔄 Save to localStorage or API
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white">Theme</h3>
      <div className="flex gap-4">
        {["light", "dark", "system"].map((option) => (
          <button
            key={option}
            onClick={() => handleThemeChange(option)}
            className={`px-4 py-2 rounded-md border ${
              theme === option
                ? "bg-primary-600 text-white"
                : "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
            }`}
          >
            {option.charAt(0).toUpperCase() + option.slice(1)}
          </button>
        ))}
      </div>
    </div>
  );
}

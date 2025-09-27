import { useState } from "react";
import { cn } from "@/lib/utils";

export default function SettingsLayout({ sections, initial = null }) {
  const [active, setActive] = useState(initial || sections[0]?.id);

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <aside className="w-64 border-r border-gray-200 dark:border-gray-700 hidden md:flex flex-col">
        <h2 className="p-6 text-lg font-semibold text-gray-900 dark:text-white">
          Settings
        </h2>
        <nav className="flex-1 space-y-1 px-3">
          {sections.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActive(id)}
              className={cn(
                "flex items-center w-full px-3 py-2 rounded-md text-sm font-medium transition-colors",
                active === id
                  ? "bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300"
                  : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
              )}
            >
              {Icon && <Icon className="mr-2 h-4 w-4" />}
              {label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-6 overflow-y-auto">
        {sections.map(
          ({ id, component }) => active === id && <div key={id}>{component}</div>
        )}
      </main>
    </div>
  );
}

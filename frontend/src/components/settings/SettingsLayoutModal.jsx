import { useState } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

export default function SettingsLayout({ sections, initial = null }) {
  const [active, setActive] = useState(initial || sections[0]?.id);

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Desktop Sidebar */}
      <aside className="w-64 border-r border-gray-200 dark:border-gray-700 hidden md:flex flex-col bg-white dark:bg-gray-800">
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
                  ? "bg-gradient-to-r from-blue-100 via-indigo-100 to-purple-100 dark:from-blue-900/30 dark:via-indigo-900/30 dark:to-purple-900/30 text-indigo-700 dark:text-indigo-300"
                  : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
              )}
            >
              {Icon && <Icon className="mr-2 h-4 w-4" />}
              {label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Desktop Main content */}
      <main className="hidden md:block flex-1 p-6 overflow-y-auto">
        {sections.map(
          ({ id, component }) => active === id && <div key={id}>{component}</div>
        )}
      </main>

      {/* Mobile Accordion View */}
      <main className="md:hidden flex-1 p-4 overflow-y-auto">
        <h2 className="mb-4 text-xl font-bold text-gray-900 dark:text-white">
          Settings
        </h2>
        <div className="space-y-3">
          {sections.map(({ id, label, icon: Icon, component }) => (
            <div
              key={id}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm"
            >
              <button
                onClick={() => setActive(active === id ? null : id)}
                className={cn(
                  "w-full flex items-center justify-between p-4 text-left transition-colors",
                  active === id
                    ? "bg-gray-50 dark:bg-gray-800/50"
                    : "hover:bg-gray-50 dark:hover:bg-gray-700/50"
                )}
              >
                <div className="flex items-center gap-3">
                  {Icon && <Icon className="w-5 h-5 text-gray-500 dark:text-gray-400" />}
                  <span className={cn(
                    "font-medium",
                    active === id
                      ? "text-indigo-600 dark:text-indigo-400"
                      : "text-gray-900 dark:text-gray-100"
                  )}>
                    {label}
                  </span>
                </div>
                <ChevronDown
                  className={cn(
                    "w-5 h-5 text-gray-400 transition-transform duration-200",
                    active === id ? "transform rotate-180" : ""
                  )}
                />
              </button>

              {active === id && (
                <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                  {component}
                </div>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

const SkeletonNotifications = ({ count = 6 }) => (
  <div className="space-y-3">
    {[...Array(count)].map((_, i) => (
      <div key={i} className="flex items-center gap-3 px-3 sm:px-4 py-3 rounded-xl border bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
        <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="h-3 w-3/4 sm:w-40 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2" />
          <div className="h-3 w-full sm:w-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>
        <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
          <div className="h-7 w-20 rounded-lg bg-gray-200 dark:bg-gray-700 animate-pulse" />
          <div className="h-7 w-20 rounded-lg bg-gray-200 dark:bg-gray-700 animate-pulse" />
        </div>
        <div className="flex sm:hidden flex-shrink-0">
          <div className="h-6 w-6 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
        </div>
      </div>
    ))}
  </div>
)

export default SkeletonNotifications



const SkeletonCard = ({ avatar = true, lines = 3 }) => (
  <div className="animate-pulse rounded-2xl p-6 border border-gray-200 dark:border-gray-700/50 bg-white/80 dark:bg-gray-800/50">
    {avatar && <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-700 mb-4" />}
    {[...Array(lines)].map((_, i) => (
      <div key={i} className={`h-3 rounded bg-gray-200 dark:bg-gray-700 ${i ? 'mt-2' : ''}`} />
    ))}
  </div>
)
export default SkeletonCard 
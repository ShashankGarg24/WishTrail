import SkeletonCard from './SkeletonCard'
const SkeletonList = ({ count = 6, grid = true, avatar = true, lines = 3 }) => (
  <div className={grid ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
    {[...Array(count)].map((_, i) => <SkeletonCard key={i} avatar={avatar} lines={lines} />)}
  </div>
)
export default SkeletonList 
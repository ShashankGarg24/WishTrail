import { useEffect, useRef, useState } from 'react'
import ShareableGoalCard from './ShareableGoalCard'

export default function GoalSharePreview({ snapshot, cardRef, maxWidth = 360 }) {
  const container = useRef(null)
  const [width, setWidth] = useState(maxWidth)
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setWidth(Math.min(maxWidth, entry.contentRect.width)))
    observer.observe(container.current)
    return () => observer.disconnect()
  }, [maxWidth])
  const height = snapshot.format === 'SQUARE_1_1' ? 360 : 640
  return <div ref={container} style={{ width: '100%', maxWidth, margin: 'auto' }}><div style={{ height: height * width / 360, position: 'relative' }}><div style={{ position: 'absolute', top: 0, left: 0, transform: `scale(${width / 360})`, transformOrigin: 'top left' }}><ShareableGoalCard ref={cardRef} snapshot={snapshot}/></div></div></div>
}

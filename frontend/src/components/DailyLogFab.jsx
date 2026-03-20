import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Check, PenLine } from 'lucide-react'
import useApiStore from '../store/apiStore'
import DailyLogsPromptModal from './DailyLogsPromptModal'
import { getDateKeyInTimezone } from '../utils/timezoneUtils'

const DailyLogFab = () => {
  const { isAuthenticated, dailyLogsEntries, getMyDailyLogsEntries } = useApiStore()
  const [isOpen, setIsOpen] = useState(false)
  const [isFabReady, setIsFabReady] = useState(false)

  useEffect(() => {
    let isMounted = true

    if (!isAuthenticated) {
      setIsFabReady(false)
      return () => {
        isMounted = false
      }
    }

    setIsFabReady(false)
    getMyDailyLogsEntries({ todayOnly: true, limit: 1 })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setIsFabReady(true)
      })

    return () => {
      isMounted = false
    }
  }, [isAuthenticated, getMyDailyLogsEntries])

  const todayEntry = useMemo(() => {
    const todayKey = getDateKeyInTimezone(new Date())
    if (!Array.isArray(dailyLogsEntries) || dailyLogsEntries.length === 0) return null

    return dailyLogsEntries.find((entry) => {
      if (!entry) return false
      if (entry.dayKey === todayKey) return true
      if (entry.createdAt && getDateKeyInTimezone(new Date(entry.createdAt)) === todayKey) return true
      return false
    }) || null
  }, [dailyLogsEntries])

  const hasTodayDailyLog = Boolean(todayEntry)

  if (!isAuthenticated || !isFabReady) return null

  return (
    <>
      <motion.button
        type="button"
        onClick={() => setIsOpen(true)}
        initial={{ opacity: 0, y: 20, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        whileTap={{ scale: 0.92 }}
        className="fixed z-40 bottom-24 right-5 md:bottom-8 md:right-8 h-14 w-14 rounded-full shadow-lg flex items-center justify-center text-white"
        style={{ backgroundColor: hasTodayDailyLog ? '#9ca3af' : '#4c99e6' }}
        aria-label={hasTodayDailyLog ? 'Today daily log completed' : 'Create daily log'}
        title={hasTodayDailyLog ? 'Today Daily Log Completed' : 'Log Daily'}
      >
        {hasTodayDailyLog ? <Check className="h-7 w-7" /> : <PenLine className="h-6 w-6" />}
      </motion.button>

      <DailyLogsPromptModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        existingEntry={todayEntry}
        onSubmitted={async () => {
          await getMyDailyLogsEntries({ todayOnly: true, limit: 1 })
        }}
      />
    </>
  )
}

export default DailyLogFab

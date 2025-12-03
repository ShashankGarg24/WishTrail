import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Download, FileText, BookOpen, Sparkles, Calendar as CalendarIcon } from 'lucide-react'
import { journalsAPI } from '../services/api'

export default function JournalExportModal({ isOpen, onClose }) {
  const [format, setFormat] = useState('pdf') // pdf | text
  const [style, setStyle] = useState('simple') // diary | simple
  const [includeMotivation, setIncludeMotivation] = useState(true)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setFormat('pdf')
      setStyle('simple')
      setIncludeMotivation(true)
      setLoading(false)
    }
  }, [isOpen])

  if (!isOpen) return null

  const download = async () => {
    try {
      // Validate date range
      if (from && to) {
        const fromDate = new Date(from)
        const toDate = new Date(to)
        if (toDate < fromDate) {
          alert('End date cannot be before start date')
          return
        }
      }
      
      setLoading(true)
      const params = { format, style, includeMotivation }
      if (from) params.from = from
      if (to) params.to = to
      const res = await journalsAPI.export(params)
      const blob = res?.data
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const ext = format === 'pdf' ? 'pdf' : 'txt'
      const styleName = style === 'diary' ? 'diary' : 'simple'
      a.download = `wishtrail-journal-${styleName}.${ext}`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
      onClose()
    } catch (error) {
      const msg = error?.response?.data?.message || 'Failed to export journal'
      alert(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/50" onClick={onClose} />
        <motion.div initial={{ opacity: 0, scale: 0.95, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 12 }} className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2"><BookOpen className="h-5 w-5 text-indigo-500"/> Export Journal</h3>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"><X className="h-5 w-5 text-gray-500"/></button>
          </div>

          <div className="space-y-4">
            {/* Format */}
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2 block uppercase tracking-wide">Format</label>
              <div className="flex gap-2">
                <button onClick={() => setFormat('pdf')} className={`flex-1 px-3 py-2.5 rounded-lg border font-medium text-sm transition-all ${format==='pdf' ? 'bg-indigo-500 text-white border-indigo-500 shadow-sm' : 'bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500'}`}><Download className="h-4 w-4 inline mr-1.5"/> PDF</button>
                <button onClick={() => setFormat('text')} className={`flex-1 px-3 py-2.5 rounded-lg border font-medium text-sm transition-all ${format==='text' ? 'bg-indigo-500 text-white border-indigo-500 shadow-sm' : 'bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500'}`}><FileText className="h-4 w-4 inline mr-1.5"/> Text</button>
              </div>
            </div>

            {/* Style */}
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2 block uppercase tracking-wide">Style</label>
              <div className="flex gap-2">
                <button onClick={() => setStyle('diary')} className={`flex-1 px-3 py-2.5 rounded-lg border font-medium text-sm transition-all ${style==='diary' ? 'bg-indigo-500 text-white border-indigo-500 shadow-sm' : 'bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500'}`}><BookOpen className="h-4 w-4 inline mr-1.5"/> Diary</button>
                <button onClick={() => setStyle('simple')} className={`flex-1 px-3 py-2.5 rounded-lg border font-medium text-sm transition-all ${style==='simple' ? 'bg-indigo-500 text-white border-indigo-500 shadow-sm' : 'bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500'}`}><FileText className="h-4 w-4 inline mr-1.5"/> Simple</button>
              </div>
            </div>

            {/* Options */}
            <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
              <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                <input type="checkbox" checked={includeMotivation} onChange={(e)=>setIncludeMotivation(e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-indigo-500 focus:ring-indigo-500" />
                <span className="inline-flex items-center gap-1.5 font-medium"><Sparkles className="h-4 w-4 text-indigo-500"/> Include AI motivation</span>
              </label>
            </div>

            {/* Date range */}
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2 flex items-center gap-1.5 uppercase tracking-wide"><CalendarIcon className="h-3.5 w-3.5"/> Date Range (Optional)</label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">From</label>
                  <input type="date" value={from} onChange={(e)=>setFrom(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-white dark:bg-gray-900/50 border border-gray-300 dark:border-gray-600 text-sm text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"/>
                </div>
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">To</label>
                  <input type="date" value={to} onChange={(e)=>setTo(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-white dark:bg-gray-900/50 border border-gray-300 dark:border-gray-600 text-sm text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"/>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-200 dark:border-gray-700 mt-2">
              <button onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 text-sm font-medium transition-colors">Cancel</button>
              <button onClick={download} disabled={loading} className={`px-5 py-2 rounded-lg text-white text-sm font-medium transition-colors inline-flex items-center gap-2 ${loading ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-500 hover:bg-indigo-600'}`}>
                <Download className="h-4 w-4" />
                {loading ? 'Preparing…' : 'Download'}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}



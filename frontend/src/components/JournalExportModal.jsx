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
      a.download = `wishtrail-journal.${ext}`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (_) {
    } finally {
      setLoading(false)
    }
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/50" onClick={onClose} />
        <motion.div initial={{ opacity: 0, scale: 0.95, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 12 }} className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2"><BookOpen className="h-5 w-5 text-indigo-600"/> Export Journal</h3>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"><X className="h-5 w-5 text-gray-500"/></button>
          </div>

          <div className="space-y-5">
            {/* Format */}
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-300 mb-2">Format</div>
              <div className="flex gap-2">
                <button onClick={() => setFormat('pdf')} className={`flex-1 px-3 py-2 rounded-xl border ${format==='pdf' ? 'bg-indigo-500 text-white border-indigo-500' : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200'}`}><Download className="h-4 w-4 inline mr-2"/> PDF</button>
                <button onClick={() => setFormat('text')} className={`flex-1 px-3 py-2 rounded-xl border ${format==='text' ? 'bg-indigo-500 text-white border-indigo-500' : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200'}`}><FileText className="h-4 w-4 inline mr-2"/> Text</button>
              </div>
            </div>

            {/* Style
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-300 mb-2">Style</div>
              <div className="flex gap-2">
                <button onClick={() => setStyle('diary')} className={`flex-1 px-3 py-2 rounded-xl border ${style==='diary' ? 'bg-indigo-500 text-white border-indigo-500' : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200'}`}><BookOpen className="h-4 w-4 inline mr-2"/> Digital Diary</button>
                <button onClick={() => setStyle('simple')} className={`flex-1 px-3 py-2 rounded-xl border ${style==='simple' ? 'bg-indigo-500 text-white border-indigo-500' : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200'}`}><FileText className="h-4 w-4 inline mr-2"/> Simple Text</button>
              </div>
            </div> */}

            {/* Options */}
            <div>
              <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input type="checkbox" checked={includeMotivation} onChange={(e)=>setIncludeMotivation(e.target.checked)} />
                <span className="inline-flex items-center gap-1"><Sparkles className="h-4 w-4 text-indigo-500"/> Include motivation</span>
              </label>
            </div>

            {/* Date range */}
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-300 mb-2 inline-flex items-center gap-2"><CalendarIcon className="h-4 w-4"/> Date range (optional)</div>
              <div className="grid grid-cols-2 gap-3">
                <input type="date" value={from} onChange={(e)=>setFrom(e.target.value)} className="px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200"/>
                <input type="date" value={to} onChange={(e)=>setTo(e.target.value)} className="px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200"/>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200">Cancel</button>
              <button onClick={download} disabled={loading} className={`px-4 py-2 rounded-lg text-white ${loading ? 'bg-indigo-400' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
                {loading ? 'Preparing…' : 'Download'}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}



import { motion, AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';
import { lockBodyScroll, unlockBodyScroll } from '../utils/scrollLock';
import { X, Heart } from 'lucide-react';

const Chip = ({ children }) => (
  <span className="px-2 py-0.5 rounded-full text-xs bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200">{children}</span>
);

const Pill = ({ title, value }) => (
  <div className="p-3 bg-white dark:bg-gray-800/40 rounded-xl border border-gray-200 dark:border-gray-700 text-center shadow-sm">
    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{title}</div>
    <div className="text-lg font-semibold text-gray-800 dark:text-gray-100">{value || 0}</div>
  </div>
);

const JournalEntryModal = ({ isOpen, onClose, entry }) => {
  if (!isOpen || !entry) return null;

  useEffect(() => { lockBodyScroll(); return () => unlockBodyScroll(); }, []);
  const motivation = entry?.ai?.motivation || '';
  const s = entry?.aiSignals || {};
  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ zIndex: 1000 }}>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/50" onClick={onClose} />
        <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-2xl border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2"><Heart className="h-5 w-5 text-rose-500" /> Journal Entry</h3>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"><X className="h-5 w-5 text-gray-500" /></button>
          </div>

          <div className="space-y-5">
            <div>
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-2">
                <Chip>{new Date(entry.createdAt).toLocaleString()}</Chip>
                <Chip>{entry.visibility}</Chip>
                <Chip>{String(entry.mood || '').replace('_',' ') || 'neutral'}</Chip>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800/40 rounded-2xl p-4 border border-gray-200 dark:border-gray-700">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Your reflection</div>
                <div className="whitespace-pre-wrap text-gray-900 dark:text-gray-100 leading-relaxed">{entry.content}</div>
              </div>
            </div>

            {motivation && (
              <div className="p-5 bg-gradient-to-br from-indigo-50 to-sky-50 dark:from-indigo-900/10 dark:to-sky-900/10 border border-indigo-200/70 dark:border-indigo-800/50 rounded-2xl">
                <div className="text-sm text-indigo-800 dark:text-indigo-200 font-semibold mb-2">Motivation</div>
                <div className="text-gray-800 dark:text-gray-100 leading-relaxed text-[15px]">{motivation}</div>
              </div>
            )}

            <div>
              <div className="text-sm text-gray-600 dark:text-gray-300 mb-2">Points from this entry</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <Pill title="+1 Helped" value={s.helpedCount} />
                <Pill title="+1 Gratitude" value={s.gratitudeCount} />
                <Pill title="+1 Self Sacrifice" value={s.selfSacrificeCount} />
                <Pill title="+1 Positive" value={s.positiveCount} />
                <Pill title="+1 Kindness" value={s.kindnessCount} />
                <Pill title="+1 Resilience" value={s.resilienceCount} />
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default JournalEntryModal;

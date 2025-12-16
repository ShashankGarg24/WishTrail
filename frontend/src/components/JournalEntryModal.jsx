import { motion, AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';
import { lockBodyScroll, unlockBodyScroll } from '../utils/scrollLock';
import { X, Heart } from 'lucide-react';

const Chip = ({ children }) => (
  <span className="px-2 py-1 rounded-md text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700">{children}</span>
);



const JournalEntryModal = ({ isOpen, onClose, entry }) => {
  useEffect(() => {
    if (isOpen) {
      lockBodyScroll();
      return () => unlockBodyScroll();
    }
    return undefined;
  }, [isOpen]);
  if (!isOpen || !entry) return null;
  const motivation = entry?.motivation || '';
  const s = entry?.aiSignals || {};
  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ zIndex: 1000 }}>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/50" onClick={onClose} />
        <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto scrollbar-hide bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-xl border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2"><Heart className="h-5 w-5 text-rose-500" /> Journal Entry</h3>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"><X className="h-5 w-5 text-gray-500" /></button>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex items-center flex-wrap gap-2 mb-3">
                <Chip>{new Date(entry.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</Chip>
                <Chip className="capitalize">{entry.visibility}</Chip>
                <Chip className="capitalize">{String(entry.mood || '').replace('_',' ') || 'neutral'}</Chip>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">Your Reflection</div>
                <div className="whitespace-pre-wrap text-sm text-gray-900 dark:text-gray-100 leading-relaxed">{entry.content}</div>
              </div>
            </div>

            {entry?.motivation && (
              <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200/50 dark:border-indigo-800/30 rounded-xl">
                <div className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 mb-2 uppercase tracking-wide">AI Motivation</div>
                <div className="text-sm text-gray-800 dark:text-gray-100 leading-relaxed">{entry?.motivation}</div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default JournalEntryModal;

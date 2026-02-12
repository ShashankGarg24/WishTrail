import { motion, AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';
import { lockBodyScroll, unlockBodyScroll } from '../utils/scrollLock';
import { X, Sparkles, Lock, Globe } from 'lucide-react';

const THEME_COLOR = '#4c99e6';

const JournalEntryModal = ({ isOpen, onClose, entry }) => {
  useEffect(() => {
    if (isOpen) {
      lockBodyScroll();
      return () => unlockBodyScroll();
    }
    return undefined;
  }, [isOpen]);
  if (!isOpen || !entry) return null;

  const formatDate = (dateString) =>
    new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ zIndex: 1000 }}>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/50" onClick={onClose} />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto scrollbar-hide bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-xl border border-gray-200 dark:border-gray-700"
          style={{ fontFamily: 'Manrope, ui-sans-serif, system-ui' }}
        >
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Journal Entry</h3>
            <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors" aria-label="Close">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-4">
            <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
              {formatDate(entry.createdAt)}
            </div>
            <div className="flex items-center gap-2 mb-3">
              {entry.visibility === 'public' ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium" style={{ color: THEME_COLOR }}>
                  <Globe className="h-3.5 w-3.5" /> PUBLIC
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
                  <Lock className="h-3.5 w-3.5" /> PRIVATE
                </span>
              )}
              <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                {String(entry.mood || '').replace('_', ' ') || 'neutral'}
              </span>
            </div>
            <h4 className="font-semibold text-gray-900 dark:text-white text-base">{entry.title || 'Reflection'}</h4>
            <div className="rounded-xl p-4 border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30">
              <div className="whitespace-pre-wrap text-sm text-gray-900 dark:text-gray-100 leading-relaxed">{entry.content}</div>
            </div>

            {entry?.motivation && (
              <div className="p-4 rounded-xl flex items-start gap-2" style={{ backgroundColor: 'rgba(76, 153, 230, 0.1)', border: '1px solid rgba(76, 153, 230, 0.2)' }}>
                <Sparkles className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: THEME_COLOR }} />
                <div>
                  <span className="text-xs font-semibold uppercase block mb-1" style={{ color: THEME_COLOR }}>AI Insight</span>
                  <div className="text-sm text-gray-800 dark:text-gray-100 leading-relaxed" style={{ color: '#3d7ab8' }}>{entry.motivation}</div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default JournalEntryModal;

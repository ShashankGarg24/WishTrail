import { motion, AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';
import { lockBodyScroll, unlockBodyScroll } from '../utils/scrollLock';
import { X, Sparkles } from 'lucide-react';

const THEME_COLOR = '#4c99e6';

const DailyLogsEntryModal = ({ isOpen, onClose, entry }) => {
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
      <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4" style={{ zIndex: 1000 }}>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-950/60 backdrop-blur-[2px]" onClick={onClose} />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative flex h-[94dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-[#f8fafc] shadow-2xl dark:bg-canvas sm:h-[min(84dvh,760px)] sm:max-h-[calc(100dvh-2rem)] sm:max-w-[760px] sm:rounded-2xl sm:border sm:border-slate-200 dark:sm:border-gray-700"
          style={{ fontFamily: 'Manrope, ui-sans-serif, system-ui' }}
        >
          <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-5 py-4 dark:border-line dark:bg-canvas sm:px-8 sm:py-5">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Journal Entry</h3>
            <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-elevated text-gray-500 transition-colors" aria-label="Close">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5 sm:px-8 sm:py-6">
            <div className="text-xs text-gray-500 dark:text-muted uppercase tracking-wide mb-2">
              {formatDate(entry.createdAt)}
            </div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs text-gray-500 dark:text-muted capitalize">
                {String(entry.mood || '').replace('_', ' ') || 'okay'}
              </span>
            </div>
            <h4 className="font-semibold text-gray-900 dark:text-white text-base">{entry.title || 'Daily Log'}</h4>
            <div className="rounded-xl p-4 border border-gray-200 dark:border-line bg-gray-50/50 dark:bg-gray-900/30">
              <div className="whitespace-pre-wrap text-sm text-gray-900 dark:text-ink leading-relaxed">{entry.content}</div>
            </div>

            {entry?.motivation && (
              <div className="p-4 rounded-xl flex items-start gap-2" style={{ backgroundColor: 'rgba(76, 153, 230, 0.1)', border: '1px solid rgba(76, 153, 230, 0.2)' }}>
                <Sparkles className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: THEME_COLOR }} />
                <div>
                  <span className="text-xs font-semibold uppercase block mb-1" style={{ color: THEME_COLOR }}>AI Insight</span>
                  <div className="text-sm text-gray-800 dark:text-ink leading-relaxed" style={{ color: '#3d7ab8' }}>{entry.motivation}</div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default DailyLogsEntryModal;

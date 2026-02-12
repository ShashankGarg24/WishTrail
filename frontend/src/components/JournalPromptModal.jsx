import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Lock, Users, Globe } from 'lucide-react';
import useApiStore from '../store/apiStore';
import { lockBodyScroll, unlockBodyScroll } from '../utils/scrollLock';

const THEME_COLOR = '#4c99e6';
const MAX_WORDS = 500;

const visibilityOptions = [
  { value: 'private', label: 'Private', icon: Lock },
  { value: 'friends', label: 'Friends', icon: Users },
  { value: 'public', label: 'Public', icon: Globe },
];

const JournalPromptModal = ({ isOpen, onClose, onSubmitted }) => {
  const { getJournalPrompt, journalPrompt, createJournalEntry, updateJournalEntry } = useApiStore();
  const [content, setContent] = useState('');
  const [visibility, setVisibility] = useState('private');
  const [mood, setMood] = useState('neutral');
  const [submitting, setSubmitting] = useState(false);
  const words = content.trim() ? content.trim().split(/\s+/).filter(Boolean).length : 0;
  const [llmResult, setLlmResult] = useState(null);

  useEffect(() => {
    if (isOpen && !journalPrompt) {
      getJournalPrompt();
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    if (!content.trim() || words > MAX_WORDS) return;
    setSubmitting(true);
    try {
      const res = await createJournalEntry({ content, promptKey: journalPrompt?.key, visibility, mood: undefined, tags: [] });
      const entry = res?.entry;
      if (entry) {
        setMood(entry.mood || 'neutral');
      }
      if (entry?.motivation) {
        const entryId = entry?.id || entry?._id;
        setLlmResult({
          entryId: entryId,
          motivation: entry?.motivation || ''
        });
      } else {
        setContent('');
        onSubmitted?.();
        onClose();
      }
    } catch (error) {
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      lockBodyScroll();
      return () => unlockBodyScroll();
    }
    return undefined;
  }, [isOpen]);
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ zIndex: 1000 }}>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/50" onClick={onClose} />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto scrollbar-hide bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-xl border border-gray-200 dark:border-gray-700 font-manrope"
          style={{ fontFamily: 'Manrope, ui-sans-serif, system-ui' }}
        >
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <span className="flex items-center justify-center w-9 h-9 rounded-lg" style={{ backgroundColor: 'rgba(76, 153, 230, 0.12)' }}>
                <Sparkles className="h-5 w-5" style={{ color: THEME_COLOR }} />
              </span>
              Daily Journal
            </h3>
            <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors" aria-label="Close">
              <X className="h-5 w-5" />
            </button>
          </div>
          {!llmResult ? (
            <>
              {journalPrompt?.text && (
                <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl text-sm text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                  {journalPrompt.text}
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-5">
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="What's on your mind today?"
                  rows={6}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-wt focus:border-transparent bg-white dark:bg-gray-900/50 text-sm text-gray-900 dark:text-white placeholder-gray-400 resize-none"
                />
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 block uppercase tracking-wide">Visibility</label>
                  <div className="flex flex-wrap gap-2">
                    {visibilityOptions.map((v) => {
                      const Icon = v.icon;
                      const selected = visibility === v.value;
                      return (
                        <button
                          type="button"
                          key={v.value}
                          onClick={() => setVisibility(v.value)}
                          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                            selected
                              ? 'text-white border-transparent'
                              : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500 bg-white dark:bg-gray-800'
                          }`}
                          style={selected ? { backgroundColor: THEME_COLOR } : {}}
                        >
                          <Icon className="h-4 w-4" style={selected ? { color: 'white' } : {}} />
                          {v.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2">
                  <span className={`text-xs ${words > MAX_WORDS ? 'text-red-600' : 'text-gray-500 dark:text-gray-400'}`}>
                    {words}/{MAX_WORDS} words
                  </span>
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={onClose} className="px-4 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 text-sm font-medium transition-colors">
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting || !content.trim() || words > MAX_WORDS}
                      className="px-4 py-2.5 text-white rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-opacity"
                      style={{ backgroundColor: THEME_COLOR }}
                    >
                      {submitting ? 'Saving...' : 'Save Entry'}
                    </button>
                  </div>
                </div>
              </form>
            </>
          ) : (
            <div className="space-y-5">
              <div className="p-4 rounded-xl" style={{ backgroundColor: 'rgba(76, 153, 230, 0.1)', border: '1px solid rgba(76, 153, 230, 0.25)' }}>
                <div className="text-xs font-semibold mb-2 uppercase tracking-wide flex items-center gap-1.5" style={{ color: THEME_COLOR }}>
                  <Sparkles className="h-3.5 w-3.5" /> Today&apos;s Boost
                </div>
                <div className="text-sm text-gray-800 dark:text-gray-100 leading-relaxed">{llmResult.motivation}</div>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2 block uppercase tracking-wide">Mood</label>
                  <select value={mood} onChange={(e) => setMood(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900/50 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-wt focus:border-transparent">
                    <option value="very_negative">Very Negative</option>
                    <option value="negative">Negative</option>
                    <option value="neutral">Neutral</option>
                    <option value="positive">Positive</option>
                    <option value="very_positive">Very Positive</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2 block uppercase tracking-wide">Visibility</label>
                  <div className="flex flex-wrap gap-2">
                    {visibilityOptions.map((v) => {
                      const Icon = v.icon;
                      const selected = visibility === v.value;
                      return (
                        <button
                          type="button"
                          key={v.value}
                          onClick={() => setVisibility(v.value)}
                          className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium ${selected ? 'text-white border-transparent' : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800'}`}
                          style={selected ? { backgroundColor: THEME_COLOR } : {}}
                        >
                          <Icon className="h-4 w-4" />
                          {v.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      if (llmResult?.entryId) {
                        const result = await updateJournalEntry(llmResult.entryId, { mood, visibility });
                        if (!result?.success) console.error('Failed to update journal entry:', result?.error);
                      }
                    } catch (error) {
                      console.error('Error updating journal entry:', error);
                    } finally {
                      setLlmResult(null);
                      setContent('');
                      onSubmitted?.();
                      onClose();
                    }
                  }}
                  className="px-5 py-2.5 text-white rounded-xl text-sm font-medium hover:opacity-90"
                  style={{ backgroundColor: THEME_COLOR }}
                >
                  Complete
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default JournalPromptModal;



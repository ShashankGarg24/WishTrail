import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Lock, Users, Globe, Heart } from 'lucide-react';
import useApiStore from '../store/apiStore';
import { lockBodyScroll, unlockBodyScroll } from '../utils/scrollLock';

// Mood selection removed from initial compose; inferred by LLM and editable post-save

const visibilityOptions = [
  { value: 'private', label: 'Private', icon: <Lock className="h-4 w-4" /> },
  { value: 'friends', label: 'Friends', icon: <Users className="h-4 w-4" /> },
  { value: 'public', label: 'Public', icon: <Globe className="h-4 w-4" /> },
];

const JournalPromptModal = ({ isOpen, onClose, onSubmitted }) => {
  const { getJournalPrompt, journalPrompt, createJournalEntry, updateJournalEntry } = useApiStore();
  const [content, setContent] = useState('');
  const [visibility, setVisibility] = useState('private');
  const [mood, setMood] = useState('neutral');
  const [submitting, setSubmitting] = useState(false);
  const maxWords = 120;
  const words = content.trim() ? content.trim().split(/\s+/).length : 0;
  const [llmResult, setLlmResult] = useState(null);

  useEffect(() => {
    if (isOpen && !journalPrompt) {
      getJournalPrompt();
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    if (!content.trim()) return;
    setSubmitting(true);
    try {
      const res = await createJournalEntry({ content, promptKey: journalPrompt?.key, visibility, mood: undefined, tags: [] });
      const entry = res?.entry;
      if (entry) {
        setMood(entry.mood || 'neutral');
      }
      if (entry?.motivation) {
        const entryId = entry?.id || entry?._id;
        console.log('Setting llmResult with entryId:', entryId);
        setLlmResult({
          entryId: entryId,
          motivation: entry?.motivation || ''
        });
      } else {
        console.log('No motivation found, closing modal');
        setContent('');
        onSubmitted?.();
        onClose();
      }
    } catch (error) {
      console.error('Error creating journal entry:', error);
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
        <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto scrollbar-hide bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-xl border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2"><Sparkles className="h-5 w-5 text-indigo-500" /> Daily Journal</h3>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"><X className="h-5 w-5 text-gray-500" /></button>
          </div>
          {!llmResult ? (
            <>
              <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg text-sm text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                {journalPrompt?.text || 'Write a short reflection about your day.'}
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Write 1-3 sentences..." rows={5} className="w-full px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-900/50 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 resize-none" />
                <div className={`text-right text-xs ${words > maxWords ? 'text-red-600' : 'text-gray-500 dark:text-gray-400'}`}>{words}/{maxWords} words</div>
                <div>
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2 block uppercase tracking-wide">Visibility</label>
                  <div className="flex flex-wrap gap-2">
                    {visibilityOptions.map(v => (
                      <button type="button" key={v.value} onClick={() => setVisibility(v.value)} className={`px-3 py-2 rounded-lg border text-sm font-medium flex items-center gap-1.5 transition-all ${visibility === v.value ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500'}`}>{v.icon}{v.label}</button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-sm font-medium transition-colors">Cancel</button>
                  <button type="submit" disabled={submitting || !content.trim() || words > maxWords} className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors">{submitting ? 'Saving...' : 'Save Entry'}</button>
                </div>
              </form>
            </>
          ) : (
            <div className="space-y-5">
              <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200/50 dark:border-indigo-800/30 rounded-xl">
                <div className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 mb-2 uppercase tracking-wide flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5" /> Today's Boost</div>
                <div className="text-sm text-gray-800 dark:text-gray-100 leading-relaxed">{llmResult.motivation}</div>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2 block uppercase tracking-wide">Mood</label>
                  <select value={mood} onChange={(e) => setMood(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900/50 text-sm text-gray-900 dark:text-white">
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
                    {visibilityOptions.map(v => (
                      <button type="button" key={v.value} onClick={() => setVisibility(v.value)} className={`px-3 py-2 rounded-lg border text-sm font-medium flex items-center gap-1.5 transition-all ${visibility === v.value ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500'}`}>{v.icon}{v.label}</button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-end pt-2">
                <button
                  onClick={async () => {
                    try {
                      if (llmResult?.entryId) {
                        const result = await updateJournalEntry(llmResult.entryId, { mood, visibility });
                        if (!result?.success) {
                          console.error('Failed to update journal entry:', result?.error);
                        }
                      } else {
                        console.error('No entryId found in llmResult:', llmResult);
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
                  className="px-5 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 text-sm font-medium transition-colors"
                >Complete</button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default JournalPromptModal;



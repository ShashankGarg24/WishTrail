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
      if (entry?.ai?.motivation || (entry?.aiSignals && (entry.aiSignals.helpedCount || entry.aiSignals.gratitudeCount || entry.aiSignals.selfSacrificeCount || entry.aiSignals.positiveCount))) {
        setLlmResult({
          entryId: entry?._id,
          motivation: entry?.ai?.motivation || '',
          signals: entry?.aiSignals || { helpedCount: 0, gratitudeCount: 0, selfSacrificeCount: 0, positiveCount: 0, kindnessCount: 0, resilienceCount: 0, otherCount: 0 }
        });
      } else {
        setContent('');
        onSubmitted?.();
        onClose();
      }
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
        <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-2xl border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2"><Sparkles className="h-5 w-5 text-indigo-500" /> Daily Journal</h3>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"><X className="h-5 w-5 text-gray-500" /></button>
          </div>
          {!llmResult ? (
            <>
              <div className="mb-3 text-gray-700 dark:text-gray-300">
                {journalPrompt?.text || 'Write a short reflection about your day.'}
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Write 1-3 sentences..." rows={4} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 resize-none" />
                <div className={`text-right text-xs ${words > maxWords ? 'text-red-600' : 'text-gray-500 dark:text-gray-400'}`}>{words}/{maxWords} words</div>
                <div>
                  <label className="text-sm text-gray-600 dark:text-gray-400 mb-2 block">Visibility</label>
                  <div className="flex flex-wrap gap-2">
                    {visibilityOptions.map(v => (
                      <button type="button" key={v.value} onClick={() => setVisibility(v.value)} className={`px-3 py-2 rounded-xl border text-sm flex items-center gap-2 ${visibility === v.value ? 'border-sky-500 bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-300' : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'}`}>{v.icon}{v.label}</button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <Heart className="h-3 w-3" /> Your words can become a Heart Moment on your profile.
                  </div>
                  <button type="submit" disabled={submitting || !content.trim() || words > maxWords} className="px-4 py-2 bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed">{submitting ? 'Saving...' : 'Save'}</button>
                </div>
              </form>
            </>
          ) : (
            <div className="space-y-5">
              <div className="p-5 bg-gradient-to-br from-indigo-50 to-sky-50 dark:from-indigo-900/10 dark:to-sky-900/10 border border-indigo-200/70 dark:border-indigo-800/50 rounded-2xl">
                <div className="text-sm text-indigo-800 dark:text-indigo-200 font-semibold mb-2">Today’s Boost</div>
                <div className="text-gray-800 dark:text-gray-100 leading-relaxed text-[15px]">{llmResult.motivation}</div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-gray-600 dark:text-gray-400 mb-2 block">Mood</label>
                  <select value={mood} onChange={(e) => setMood(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                    <option value="very_negative">Very Negative</option>
                    <option value="negative">Negative</option>
                    <option value="neutral">Neutral</option>
                    <option value="positive">Positive</option>
                    <option value="very_positive">Very Positive</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-gray-600 dark:text-gray-400 mb-2 block">Visibility</label>
                  <div className="flex flex-wrap gap-2">
                    {visibilityOptions.map(v => (
                      <button type="button" key={v.value} onClick={() => setVisibility(v.value)} className={`px-3 py-2 rounded-xl border text-sm flex items-center gap-2 ${visibility === v.value ? 'border-sky-500 bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-300' : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'}`}>{v.icon}{v.label}</button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-white dark:bg-gray-800/40 rounded-xl border border-gray-200 dark:border-gray-700 text-center shadow-sm">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">+1 Helped</div>
                  <div className="text-lg font-semibold text-gray-800 dark:text-gray-100">{llmResult.signals?.helpedCount || 0}</div>
                </div>
                <div className="p-3 bg-white dark:bg-gray-800/40 rounded-xl border border-gray-200 dark:border-gray-700 text-center shadow-sm">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">+1 Gratitude</div>
                  <div className="text-lg font-semibold text-gray-800 dark:text-gray-100">{llmResult.signals?.gratitudeCount || 0}</div>
                </div>
                <div className="p-3 bg-white dark:bg-gray-800/40 rounded-xl border border-gray-200 dark:border-gray-700 text-center shadow-sm">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">+1 Self Sacrifice</div>
                  <div className="text-lg font-semibold text-gray-800 dark:text-gray-100">{llmResult.signals?.selfSacrificeCount || 0}</div>
                </div>
                <div className="p-3 bg-white dark:bg-gray-800/40 rounded-xl border border-gray-200 dark:border-gray-700 text-center shadow-sm">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">+1 Positive</div>
                  <div className="text-lg font-semibold text-gray-800 dark:text-gray-100">{llmResult.signals?.positiveCount || 0}</div>
                </div>
                <div className="p-3 bg-white dark:bg-gray-800/40 rounded-xl border border-gray-200 dark:border-gray-700 text-center shadow-sm">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">+1 Kindness</div>
                  <div className="text-lg font-semibold text-gray-800 dark:text-gray-100">{llmResult.signals?.kindnessCount || 0}</div>
                </div>
                <div className="p-3 bg-white dark:bg-gray-800/40 rounded-xl border border-gray-200 dark:border-gray-700 text-center shadow-sm">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">+1 Resilience</div>
                  <div className="text-lg font-semibold text-gray-800 dark:text-gray-100">{llmResult.signals?.resilienceCount || 0}</div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-xs text-gray-500 dark:text-gray-400">Great work—small steps build a lasting emotional legacy.</div>
                <button
                  onClick={async () => {
                    try {
                      if (llmResult?.entryId) {
                        await updateJournalEntry(llmResult.entryId, { mood, visibility });
                      }
                    } finally {
                      setLlmResult(null);
                      setContent('');
                      onSubmitted?.();
                      onClose();
                    }
                  }}
                  className="px-4 py-2 bg-indigo-500 text-white rounded-xl hover:bg-indigo-600"
                >Done</button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default JournalPromptModal;



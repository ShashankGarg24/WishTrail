import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Lock, Users, Globe, Smile, Frown, Meh, Heart } from 'lucide-react';
import useApiStore from '../store/apiStore';

const moods = [
  { value: 'very_negative', label: 'Very Negative', icon: <Frown className="h-4 w-4" /> },
  { value: 'negative', label: 'Negative', icon: <Frown className="h-4 w-4" /> },
  { value: 'neutral', label: 'Neutral', icon: <Meh className="h-4 w-4" /> },
  { value: 'positive', label: 'Positive', icon: <Smile className="h-4 w-4" /> },
  { value: 'very_positive', label: 'Very Positive', icon: <Smile className="h-4 w-4" /> }
];

const visibilityOptions = [
  { value: 'private', label: 'Private', icon: <Lock className="h-4 w-4" /> },
  { value: 'friends', label: 'Friends', icon: <Users className="h-4 w-4" /> },
  { value: 'public', label: 'Public', icon: <Globe className="h-4 w-4" /> },
];

const JournalPromptModal = ({ isOpen, onClose, onSubmitted }) => {
  const { getJournalPrompt, journalPrompt, createJournalEntry } = useApiStore();
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
      const res = await createJournalEntry({ content, promptKey: journalPrompt?.key, visibility, mood, tags: [] });
      const entry = res?.entry;
      if (entry?.ai?.motivation || (entry?.aiSignals && (entry.aiSignals.helpedCount || entry.aiSignals.gratitudeCount || entry.aiSignals.selfSacrificeCount || entry.aiSignals.positiveCount))) {
        setLlmResult({
          motivation: entry?.ai?.motivation || '',
          signals: entry?.aiSignals || { helpedCount: 0, gratitudeCount: 0, selfSacrificeCount: 0, positiveCount: 0, otherCount: 0 }
        });
      } else {
        // No LLM enrichment – close immediately
        setContent('');
        onSubmitted?.();
        onClose();
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ zIndex: 1000 }}>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/50" onClick={onClose} />
        <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-2xl border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2"><Sparkles className="h-5 w-5 text-pink-500" /> Daily Journal</h3>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"><X className="h-5 w-5 text-gray-500" /></button>
          </div>
          {!llmResult ? (
            <>
              <div className="mb-3 text-gray-700 dark:text-gray-300">
                {journalPrompt?.text || 'Write a short reflection about your day.'}
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Write 1-3 sentences..." rows={4} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 resize-none" />
                <div className={`text-right text-xs ${words > maxWords ? 'text-red-600' : 'text-gray-500 dark:text-gray-400'}`}>{words}/{maxWords} words</div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm text-gray-600 dark:text-gray-400 mb-2 block">Mood</label>
                    <div className="flex flex-wrap gap-2">
                      {moods.map(m => (
                        <button type="button" key={m.value} onClick={() => setMood(m.value)} className={`px-3 py-2 rounded-lg border text-sm flex items-center gap-2 ${mood === m.value ? 'border-pink-500 bg-pink-50 dark:bg-pink-900/20 text-pink-700 dark:text-pink-300' : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'}`}>{m.icon}{m.label}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600 dark:text-gray-400 mb-2 block">Visibility</label>
                    <div className="flex flex-wrap gap-2">
                      {visibilityOptions.map(v => (
                        <button type="button" key={v.value} onClick={() => setVisibility(v.value)} className={`px-3 py-2 rounded-lg border text-sm flex items-center gap-2 ${visibility === v.value ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'}`}>{v.icon}{v.label}</button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <Heart className="h-3 w-3" /> Your words can become a Heart Moment on your profile.
                  </div>
                  <button type="submit" disabled={submitting || !content.trim() || words > maxWords} className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed">{submitting ? 'Saving...' : 'Save'}</button>
                </div>
              </form>
            </>
          ) : (
            <div className="space-y-5">
              <div className="p-5 bg-gradient-to-br from-pink-50 to-rose-50 dark:from-pink-900/10 dark:to-rose-900/10 border border-pink-200/70 dark:border-pink-800/50 rounded-2xl">
                <div className="text-sm text-pink-800 dark:text-pink-200 font-semibold mb-2">Today’s Boost</div>
                <div className="text-gray-800 dark:text-gray-100 leading-relaxed text-[15px]">{llmResult.motivation}</div>
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
                  onClick={() => { setLlmResult(null); setContent(''); onSubmitted?.(); onClose(); }}
                  className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
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



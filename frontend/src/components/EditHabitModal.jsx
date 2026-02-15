import { useEffect, useState } from 'react';
import { X, Calendar, Info } from 'lucide-react';
import { lockBodyScroll, unlockBodyScroll } from '../utils/scrollLock';

const THEME_COLOR = '#4c99e6';

const dayOptions = [
  { label: 'Sun', value: 0 },
  { label: 'Mon', value: 1 },
  { label: 'Tue', value: 2 },
  { label: 'Wed', value: 3 },
  { label: 'Thu', value: 4 },
  { label: 'Fri', value: 5 },
  { label: 'Sat', value: 6 },
];

export default function EditHabitModal({ isOpen, onClose, habit, onSave }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [frequency, setFrequency] = useState('daily');
  const [daysOfWeek, setDaysOfWeek] = useState([]);
  const [reminders, setReminders] = useState(['']);
  const [targetCompletions, setTargetCompletions] = useState('');
  const [targetDays, setTargetDays] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen || !habit) return;
    setName(habit.name || '');
    setDescription(habit.description || '');
    setFrequency(habit.frequency || 'daily');
    setDaysOfWeek(Array.isArray(habit.daysOfWeek) ? habit.daysOfWeek.slice() : []);
    setReminders(Array.isArray(habit.reminders) && habit.reminders.length > 0 ? habit.reminders.map(r => r.time || '') : ['']);
    setTargetCompletions(habit.targetCompletions || '');
    setTargetDays(habit.targetDays || '');
    setSubmitting(false);
    setError('');
  }, [isOpen, habit]);

  if (!isOpen || !habit) return null;

  useEffect(() => {
    lockBodyScroll();
    return () => unlockBodyScroll();
  }, []);

  const toggleDay = (v) => {
    setDaysOfWeek(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const payload = {
        name,
        description,
        frequency,
        daysOfWeek: frequency === 'daily' ? [] : daysOfWeek.sort()
        // reminders: reminders.filter(Boolean).map(t => ({ time: t })),
      };
      
      // Add targets if provided
      if (targetCompletions && parseInt(targetCompletions) > 0) {
        payload.targetCompletions = parseInt(targetCompletions);
      } else {
        payload.targetCompletions = null;
      }
      if (targetDays && parseInt(targetDays) > 0) {
        payload.targetDays = parseInt(targetDays);
      } else {
        payload.targetDays = null;
      }
      
      await onSave?.(payload);
      onClose?.();
    } catch (e) {
      const errorMessage = e?.message || 'Failed to update habit';
      setError(errorMessage);
      window.dispatchEvent(new CustomEvent('wt_toast', {
        detail: { message: errorMessage, type: 'error' }
      }));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[102] flex items-center justify-center p-4" style={{ fontFamily: 'Manrope, ui-sans-serif, system-ui' }}>
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-xl border border-gray-200 dark:border-gray-700 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg text-white" style={{ backgroundColor: THEME_COLOR }}>
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Edit Habit</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Update your habit details</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="px-6 py-5 space-y-5">
            {error && (
              <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300 text-sm">
                <Info className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Basic Information */}
            <div className="space-y-4">
              <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-2">
                <span className="w-6 h-6 rounded flex items-center justify-center text-white text-xs" style={{ backgroundColor: THEME_COLOR }}>i</span>
                Basic Information
              </h4>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Habit Name *</label>
                <input 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  placeholder="e.g., Morning meditation"
                  required 
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#4c99e6] transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Description</label>
                <textarea 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)} 
                  placeholder="Add any notes or motivation for this habit"
                  rows={3} 
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#4c99e6] transition-colors resize-none"
                />
              </div>
            </div>

            {/* Schedule */}
            <div className="space-y-4">
              <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-2">
                <Calendar className="h-4 w-4" style={{ color: THEME_COLOR }} />
                Schedule
              </h4>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Frequency *</label>
                <select 
                  value={frequency} 
                  onChange={(e) => setFrequency(e.target.value)} 
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#4c99e6]"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="custom">Custom</option>
                </select>
              </div>

              {(frequency === 'weekly' || frequency === 'custom') && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Select Days</label>
                  <div className="flex flex-wrap gap-2">
                    {dayOptions.map(d => (
                      <button 
                        type="button" 
                        key={d.value} 
                        onClick={() => toggleDay(d.value)} 
                        className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all ${
                          daysOfWeek.includes(d.value) 
                            ? 'text-white border-transparent' 
                            : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                        style={daysOfWeek.includes(d.value) ? { backgroundColor: THEME_COLOR } : {}}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Reminders Section */}
            {/* <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-primary-600 dark:text-primary-400" />
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Reminders (optional)</h4>
              </div>

              <div className="space-y-3">
                {reminders.map((t, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <input 
                      type="time" 
                      value={t} 
                      onChange={(e) => setReminders(prev => prev.map((v,i) => i===idx ? e.target.value : v))} 
                      className="flex-1 px-4 py-3 rounded-xl border-2 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-primary-500 dark:focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-colors" 
                    />
                    {reminders.length > 1 && (
                      <button 
                        type="button" 
                        onClick={() => setReminders(prev => prev.filter((_,i) => i!==idx))} 
                        className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                        title="Remove reminder"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
                <button 
                  type="button" 
                  onClick={() => setReminders(prev => [...prev, ''])} 
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors font-medium"
                >
                  <Plus className="h-4 w-4" /> Add Reminder
                </button>
              </div>
            </div> */}

            {/* Goals */}
            <div className="space-y-4">
              <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-2">
                <Info className="h-4 w-4" style={{ color: THEME_COLOR }} />
                Goals
              </h4>
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs">
                Choose either count-based OR days-based target (not both).
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Target Total Count</label>
                  <input 
                    type="number" 
                    min="0"
                    value={targetCompletions} 
                    onChange={(e) => {
                      setTargetCompletions(e.target.value);
                      if (e.target.value) setTargetDays('');
                    }} 
                    placeholder="e.g., 100"
                    disabled={targetDays && parseInt(targetDays) > 0}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#4c99e6] disabled:opacity-50 disabled:cursor-not-allowed" 
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Total times to complete this habit</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Target Days</label>
                  <input 
                    type="number" 
                    min="0"
                    value={targetDays} 
                    onChange={(e) => {
                      setTargetDays(e.target.value);
                      if (e.target.value) setTargetCompletions('');
                    }} 
                    placeholder="e.g., 30"
                    disabled={targetCompletions && parseInt(targetCompletions) > 0}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#4c99e6] disabled:opacity-50 disabled:cursor-not-allowed" 
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Number of unique days</p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 dark:bg-gray-800/50 px-4 sm:px-6 lg:px-8 py-4 sm:py-5 border-t border-gray-200 dark:border-gray-700 flex items-center gap-2 sm:gap-3">
            <button 
              type="button" 
              onClick={onClose} 
              className="flex-1 py-2.5 sm:py-3 px-3 sm:px-5 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 font-medium transition-all text-sm sm:text-base"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={submitting} 
              className="flex-1 py-3 px-5 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-lg transition-all"
              style={{ backgroundColor: THEME_COLOR }}
            >
              {submitting ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}



import { useEffect, useState } from 'react';
import { X, Calendar, Bell, Plus, Minus, Info } from 'lucide-react';
import { lockBodyScroll, unlockBodyScroll } from '../utils/scrollLock';

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
        daysOfWeek: frequency === 'daily' ? [] : daysOfWeek.sort(),
        reminders: reminders.filter(Boolean).map(t => ({ time: t })),
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
    <div className="fixed inset-0 z-[102] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl border border-gray-200 dark:border-gray-800 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 px-8 py-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary-100 dark:bg-primary-900/30 rounded-xl">
              <Calendar className="h-6 w-6 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Edit Habit</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">Update your habit details</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors" aria-label="Close">
            <X className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="px-8 py-6 space-y-6">
            {error && (
              <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300">
                <Info className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            {/* Basic Info Section */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Basic Information</h4>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Habit Name <span className="text-red-500">*</span>
                </label>
                <input 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  placeholder="e.g., Morning meditation, Exercise, Read before bed"
                  required 
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-primary-500 dark:focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-colors" 
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description (optional)</label>
                <textarea 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)} 
                  placeholder="Add any notes or motivation for this habit"
                  rows={3} 
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-primary-500 dark:focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-colors resize-none" 
                />
              </div>
            </div>

            {/* Schedule Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary-600 dark:text-primary-400" />
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Schedule</h4>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Frequency <span className="text-red-500">*</span>
                </label>
                <select 
                  value={frequency} 
                  onChange={(e) => setFrequency(e.target.value)} 
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-primary-500 dark:focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-colors"
                >
                  <option value="daily">Daily</option>
                  <option value="custom">Custom</option>
                </select>
              </div>

              {(frequency === 'weekly' || frequency === 'custom') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Select Days</label>
                  <div className="flex flex-wrap gap-2">
                    {dayOptions.map(d => (
                      <button 
                        type="button" 
                        key={d.value} 
                        onClick={() => toggleDay(d.value)} 
                        className={`px-4 py-2.5 rounded-xl text-sm font-medium border-2 transition-all ${
                          daysOfWeek.includes(d.value) 
                            ? 'bg-primary-500 text-white border-primary-500 shadow-lg shadow-primary-500/30' 
                            : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-primary-300 dark:hover:border-primary-600'
                        }`}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Reminders Section */}
            <div className="space-y-4">
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
            </div>

            {/* Goals Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-primary-600 dark:text-primary-400" />
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Goals (optional)</h4>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">Set one target type to track your progress</p>
              <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 rounded-lg">
                ⚠️ Choose either count-based OR days-based target (not both)
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Target Total Count
                  </label>
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
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-primary-500 dark:focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" 
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Total times to complete this habit</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Target Days
                  </label>
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
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-primary-500 dark:focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" 
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Number of unique days to do this habit</p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 dark:bg-gray-800/50 px-8 py-5 border-t border-gray-200 dark:border-gray-700 flex items-center gap-3">
            <button 
              type="button" 
              onClick={onClose} 
              className="flex-1 py-3 px-5 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 font-medium transition-all"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={submitting} 
              className="flex-1 py-3 px-5 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-lg shadow-primary-500/20 transition-all"
            >
              {submitting ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}



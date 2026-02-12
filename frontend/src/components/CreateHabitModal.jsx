import { useEffect, useState, useMemo } from 'react';
import { X, Calendar, Info } from 'lucide-react';
import { lockBodyScroll, unlockBodyScroll } from '../utils/scrollLock';

const THEME_COLOR = '#4c99e6';
import { habitsAPI } from '../services/api';
import useApiStore from '../store/apiStore';
import { useHabitLimits } from '../hooks/usePremium';
import PremiumLimitIndicator from './PremiumLimitIndicator';

const dayOptions = [
  { label: 'Sun', value: 0 },
  { label: 'Mon', value: 1 },
  { label: 'Tue', value: 2 },
  { label: 'Wed', value: 3 },
  { label: 'Thu', value: 4 },
  { label: 'Fri', value: 5 },
  { label: 'Sat', value: 6 },
];

export default function CreateHabitModal({ isOpen, onClose, onCreated, initialData }) {
  const { habits } = useApiStore();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [frequency, setFrequency] = useState('daily');
  const [daysOfWeek, setDaysOfWeek] = useState([]);
  const [reminders, setReminders] = useState(['']);
  const [targetCompletions, setTargetCompletions] = useState('');
  const [targetDays, setTargetDays] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Premium limits
  const activeHabitsCount = useMemo(() => {
    return habits?.filter(h => h.isActive !== false)?.length || 0
  }, [habits])
  const habitLimits = useHabitLimits(activeHabitsCount)

  useEffect(() => {
    if (!isOpen) return;
    lockBodyScroll();
    setError(''); // Clear error when modal opens
    return () => unlockBodyScroll();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !initialData) return;
    if (typeof initialData.name === 'string') setName(initialData.name);
    if (typeof initialData.description === 'string') setDescription(initialData.description);
    if (typeof initialData.frequency === 'string') setFrequency(initialData.frequency);
    if (Array.isArray(initialData.daysOfWeek)) setDaysOfWeek(initialData.daysOfWeek);
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const toggleDay = (v) => {
    setDaysOfWeek(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Check premium limits
    if (!habitLimits.canCreate) {
      window.dispatchEvent(new CustomEvent('wt_toast', { 
        detail: { 
          message: `Habit limit reached (${activeHabitsCount}/${habitLimits.maxHabits}). You cannot create more habits at this time.`, 
          type: 'error' 
        } 
      }))
      return
    }
    
    setSubmitting(true);
    setError(''); // Clear previous errors
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
      }
      if (targetDays && parseInt(targetDays) > 0) {
        payload.targetDays = parseInt(targetDays);
      }
      
      const res = await habitsAPI.create(payload);
      if (res?.data?.success) {
        onCreated?.(res.data.data.habit);
        onClose?.();
      } else {
        const errorMsg = res?.data?.message || 'Failed to create habit';
        setError(errorMsg);
        window.dispatchEvent(new CustomEvent('wt_toast', {
          detail: { message: errorMsg, type: 'error' }
        }));
      }
    } catch (e) {
      const errorMsg = e?.response?.data?.message || e.message || 'Failed to create habit';
      setError(errorMsg);
      window.dispatchEvent(new CustomEvent('wt_toast', {
        detail: { message: errorMsg, type: 'error' }
      }));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ fontFamily: 'Manrope, ui-sans-serif, system-ui' }}>
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-xl border border-gray-200 dark:border-gray-700 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg text-white" style={{ backgroundColor: THEME_COLOR }}>
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Create New Habit</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Build a positive routine</p>
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

            {!habitLimits.canCreate && (
              <PremiumLimitIndicator
                current={activeHabitsCount}
                max={habitLimits.maxHabits}
                label="Active Habits"
                showUpgradeButton={false}
              />
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
                  <option value="custom">Custom</option>
                </select>
              </div>

              {(frequency === 'custom') && (
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
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end gap-3 flex-shrink-0">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={submitting || !habitLimits.canCreate} 
              className="px-5 py-2.5 rounded-lg text-white font-medium transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: THEME_COLOR }}
            >
              {submitting ? 'Creating…' : !habitLimits.canCreate ? 'Limit Reached' : 'Create Habit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}



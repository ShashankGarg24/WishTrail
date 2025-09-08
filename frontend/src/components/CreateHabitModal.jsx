import { useEffect, useState } from 'react';
import { lockBodyScroll, unlockBodyScroll } from '../utils/scrollLock';
import { habitsAPI } from '../services/api';

const dayOptions = [
  { label: 'Sun', value: 0 },
  { label: 'Mon', value: 1 },
  { label: 'Tue', value: 2 },
  { label: 'Wed', value: 3 },
  { label: 'Thu', value: 4 },
  { label: 'Fri', value: 5 },
  { label: 'Sat', value: 6 },
];

export default function CreateHabitModal({ isOpen, onClose, onCreated }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [frequency, setFrequency] = useState('daily');
  const [daysOfWeek, setDaysOfWeek] = useState([]);
  const [reminders, setReminders] = useState(['']);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

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
    setError(null);
    try {
      const payload = {
        name,
        description,
        frequency,
        daysOfWeek: frequency === 'daily' ? [] : daysOfWeek.sort(),
        reminders: reminders.filter(Boolean).map(t => ({ time: t })),
      };
      const res = await habitsAPI.create(payload);
      if (res?.data?.success) {
        onCreated?.(res.data.data.habit);
        onClose?.();
      } else {
        setError(res?.data?.message || 'Failed to create habit');
      }
    } catch (e) {
      setError(e?.response?.data?.message || e.message || 'Failed to create habit');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md mx-4 p-6 border border-gray-200 dark:border-gray-800">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Create Habit</h3>
        {error && <div className="text-sm text-red-600 dark:text-red-400 mb-3">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
          </div>
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Description (optional)</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
          </div>
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Frequency</label>
            <select value={frequency} onChange={(e) => setFrequency(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="custom">Custom days</option>
            </select>
          </div>
          {(frequency === 'weekly' || frequency === 'custom') && (
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Days</label>
              <div className="flex flex-wrap gap-2">
                {dayOptions.map(d => (
                  <button type="button" key={d.value} onClick={() => toggleDay(d.value)} className={`px-3 py-1.5 rounded-full text-sm border ${daysOfWeek.includes(d.value) ? 'bg-blue-500 text-white border-blue-500' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600'}`}>
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Reminders (optional)</label>
            <div className="space-y-2">
              {reminders.map((t, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input type="time" value={t} onChange={(e) => setReminders(prev => prev.map((v,i) => i===idx ? e.target.value : v))} className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                  {reminders.length > 1 && (
                    <button type="button" onClick={() => setReminders(prev => prev.filter((_,i) => i!==idx))} className="px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">Remove</button>
                  )}
                </div>
              ))}
              <button type="button" onClick={() => setReminders(prev => [...prev, ''])} className="px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">Add reminder</button>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200">Cancel</button>
            <button type="submit" disabled={submitting} className="px-4 py-2 rounded-lg bg-primary-500 hover:bg-primary-600 text-white disabled:opacity-70">
              {submitting ? 'Creating…' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}



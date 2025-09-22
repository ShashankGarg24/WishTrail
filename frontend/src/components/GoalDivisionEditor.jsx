import { useEffect, useMemo, useState } from 'react'
import useApiStore from '../store/apiStore'
import { motion } from 'framer-motion'
import CreateHabitModal from './CreateHabitModal'
import CreateWishModal from './CreateWishModal'

export default function GoalDivisionEditor({ goal, habits, onClose }) {
  const { setSubGoals, setHabitLinks, getGoalProgress } = useApiStore()
  const [localSubGoals, setLocalSubGoals] = useState([])
  const [localHabitLinks, setLocalHabitLinks] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [progress, setProgress] = useState(null)
  const [isCreateHabitOpen, setIsCreateHabitOpen] = useState(false)
  const [isCreateGoalOpen, setIsCreateGoalOpen] = useState(false)
  const [pendingLinkIndex, setPendingLinkIndex] = useState(null)

  useEffect(() => {
    setLocalSubGoals(Array.isArray(goal?.subGoals) ? goal.subGoals.map(s => ({ ...s })) : [])
    setLocalHabitLinks(Array.isArray(goal?.habitLinks) ? goal.habitLinks.map(h => ({ ...h })) : [])
  }, [goal])

  const totalWeight = useMemo(() => {
    const sg = localSubGoals.reduce((s, g) => s + (Number(g.weight) || 0), 0)
    const hl = localHabitLinks.reduce((s, h) => s + (Number(h.weight) || 0), 0)
    return sg + hl
  }, [localSubGoals, localHabitLinks])

  const equalizeWeights = () => {
    const count = (localSubGoals?.length || 0) + (localHabitLinks?.length || 0)
    if (count === 0) return
    const base = Math.floor(100 / count)
    const remainder = 100 - base * count
    const weights = Array(count).fill(base).map((w, i) => w + (i < remainder ? 1 : 0))
    const nextSG = localSubGoals.map((sg, i) => ({ ...sg, weight: weights[i] }))
    const nextHL = localHabitLinks.map((hl, i) => ({ ...hl, weight: weights[i + localSubGoals.length] }))
    setLocalSubGoals(nextSG)
    setLocalHabitLinks(nextHL)
  }

  const addSubGoal = () => setLocalSubGoals(prev => [...prev, { title: '', weight: 0, completed: false, note: '' }])
  const addAndCreateGoal = () => {
    const idx = localSubGoals.length
    setPendingLinkIndex(idx)
    setIsCreateGoalOpen(true)
  }
  const addHabitLink = () => setLocalHabitLinks(prev => [...prev, { habitId: '', weight: 0, endDate: '' }])
  const addHabitInline = () => setIsCreateHabitOpen(true)

  const removeSubGoal = (i) => setLocalSubGoals(prev => prev.filter((_, idx) => idx !== i))
  const removeHabitLink = (i) => setLocalHabitLinks(prev => prev.filter((_, idx) => idx !== i))

  const saveAll = async () => {
    setSaving(true)
    setError('')
    try {
      const subPayload = localSubGoals.map(s => ({ title: String(s.title || '').trim(), linkedGoalId: s.linkedGoalId || undefined, weight: Number(s.weight || 0), completed: !!s.completed, note: s.note || '' }))
      const habitPayload = localHabitLinks.map(h => ({ habitId: h.habitId, weight: Number(h.weight || 0), endDate: h.endDate || undefined }))
      await setSubGoals(goal._id, subPayload)
      await setHabitLinks(goal._id, habitPayload)
      const res = await getGoalProgress(goal._id)
      setProgress(res?.progress || null)
      onClose?.()
    } catch (e) {
      setError(e?.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  if (!goal) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-3xl mx-4 p-6 border border-gray-200 dark:border-gray-800" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Goal Breakdown</h3>
          <button onClick={onClose} className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200">Close</button>
        </div>
        {error && <div className="text-sm text-red-600 dark:text-red-400 mb-3">{error}</div>}
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm text-gray-700 dark:text-gray-300">Total weight: <span className={`${totalWeight !== 100 ? 'text-orange-600' : ''}`}>{totalWeight}%</span> {totalWeight !== 100 && '(auto-normalized in progress)'}
          </div>
          <button onClick={equalizeWeights} className="px-3 py-1.5 rounded-lg bg-primary-500 text-white">Equal split</button>
        </div>

        {/* Sub-Goals */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-md font-semibold text-gray-900 dark:text-white">Sub-Goals</h4>
            <div className="flex items-center gap-2">
              <button onClick={addSubGoal} className="px-2.5 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200">Link</button>
              <button onClick={addAndCreateGoal} className="px-2.5 py-1.5 rounded-lg bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800">New Goal</button>
            </div>
          </div>
          <div className="space-y-2 max-h-64 overflow-auto pr-1">
            {localSubGoals.map((sg, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-6 grid grid-cols-12 gap-2 items-center">
                  <select value={sg.linkedGoalId || ''} onChange={(e) => setLocalSubGoals(prev => prev.map((s,i) => i===idx ? { ...s, linkedGoalId: e.target.value || undefined } : s))} className="col-span-12 sm:col-span-5 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                    <option value="">Link goal…</option>
                    {(useApiStore.getState().goals || []).filter(g => g._id !== goal._id).slice(0, 50).map(g => (
                      <option key={g._id} value={g._id}>{g.title}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-4 flex items-center gap-2">
                  <input type="range" min={0} max={100} value={sg.weight || 0} onChange={(e) => setLocalSubGoals(prev => prev.map((s,i) => i===idx ? { ...s, weight: Number(e.target.value) } : s))} className="flex-1" />
                  <input type="number" min={0} max={100} value={sg.weight || 0} onChange={(e) => setLocalSubGoals(prev => prev.map((s,i) => i===idx ? { ...s, weight: Number(e.target.value) } : s))} className="w-16 px-2 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                </div>
                <div className="col-span-12 sm:col-span-2 flex items-center gap-2">
                  <button onClick={() => removeSubGoal(idx)} className="flex-1 px-2 py-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400">Remove</button>
                </div>
              </div>
            ))}
            {localSubGoals.length === 0 && <div className="text-sm text-gray-500 dark:text-gray-400">No sub-goals added.</div>}
          </div>
        </div>

        {/* Habit Links */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-md font-semibold text-gray-900 dark:text-white">Habits</h4>
            <div className="flex items-center gap-2">
              <button onClick={addHabitLink} className="px-2.5 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200">Link</button>
              <button onClick={addHabitInline} className="px-2.5 py-1.5 rounded-lg bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800">New Habit</button>
            </div>
          </div>
          <div className="space-y-2 max-h-64 overflow-auto pr-1">
            {localHabitLinks.map((hl, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                <select value={hl.habitId} onChange={(e) => setLocalHabitLinks(prev => prev.map((h,i) => i===idx ? { ...h, habitId: e.target.value } : h))} className="col-span-6 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                  <option value="">Select a habit…</option>
                  {(habits || []).map(h => (
                    <option key={h._id} value={h._id}>{h.name}</option>
                  ))}
                </select>
                <div className="col-span-4 flex items-center gap-2">
                  <input type="range" min={0} max={100} value={hl.weight || 0} onChange={(e) => setLocalHabitLinks(prev => prev.map((h,i) => i===idx ? { ...h, weight: Number(e.target.value) } : h))} className="flex-1" />
                  <input type="number" min={0} max={100} value={hl.weight || 0} onChange={(e) => setLocalHabitLinks(prev => prev.map((h,i) => i===idx ? { ...h, weight: Number(e.target.value) } : h))} className="w-16 px-2 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                </div>
                <div className="col-span-12 sm:col-span-2 flex items-center gap-2">
                  <button onClick={() => removeHabitLink(idx)} className="flex-1 px-2 py-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400">Remove</button>
                </div>
              </div>
            ))}
            {localHabitLinks.length === 0 && <div className="text-sm text-gray-500 dark:text-gray-400">No habits linked yet.</div>}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2">
          <div className="text-xs text-gray-500 dark:text-gray-400">Weights should sum to 100%. If not, progress calculation will auto-normalize.</div>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200">Cancel</button>
            <button disabled={saving} onClick={saveAll} className="px-4 py-2 rounded-lg bg-primary-500 text-white disabled:opacity-70">{saving ? 'Saving…' : 'Save'}</button>
          </div>
        </div>
      </motion.div>
      {isCreateHabitOpen && (
        <CreateHabitModal
          isOpen={isCreateHabitOpen}
          onClose={() => setIsCreateHabitOpen(false)}
          onCreated={(habit) => {
            try {
              const id = habit?._id
              if (id) {
                setLocalHabitLinks(prev => {
                  const next = [...prev]
                  if (next.length === 0) next.push({ habitId: id, weight: 0, endDate: '' })
                  else next[next.length - 1] = { ...(next[next.length - 1] || {}), habitId: id }
                  return next
                })
              }
            } catch {}
            setIsCreateHabitOpen(false)
          }}
          initialData={{}}
        />
      )}
      {/* Inline create goal modal for sub-goal creation and linking */}
      {isCreateGoalOpen && (
        <CreateWishModal
          isOpen={isCreateGoalOpen}
          onClose={() => { setIsCreateGoalOpen(false); setPendingLinkIndex(null); }}
          onSave={async (goalData) => {
            try {
              const res = await useApiStore.getState().createGoal(goalData)
              if (res?.success && res.goal?._id) {
                setLocalSubGoals(prev => prev.map((sg, i) => i === pendingLinkIndex ? { ...sg, linkedGoalId: res.goal._id, title: sg.title || res.goal.title } : sg))
                setIsCreateGoalOpen(false)
                setPendingLinkIndex(null)
                return res
              }
              return res
            } catch (e) { return { success: false, error: e?.message || 'Failed' } }
          }}
          year={new Date().getFullYear()}
          initialData={{}}
        />
      )}
    </div>
  )
}



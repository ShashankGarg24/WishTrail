import { lazy, Suspense, useEffect, useMemo, useState, useRef } from 'react'
import useApiStore from '../store/apiStore'
import { goalsAPI } from '../services/api'
import { motion } from 'framer-motion'
const CreateHabitModal = lazy(() => import('./CreateHabitModal'));
const CreateWishModal = lazy(() => import('./CreateWishModal'));
import { ChevronDown, ChevronRight, Trash2, Plus, Link} from 'lucide-react'

export default function GoalDivisionEditor({ goal, goalId, habits, onClose, draftMode = false, renderInline = false, value, onChange }) {
  const { setSubGoals, setHabitLinks, getGoalProgress } = useApiStore()
  const [localSubGoals, setLocalSubGoals] = useState([])
  const [localHabitLinks, setLocalHabitLinks] = useState([])
  const [saving, setSaving] = useState(false)
  const [progress, setProgress] = useState(null)
  const [isCreateHabitOpen, setIsCreateHabitOpen] = useState(false)
  const [isCreateGoalOpen, setIsCreateGoalOpen] = useState(false)
  const [pendingLinkIndex, setPendingLinkIndex] = useState(null)
  const [showSubs, setShowSubs] = useState(true)
  const [showHabits, setShowHabits] = useState(true)
  const [autoAdjusted, setAutoAdjusted] = useState(false)
  const [didInitNormalize, setDidInitNormalize] = useState(false)
  const [additionalGoals, setAdditionalGoals] = useState([])
  const debounceTimerRef = useRef(null)
  const isInitializingRef = useRef(false)
  const [subGoalToRemove, setSubGoalToRemove] = useState(null)
  const [habitToRemove, setHabitToRemove] = useState(null)

  // Initialize only once when component mounts or when switching between draft/non-draft mode
  useEffect(() => {
    isInitializingRef.current = true
    if (draftMode) {
      const subGoals = Array.isArray(value?.subGoals) ? value.subGoals.map(s => ({ ...s })) : []
      const habitLinks = Array.isArray(value?.habitLinks) ? value.habitLinks.map(h => ({ ...h })) : []
      setLocalSubGoals(subGoals)
      setLocalHabitLinks(habitLinks)
      setDidInitNormalize(false)
      setTimeout(() => { isInitializingRef.current = false }, 100)
      return
    }
    setLocalSubGoals(Array.isArray(goal?.subGoals) ? goal.subGoals.map(s => ({ ...s })) : [])
    setLocalHabitLinks(Array.isArray(goal?.habitLinks) ? goal.habitLinks.map(h => ({ ...h })) : [])
    setDidInitNormalize(false)
    setTimeout(() => { isInitializingRef.current = false }, 100)
  }, [draftMode, goal?._id])
  
  // Fetch all user goals (without year filter) to ensure linked goals from other years are available
  useEffect(() => {
    const fetchAllGoals = async () => {
      const subGoalsData = draftMode ? (Array.isArray(value?.subGoals) ? value.subGoals : []) : (Array.isArray(goal?.subGoals) ? goal.subGoals : [])
      const hasLinkedGoals = subGoalsData.some(sg => sg.linkedGoalId)
      
      if (!hasLinkedGoals) return
      
      try {
        // Fetch ALL user's goals without year filter and with high limit to avoid pagination
        const response = await goalsAPI.getGoals({ includeProgress: false, limit: 1000 })
        if (response.data?.data?.goals) {
          setAdditionalGoals(response.data.data.goals)
        }
      } catch (error) {
        console.error('Failed to fetch all goals:', error)
      }
    }
    
    fetchAllGoals()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftMode, goal?._id])
  
  // Sync local changes back to parent in draft mode (debounced to avoid API calls during sliding)
  useEffect(() => {
    // Don't sync during initialization
    if (isInitializingRef.current) return
    
    if (draftMode && onChange) {
      // Clear existing timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
      
      // Set new timer to call onChange after 500ms of no changes
      debounceTimerRef.current = setTimeout(() => {
        onChange({ subGoals: localSubGoals, habitLinks: localHabitLinks })
      }, 500)
    }
    
    // Cleanup timer on unmount
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    console.log('Effect triggered')
  }, [localSubGoals, localHabitLinks, draftMode])

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
    setAutoAdjusted(true)
  }

  const addSubGoal = () => setLocalSubGoals(prev => [...prev, { title: '', linkedGoalId: '', weight: 0, completed: false, note: '' }])
  const addHabitLink = () => setLocalHabitLinks(prev => [...prev, { habitId: '', weight: 0, endDate: '' }])
  const addHabitInline = () => { if (!draftMode) setIsCreateHabitOpen(true) }
  const createGoal = () => {
    if (draftMode) return
    const idx = localSubGoals.length
    setPendingLinkIndex(idx)
    setIsCreateGoalOpen(true)
  }

  const removeSubGoal = (i) => setSubGoalToRemove(i)
  const confirmRemoveSubGoal = () => {
    if (subGoalToRemove !== null) {
      setLocalSubGoals(prev => prev.filter((_, idx) => idx !== subGoalToRemove))
      setSubGoalToRemove(null)
    }
  }
  
  const removeHabitLink = (i) => setHabitToRemove(i)
  const confirmRemoveHabitLink = () => {
    if (habitToRemove !== null) {
      setLocalHabitLinks(prev => prev.filter((_, idx) => idx !== habitToRemove))
      setHabitToRemove(null)
    }
  }

  const round5 = (n) => {
    const x = Math.max(0, Math.min(100, Number(n) || 0))
    return Math.round(x / 5) * 5
  }

  // Auto normalize on first render
  useEffect(() => {
    if (didInitNormalize) return
    const count = (localSubGoals?.length || 0) + (localHabitLinks?.length || 0)
    if (count <= 0) return
    const sum = localSubGoals.reduce((s, g) => s + (Number(g.weight) || 0), 0) + localHabitLinks.reduce((s, h) => s + (Number(h.weight) || 0), 0)
    if (sum !== 100) {
      equalizeWeights()
      setAutoAdjusted(true)
    }
    setDidInitNormalize(true)
    console.log('Auto-normalized weights on init')
  }, [localSubGoals, localHabitLinks, didInitNormalize])

  const normalizeToHundred = (arr) => {
    const sum = arr.reduce((s, w) => s + w, 0)
    if (sum === 100 || sum === 0) return arr
    const ratio = 100 / sum
    let scaled = arr.map(w => round5(w * ratio))
    let diff = 100 - scaled.reduce((s, w) => s + w, 0)
    let i = 0
    while (diff !== 0 && i < scaled.length * 2) {
      const idx = i % scaled.length
      if (diff > 0 && scaled[idx] < 100) { scaled[idx] += 5; diff -= 5 }
      else if (diff < 0 && scaled[idx] > 0) { scaled[idx] -= 5; diff += 5 }
      i++
    }
    return scaled
  }

  const saveAll = async () => {
    setSaving(true)
    try {
      if (draftMode) {
        // In draft mode, bubble current values to parent and exit; do not persist
        onChange?.({
          subGoals: localSubGoals.map(s => ({ ...s })),
          habitLinks: localHabitLinks.map(h => ({ ...h }))
        })
        onClose?.()
        return
      }
      const allWeights = [
        ...localSubGoals.map(s => Number(s.weight || 0)),
        ...localHabitLinks.map(h => Number(h.weight || 0))
      ]
      const normalized = normalizeToHundred(allWeights)
      const nextSubs = localSubGoals.map((s, i) => ({ ...s, weight: normalized[i] }))
      const nextHabs = localHabitLinks.map((h, j) => ({ ...h, weight: normalized[localSubGoals.length + j] }))
      const subPayload = nextSubs.map(s => ({ title: String(s.title || '').trim(), linkedGoalId: s.linkedGoalId || undefined, weight: Number(s.weight || 0), completed: !!s.completed, note: s.note || '' }))
      const habitPayload = nextHabs.map(h => ({ habitId: h.habitId, weight: Number(h.weight || 0), endDate: h.endDate || undefined }))
      await setSubGoals(goal._id, subPayload)
      await setHabitLinks(goal._id, habitPayload)
      const res = await getGoalProgress(goal._id)
      setProgress(res?.progress || null)
      onClose?.()
    } catch (e) {
      window.dispatchEvent(new CustomEvent('wt_toast', {
        detail: { message: e?.message || 'Failed to save', type: 'error' }
      }));
    } finally {
      setSaving(false)
    }
  }

  if (!goal && !draftMode) return null

  const content = (
      <>
      <motion.div initial={{ opacity: renderInline ? 1 : 0, y: renderInline ? 0 : 20 }} animate={{ opacity: 1, y: 0 }} className={`relative ${renderInline ? '' : 'bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-3xl mx-4 p-6 border border-gray-200 dark:border-gray-800'}`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Goal Breakdown</h3>
          {!renderInline && (<button onClick={onClose} className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200">Close</button>)}
        </div>
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
            <span>Total Weight</span>
            <span title={autoAdjusted ? 'Adjusted to 100%' : ''}>{Math.min(100, Math.max(0, totalWeight))}%{autoAdjusted ? ' (auto-adjusted)' : ''}</span>
          </div>
          <div className="w-full h-2 rounded-full bg-gray-200 dark:bg-gray-700">
            <div className="h-2 rounded-full bg-primary-500" style={{ width: `${Math.min(100, Math.max(0, totalWeight))}%` }} />
          </div>
        </div>

        {/* Sub-Goals */}
        <div className="mb-6">
          <button onClick={() => setShowSubs(v => !v)} className="w-full flex items-center justify-between mb-2 px-2 py-1 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800/50">
            <span className="text-md font-semibold text-gray-900 dark:text-white flex items-center gap-2">{showSubs ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />} Sub-Goals</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">{localSubGoals.length}</span>
          </button>
          {showSubs && (
          <div className="space-y-2 max-h-80 overflow-auto pr-1">
            <div className="mb-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
              <p className="text-xs text-blue-800 dark:text-blue-300">
                <strong>Note:</strong> Only goals without existing sub-goals or habit links can be selected as sub-goals to prevent nested hierarchies.
              </p>
            </div>
            {localSubGoals.map((sg, idx) => {
              const allGoals = useApiStore.getState().goals || [];
              
              // Merge store goals with additionally fetched goals
              const combinedGoals = [...allGoals, ...additionalGoals]
              
              // Filter available goals
              let availableGoals = combinedGoals.filter(g => {
                try { 
                  // Always include the currently linked goal
                  if (sg.linkedGoalId && String(g._id) === String(sg.linkedGoalId)) return true;
                  
                  // Exclude current goal to prevent self-linking
                  const currentGoalId = draftMode ? goalId : goal?._id;
                  if (currentGoalId && String(g.id) === String(currentGoalId)) return false;
                  
                  // Exclude goals that already have sub-goals or habit links
                  if (Array.isArray(g.subGoals) && g.subGoals.length > 0) return false;
                  if (Array.isArray(g.habitLinks) && g.habitLinks.length > 0) return false;
                  
                  return true;
                } catch { return true }
              });
              
              // Remove duplicates based on _id
              const seen = new Set()
              availableGoals = availableGoals.filter(g => {
                const id = String(g._id)
                if (seen.has(id)) return false
                seen.add(id)
                return true
              })
              
              availableGoals = availableGoals.slice(0, 50);
              
              return (
              <div key={idx} className="grid grid-cols-12 gap-3 items-center">
                <div className="col-span-7">
                  <select 
                    value={sg.linkedGoalId || ''} 
                    onChange={(e) => {
                      const selectedGoalId = e.target.value;
                      // Prevent selecting the current goal as its own sub-goal
                      const currentGoalId = draftMode ? goalId : goal?._id;
                      if (currentGoalId && selectedGoalId && String(selectedGoalId) === String(currentGoalId)) {
                        window.dispatchEvent(new CustomEvent('wt_toast', {
                          detail: { message: 'Cannot link a goal to itself', type: 'error' }
                        }));
                        return;
                      }
                      setLocalSubGoals(prev => prev.map((s,i) => i===idx ? { ...s, linkedGoalId: selectedGoalId || undefined } : s));
                    }} 
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  >
                    <option value="">Link goal…</option>
                    {availableGoals.map(g => (
                      <option key={g._id} value={g._id}>{g.title}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-5 flex items-center gap-3">
                  <input type="range" min={0} max={100} step={5} value={round5(sg.weight || 0)} onChange={(e) => setLocalSubGoals(prev => prev.map((s,i) => i===idx ? { ...s, weight: round5(e.target.value) } : s))} className="flex-1" />
                  <div className="w-10 text-right text-sm text-gray-700 dark:text-gray-300">{round5(sg.weight || 0)}%</div>
                  <button title="Remove" onClick={() => removeSubGoal(idx)} className="p-2 rounded-md bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            )})}
            {localSubGoals.length === 0 && <div className="text-sm text-gray-500 dark:text-gray-400">No sub-goals added.</div>}
            <div className="pt-2 flex items-center justify-end gap-2">
              <button onClick={addSubGoal} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200"><Link className="h-4 w-4" />Link</button>
              {!draftMode && (<button onClick={createGoal} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800"><Plus className="h-4 w-4" />Add New</button>)}
            </div>
          </div>
          )}
        </div>

        {/* Habits */}
        <div className="mb-6">
          <button onClick={() => setShowHabits(v => !v)} className="w-full flex items-center justify-between mb-2 px-2 py-1 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800/50">
            <span className="text-md font-semibold text-gray-900 dark:text-white flex items-center gap-2">{showHabits ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />} Habits</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">{localHabitLinks.length}</span>
          </button>
          {showHabits && (
          <div className="space-y-2 max-h-80 overflow-auto pr-1">
            <div className="mb-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
              <p className="text-xs text-amber-800 dark:text-amber-300">
                <strong>Note:</strong> Only habits with target days or target completions can be linked to goals for progress tracking.
              </p>
            </div>
            {localHabitLinks.map((hl, idx) => {
              // Filter habits to only show those with targets
              const availableHabits = (habits || []).filter(h => {
                // Always include the currently selected habit
                const habitId = h.id || h._id;
                if (hl.habitId && String(habitId) === String(hl.habitId)) return true;
                
                // Only show habits with targetDays or targetCompletions
                return h.targetDays || h.targetCompletions;
              });
              
              return (
              <div key={idx} className="grid grid-cols-12 gap-3 items-center">
                <select value={hl.habitId} onChange={(e) => setLocalHabitLinks(prev => prev.map((h,i) => i===idx ? { ...h, habitId: e.target.value } : h))} className="col-span-7 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                  <option value="">Select a habit…</option>
                  {availableHabits.map(h => (
                    <option key={h.id || h._id} value={h.id || h._id}>{h.name}</option>
                  ))}
                </select>
                <div className="col-span-5 flex items-center gap-3">
                  <input type="range" min={0} max={100} step={5} value={round5(hl.weight || 0)} onChange={(e) => setLocalHabitLinks(prev => prev.map((h,i) => i===idx ? { ...h, weight: round5(e.target.value) } : h))} className="flex-1" />
                  <div className="w-10 text-right text-sm text-gray-700 dark:text-gray-300">{round5(hl.weight || 0)}%</div>
                  <button title="Remove" onClick={() => removeHabitLink(idx)} className="p-2 rounded-md bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            )})}
            {localHabitLinks.length === 0 && <div className="text-sm text-gray-500 dark:text-gray-400">No habits linked yet.</div>}
            <div className="pt-2 flex items-center justify-end gap-2">
              <button onClick={addHabitLink} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200"><Link className="h-4 w-4" />Link</button>
              {!draftMode && (<button onClick={addHabitInline} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800"><Plus className="h-4 w-4" />Add New</button>)}
            </div>
          </div>
          )}
        </div>

        {/* Footer */}
        {!draftMode && !renderInline && (
          <div className="flex items-center justify-between pt-2">
            <div className="text-xs text-gray-500 dark:text-gray-400">Weights auto-adjust to 100%.</div>
            <div className="flex items-center gap-2">
              <button onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200">Cancel</button>
              <button disabled={saving} onClick={saveAll} className="px-4 py-2 rounded-lg bg-primary-500 text-white disabled:opacity-70">{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        )}
      </motion.div>
      {isCreateHabitOpen && (
        <Suspense fallback={null}>
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
        </Suspense>
      )}
      {/* Inline create goal modal for sub-goal creation and linking */}
      {isCreateGoalOpen && (
        <Suspense fallback={null}>
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
        </Suspense>
      )}
      
      {/* Confirmation modal for removing subgoal */}
      {subGoalToRemove !== null && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSubGoalToRemove(null)} />
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Remove Sub-Goal?</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">Are you sure you want to unlink this sub-goal? This will only remove it from this goal's breakdown - the goal itself will not be deleted.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setSubGoalToRemove(null)} className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">Cancel</button>
              <button onClick={confirmRemoveSubGoal} className="px-4 py-2 rounded-lg bg-red-600 text-white">Remove</button>
            </div>
          </motion.div>
        </div>
      )}
      
      {/* Confirmation modal for removing habit */}
      {habitToRemove !== null && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setHabitToRemove(null)} />
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Remove Habit Link?</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">Are you sure you want to unlink this habit? This will only remove it from this goal's breakdown - the habit itself will not be deleted.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setHabitToRemove(null)} className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">Cancel</button>
              <button onClick={confirmRemoveHabitLink} className="px-4 py-2 rounded-lg bg-red-600 text-white">Remove</button>
            </div>
          </motion.div>
        </div>
      )}
      </>
  )

  // Sync upwards on change when in draft mode
  useEffect(() => {
    if (draftMode) {
      onChange?.({ subGoals: localSubGoals.map(s => ({ ...s })), habitLinks: localHabitLinks.map(h => ({ ...h })) })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftMode, localSubGoals, localHabitLinks])

  if (renderInline) {
    return content
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      {content}
    </div>
  )
}



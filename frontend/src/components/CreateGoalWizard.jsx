import { useEffect, useMemo, useState, useCallback, useRef, lazy, Suspense } from 'react'
import { motion } from 'framer-motion'
import { X, Plus, Target, Calendar, Tag, AlertCircle, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react'
import useApiStore from '../store/apiStore'
import { lockBodyScroll, unlockBodyScroll } from '../utils/scrollLock'
const GoalDivisionEditor = lazy(() => import('./GoalDivisionEditor'));
import { useGoalLimits } from '../hooks/usePremium'
import PremiumLimitIndicator from './PremiumLimitIndicator'

export default function CreateGoalWizard({ isOpen, onClose, year, initialData, editMode = false, goalId = null }) {
  const MAX_TITLE_CHARS = 200
  const MAX_DESC_CHARS = 1000

  const {
    createGoal,
    updateGoal,
    setSubGoals,
    setHabitLinks,
    loadHabits,
    getDashboardStats,
    habits,
    goals
  } = useApiStore()

  // Premium state
  const activeGoalsCount = useMemo(() => {
    return goals?.filter(g => !g.completedAt)?.length || 0
  }, [goals])
  const goalLimits = useGoalLimits(activeGoalsCount)

  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    targetDate: '',
    isPublic: true
  })

  // Step 2 state: sub-goals and habit links (local; applied after goal creation)
  const [localSubGoals, setLocalSubGoals] = useState([])
  const [localHabitLinks, setLocalHabitLinks] = useState([])
  const prevIsOpenRef = useRef(false)

  useEffect(() => {
    // Only initialize when modal transitions from closed to open
    if (isOpen && !prevIsOpenRef.current) {
      prevIsOpenRef.current = true
      setStep(1)
      setSaving(false)

      // Load habits if not already loaded (needed for habit links dropdown)
      if (editMode && (!habits || habits.length === 0)) {
        loadHabits({}).catch(() => {})
      }

      // Format target date for HTML date input if it exists
      let formattedTargetDate = ''
      if (initialData?.targetDate) {
        const date = new Date(initialData.targetDate)
        if (!isNaN(date.getTime())) {
          formattedTargetDate = date.toISOString().split('T')[0]
        }
      }

      setFormData({
        title: initialData?.title || '',
        description: initialData?.description || '',
        category: initialData?.category || '',
        targetDate: formattedTargetDate,
        isPublic: initialData?.isPublic ?? true
      })
      setErrors({})

      // Load existing sub-goals and habit links if in edit mode
      if (editMode && initialData) {
        const subGoals = Array.isArray(initialData.subGoals) ? initialData.subGoals.map(s => ({ ...s })) : []
        const habitLinks = Array.isArray(initialData.habitLinks) ? initialData.habitLinks.map(h => ({ ...h })) : []
        setLocalSubGoals(subGoals)
        setLocalHabitLinks(habitLinks)
      } else {
        setLocalSubGoals([])
        setLocalHabitLinks([])
      }
    }
    
    // Track modal closed state
    if (!isOpen) {
      prevIsOpenRef.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  useEffect(() => { if (isOpen) { lockBodyScroll(); return () => unlockBodyScroll(); } }, [isOpen])

  const categories = [
    'Health & Fitness',
    'Career & Business',
    'Personal Development',
    'Relationships',
    'Education & Learning',
    'Travel & Adventure',
    'Financial Goals',
    'Creative Projects',
    'Family & Friends',
    'Other'
  ]

  // Memoize the value prop to prevent infinite loops
  const divisionEditorValue = useMemo(() => ({
    subGoals: localSubGoals,
    habitLinks: localHabitLinks
  }), [localSubGoals, localHabitLinks])

  // Memoize onChange handler to prevent infinite loops
  const handleDivisionChange = useCallback((v) => {
    if (!v) return
    if (Array.isArray(v.subGoals)) setLocalSubGoals(v.subGoals.map(s => ({ ...s })))
    if (Array.isArray(v.habitLinks)) setLocalHabitLinks(v.habitLinks.map(h => ({ ...h })))
  }, [])

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    const v = type === 'checkbox' ? checked : value
    const limited = name === 'title'
      ? String(v).slice(0, MAX_TITLE_CHARS)
      : name === 'description'
        ? String(v).slice(0, MAX_DESC_CHARS)
        : v
    setFormData(prev => ({ ...prev, [name]: limited }))
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }))
  }

  const getMinDate = () => {
    if (editMode && initialData?.createdAt) {
      // For editing, allow dates from creation date + 1 day
      const creationDate = new Date(initialData.createdAt)
      const minDate = new Date(creationDate)
      minDate.setDate(minDate.getDate() + 1)
      return minDate.toISOString().split('T')[0]
    } else {
      // For creation, allow dates from today + 1 day
      const today = new Date(Date.now())
      const minDate = new Date(today)
      minDate.setDate(minDate.getDate() + 1)
      return minDate.toISOString().split('T')[0]
    }
  }

  const validateStep1 = () => {
    const newErrors = {}
    if (!formData.title.trim()) newErrors.title = 'Title is required'
    if (formData.title.trim().length > MAX_TITLE_CHARS) newErrors.title = `Title cannot exceed ${MAX_TITLE_CHARS} characters`
    if (formData.description.trim().length > MAX_DESC_CHARS) newErrors.description = `Description cannot exceed ${MAX_DESC_CHARS} characters`
    if (!formData.category) newErrors.category = 'Category is required'
    if (formData.targetDate) {
      const targetDate = new Date(formData.targetDate)
      if (editMode && initialData?.createdAt) {
        const creationDate = new Date(initialData.createdAt)
        const minAllowedDate = new Date(creationDate)
        minAllowedDate.setDate(minAllowedDate.getDate() + 1)
        if (targetDate < minAllowedDate) newErrors.targetDate = 'Target date must be at least 1 day after creation date'
      } else {
        const today = new Date()
        const minAllowedDate = new Date(today)
        minAllowedDate.setDate(minAllowedDate.getDate() + 1)
        if (targetDate < minAllowedDate) newErrors.targetDate = 'Target date must be at least 1 day from today'
      }
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Step 2 helpers
  const totalWeight = useMemo(() => {
    const sg = localSubGoals.reduce((s, g) => s + (Number(g.weight) || 0), 0)
    const hl = localHabitLinks.reduce((s, h) => s + (Number(h.weight) || 0), 0)
    return sg + hl
  }, [localSubGoals, localHabitLinks])

  const round5 = (n) => {
    const x = Math.max(0, Math.min(100, Number(n) || 0))
    return Math.round(x / 5) * 5
  }

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

  const goNext = async () => {
    if (!validateStep1()) return
    setSaving(true)
    try { await loadHabits({}).catch(() => { }) } catch { }
    setStep(2)
    setSaving(false)
  }

  const handleSave = async () => {
    // Check premium limits before saving (only for new goals)
    if (!editMode && !goalLimits.canCreate) {
      window.dispatchEvent(new CustomEvent('wt_toast', { 
        detail: { 
          message: `Goal limit reached (${activeGoalsCount}/${goalLimits.maxGoals}). You cannot create more goals at this time.`, 
          type: 'error' 
        } 
      }))
      return
    }

    setSaving(true)
    try {
      // Prepare basic goal data
      const goalPayload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category,
        targetDate: formData.targetDate || null,
        year: year,
        isPublic: !!formData.isPublic
      }

      // Prepare division data if any exists
      const allWeights = [
        ...localSubGoals.map(s => Number(s.weight || 0)),
        ...localHabitLinks.map(h => Number(h.weight || 0))
      ]

      let normalizedSubGoals = []
      let normalizedHabitLinks = []

      if (allWeights.some(w => Number(w) > 0)) {
        const normalized = normalizeToHundred(allWeights)
        normalizedSubGoals = localSubGoals.map((s, i) => ({
          title: String(s.title || '').trim(),
          linkedGoalId: s.linkedGoalId || undefined,
          weight: Number(normalized[i] || 0),
          completedAt: s.completedAt || undefined
        })).filter(s => s.title.length > 0 || (s.linkedGoalId && String(s.linkedGoalId).length > 0))

        normalizedHabitLinks = localHabitLinks.map((h, j) => ({
          habitId: h.habitId,
          weight: Number(normalized[localSubGoals.length + j] || 0),
          endDate: h.endDate || undefined
        })).filter(h => h.habitId)
      }

      // Add division data to payload
      goalPayload.subGoals = normalizedSubGoals
      goalPayload.habitLinks = normalizedHabitLinks

      let result
      if (editMode && goalId) {
        // Update existing goal
        result = await updateGoal(goalId, goalPayload)
        if (!result?.success) throw new Error(result?.error || 'Failed to update goal')
      } else {
        // Create new goal
        result = await createGoal(goalPayload)
        if (!result?.success || !result?.goal?.id) {
          throw new Error(result?.error || 'Failed to create goal')
        }
      }

      // Refresh dashboard stats to reflect changes
      try { await getDashboardStats({ force: true }) } catch { }

      onClose?.()
    } catch (e) {
      window.dispatchEvent(new CustomEvent('wt_toast', { detail: { message: e?.message || 'Failed to save goal', type: 'error' } }))
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[9999]"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-3xl h-[85vh] relative shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 px-8 py-6 border-b border-gray-200 dark:border-gray-700">
          <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
            <X className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          </button>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 bg-primary-100 dark:bg-primary-900/30 rounded-xl">
              <Target className="h-6 w-6 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {editMode ? 'Edit Goal' : 'Create New Goal'}
              </h2>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                {editMode ? 'Update your goal details' : 'Define what you want to achieve'}
              </p>
            </div>
          </div>

          {/* Stepper */}
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setStep(1)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                step === 1 
                  ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 border-2 border-primary-300 dark:border-primary-700' 
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-2 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <span className={`flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold ${
                step === 1 ? 'bg-primary-500 text-white' : 'bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-300'
              }`}>1</span>
              Details
            </button>
            <ChevronRight className="h-4 w-4 text-gray-400 dark:text-gray-600" />
            <button
              type="button"
              onClick={() => { if (validateStep1()) setStep(2) }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                step === 2 
                  ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 border-2 border-primary-300 dark:border-primary-700' 
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-2 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <span className={`flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold ${
                step === 2 ? 'bg-primary-500 text-white' : 'bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-300'
              }`}>2</span>
              Division
            </button>
          </div>
        </div>

        {step === 1 && (
          <form onSubmit={(e) => { e.preventDefault(); goNext(); }} className="flex-1 overflow-y-auto">
            <div className="px-8 py-6 space-y-6">
              {/* Premium Limit Indicator (only show when limit reached and for new goals) */}
              {!editMode && !goalLimits.canCreate && (
                <PremiumLimitIndicator
                  current={activeGoalsCount}
                  max={goalLimits.maxGoals}
                  label="Active Goals"
                  showUpgradeButton={false}
                />
              )}

              {/* Title */}
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Goal Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-colors ${errors.title ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'}`}
                  placeholder="e.g., Run a marathon, Learn Spanish, Start a business"
                  required
                  maxLength={MAX_TITLE_CHARS}
                  disabled={!editMode && !goalLimits.canCreate}
                />
                <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 text-right">{formData.title.length}/{MAX_TITLE_CHARS}</div>
                {errors.title && (
                  <div className="flex items-center gap-2 mt-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    {errors.title}
                  </div>
                )}
              </div>

              {/* Description */}
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={4}
                  className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 resize-none transition-colors ${errors.description ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'}`}
                  placeholder="Describe your goal in detail, including why it's important to you"
                  required
                  disabled={!editMode && !goalLimits.canCreate}
                  maxLength={MAX_DESC_CHARS}
                />
                <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 text-right">{formData.description.length}/{MAX_DESC_CHARS}</div>
                {errors.description && (
                  <div className="flex items-center gap-2 mt-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    {errors.description}
                  </div>
                )}
              </div>

              {/* Category */}
              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Tag className="h-3.5 w-3.5 inline mr-1" />
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-colors ${errors.category ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'}`}
                  required
                  disabled={!editMode && !goalLimits.canCreate}
                >
                  <option value="">Select a category</option>
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
                {errors.category && (
                  <div className="flex items-center gap-2 mt-2 text-red-600 dark:text-red-400 text-xs">
                    <AlertCircle className="h-3 w-3 flex-shrink-0" />
                    {errors.category}
                  </div>
                )}
              </div>

              {/* Target Date */}
              <div>

                <label htmlFor="targetDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Calendar className="h-3.5 w-3.5 inline mr-1" />
                  Target Date (Optional)
                </label>
                <input 
                  type="date" 
                  disabled={!editMode && !goalLimits.canCreate} 
                  id="targetDate" 
                  name="targetDate" 
                  value={formData.targetDate} 
                  onChange={handleInputChange} 
                  min={getMinDate()} 
                  className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-colors ${errors.targetDate ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'}`} 
                />
                {errors.targetDate && (
                  <div className="flex items-center gap-2 mt-2 text-red-600 dark:text-red-400 text-xs">
                    <AlertCircle className="h-3 w-3 flex-shrink-0" />
                    {errors.targetDate}
                  </div>
                )}
              </div>

              {/* Visibility settings */}
              <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input 
                    type="checkbox" 
                    name="isPublic" 
                    checked={!!formData.isPublic} 
                    onChange={handleInputChange} 
                    className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500" 
                  />
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">Make this goal public</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Others can see and interact with your goal</div>
                  </div>
                </label>
              </div>
            </div>

            {/* Actions Footer */}
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
                disabled={saving} 
                className="flex-1 py-3 px-5 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-lg shadow-primary-500/20 transition-all"
              >
                {saving ? (editMode ? 'Updating…' : 'Creating…') : 'Next →'}
              </button>
            </div>
          </form>
        )}
        {step === 2 && (
          <div className="flex-1 overflow-y-auto flex flex-col">
            <div className="flex-1 px-8 py-6">
              <Suspense fallback={null}>
                <GoalDivisionEditor
                  key={`draft-${editMode ? goalId : 'new'}`}
                  goalId={goalId}
                  draftMode
                  renderInline
                  value={divisionEditorValue}
                  onChange={handleDivisionChange}
                  habits={habits}
                  onClose={() => setStep(1)}
                />
              </Suspense>
            </div>

            {/* Actions Footer */}
            <div className="bg-gray-50 dark:bg-gray-800/50 px-8 py-5 border-t border-gray-200 dark:border-gray-700 flex items-center gap-3">
              <button 
                type="button" 
                onClick={() => setStep(1)} 
                className="flex-1 py-3 px-5 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 font-medium transition-all inline-flex items-center justify-center gap-2"
              >
                <ChevronLeft className="h-4 w-4" /> Back
              </button>
              <button 
                type="button" 
                onClick={handleSave} 
                disabled={saving || (!editMode && !goalLimits.canCreate)} 
                className="flex-1 py-3 px-5 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-lg shadow-primary-500/20 transition-all"
              >
                {saving ? (editMode ? 'Updating…' : 'Saving…') : (!editMode && !goalLimits.canCreate ? 'Limit Reached' : (editMode ? 'Update' : 'Create'))}
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}



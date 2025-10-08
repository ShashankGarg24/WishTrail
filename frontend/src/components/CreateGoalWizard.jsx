import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { X, Plus, Target, Calendar, Tag, AlertCircle, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react'
import useApiStore from '../store/apiStore'
import { lockBodyScroll, unlockBodyScroll } from '../utils/scrollLock'
import GoalDivisionEditor from './GoalDivisionEditor'

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
    habits
  } = useApiStore()

  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    priority: 'medium',
    duration: 'medium-term',
    targetDate: '',
    isPublic: true
  })

  // Step 2 state: sub-goals and habit links (local; applied after goal creation)
  const [localSubGoals, setLocalSubGoals] = useState([])
  const [localHabitLinks, setLocalHabitLinks] = useState([])

  useEffect(() => {
    if (isOpen) {
      setStep(1)
      setSaving(false)
      
      // Format target date for HTML date input if it exists
      let formattedTargetDate = ''
      if (initialData?.targetDate) {
        const date = new Date(initialData.targetDate)
        if (!isNaN(date.getTime())) {
          formattedTargetDate = date.toISOString().split('T')[0]
        }
      }
      
      setFormData(prev => ({
        title: initialData?.title || '',
        description: initialData?.description || '',
        category: initialData?.category || '',
        priority: initialData?.priority || 'medium',
        duration: initialData?.duration || 'medium-term',
        targetDate: formattedTargetDate,
        isPublic: initialData?.isPublic ?? true
      }))
      setErrors({})
      
      // Load existing sub-goals and habit links if in edit mode
      if (editMode && initialData) {
        setLocalSubGoals(Array.isArray(initialData.subGoals) ? initialData.subGoals.map(s => ({ ...s })) : [])
        setLocalHabitLinks(Array.isArray(initialData.habitLinks) ? initialData.habitLinks.map(h => ({ ...h })) : [])
      } else {
        setLocalSubGoals([])
        setLocalHabitLinks([])
      }
    }
  }, [isOpen, initialData, editMode])

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

  const priorities = [
    { value: 'high', label: 'High Priority' },
    { value: 'medium', label: 'Medium Priority' },
    { value: 'low', label: 'Low Priority' }
  ]

  const durations = [
    { value: 'short-term', label: 'Short-term (1-30 days)' },
    { value: 'medium-term', label: 'Medium-term (1-6 months)' },
    { value: 'long-term', label: 'Long-term (6+ months)' }
  ]

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
    if (!formData.description.trim()) newErrors.description = 'Description is required'
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
    try { await loadHabits({}).catch(()=>{}) } catch {}
    setStep(2)
    setSaving(false)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      // Prepare basic goal data
      const goalPayload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category,
        priority: formData.priority,
        duration: formData.duration,
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
          completed: !!s.completed,
          completedAt: s.completedAt || undefined,
          note: String(s.note || '')
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
        if (!result?.success || !result?.goal?._id) throw new Error(result?.error || 'Failed to create goal')
      }

      // Refresh dashboard stats to reflect changes
      try { await getDashboardStats({ force: true }) } catch {}

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
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
      style={{ zIndex: 9999 }}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white dark:bg-gray-800 p-6 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto relative shadow-2xl border border-gray-200 dark:border-gray-700"
        onClick={(e) => e.stopPropagation()}
        style={{ zIndex: 10000 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Plus className="h-6 w-6 text-primary-500" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {editMode ? 'Edit Goal' : 'Create New Goal'}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 transition-colors">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Stepper */}
        <div className="flex items-center justify-center gap-3 mb-6 text-sm">
          <div 
          onClick={() => setStep(1)} 
          className={`px-3 py-1.5 rounded-full border ${step === 1 ? 'bg-primary-50 border-primary-200 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300 dark:border-primary-800 cursor-pointer' : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 cursor-pointer'}`}>
            1. Details
          </div>
          <ChevronRight className="h-4 w-4 text-gray-400" />
          <div 
          onClick={() => setStep(2)}
          className={`px-3 py-1.5 rounded-full border ${step === 2 ? 'bg-primary-50 border-primary-200 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300 dark:border-primary-800 cursor-pointer' : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 cursor-pointer'}`}>
            2. Sub-goals & Habits
          </div>
        </div>

        {step === 1 && (
          <form onSubmit={(e) => { e.preventDefault(); goNext(); }} className="space-y-6">
            {/* Title */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Goal Title <span className="text-red-500">*</span></label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 ${errors.title ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                placeholder="Enter your goal title"
                required
                maxLength={MAX_TITLE_CHARS}
              />
              <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 text-right">{formData.title.length}/{MAX_TITLE_CHARS}</div>
              {errors.title && (
                <div className="flex items-center mt-1 text-red-500 text-sm">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {errors.title}
                </div>
              )}
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description <span className="text-red-500">*</span></label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={3}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 ${errors.description ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                placeholder="Describe your goal in detail"
                required
                maxLength={MAX_DESC_CHARS}
              />
              <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 text-right">{formData.description.length}/{MAX_DESC_CHARS}</div>
              {errors.description && (
                <div className="flex items-center mt-1 text-red-500 text-sm">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {errors.description}
                </div>
              )}
            </div>

            {/* Category */}
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Category <span className="text-red-500">*</span></label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white ${errors.category ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                required
              >
                <option value="">Select a category</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
              {errors.category && (
                <div className="flex items-center mt-1 text-red-500 text-sm">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {errors.category}
                </div>
              )}
            </div>

            {/* Priority */}
            <div>
              <label htmlFor="priority" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Priority</label>
              <select id="priority" name="priority" value={formData.priority} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                {priorities.map(p => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>

            {/* Duration */}
            <div>
              <label htmlFor="duration" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Duration</label>
              <select id="duration" name="duration" value={formData.duration} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                {durations.map(d => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            </div>

            {/* Target Date */}
            <div>
              <label htmlFor="targetDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Target Date (Optional)</label>
              <input type="date" id="targetDate" name="targetDate" value={formData.targetDate} onChange={handleInputChange} min={getMinDate()} className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white ${errors.targetDate ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`} />
              {errors.targetDate && (
                <div className="flex items-center mt-1 text-red-500 text-sm">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {errors.targetDate}
                </div>
              )}
            </div>

            {/* Visibility settings */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input type="checkbox" name="isPublic" checked={!!formData.isPublic} onChange={handleInputChange} className="rounded" />
                Make this goal visible to others
              </label>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-4">
              <button type="button" onClick={onClose} className="flex-1 py-2 px-4 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Cancel</button>
              <button type="submit" disabled={saving} className="flex-1 py-2 px-4 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">{saving ? (editMode ? 'Updating…' : 'Creating…') : 'Next'}</button>
            </div>
          </form>
        )}
        {step === 2 && (
          <div className="space-y-4">
            <GoalDivisionEditor
              draftMode
              renderInline
              value={{ subGoals: localSubGoals, habitLinks: localHabitLinks }}
              onChange={(v) => {
                if (!v) return
                if (Array.isArray(v.subGoals)) setLocalSubGoals(v.subGoals.map(s => ({ ...s })))
                if (Array.isArray(v.habitLinks)) setLocalHabitLinks(v.habitLinks.map(h => ({ ...h })))
              }}
              habits={habits}
              onClose={() => setStep(1)}
            />
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setStep(1)} className="flex-1 py-2 px-4 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors inline-flex items-center justify-center gap-2">
                <ChevronLeft className="h-4 w-4" /> Back
              </button>
              <button type="button" onClick={handleSave} disabled={saving} className="flex-1 py-2 px-4 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                {saving ? (editMode ? 'Updating…' : 'Saving…') : (editMode ? 'Update' : 'Save')}
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}



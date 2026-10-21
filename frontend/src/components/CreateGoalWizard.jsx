import { useEffect, useMemo, useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { X, Target, Calendar, AlertCircle, ChevronDown, ChevronRight } from 'lucide-react'
import useApiStore from '../store/apiStore'
import { lockBodyScroll, unlockBodyScroll } from '../utils/scrollLock'
import { useGoalLimits } from '../hooks/usePremium'
import PremiumLimitIndicator from './PremiumLimitIndicator'
import GoalCategorySelector from './GoalCategorySelector'

const THEME_COLOR = '#4c99e6'

export default function CreateGoalWizard({ isOpen, onClose, year, initialData, editMode = false, goalId = null, onSaved }) {
  const MAX_TITLE_CHARS = 100
  const MAX_DESC_CHARS = 200

  const {
    createGoal,
    updateGoal,
    getDashboardStats,
    goals
  } = useApiStore()

  // Premium state
  const activeGoalsCount = useMemo(() => {
    return goals?.filter(g => !g.completedAt)?.length || 0
  }, [goals])
  const goalLimits = useGoalLimits(activeGoalsCount)

  const [saving, setSaving] = useState(false)
  const [showAdditionalDetails, setShowAdditionalDetails] = useState(false)
  const [errors, setErrors] = useState({})
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    targetDate: '',
    isPublic: true,
    isUpdatesPublic: true,
    subGoals: []
  })

  const prevIsOpenRef = useRef(false)

  useEffect(() => {
    // Only initialize when modal transitions from closed to open
    if (isOpen && !prevIsOpenRef.current) {
      prevIsOpenRef.current = true
      setSaving(false)

      // Format target date for HTML date input if it exists
      let formattedTargetDate = ''
      const existingTargetDate = initialData?.targetDate || initialData?.target_date
      if (existingTargetDate) {
        const date = new Date(existingTargetDate)
        if (!isNaN(date.getTime())) {
          formattedTargetDate = date.toISOString().split('T')[0]
        }
      }

      setFormData({
        title: initialData?.title || '',
        description: initialData?.description || '',
        category: initialData?.category || '',
        targetDate: formattedTargetDate,
        isPublic: initialData?.isPublic ?? true,
        isUpdatesPublic: initialData?.isUpdatesPublic ?? true,
        subGoals: Array.isArray(initialData?.subGoals) ? initialData.subGoals.map(item => ({ ...item })) : []
      })
      setShowAdditionalDetails(false)
      setErrors({})
    }

    // Track modal closed state
    if (!isOpen) {
      prevIsOpenRef.current = false
    }
  }, [isOpen])

  useEffect(() => { if (isOpen) { lockBodyScroll(); return () => unlockBodyScroll(); } }, [isOpen])

  // Canonical categories for dropdown
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
    if (newErrors.description || newErrors.targetDate) {
      setShowAdditionalDetails(true)
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }


  const handleSave = async () => {
    // Check premium limits before saving (only for new goals)
    if (!editMode && !goalLimits.canCreate) {
      window.dispatchEvent(new CustomEvent('wt_toast', {
        detail: {
          message: 'You have reached the limit for goal creation.',
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
        description: formData.description.trimEnd(),
        category: formData.category,
        targetDate: formData.targetDate || null,
        year: year,
        isPublic: !!formData.isPublic,
        isUpdatesPublic: !!formData.isUpdatesPublic,
        subGoals: formData.subGoals.filter(item => item.title.trim()).map((item, index, items) => ({ ...item, title: item.title.trim(), weight: Math.floor(100 / items.length) + (index < (100 % items.length) ? 1 : 0) }))
      }

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

      if (typeof onSaved === 'function') {
        try { await onSaved(result?.goal || null) } catch { }
      }

      onClose?.()
    } catch (e) {
      window.dispatchEvent(new CustomEvent('wt_toast', { detail: { message: e?.message || 'Failed to save goal', type: 'error' } }))
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <>
      <style>{`
        /* Ensure date picker calendar doesn't overflow bottom of screen */
        input[type="date"]::-webkit-calendar-picker-indicator {
          cursor: pointer;
        }

        /* Force date picker to open upward when near bottom */
        .date-picker-container {
          position: relative;
        }
      `}</style>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="goal-form-modal fixed inset-0 bg-slate-950/60 backdrop-blur-[2px] flex items-end justify-center sm:items-center sm:p-4 z-[9999]"
        style={{ fontFamily: 'Manrope, ui-sans-serif, system-ui' }}
        onClick={onClose}
      >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="goal-form-dialog bg-[#f8fafc] dark:bg-canvas rounded-t-3xl sm:rounded-2xl w-full sm:max-w-[760px] h-[94dvh] sm:h-[min(84dvh,760px)] sm:max-h-[calc(100dvh-2rem)] relative shadow-2xl sm:border border-slate-200 dark:border-line overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
        style={{ fontFamily: 'Manrope, ui-sans-serif, system-ui' }}
      >
        {/* Header */}
        <div className="bg-white dark:bg-canvas px-5 sm:px-8 py-4 sm:py-5 border-b border-slate-200 dark:border-line relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-elevated transition-colors text-gray-600 dark:text-muted"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-3 pr-10">
            <div className="p-2.5 rounded-xl" style={{ backgroundColor: `${THEME_COLOR}20` }}>
              <Target className="h-6 w-6" style={{ color: THEME_COLOR }} />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white" style={{ fontFamily: 'Manrope' }}>
                {editMode ? 'Edit Goal' : 'Create New Goal'}
              </h2>
              <p className="text-xs text-gray-500 dark:text-muted mt-0.5" style={{ fontFamily: 'Manrope' }}>
                {editMode ? 'Update your goal details' : 'Define what you want to achieve'}
              </p>
            </div>
          </div>

          {/*
            Temporary onboarding simplification:
            hide the top step indicator completely for now.
          */}
          {/**
          <div className="flex items-center justify-center gap-2 sm:gap-3">
            <button
              type="button"
              className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-medium border-2 border-gray-300 dark:border-line bg-white dark:bg-surface text-gray-900 dark:text-white"
              style={{ borderColor: THEME_COLOR, backgroundColor: `${THEME_COLOR}10` }}
            >
              <span
                className="flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-full text-[10px] sm:text-xs font-bold text-white flex-shrink-0"
                style={{ backgroundColor: THEME_COLOR }}
              >
                1
              </span>
              <span className="hidden sm:inline">Details</span>
            </button>
          </div>
          */}
        </div>

        <form onSubmit={(e) => { e.preventDefault(); if (validateStep1()) handleSave(); }} className="flex-1 min-h-0 flex flex-col">
          <div className="flex-1 min-h-0 overflow-y-auto theme-scrollbar px-4 sm:px-8 py-5 sm:py-6 space-y-4">
              {/* Premium Limit Indicator (only show when limit reached and for new goals) */}
              {!editMode && !saving && !goalLimits.canCreate && (
                <PremiumLimitIndicator
                  current={activeGoalsCount}
                  max={goalLimits.maxGoals}
                  label="active goals"
                  showUpgradeButton={false}
                />
              )}

              {/* Analytics retention notice for free tier - goals */}
              {/* {!editMode && goalLimits.canCreate && !goalLimits.isPremium && goalLimits.percentUsed < 60 && (
                <div className="flex items-start gap-3 p-3 rounded-xl" style={{ backgroundColor: 'rgba(76, 153, 230, 0.08)', border: '1px solid rgba(76, 153, 230, 0.2)' }}>
                  <Clock className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: THEME_COLOR }} />
                  <div>
                    <p className="text-xs font-medium" style={{ color: THEME_COLOR, fontFamily: 'Manrope' }}>
                      Free plan: up to {goalLimits.maxGoals} active goals, analytics limited to 30 days
                    </p>
                    <p className="text-[11px] text-gray-500 dark:text-muted mt-0.5 flex items-center gap-1" style={{ fontFamily: 'Manrope' }}>
                      <Crown className="h-3 w-3" style={{ color: '#f59e0b' }} />
                      Upgrade to Premium for more goals and full analytics history
                    </p>
                  </div>
                </div>
              )} */}

              {/* Title */}
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-muted mb-2" style={{ fontFamily: 'Manrope' }}>
                  Goal Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 border rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white dark:bg-surface text-gray-900 dark:text-white placeholder-gray-400 transition-colors ${errors.title ? 'border-red-500' : 'border-slate-200 dark:border-line'}`}
                  style={{ fontFamily: 'Manrope', borderColor: errors.title ? '#ef4444' : (formData.title ? THEME_COLOR : undefined) }}
                  placeholder="e.g., Run a marathon, Learn Spanish, Start a business"
                  required
                  maxLength={MAX_TITLE_CHARS}
                  disabled={!editMode && !goalLimits.canCreate}
                />
                <div className="mt-1 text-xs text-gray-500 dark:text-muted text-right" style={{ fontFamily: 'Manrope' }}>{formData.title.length}/{MAX_TITLE_CHARS}</div>
                {errors.title && (
                  <div className="flex items-center gap-2 mt-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm" style={{ fontFamily: 'Manrope' }}>
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    {errors.title}
                  </div>
                )}
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-muted mb-2" style={{ fontFamily: 'Manrope' }}>
                  Category <span className="text-red-500">*</span>
                </label>
                <GoalCategorySelector value={formData.category} onChange={category => setFormData(current => ({ ...current, category }))} disabled={!editMode && !goalLimits.canCreate}/>
                {errors.category && (
                  <div className="flex items-center gap-2 mt-2 text-red-600 dark:text-red-400 text-xs" style={{ fontFamily: 'Manrope' }}>
                    <AlertCircle className="h-3 w-3 flex-shrink-0" />
                    {errors.category}
                  </div>
                )}
              </div>

              {/* Additional details (optional) */}
              <div className="rounded-xl border border-gray-200 dark:border-line bg-gray-50/60 dark:bg-gray-800/40">
                <button
                  type="button"
                  onClick={() => setShowAdditionalDetails(prev => !prev)}
                  className="w-full px-4 py-3 flex items-center justify-between text-left"
                >
                  <div>
                    <div className="text-sm font-semibold text-gray-900 dark:text-white" style={{ fontFamily: 'Manrope' }}>
                      Additional Details
                    </div>
                    <div className="text-xs text-gray-500 dark:text-muted" style={{ fontFamily: 'Manrope' }}>
                      Optional fields for richer goal setup
                    </div>
                  </div>
                  {showAdditionalDetails ? (
                    <ChevronDown className="h-4 w-4 text-gray-500" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-gray-500" />
                  )}
                </button>

                {showAdditionalDetails && (
                  <div className="px-4 pb-4 space-y-4 border-t border-gray-200 dark:border-line">
                    {/* Description */}
                    <div>
                      <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-muted mt-2 mb-2" style={{ fontFamily: 'Manrope' }}>
                        Description
                      </label>
                      <textarea
                        id="description"
                        name="description"
                        value={formData.description}
                        onChange={handleInputChange}
                        rows={4}
                        className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 bg-white dark:bg-surface text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 resize-none transition-colors ${errors.description ? 'border-red-500' : 'border-gray-300 dark:border-line'}`}
                        style={{ fontFamily: 'Manrope', borderColor: errors.description ? '#ef4444' : (formData.description ? THEME_COLOR : undefined) }}
                        placeholder="Describe your goal in detail, including why it's important to you"
                        disabled={!editMode && !goalLimits.canCreate}
                        maxLength={MAX_DESC_CHARS}
                      />
                      <div className="mt-1 text-xs text-gray-500 dark:text-muted text-right" style={{ fontFamily: 'Manrope' }}>{formData.description.length}/{MAX_DESC_CHARS}</div>
                      {errors.description && (
                        <div className="flex items-center gap-2 mt-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm" style={{ fontFamily: 'Manrope' }}>
                          <AlertCircle className="h-4 w-4 flex-shrink-0" />
                          {errors.description}
                        </div>
                      )}
                    </div>

                    {/* Target Date */}
                    <div className="relative min-w-0 max-w-full overflow-hidden">
                      <label htmlFor="targetDate" className="block text-sm font-medium text-gray-700 dark:text-muted mb-2" style={{ fontFamily: 'Manrope' }}>
                        <Calendar className="h-3.5 w-3.5 inline mr-1" />
                        Target Date
                      </label>
                      <input
                        type="date"
                        disabled={!editMode && !goalLimits.canCreate}
                        id="targetDate"
                        name="targetDate"
                        value={formData.targetDate}
                        onChange={handleInputChange}
                        min={getMinDate()}
                        className={`block w-full min-w-0 max-w-full box-border px-3 sm:px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 bg-white dark:bg-surface text-gray-900 dark:text-white transition-colors ${errors.targetDate ? 'border-red-500' : 'border-gray-300 dark:border-line'}`}
                        style={{ fontFamily: 'Manrope', borderColor: errors.targetDate ? '#ef4444' : (formData.targetDate ? THEME_COLOR : undefined), position: 'relative', WebkitAppearance: 'none' }}
                      />
                      {errors.targetDate && (
                        <div className="flex items-center gap-2 mt-2 text-red-600 dark:text-red-400 text-xs" style={{ fontFamily: 'Manrope' }}>
                          <AlertCircle className="h-3 w-3 flex-shrink-0" />
                          {errors.targetDate}
                        </div>
                      )}
                    </div>

                    {/* Visibility settings */}
                    <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-line">
                      <label className="flex items-center justify-between gap-3 cursor-pointer">
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white" style={{ fontFamily: 'Manrope' }}>Make this goal public</div>
                          <div className="text-xs text-gray-500 dark:text-muted" style={{ fontFamily: 'Manrope' }}>Others can see and interact with your goal</div>
                        </div>
                        <span className="relative inline-flex items-center">
                          <input
                            type="checkbox"
                            name="isPublic"
                            checked={!!formData.isPublic}
                            onChange={handleInputChange}
                            className="sr-only peer"
                          />
                          <span
                            className="w-11 h-6 rounded-full transition-colors peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-offset-2 dark:peer-focus:ring-offset-gray-800"
                            style={{
                              backgroundColor: formData.isPublic ? THEME_COLOR : '#d1d5db',
                              boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.06)'
                            }}
                          />
                          <span className="pointer-events-none absolute left-[2px] top-[2px] h-5 w-5 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5" />
                        </span>
                      </label>
                      <label className={`mt-4 flex items-center justify-between gap-3 border-t border-gray-200 pt-4 dark:border-line ${formData.isPublic ? 'cursor-pointer' : 'opacity-60'}`}>
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">Make updates public</div>
                          <div className="text-xs text-gray-500 dark:text-muted">{formData.isPublic ? 'Let others see your updates and timeline. Turn off to keep both private.' : 'Updates and timeline are private while your goal is private.'}</div>
                        </div>
                        <span className="relative inline-flex shrink-0 items-center">
                          <input type="checkbox" name="isUpdatesPublic" checked={!!formData.isPublic && !!formData.isUpdatesPublic} disabled={!formData.isPublic} onChange={handleInputChange} className="sr-only peer" />
                          <span className="h-6 w-11 rounded-full transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-blue-400 peer-focus-visible:ring-offset-2" style={{ backgroundColor: formData.isPublic && formData.isUpdatesPublic ? THEME_COLOR : '#d1d5db' }} />
                          <span className="pointer-events-none absolute left-[2px] top-[2px] h-5 w-5 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5" />
                        </span>
                      </label>
                    </div>

                    {/* Sub-goals are temporarily hidden from the frontend.
                    <div>
                      <div className="mb-2 flex items-center justify-between">
                        <div><p className="text-sm font-medium text-gray-900 dark:text-white">Add Sub-goals <span className="font-normal text-gray-400">(optional)</span></p><p className="text-xs text-gray-500">Break the goal into smaller milestones.</p></div>
                        <button type="button" onClick={() => setFormData(prev => ({ ...prev, subGoals: [...prev.subGoals, { title: '', description: '' }] }))} className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-2 text-xs font-semibold text-[#1683ed] dark:bg-blue-950/40"><Plus className="h-3.5 w-3.5"/> Add</button>
                      </div>
                      <div className="space-y-2">{formData.subGoals.map((subGoal, index) => <div key={index} className="flex items-center gap-2"><input value={subGoal.title} onChange={(event) => setFormData(prev => ({ ...prev, subGoals: prev.subGoals.map((item, itemIndex) => itemIndex === index ? { ...item, title: event.target.value.slice(0, 100) } : item) }))} placeholder={`Sub-goal ${index + 1}`} className="min-w-0 flex-1 rounded-xl border-2 border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#1683ed] dark:border-line dark:bg-surface dark:text-white"/><button type="button" aria-label="Remove sub-goal" onClick={() => setFormData(prev => ({ ...prev, subGoals: prev.subGoals.filter((_, itemIndex) => itemIndex !== index) }))} className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-500"><Trash2 className="h-4 w-4"/></button></div>)}</div>
                    </div>
                    */}
                  </div>
                )}
              </div>
            </div>

            {/* Actions Footer */}
            <div className="bg-white dark:bg-canvas px-4 sm:px-8 py-4 sm:py-5 border-t border-slate-200 dark:border-line flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 px-5 border border-slate-300 dark:border-line bg-white text-slate-700 dark:bg-surface dark:text-muted rounded-xl hover:bg-slate-50 dark:hover:bg-elevated font-semibold transition-all text-sm"
                style={{ fontFamily: 'Manrope' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || (!editMode && !goalLimits.canCreate)}
                className="flex-1 py-3 px-5 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-sm transition-all hover:brightness-95 text-sm"
                style={{ backgroundColor: THEME_COLOR, fontFamily: 'Manrope' }}
              >
                {saving ? (editMode ? 'Updating…' : 'Creating…') : (!editMode && !goalLimits.canCreate ? 'Limit Reached' : (editMode ? 'Update' : 'Create'))}
              </button>
            </div>
          </form>
      </motion.div>
      </motion.div>
    </>
  )
}



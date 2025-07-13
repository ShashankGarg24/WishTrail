import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { X, Edit2, Target, Calendar, Tag, AlertCircle } from 'lucide-react'
import useApiStore from '../store/apiStore'

const EditWishModal = ({ isOpen, onClose, goal }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    priority: 'medium',
    duration: 'medium-term',
    targetDate: ''
  })
  const [errors, setErrors] = useState({})
  const { updateGoal, loading } = useApiStore()

  // Populate form with existing goal data when modal opens
  useEffect(() => {
    if (isOpen && goal) {
      // Format target date for HTML date input (YYYY-MM-DD)
      let formattedTargetDate = ''
      if (goal.targetDate) {
        const date = new Date(goal.targetDate)
        if (!isNaN(date.getTime())) {
          formattedTargetDate = date.toISOString().split('T')[0]
        }
      }

      // Ensure category is valid, default to 'Other' if not found
      const validCategory = categories.includes(goal.category) ? goal.category : 'Other'
      
      const newFormData = {
        title: goal.title || '',
        description: goal.description || '',
        category: validCategory,
        priority: goal.priority || 'medium',
        duration: goal.duration || 'medium-term',
        targetDate: formattedTargetDate
      }
      
      setFormData(newFormData)
      setErrors({})
    }
  }, [isOpen, goal])

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
    { value: 'high', label: 'High Priority', color: 'text-red-500' },
    { value: 'medium', label: 'Medium Priority', color: 'text-yellow-500' },
    { value: 'low', label: 'Low Priority', color: 'text-green-500' }
  ]

  const durations = [
    { value: 'short-term', label: 'Short-term', color: 'text-blue-500' },
    { value: 'medium-term', label: 'Medium-term', color: 'text-purple-500' },
    { value: 'long-term', label: 'Long-term', color: 'text-orange-500' }
  ]

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
  }

  const validateForm = () => {
    const newErrors = {}
    
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required'
    }
    
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required'
    }
    
    if (!formData.category) {
      newErrors.category = 'Category is required'
    }
    
    // Target date validation - for editing, allow keeping existing dates
    if (formData.targetDate) {
      const targetDate = new Date(formData.targetDate)
      const today = new Date()
      today.setHours(0, 0, 0, 0) // Reset time to start of day
      
      const creationDate = new Date(goal.createdAt);
      creationDate.setHours(0, 0, 0, 0);

      const minAllowedDate = new Date(creationDate);
      minAllowedDate.setDate(minAllowedDate.getDate() + 1);

      const existingTargetDate = goal.targetDate
      ? new Date(goal.targetDate).toISOString().split('T')[0]
      : '';
      
      // Only validate if setting a new future date
      if (targetDate < minAllowedDate && formData.targetDate !== existingTargetDate) {
        newErrors.targetDate = 'Target date must be at least 1 day after creation date';
      }
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    const updatedGoal = {
      title: formData.title.trim(),
      description: formData.description.trim(),
      category: formData.category,
      priority: formData.priority,
      duration: formData.duration,
      targetDate: formData.targetDate,
    }

    try {
      await updateGoal(goal._id, updatedGoal)
      onClose()
    } catch (error) {
      console.error('Failed to update goal:', error)
    }
  }

  const handleClose = () => {
    setFormData({
      title: '',
      description: '',
      category: '',
      priority: 'medium',
      duration: 'medium-term',
      targetDate: ''
    })
    setErrors({})
    onClose()
  }

  if (!isOpen || !goal) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4"
      onClick={handleClose}
      style={{ zIndex: 9999 }}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white dark:bg-gray-800 p-6 rounded-2xl max-w-md w-full max-h-[85vh] overflow-y-auto relative shadow-2xl border border-gray-200 dark:border-gray-700"
        onClick={(e) => e.stopPropagation()}
        style={{ zIndex: 10000 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <Edit2 className="h-6 w-6 text-primary-500" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Edit Goal
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Goal Title *
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 ${
                errors.title ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              }`}
              placeholder="Enter your goal title"
              required
            />
            {errors.title && (
              <div className="flex items-center mt-1 text-red-500 text-sm">
                <AlertCircle className="h-4 w-4 mr-1" />
                {errors.title}
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description *
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={3}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 ${
                errors.description ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              }`}
              placeholder="Describe your goal in detail"
              required
            />
            {errors.description && (
              <div className="flex items-center mt-1 text-red-500 text-sm">
                <AlertCircle className="h-4 w-4 mr-1" />
                {errors.description}
              </div>
            )}
          </div>

          {/* Category */}
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Category *
            </label>
            <select
              id="category"
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white ${
                errors.category ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              }`}
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
            <label htmlFor="priority" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Priority
            </label>
            <select
              id="priority"
              name="priority"
              value={formData.priority}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              {priorities.map(priority => (
                <option key={priority.value} value={priority.value}>
                  {priority.label}
                </option>
              ))}
            </select>
          </div>

          {/* Duration */}
          <div>
            <label htmlFor="duration" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Duration
            </label>
            <select
              id="duration"
              name="duration"
              value={formData.duration}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              {durations.map(duration => (
                <option key={duration.value} value={duration.value}>
                  {duration.label}
                </option>
              ))}
            </select>
          </div>

          {/* Target Date */}
          <div>
            <label htmlFor="targetDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Target Date (Optional)
            </label>
            <input
              type="date"
              id="targetDate"
              name="targetDate"
              value={formData.targetDate}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white ${
                errors.targetDate ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              }`}
            />
            {errors.targetDate && (
              <div className="flex items-center mt-1 text-red-500 text-sm">
                <AlertCircle className="h-4 w-4 mr-1" />
                {errors.targetDate}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 py-2 px-4 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2 px-4 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}

export default EditWishModal 
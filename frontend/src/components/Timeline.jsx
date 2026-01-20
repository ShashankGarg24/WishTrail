import { Target, CheckCircle, Award, PlusCircle, Link } from 'lucide-react'

const Timeline = ({ events = [] }) => {
  if (!events || events.length === 0) {
    return null
  }

  const getIcon = (iconType) => {
    switch (iconType) {
      case 'target':
        return Target
      case 'check-circle':
        return CheckCircle
      case 'award':
        return Award
      case 'plus-circle':
        return PlusCircle
      case 'link':
        return Link
      default:
        return Target
    }
  }

  const getColorClasses = (color) => {
    switch (color) {
      case 'blue':
        return {
          bg: 'bg-blue-100 dark:bg-blue-900/30',
          text: 'text-blue-600 dark:text-blue-400',
          line: 'bg-blue-200 dark:bg-blue-800'
        }
      case 'green':
        return {
          bg: 'bg-green-100 dark:bg-green-900/30',
          text: 'text-green-600 dark:text-green-400',
          line: 'bg-green-200 dark:bg-green-800'
        }
      case 'purple':
        return {
          bg: 'bg-purple-100 dark:bg-purple-900/30',
          text: 'text-purple-600 dark:text-purple-400',
          line: 'bg-purple-200 dark:bg-purple-800'
        }
      default:
        return {
          bg: 'bg-gray-100 dark:bg-gray-700',
          text: 'text-gray-600 dark:text-gray-400',
          line: 'bg-gray-200 dark:bg-gray-700'
        }
    }
  }

  const formatDate = (timestamp) => {
    const date = new Date(timestamp)
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    })
  }

  return (
    <div className="space-y-4">
      {events.map((event, index) => {
        const Icon = getIcon(event.icon)
        const colors = getColorClasses(event.color)
        const isLast = index === events.length - 1

        return (
          <div key={index} className="flex gap-3">
            {/* Icon and line */}
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full ${colors.bg} ${colors.text} flex items-center justify-center shrink-0`}>
                <Icon className="w-4 h-4" />
              </div>
              {!isLast && (
                <div className={`w-0.5 h-full min-h-[24px] mt-2 ${colors.line}`} />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 pb-6">
              <div className="flex items-start justify-between gap-2 mb-1">
                <h4 className="font-semibold text-gray-900 dark:text-white text-sm">
                  {event.title}
                </h4>
                <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  {formatDate(event.timestamp)}
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                {event.description}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default Timeline

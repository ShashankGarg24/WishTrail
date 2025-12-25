import { useState } from 'react';

/**
 * ExpandableText component - displays text with a "more/less" button for long content
 * @param {string} text - The text to display
 * @param {number} maxLength - Maximum character length before truncating (default: 150)
 * @param {string} className - Additional CSS classes to apply to the text
 */
export default function ExpandableText({ text, maxLength = 150, className = '' }) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!text) return null;

  const shouldTruncate = text.length > maxLength;

  if (!shouldTruncate) {
    return <p className={className}>{text}</p>;
  }

  const displayText = isExpanded ? text : text.slice(0, maxLength) + '...';

  return (
    <div>
      <p className={className}>
        {displayText}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="ml-2 text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium transition-colors inline-flex items-center"
          type="button"
        >
          {isExpanded ? 'less' : 'more'}
        </button>
      </p>
    </div>
  );
}

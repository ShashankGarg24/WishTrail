import { Link } from 'react-router-dom'
import { X } from 'lucide-react'

export default function PromotionCard({ promotion, onDismiss, preview = false }) {
  if (!promotion) return null
  return (
    <article aria-label="WishTrail announcement" className="relative rounded-2xl border border-blue-100 bg-blue-50/60 p-5 text-slate-900 dark:border-blue-900 dark:bg-blue-950/30 dark:text-white">
      {onDismiss && <button type="button" aria-label="Dismiss promotion" onClick={onDismiss} className="absolute right-2 top-2 rounded-lg p-2 text-slate-500 hover:bg-blue-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 dark:text-muted dark:hover:bg-blue-900"><X className="h-4 w-4" aria-hidden="true" /></button>}
      <div className={onDismiss ? 'pr-7' : ''}>
        <h2 className="break-words text-lg font-bold">{promotion.title}</h2>
        {promotion.subtitle && <p className="mt-1 break-words text-sm text-slate-600 dark:text-muted">{promotion.subtitle}</p>}
        {promotion.offerCopy && <p className="mt-3 break-words text-sm font-semibold">{promotion.offerCopy}</p>}
        {promotion.ctaLabel && promotion.ctaUrl && (
          <Link to={promotion.ctaUrl} onClick={preview ? event => event.preventDefault() : undefined} className="mt-4 inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold !text-white hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
            {promotion.ctaLabel}
          </Link>
        )}
      </div>
    </article>
  )
}

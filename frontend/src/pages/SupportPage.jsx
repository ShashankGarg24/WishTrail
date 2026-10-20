import { ChevronDown, LifeBuoy, Mail, MessageSquareText, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'

const faqs = [
  {
    question: 'How do I reset my password?',
    answer: 'Open the sign-in page, choose Forgot password, and enter the email connected to your WishTrail account. We will send you a secure reset link.',
  },
  {
    question: 'Where can I manage notifications?',
    answer: 'Sign in and open Settings, then choose Push Notifications or Email Notifications. You can update each channel independently.',
  },
  {
    question: 'How do I report a problem or inappropriate content?',
    answer: 'Email our support team with a short description, the affected username or page, and a screenshot when possible. Please do not include your password or other sensitive information.',
  },
  {
    question: 'Can I request access to or deletion of my data?',
    answer: 'Yes. Contact us from the email address associated with your account and tell us whether you want a copy of your data or account deletion. We may ask you to verify ownership.',
  },
]

const SupportPage = () => {
  const openFeedback = () => {
    window.dispatchEvent(new CustomEvent('wt_open_feedback'))
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900 dark:bg-canvas dark:text-white sm:px-6 sm:py-16">
      <main className="mx-auto max-w-5xl">
        <section className="overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-sm dark:border-line dark:bg-canvas">
          <div className="bg-gradient-to-br from-blue-50 via-white to-cyan-50 px-6 py-12 text-center dark:from-blue-950/40 dark:via-canvas dark:to-cyan-950/30 sm:px-12 sm:py-16">
            <span className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#4c99e6] text-white shadow-lg shadow-blue-200/70 dark:shadow-none">
              <LifeBuoy className="h-7 w-7" aria-hidden="true" />
            </span>
            <p className="mb-3 text-sm font-bold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-300">WishTrail Support</p>
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-5xl">How can we help?</h1>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-600 dark:text-muted">
              Find quick answers below or reach our team for help with your account, goals, habits, or community experience.
            </p>
          </div>

          <div className="grid gap-5 px-6 py-8 sm:grid-cols-2 sm:px-10 sm:py-10">
            <a
              href="mailto:support@wishtrail.in?subject=WishTrail%20Support%20Request"
              className="group rounded-2xl border border-slate-200 p-6 transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md dark:border-line dark:hover:border-blue-600"
            >
              <Mail className="mb-4 h-6 w-6 text-[#4c99e6]" aria-hidden="true" />
              <h2 className="text-lg font-bold">Email support</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-muted">For account help, technical issues, safety concerns, or data requests.</p>
              <span className="mt-4 inline-block text-sm font-bold text-blue-600 group-hover:text-blue-700 dark:text-blue-300">support@wishtrail.in</span>
            </a>

            <button
              type="button"
              onClick={openFeedback}
              className="group rounded-2xl border border-slate-200 p-6 text-left transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md dark:border-line dark:hover:border-blue-600"
            >
              <MessageSquareText className="mb-4 h-6 w-6 text-[#4c99e6]" aria-hidden="true" />
              <h2 className="text-lg font-bold">Share feedback</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-muted">Tell us what is working, what feels confusing, or what you would like us to build next.</p>
              <span className="mt-4 inline-block text-sm font-bold text-blue-600 group-hover:text-blue-700 dark:text-blue-300">Open feedback form</span>
            </button>
          </div>
        </section>

        <section className="mt-10" aria-labelledby="support-faq-heading">
          <div className="mb-5 flex items-center gap-3">
            <ShieldCheck className="h-6 w-6 text-[#4c99e6]" aria-hidden="true" />
            <h2 id="support-faq-heading" className="text-2xl font-extrabold">Frequently asked questions</h2>
          </div>
          <div className="space-y-3">
            {faqs.map(({ question, answer }) => (
              <details key={question} className="group rounded-2xl border border-slate-200 bg-white dark:border-line dark:bg-canvas">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-5 font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 sm:px-6">
                  {question}
                  <ChevronDown className="h-5 w-5 shrink-0 text-slate-400 transition group-open:rotate-180" aria-hidden="true" />
                </summary>
                <p className="px-5 pb-5 pr-12 text-sm leading-7 text-slate-600 dark:text-muted sm:px-6 sm:pb-6 sm:pr-16">{answer}</p>
              </details>
            ))}
          </div>
        </section>

        <aside className="mt-10 rounded-2xl bg-blue-50 p-6 text-sm leading-6 text-slate-700 dark:bg-blue-950/30 dark:text-muted">
          <strong className="block text-slate-900 dark:text-white">Help us resolve your issue faster</strong>
          Include your WishTrail username, what you were trying to do, the device or browser you used, and any error message. Never send your password. For community standards, read our{' '}
          <Link to="/community-guidelines" className="font-bold text-blue-700 hover:underline dark:text-blue-300">Community Guidelines</Link>.
        </aside>
      </main>
    </div>
  )
}

export default SupportPage

export default function StartupSkeleton() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-gray-900 px-6 py-8" role="status" aria-label="Preparing your workspace">
      <div className="mx-auto max-w-5xl space-y-6" aria-hidden="true">
        <div className="h-8 w-44 rounded-lg bg-slate-200 dark:bg-gray-800" />
        <div className="h-4 w-64 max-w-full rounded bg-slate-200 dark:bg-gray-800" />
        <div className="grid grid-cols-2 gap-4">
          {[0, 1].map(key => <div key={key} className="h-28 rounded-2xl bg-slate-200/60 dark:bg-gray-800" />)}
        </div>
        {[0, 1, 2].map(key => <div key={key} className="h-28 rounded-2xl bg-slate-200/60 dark:bg-gray-800" />)}
      </div>
    </div>
  );
}

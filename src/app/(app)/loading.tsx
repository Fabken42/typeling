// Streamed instantly as the Suspense fallback while the page's server data
// loads (on navigation and on a cold reload), so the user sees structure right
// away instead of a blank screen.
export default function Loading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-8 w-48 rounded-lg bg-surface-2" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-32 rounded-2xl border border-border bg-surface"
          />
        ))}
      </div>
    </div>
  )
}

// Mirrors the PlayClient layout (context bar + centred typing area) so a cold
// reload of the game paints a stable skeleton immediately instead of a blank
// page while the document loads from the server.
export default function Loading() {
  return (
    <div className="flex min-h-[calc(100dvh-3.5rem)] flex-col">
      <div className="border-b border-border px-4 py-2.5">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <div className="h-4 w-40 animate-pulse rounded bg-surface-2" />
          <div className="ml-2 h-2 flex-1 animate-pulse rounded bg-surface-2" />
          <div className="h-3 w-24 animate-pulse rounded bg-surface-2" />
        </div>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-4 py-10">
        <div className="h-6 w-3/4 max-w-xl animate-pulse rounded bg-surface-2" />
        <div className="h-6 w-2/3 max-w-lg animate-pulse rounded bg-surface-2" />
      </div>
    </div>
  )
}

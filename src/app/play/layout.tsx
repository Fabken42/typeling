import { AppHeader } from '@/components/AppHeader'

// The game shares the global header so the app nav is always reachable (spec 17
// updated: header always visible). The session is enforced by the page itself
// (which also reads the user's data) and by the middleware cookie check; the
// header renders null if there is no session, so no redirect is duplicated here.
export default function PlayLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen">
      <AppHeader />
      {children}
    </div>
  )
}

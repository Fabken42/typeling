// The game page is minimalist (spec 17): its own thin header, no app shell nav.
// The session is enforced by the page (which also reads the user's data) and by
// the middleware cookie check, so this layout is just a wrapper — avoiding a
// second per-request session lookup here.
export default function PlayLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <div className="min-h-screen">{children}</div>
}

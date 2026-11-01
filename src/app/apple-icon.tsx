import { ImageResponse } from 'next/og'

// iOS ignores the web manifest icons for the home-screen shortcut and uses the
// apple-touch-icon instead, which must be a raster image. Generate a 180×180 PNG
// matching the "T" logo so an installed/pinned Typeling looks right on iOS.
export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#059669',
          color: '#ffffff',
          fontSize: 120,
          fontWeight: 700,
        }}
      >
        T
      </div>
    ),
    { ...size },
  )
}

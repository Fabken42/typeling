import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ToastProvider } from '@/components/ui/Toast'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'Typeling',
  description: 'Estude idiomas digitando legendas, letras e textos.',
}

export const viewport: Viewport = {
  themeColor: '#09090b',
}

// Applied before hydration to avoid a theme flash. Reads the persisted theme
// ('dark' | 'light' | 'system'); the settings store keeps it in sync.
const themeScript = `
(function() {
  try {
    var t = localStorage.getItem('typeling-theme') || 'dark';
    var sysLight = window.matchMedia('(prefers-color-scheme: light)').matches;
    var light = t === 'light' || (t === 'system' && sysLight);
    document.documentElement.classList.toggle('light', light);
  } catch (e) {}
})();
`

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <link
          rel="preconnect"
          href="https://fonts.googleapis.com"
        />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  )
}

import type { Metadata } from 'next'
import { JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { GraphBridgeProvider } from '@/components/GraphBridge'
import { Minimap } from '@/components/Minimap'
import { Terminal } from '@/components/Terminal'

// Mono-forward type (CLAUDE.md). Loaded here and mapped to --font-jetbrains-mono,
// which app/globals.css feeds into the --font-mono token.
const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  // Absolute base for OG/twitter image URLs. On Vercel the production domain is
  // injected; locally it falls back to localhost so previews still resolve.
  metadataBase: process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? new URL(`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`)
    : new URL('http://localhost:3000'),
  title: 'Portfolio — explorable work graph',
  description:
    'A CS/DSCI portfolio presented as a navigable force-directed network of projects.',
  twitter: { card: 'summary_large_image' },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={jetbrainsMono.variable}>
      <body>
        <GraphBridgeProvider>
          {children}
          <Minimap />
          <Terminal />
        </GraphBridgeProvider>
      </body>
    </html>
  )
}

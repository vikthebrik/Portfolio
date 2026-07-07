import type { Metadata } from 'next'
import { JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { GraphBridgeProvider } from '@/components/GraphBridge'
import { Minimap } from '@/components/Minimap'

// Mono-forward type (CLAUDE.md). Loaded here and mapped to --font-jetbrains-mono,
// which app/globals.css feeds into the --font-mono token.
const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Portfolio — explorable work graph',
  description:
    'A CS/DSCI portfolio presented as a navigable force-directed network of projects.',
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
        </GraphBridgeProvider>
      </body>
    </html>
  )
}

import type { Metadata, Viewport } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/toaster'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' })

export const metadata: Metadata = {
  title: {
    default: 'TRION Protocol — Behavioral Truth Infrastructure',
    template: '%s · TRION Protocol',
  },
  description:
    'The verification layer for the age of synthetic everything. Five-plane behavioral coherence: C(t) = α·Φ + β·M + γ·Σ + δ·K + ε·A ≥ Θ(t). Zero-bridge BTCP across 101 chains and 16 VM families.',
  keywords: ['TRION', 'BTCP', 'behavioral coherence', 'zero-bridge', 'oracle', 'DW-BFT', 'Akashic Index'],
  openGraph: {
    title: 'TRION Protocol — Behavioral Truth Infrastructure',
    description: 'Truth emits only when all five planes of reality are coherent. When any plane fails: silence.',
    type: 'website',
  },
}

export const viewport: Viewport = {
  themeColor: '#0a0a0b',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${mono.variable} font-sans antialiased bg-zinc-950 text-zinc-100`}>
        {children}
        <Toaster />
      </body>
    </html>
  )
}

import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'BoomBank - Minesweeper Betting Game',
  description: 'Advanced minesweeper betting game with OTP authentication and mind-reading algorithms',
  keywords: ['minesweeper', 'betting', 'game', 'otp', 'gambling'],
  authors: [{ name: 'BoomBank Team' }],
  viewport: 'width=device-width, initial-scale=1',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="theme-color" content="#0f172a" />
      </head>
      <body>
        {children}
      </body>
    </html>
  )
}

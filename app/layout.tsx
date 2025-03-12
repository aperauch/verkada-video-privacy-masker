import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Verkada Video Privacy Masker',
  description: 'Created with l0Ve.'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

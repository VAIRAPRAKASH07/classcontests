import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'ClassCode Tracker — Institutional Coding Profile Aggregator',
  description: 'Private competitive programming profile aggregator & analytics platform for academic institutions.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark h-full bg-slate-950">
      <body className={`${inter.className} min-h-full bg-slate-950 text-slate-100 antialiased`}>
        {children}
      </body>
    </html>
  )
}

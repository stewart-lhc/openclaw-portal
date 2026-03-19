'use client'

import { useState } from 'react'
import { NodeList } from '@/components/node-list'
import { Button } from '@/components/ui/button'
import { t, type Locale } from '@/lib/i18n'

export default function Home() {
  const [locale, setLocale] = useState<Locale>('en')
  const m = t(locale)

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto flex items-center justify-between gap-4 px-4 py-6">
          <div>
            <h1 className="text-2xl font-bold">{m.title}</h1>
            <p className="text-muted-foreground">{m.subtitle}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setLocale(locale === 'en' ? 'zh' : 'en')}>
            {m.language}
          </Button>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">
        <NodeList locale={locale} />
      </main>
    </div>
  )
}

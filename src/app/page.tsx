import { NodeList } from '@/components/node-list'

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto py-6 px-4">
          <h1 className="text-2xl font-bold">OpenClaw Portal</h1>
          <p className="text-muted-foreground">Manage your OpenClaw dashboards</p>
        </div>
      </header>
      <main className="container mx-auto py-8 px-4">
        <NodeList />
      </main>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { AlertCircle, ArrowRight, FileText, GitBranch, Layers } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { LogoMark } from '@/components/layout/Logo'
import { cn } from '@/lib/utils'

/** Demo accounts created by `npm run demo:reset` (password "demo"). */
const DEMO_ACCOUNTS = [
  { email: 'anna.berg@nexus.demo', name: 'Anna Berg', role: 'Registers deviations' },
  { email: 'erik.lund@nexus.demo', name: 'Erik Lund', role: 'Deviation leader' },
  { email: 'sara.nilsson@nexus.demo', name: 'Sara Nilsson', role: 'QA assessor' },
  { email: 'admin@nexus.demo', name: 'Demo Admin', role: 'Configures Nexus' },
]

export function LoginForm({ demo }: { demo: boolean }) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function submit(e?: React.FormEvent, creds = { email, password }) {
    e?.preventDefault()
    setLoading(true)
    setError('')
    const result = await signIn('credentials', { ...creds, redirect: false })
    setLoading(false)
    if (result?.error) return setError('Wrong email or password.')
    router.push('/')
    router.refresh()
  }

  return (
    <div className="grid min-h-screen bg-paper lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-rail p-12 text-white lg:flex">
        <div className="flex items-center gap-3">
          <LogoMark size={36} />
          <span className="font-display text-lg font-semibold tracking-tight">Nexus</span>
        </div>
        <div className="max-w-md space-y-6">
          <h1 className="font-display text-4xl font-semibold leading-tight tracking-tight">
            One place for documents, processes and cases.
          </h1>
          <ul className="space-y-3 text-sm text-white/70">
            <li className="flex items-center gap-3"><FileText size={16} className="text-nw-accent" /> Controlled documents with approvals and read receipts</li>
            <li className="flex items-center gap-3"><GitBranch size={16} className="text-nw-accent" /> Process maps that link to what you actually do</li>
            <li className="flex items-center gap-3"><Layers size={16} className="text-nw-accent" /> Deviations, CAPA and changes with roles, rules and e-signatures</li>
          </ul>
        </div>
        <p className="mono-meta text-white/40">Governance platform · demo</p>
      </aside>

      <main className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-8">
          <div className="space-y-2">
            <div className="lg:hidden"><LogoMark size={36} /></div>
            <h2 className="font-display text-2xl font-semibold text-ink">Sign in</h2>
            <p className="text-sm text-ink-3">Welcome back. Sign in with your work account.</p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-[13px] font-medium text-ink-2">Email</label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" autoComplete="email" required />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="password" className="text-[13px] font-medium text-ink-2">Password</label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
            </div>
            {error && (
              <p role="alert" className="flex items-center gap-2 rounded-[2px] border border-risk-line bg-risk-tint px-3 py-2 text-sm text-risk-ink">
                <AlertCircle size={14} className="shrink-0" /> {error}
              </p>
            )}
            <Button type="submit" className="h-10 w-full" disabled={loading || !email || !password}>
              {loading ? 'Signing in…' : 'Sign in'} {!loading && <ArrowRight size={14} />}
            </Button>
          </form>

          {demo && (
            <div className="space-y-2">
              <p className="mono-meta">Demo accounts · password “demo”</p>
              <div className="grid gap-1.5">
                {DEMO_ACCOUNTS.map((a) => (
                  <button
                    key={a.email}
                    type="button"
                    disabled={loading}
                    onClick={() => {
                      setEmail(a.email)
                      setPassword('demo')
                      submit(undefined, { email: a.email, password: 'demo' })
                    }}
                    className={cn(
                      'flex items-center justify-between rounded-[2px] border border-rule bg-surface px-3 py-2 text-left text-sm hover:border-nw-accent',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nw-accent'
                    )}
                  >
                    <span className="font-medium text-ink">{a.name}</span>
                    <span className="text-xs text-ink-4">{a.role}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

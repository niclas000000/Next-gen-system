import { prisma } from '@/lib/db/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { FileText, Clock, CheckCircle, GitBranch, ArrowRight, Plus, FileClock, FileCheck, FileX } from 'lucide-react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDistanceToNow } from 'date-fns'

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  const userName = (session?.user as { name?: string } | undefined)?.name ?? 'there'
  const firstName = userName.split(' ')[0].replace(/^\w/, (c) => c.toUpperCase())
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  const [
    activeCases,
    publishedWorkflows,
    completedToday,
    totalDocuments,
    publishedDocuments,
    activeProcesses,
    recentInstances,
    recentDocuments,
  ] = await Promise.all([
    prisma.workflowInstance.count({ where: { status: 'running' } }),
    prisma.workflow.count({ where: { status: 'published' } }),
    prisma.workflowInstance.count({
      where: {
        status: 'completed',
        completedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      },
    }),
    prisma.document.count(),
    prisma.document.count({ where: { status: 'published' } }),
    prisma.process.count({ where: { status: 'active' } }),
    prisma.workflowInstance.findMany({
      where: { status: { in: ['running', 'completed', 'cancelled'] } },
      orderBy: { createdAt: 'desc' },
      take: 6,
      include: {
        workflow: { select: { name: true } },
        steps: { where: { status: 'in_progress' }, take: 1 },
      },
    }),
    prisma.document.findMany({
      orderBy: { updatedAt: 'desc' },
      take: 5,
      include: { author: { select: { name: true } } },
    }),
  ])

  const stats = [
    { label: 'Active Cases',        value: activeCases,        sub: `${activeCases} running`,      icon: <Clock size={18} />,     color: 'var(--warn)' },
    { label: 'Completed Today',      value: completedToday,     sub: 'finished today',              icon: <CheckCircle size={18} />, color: 'var(--ok)' },
    { label: 'Published Workflows',  value: publishedWorkflows, sub: 'available to start',          icon: <GitBranch size={18} />, color: 'var(--nw-accent)' },
    { label: 'Documents',            value: totalDocuments,     sub: `${publishedDocuments} published`, icon: <FileText size={18} />, color: 'var(--ink-3)' },
    { label: 'Active Processes',     value: activeProcesses,    sub: 'in management system',        icon: <GitBranch size={18} />, color: 'var(--nw-accent)' },
  ]

  const caseStatusVariant: Record<string, 'warn' | 'ok' | 'default'> = {
    running: 'warn', completed: 'ok', cancelled: 'default',
  }
  const caseStatusLabel: Record<string, string> = {
    running: 'Running', completed: 'Completed', cancelled: 'Cancelled',
  }

  const docStatusVariant: Record<string, 'ok' | 'default'> = {
    draft: 'default', published: 'ok', archived: 'default',
  }
  const docStatusIcon: Record<string, React.ReactNode> = {
    draft: <FileClock size={10} />, published: <FileCheck size={10} />, archived: <FileX size={10} />,
  }
  const docStatusLabel: Record<string, string> = {
    draft: 'Draft', published: 'Published', archived: 'Archived',
  }

  const quickActions = [
    { label: 'Browse Workflows', href: '/design/workflows', icon: <GitBranch size={16} /> },
    { label: 'All Cases',        href: '/cases',            icon: <Clock size={16} /> },
    { label: 'Documents',        href: '/documents',        icon: <FileText size={16} /> },
    { label: 'Manage Users',     href: '/admin/users',      icon: <Plus size={16} /> },
  ]

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--ink)' }}>{greeting}, {firstName}</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--ink-4)' }}>Here&apos;s what&apos;s going on today.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs" style={{ color: 'var(--ink-4)' }}>{stat.label}</p>
                  <p className="text-3xl font-semibold mt-1" style={{ fontFamily: 'var(--font-display)', color: 'var(--ink)' }}>{stat.value}</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--ink-4)' }}>{stat.sub}</p>
                </div>
                <span style={{ color: stat.color }}>{stat.icon}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Recent cases */}
        <Card className="xl:col-span-2">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold">Recent Cases</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/cases" className="flex items-center gap-1 text-sm" style={{ color: 'var(--nw-accent)' }}>
                See all <ArrowRight size={14} />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentInstances.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm" style={{ color: 'var(--ink-4)' }}>No cases yet.</p>
                <Button variant="outline" size="sm" className="mt-3" asChild>
                  <Link href="/design/workflows">Start from a workflow</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-0.5">
                {recentInstances.map((inst) => {
                  const currentStep = inst.steps[0]?.stepName
                  return (
                    <Link
                      key={inst.id}
                      href={`/workflows/instances/${inst.id}`}
                      className="flex items-center gap-4 px-3 py-2.5 rounded-[2px] transition-colors group hover:bg-[var(--paper-2)]"
                      style={{ color: 'var(--ink)' }}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: 'var(--ink)' }}>{inst.title}</p>
                        <p className="text-xs truncate mt-0.5" style={{ color: 'var(--ink-4)' }}>
                          {inst.workflow.name}{currentStep && ` · ${currentStep}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="w-[90px] flex justify-end">
                          <Badge variant={caseStatusVariant[inst.status] ?? 'default'} className="text-xs">
                            {caseStatusLabel[inst.status] ?? inst.status}
                          </Badge>
                        </div>
                        <span className="text-xs hidden sm:block w-28 text-right" style={{ color: 'var(--ink-4)' }}>
                          {formatDistanceToNow(new Date(inst.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right column */}
        <div className="space-y-6">
          {/* Quick actions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {quickActions.map((action) => (
                <Button key={action.label} variant="outline" className="w-full justify-start gap-2 text-sm h-9" asChild>
                  <Link href={action.href}>
                    {action.icon}
                    {action.label}
                  </Link>
                </Button>
              ))}
            </CardContent>
          </Card>

          {/* Recent documents */}
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold">Recent Documents</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/documents" className="flex items-center gap-1 text-sm" style={{ color: 'var(--nw-accent)' }}>
                  See all <ArrowRight size={14} />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {recentDocuments.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-sm" style={{ color: 'var(--ink-4)' }}>No documents yet.</p>
                  <Button variant="outline" size="sm" className="mt-3" asChild>
                    <Link href="/documents">Create one</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-0.5">
                  {recentDocuments.map((doc) => {
                    const variant = docStatusVariant[doc.status] ?? 'default'
                    const icon = docStatusIcon[doc.status]
                    const label = docStatusLabel[doc.status] ?? doc.status
                    return (
                      <Link
                        key={doc.id}
                        href="/documents"
                        className="flex items-center gap-3 px-2 py-2 rounded-[2px] transition-colors group hover:bg-[var(--paper-2)]"
                      >
                        <FileText size={14} className="shrink-0" style={{ color: 'var(--ink-4)' }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate" style={{ color: 'var(--ink)' }}>{doc.title}</p>
                          <p className="text-xs truncate" style={{ color: 'var(--ink-4)' }}>
                            {doc.author.name} · {formatDistanceToNow(new Date(doc.updatedAt), { addSuffix: true })}
                          </p>
                        </div>
                        <Badge variant={variant} className="text-[10px] flex items-center gap-1 shrink-0">
                          {icon}{label}
                        </Badge>
                      </Link>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

import { prisma } from '@/lib/db/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { FileText, Clock, CheckCircle, GitBranch, ArrowRight, Plus, FileClock, FileCheck, FileX, Target } from 'lucide-react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDistanceToNow } from 'date-fns'

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  const userName = (session?.user as { name?: string } | undefined)?.name ?? 'there'
  const firstName = userName.split(' ')[0]

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
    {
      label: 'Active Cases',
      value: activeCases,
      sub: activeCases === 1 ? '1 case running' : `${activeCases} cases running`,
      icon: <Clock className="text-blue-600" size={20} />,
      bg: 'bg-blue-50',
    },
    {
      label: 'Completed Today',
      value: completedToday,
      sub: 'cases finished today',
      icon: <CheckCircle className="text-green-600" size={20} />,
      bg: 'bg-green-50',
    },
    {
      label: 'Published Workflows',
      value: publishedWorkflows,
      sub: 'available to start',
      icon: <GitBranch className="text-purple-600" size={20} />,
      bg: 'bg-purple-50',
    },
    {
      label: 'Documents',
      value: totalDocuments,
      sub: `${publishedDocuments} published`,
      icon: <FileText className="text-orange-600" size={20} />,
      bg: 'bg-orange-50',
    },
    {
      label: 'Active Processes',
      value: activeProcesses,
      sub: 'in the management system',
      icon: <GitBranch className="text-teal-600" size={20} />,
      bg: 'bg-teal-50',
    },
  ]

  const caseStatusConfig: Record<string, { label: string; class: string }> = {
    running:   { label: 'Running',   class: 'bg-blue-100 text-blue-700 border-blue-200' },
    completed: { label: 'Completed', class: 'bg-green-100 text-green-700 border-green-200' },
    cancelled: { label: 'Cancelled', class: 'bg-slate-100 text-slate-600 border-slate-200' },
  }

  const docStatusConfig: Record<string, { label: string; class: string; icon: React.ReactNode }> = {
    draft:     { label: 'Draft',     class: 'bg-slate-100 text-slate-600 border-slate-200',    icon: <FileClock size={10} /> },
    published: { label: 'Published', class: 'bg-green-100 text-green-700 border-green-200',    icon: <FileCheck size={10} /> },
    archived:  { label: 'Archived',  class: 'bg-orange-100 text-orange-700 border-orange-200', icon: <FileX size={10} /> },
  }

  const quickActions = [
    { label: 'Browse Workflows', href: '/workflows/design',    icon: <GitBranch size={16} /> },
    { label: 'View All Cases',   href: '/workflows/instances', icon: <Clock size={16} /> },
    { label: 'Documents',        href: '/documents',           icon: <FileText size={16} /> },
    { label: 'Manage Users',     href: '/admin/users',         icon: <Plus size={16} /> },
  ]

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Good morning, {firstName}</h1>
        <p className="text-sm text-slate-500 mt-1">Here&apos;s what&apos;s going on today.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-slate-500">{stat.label}</p>
                  <p className="text-3xl font-semibold text-slate-900 mt-1">{stat.value}</p>
                  <p className="text-xs text-slate-400 mt-1">{stat.sub}</p>
                </div>
                <div className={`p-2.5 rounded-lg ${stat.bg} shrink-0`}>{stat.icon}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Recent cases */}
        <Card className="xl:col-span-2 shadow-sm">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold">Recent Cases</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/workflows/instances" className="text-blue-600 hover:text-blue-700 flex items-center gap-1 text-sm">
                See all <ArrowRight size={14} />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentInstances.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-slate-400">No cases yet.</p>
                <Button variant="outline" size="sm" className="mt-3" asChild>
                  <Link href="/workflows/design">Start from a workflow</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-1">
                {recentInstances.map((inst) => {
                  const cfg = caseStatusConfig[inst.status]
                  const currentStep = inst.steps[0]?.stepName
                  return (
                    <Link
                      key={inst.id}
                      href={`/workflows/instances/${inst.id}`}
                      className="flex items-center gap-4 px-3 py-2.5 rounded-lg hover:bg-slate-50 transition-colors group"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate group-hover:text-blue-600 transition-colors">
                          {inst.title}
                        </p>
                        <p className="text-xs text-slate-500 truncate mt-0.5">
                          {inst.workflow.name}
                          {currentStep && ` · ${currentStep}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {cfg && (
                          <Badge variant="outline" className={`text-xs ${cfg.class}`}>
                            {cfg.label}
                          </Badge>
                        )}
                        <span className="text-xs text-slate-400 hidden sm:block">
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
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {quickActions.map((action) => (
                <Button key={action.label} variant="outline" className="w-full justify-start gap-2 text-sm h-10" asChild>
                  <Link href={action.href}>
                    {action.icon}
                    {action.label}
                  </Link>
                </Button>
              ))}
            </CardContent>
          </Card>

          {/* Recent documents */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold">Recent Documents</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/documents" className="text-blue-600 hover:text-blue-700 flex items-center gap-1 text-sm">
                  See all <ArrowRight size={14} />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {recentDocuments.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-sm text-slate-400">No documents yet.</p>
                  <Button variant="outline" size="sm" className="mt-3" asChild>
                    <Link href="/documents">Create one</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-1">
                  {recentDocuments.map((doc) => {
                    const cfg = docStatusConfig[doc.status] ?? docStatusConfig.draft
                    return (
                      <Link
                        key={doc.id}
                        href="/documents"
                        className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-slate-50 transition-colors group"
                      >
                        <FileText size={14} className="text-slate-400 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-700 truncate group-hover:text-blue-600 transition-colors">
                            {doc.title}
                          </p>
                          <p className="text-xs text-slate-400 truncate">
                            {doc.author.name} · {formatDistanceToNow(new Date(doc.updatedAt), { addSuffix: true })}
                          </p>
                        </div>
                        <Badge variant="outline" className={`text-[10px] flex items-center gap-1 shrink-0 ${cfg.class}`}>
                          {cfg.icon}{cfg.label}
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

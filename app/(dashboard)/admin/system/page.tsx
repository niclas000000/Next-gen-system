import { prisma } from '@/lib/db/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users, Workflow, FileText, Activity, CheckCircle2, Clock, XCircle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

export default async function AdminSystemPage() {
  const [userCount, workflowCount, instanceStats, recentInstances] = await Promise.all([
    prisma.user.count({ where: { id: { not: 'system-placeholder-user' }, active: true } }),
    prisma.workflow.count({ where: { status: 'published' } }),
    prisma.workflowInstance.groupBy({ by: ['status'], _count: { status: true } }),
    prisma.workflowInstance.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: { workflow: { select: { name: true } } },
    }),
  ])

  const statusMap = Object.fromEntries(instanceStats.map((s) => [s.status, s._count.status]))
  const totalInstances = instanceStats.reduce((a, s) => a + s._count.status, 0)

  const statusVariant: Record<string, 'warn' | 'ok' | 'default'> = {
    running: 'warn', completed: 'ok', cancelled: 'default',
  }
  const statusLabel: Record<string, string> = {
    running: 'Running', completed: 'Completed', cancelled: 'Cancelled',
  }
  const statusIcon: Record<string, React.ReactNode> = {
    running: <Clock size={11} />, completed: <CheckCircle2 size={11} />, cancelled: <XCircle size={11} />,
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--ink)' }}>System</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--ink-4)' }}>Platform overview and health.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Active users',        value: userCount,                 icon: <Users size={18} style={{ color: 'var(--nw-accent)' }} /> },
          { label: 'Published workflows', value: workflowCount,             icon: <Workflow size={18} style={{ color: 'var(--nw-accent)' }} /> },
          { label: 'Total cases',         value: totalInstances,            icon: <FileText size={18} style={{ color: 'var(--ink-3)' }} /> },
          { label: 'Running cases',       value: statusMap['running'] ?? 0, icon: <Activity size={18} style={{ color: 'var(--ok)' }} /> },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2.5 rounded-[2px] shrink-0" style={{ background: 'var(--paper-3)' }}>{stat.icon}</div>
              <div>
                <p className="text-2xl font-semibold" style={{ color: 'var(--ink)' }}>{stat.value}</p>
                <p className="text-xs" style={{ color: 'var(--ink-4)' }}>{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Instance breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {(Object.keys(statusVariant) as Array<keyof typeof statusVariant>).map((status) => (
          <Card key={status}>
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant={statusVariant[status]} className="text-xs flex items-center gap-1">
                  {statusIcon[status]}
                  {statusLabel[status]}
                </Badge>
              </div>
              <span className="text-2xl font-semibold" style={{ color: 'var(--ink)' }}>{statusMap[status] ?? 0}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent activity */}
      <Card>
        <CardHeader className="pb-3" style={{ borderBottom: '1px solid var(--rule)' }}>
          <CardTitle className="text-sm font-semibold" style={{ color: 'var(--ink-3)' }}>Recent Cases</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {recentInstances.length === 0 ? (
            <p className="text-sm text-center py-8" style={{ color: 'var(--ink-4)' }}>No cases yet.</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--rule)' }}>
                  <th className="text-left text-xs font-medium px-5 py-3" style={{ color: 'var(--ink-4)' }}>Case</th>
                  <th className="text-left text-xs font-medium px-4 py-3" style={{ color: 'var(--ink-4)' }}>Workflow</th>
                  <th className="text-left text-xs font-medium px-4 py-3" style={{ color: 'var(--ink-4)' }}>Status</th>
                  <th className="text-left text-xs font-medium px-4 py-3 hidden md:table-cell" style={{ color: 'var(--ink-4)' }}>Started</th>
                </tr>
              </thead>
              <tbody>
                {recentInstances.map((inst) => (
                  <tr key={inst.id} className="hover:bg-[var(--paper-2)] transition-colors" style={{ borderBottom: '1px solid var(--rule)' }}>
                    <td className="px-5 py-3 text-sm font-medium truncate max-w-[200px]" style={{ color: 'var(--ink)' }}>{inst.title}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--ink-4)' }}>{inst.workflow.name}</td>
                    <td className="px-4 py-3">
                      <Badge variant={statusVariant[inst.status] ?? 'default'} className="text-xs flex items-center gap-1 w-fit">
                        {statusIcon[inst.status]}
                        {statusLabel[inst.status] ?? inst.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-xs hidden md:table-cell" style={{ color: 'var(--ink-4)' }}>
                      {formatDistanceToNow(new Date(inst.createdAt), { addSuffix: true })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Environment info */}
      <Card>
        <CardHeader className="pb-3" style={{ borderBottom: '1px solid var(--rule)' }}>
          <CardTitle className="text-sm font-semibold" style={{ color: 'var(--ink-3)' }}>Environment</CardTitle>
        </CardHeader>
        <CardContent className="p-5">
          <div className="space-y-2">
            {[
              ['Platform', 'Nexus v0.1.0'],
              ['Framework', 'Next.js 16 (App Router)'],
              ['Database', 'PostgreSQL (Prisma)'],
              ['Environment', process.env.NODE_ENV ?? 'development'],
            ].map(([label, value]) => (
              <div key={label} className="flex gap-4 text-sm">
                <span className="font-medium w-32 shrink-0" style={{ color: 'var(--ink-4)' }}>{label}</span>
                <span className="font-mono text-xs" style={{ color: 'var(--ink-3)' }}>{value}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

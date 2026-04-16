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

  const statusConfig: Record<string, { label: string; class: string; icon: React.ReactNode }> = {
    running:   { label: 'Running',   class: 'bg-blue-100 text-blue-700 border-blue-200',    icon: <Clock size={11} /> },
    completed: { label: 'Completed', class: 'bg-green-100 text-green-700 border-green-200', icon: <CheckCircle2 size={11} /> },
    cancelled: { label: 'Cancelled', class: 'bg-slate-100 text-slate-600 border-slate-200', icon: <XCircle size={11} /> },
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">System</h1>
        <p className="text-sm text-slate-500 mt-1">Platform overview and health.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Active users',        value: userCount,                        icon: <Users size={18} className="text-blue-600" />,   bg: 'bg-blue-50' },
          { label: 'Published workflows', value: workflowCount,                    icon: <Workflow size={18} className="text-purple-600" />, bg: 'bg-purple-50' },
          { label: 'Total cases',         value: totalInstances,                   icon: <FileText size={18} className="text-slate-600" />,  bg: 'bg-slate-100' },
          { label: 'Running cases',       value: statusMap['running'] ?? 0,        icon: <Activity size={18} className="text-green-600" />,  bg: 'bg-green-50' },
        ].map((stat) => (
          <Card key={stat.label} className="shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2.5 rounded-lg ${stat.bg} shrink-0`}>{stat.icon}</div>
              <div>
                <p className="text-2xl font-semibold text-slate-800">{stat.value}</p>
                <p className="text-xs text-slate-500">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Instance breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {Object.entries(statusConfig).map(([status, cfg]) => (
          <Card key={status} className="shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={`text-xs flex items-center gap-1 ${cfg.class}`}>
                  {cfg.icon}
                  {cfg.label}
                </Badge>
              </div>
              <span className="text-2xl font-semibold text-slate-800">{statusMap[status] ?? 0}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent activity */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3 border-b border-slate-100">
          <CardTitle className="text-sm font-semibold text-slate-700">Recent Cases</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {recentInstances.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">No cases yet.</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left text-xs font-medium text-slate-500 px-5 py-3">Case</th>
                  <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Workflow</th>
                  <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Status</th>
                  <th className="text-left text-xs font-medium text-slate-500 px-4 py-3 hidden md:table-cell">Started</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentInstances.map((inst) => {
                  const cfg = statusConfig[inst.status]
                  return (
                    <tr key={inst.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3 text-sm font-medium text-slate-800 truncate max-w-[200px]">{inst.title}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">{inst.workflow.name}</td>
                      <td className="px-4 py-3">
                        {cfg ? (
                          <Badge variant="outline" className={`text-xs flex items-center gap-1 w-fit ${cfg.class}`}>
                            {cfg.icon}
                            {cfg.label}
                          </Badge>
                        ) : (
                          <span className="text-xs text-slate-400">{inst.status}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400 hidden md:table-cell">
                        {formatDistanceToNow(new Date(inst.createdAt), { addSuffix: true })}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Environment info */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3 border-b border-slate-100">
          <CardTitle className="text-sm font-semibold text-slate-700">Environment</CardTitle>
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
                <span className="font-medium text-slate-500 w-32 shrink-0">{label}</span>
                <span className="text-slate-700 font-mono text-xs">{value}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

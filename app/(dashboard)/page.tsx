import { FileText, Clock, CheckCircle, GitBranch, ArrowRight, Plus } from 'lucide-react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

const stats = [
  {
    label: 'Active Cases',
    value: '24',
    change: '+3 this week',
    icon: <Clock className="text-blue-600" size={20} />,
    color: 'bg-blue-50 dark:bg-blue-950',
  },
  {
    label: 'Awaiting Approval',
    value: '7',
    change: '2 overdue',
    icon: <CheckCircle className="text-orange-500" size={20} />,
    color: 'bg-orange-50 dark:bg-orange-950',
  },
  {
    label: 'Documents',
    value: '142',
    change: '+5 this month',
    icon: <FileText className="text-green-600" size={20} />,
    color: 'bg-green-50 dark:bg-green-950',
  },
  {
    label: 'Active Processes',
    value: '8',
    change: '3 published',
    icon: <GitBranch className="text-purple-600" size={20} />,
    color: 'bg-purple-50 dark:bg-purple-950',
  },
]

const recentActivity = [
  {
    id: '1',
    title: 'Purchase Requisition - Laptops',
    workflow: 'Procurement Process',
    status: 'in_progress',
    step: 'Manager Approval',
    assignee: 'Anna Lindgren',
    updated: '15 min ago',
  },
  {
    id: '2',
    title: 'Vacation Request - Summer',
    workflow: 'HR - Vacation Process',
    status: 'pending',
    step: 'Awaiting Start',
    assignee: 'Erik Johansson',
    updated: '1 hour ago',
  },
  {
    id: '3',
    title: 'New Supplier Agreement',
    workflow: 'Contract Approval',
    status: 'completed',
    step: 'Completed',
    assignee: '',
    updated: '2 hours ago',
  },
  {
    id: '4',
    title: 'System Access - CRM',
    workflow: 'IT - Rights Management',
    status: 'in_progress',
    step: 'IT Review',
    assignee: 'Marcus Berg',
    updated: '3 hours ago',
  },
  {
    id: '5',
    title: 'Budget Revision Q2',
    workflow: 'Finance Approval',
    status: 'pending',
    step: 'CFO Approval',
    assignee: 'Sofia Holm',
    updated: 'Yesterday',
  },
]

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive'; className: string }> = {
  in_progress: { label: 'In Progress', variant: 'default', className: 'bg-blue-100 text-blue-700 hover:bg-blue-100 dark:bg-blue-900 dark:text-blue-300' },
  pending: { label: 'Pending', variant: 'secondary', className: 'bg-orange-100 text-orange-700 hover:bg-orange-100 dark:bg-orange-900 dark:text-orange-300' },
  completed: { label: 'Completed', variant: 'outline', className: 'bg-green-100 text-green-700 hover:bg-green-100 border-green-200 dark:bg-green-900 dark:text-green-300' },
}

const quickActions = [
  { label: 'Start Case', href: '/workflows/instances', icon: <Plus size={16} /> },
  { label: 'New Workflow', href: '/workflows/design', icon: <GitBranch size={16} /> },
  { label: 'Upload Document', href: '/documents', icon: <FileText size={16} /> },
]

export default function DashboardPage() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
          Good morning, Niclas
        </h1>
        <p className="text-sm text-slate-500 mt-1">Here is an overview of your cases and activities.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{stat.label}</p>
                  <p className="text-3xl font-semibold text-slate-900 dark:text-slate-100 mt-1">
                    {stat.value}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">{stat.change}</p>
                </div>
                <div className={`p-2.5 rounded-lg ${stat.color}`}>{stat.icon}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Recent activity */}
        <Card className="xl:col-span-2 shadow-sm">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold">Recent Activity</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/workflows/instances" className="text-blue-600 hover:text-blue-700 flex items-center gap-1 text-sm">
                See all <ArrowRight size={14} />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {recentActivity.map((item, i) => (
                <Link
                  key={item.id}
                  href={`/workflows/instances/${item.id}`}
                  className="flex items-center gap-4 px-3 py-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate group-hover:text-blue-600 transition-colors">
                      {item.title}
                    </p>
                    <p className="text-xs text-slate-500 truncate mt-0.5">
                      {item.workflow} &middot; {item.step}
                      {item.assignee && ` &middot; ${item.assignee}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <Badge className={statusConfig[item.status].className}>
                      {statusConfig[item.status].label}
                    </Badge>
                    <span className="text-xs text-slate-400 hidden sm:block">{item.updated}</span>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick actions */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {quickActions.map((action) => (
              <Button
                key={action.label}
                variant="outline"
                className="w-full justify-start gap-2 text-sm h-10"
                asChild
              >
                <Link href={action.href}>
                  {action.icon}
                  {action.label}
                </Link>
              </Button>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

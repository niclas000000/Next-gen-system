import { Suspense } from 'react'
import { CheckSquare } from 'lucide-react'
import { TasksClient } from './TasksClient'

export default function TasksPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-8 h-8 rounded-[2px]" style={{ background: 'var(--paper-3)' }}>
          <CheckSquare size={16} style={{ color: 'var(--ink-3)' }} />
        </div>
        <div>
          <h1 className="text-xl font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--ink)' }}>
            My Tasks
          </h1>
          <p className="text-xs" style={{ color: 'var(--ink-4)' }}>Workflow steps assigned to you or your role</p>
        </div>
      </div>

      <Suspense>
        <TasksClient />
      </Suspense>
    </div>
  )
}

import type { NodeType, WorkflowNode, WorkflowSettings, StartNodeData, TaskNodeData, DecisionNodeData, AutomationNodeData, NotificationNodeData, SubprocessNodeData, DelayNodeData, ParallelNodeData, EndNodeData } from '@/types/workflow'

export const SYSTEM_USER_ID = 'system-placeholder-user'

export const defaultWorkflowSettings: WorkflowSettings = {
  allowReassign: true,
  allowCancel: true,
  allowComments: true,
  allowAttachments: true,
  instanceTitleTemplate: '{{workflow.name}} - {{date}}',
  notifications: {
    onStart: true,
    onComplete: true,
    onStep: false,
  },
}

export function makeDefaultNodeData(type: NodeType): Record<string, unknown> {
  switch (type) {
    case 'start':
      return { name: 'Start', trigger: 'manual' } satisfies StartNodeData as Record<string, unknown>
    case 'task':
      return { name: 'Task', description: '', assignment: { type: 'initiator', value: '' } } satisfies TaskNodeData as Record<string, unknown>
    case 'decision':
      return { name: 'Decision', conditions: [], defaultBranch: '' } satisfies DecisionNodeData as Record<string, unknown>
    case 'automation':
      return { name: 'Automation', type: 'calculation', config: {}, inputMapping: {}, outputMapping: {}, errorHandling: 'fail' } satisfies AutomationNodeData as Record<string, unknown>
    case 'notification':
      return { name: 'Notification', recipients: [], deliveryMethod: ['in_app'] } satisfies NotificationNodeData as Record<string, unknown>
    case 'subprocess':
      return { name: 'Subprocess', workflowId: '', inputMapping: {}, outputMapping: {}, waitForCompletion: true } satisfies SubprocessNodeData as Record<string, unknown>
    case 'delay':
      return { name: 'Delay', duration: 1, unit: 'hours', useBusinessHours: false } satisfies DelayNodeData as Record<string, unknown>
    case 'parallel-split':
      return { name: 'Parallel Split', type: 'split' } satisfies ParallelNodeData as Record<string, unknown>
    case 'parallel-join':
      return { name: 'Parallel Join', type: 'join', joinStrategy: 'wait_all' } satisfies ParallelNodeData as Record<string, unknown>
    case 'end':
      return { name: 'End', completionStatus: 'completed' } satisfies EndNodeData as Record<string, unknown>
  }
}

export function makeInitialNodes(): WorkflowNode[] {
  return [
    {
      id: 'start-1',
      type: 'start',
      position: { x: 250, y: 100 },
      data: makeDefaultNodeData('start') as WorkflowNode['data'],
    },
  ]
}

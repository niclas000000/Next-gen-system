export type NodeType =
  | 'start'
  | 'task'
  | 'decision'
  | 'automation'
  | 'notification'
  | 'subprocess'
  | 'delay'
  | 'parallel-split'
  | 'parallel-join'
  | 'end'

export type WorkflowStatus = 'draft' | 'published' | 'archived'

export type InstanceStatus = 'running' | 'completed' | 'cancelled' | 'error'

export type StepStatus = 'pending' | 'in_progress' | 'completed' | 'skipped' | 'error'

export interface WorkflowDefinition {
  id: string
  name: string
  description?: string
  version: number
  status: WorkflowStatus
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  settings: WorkflowSettings
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

export interface WorkflowNode {
  id: string
  type: NodeType
  position: { x: number; y: number }
  data: NodeData
}

export interface WorkflowEdge {
  id: string
  source: string
  target: string
  sourceHandle?: string
  targetHandle?: string
  label?: string
  condition?: string
  style?: 'normal' | 'conditional' | 'default'
}

export type NodeData =
  | StartNodeData
  | TaskNodeData
  | DecisionNodeData
  | AutomationNodeData
  | NotificationNodeData
  | SubprocessNodeData
  | DelayNodeData
  | ParallelNodeData
  | EndNodeData

export interface StartNodeData {
  name: string
  trigger: 'manual' | 'scheduled' | 'api' | 'event'
  initialFormId?: string
  defaultVariables?: Record<string, unknown>
}

export interface TaskNodeData {
  name: string
  description?: string
  assignment: Assignment
  formId?: string
  sla?: SLAConfig
  onEntry?: Action[]
  onExit?: Action[]
}

export interface DecisionNodeData {
  name: string
  conditions: DecisionBranch[]
  defaultBranch: string
}

export interface DecisionBranch {
  id: string
  name: string
  expression: string
  targetNodeId: string
}

export interface AutomationNodeData {
  name: string
  type: 'calculation' | 'webhook' | 'database' | 'document' | 'email' | 'subprocess'
  config: Record<string, unknown>
  inputMapping: Record<string, string>
  outputMapping: Record<string, string>
  errorHandling?: 'fail' | 'skip' | 'retry'
}

export interface NotificationNodeData {
  name: string
  templateId?: string
  recipients: NotificationRecipient[]
  deliveryMethod: ('email' | 'in_app' | 'sms')[]
  variables?: Record<string, string>
}

export interface NotificationRecipient {
  type: 'user' | 'role' | 'expression' | 'assignee'
  value: string
}

export interface SubprocessNodeData {
  name: string
  workflowId: string
  inputMapping: Record<string, string>
  outputMapping: Record<string, string>
  waitForCompletion: boolean
}

export interface DelayNodeData {
  name: string
  duration: number
  unit: 'minutes' | 'hours' | 'days'
  useBusinessHours: boolean
}

export interface ParallelNodeData {
  name: string
  type: 'split' | 'join'
  joinStrategy?: 'wait_all' | 'wait_any'
}

export interface EndNodeData {
  name: string
  completionStatus?: 'completed' | 'cancelled'
}

export interface Assignment {
  type: 'user' | 'role' | 'expression' | 'previous_step_user' | 'initiator'
  value: string
}

export interface SLAConfig {
  duration: number
  unit: 'hours' | 'days'
  warningThreshold: number
  escalation?: EscalationRule[]
  useBusinessHours: boolean
}

export interface EscalationRule {
  after: number
  unit: 'hours' | 'days'
  action: 'notify_manager' | 'reassign' | 'reminder'
  targetValue?: string
}

export interface WorkflowSettings {
  allowReassign: boolean
  allowCancel: boolean
  allowComments: boolean
  allowAttachments: boolean
  instanceTitleTemplate: string
  archiveAfterDays?: number
  notifications: {
    onStart: boolean
    onComplete: boolean
    onStep: boolean
  }
}

export interface Action {
  type: 'automation' | 'notification' | 'set_variable'
  config: Record<string, unknown>
}

export interface WorkflowInstance {
  id: string
  workflowId: string
  title: string
  status: InstanceStatus
  currentStep?: string
  variables: Record<string, unknown>
  createdBy: string
  createdAt: Date
  updatedAt: Date
  completedAt?: Date
}

export interface WorkflowStep {
  id: string
  instanceId: string
  nodeId: string
  stepName: string
  stepType: NodeType
  status: StepStatus
  assignedTo?: string
  assignedRole?: string
  formData?: Record<string, unknown>
  decision?: string
  output?: Record<string, unknown>
  startedAt?: Date
  completedAt?: Date
  dueAt?: Date
  escalated: boolean
}

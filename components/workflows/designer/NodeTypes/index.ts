import { StartNode } from './StartNode'
import { TaskNode } from './TaskNode'
import { DecisionNode } from './DecisionNode'
import { AutomationNode } from './AutomationNode'
import { NotificationNode } from './NotificationNode'
import { SubprocessNode } from './SubprocessNode'
import { DelayNode } from './DelayNode'
import { ParallelNode } from './ParallelNode'
import { EndNode } from './EndNode'

// Must be defined outside component render to avoid ReactFlow re-registering on every render
export const nodeTypes = {
  start: StartNode,
  task: TaskNode,
  decision: DecisionNode,
  automation: AutomationNode,
  notification: NotificationNode,
  subprocess: SubprocessNode,
  delay: DelayNode,
  'parallel-split': ParallelNode,
  'parallel-join': ParallelNode,
  end: EndNode,
} as const

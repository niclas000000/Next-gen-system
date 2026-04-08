// TODO: Implement WorkflowEngine
export class WorkflowEngine {
  async startInstance(_workflowId: string, _initialData: Record<string, unknown>, _userId: string) {
    throw new Error('Not implemented')
  }

  async completeStep(
    _instanceId: string,
    _stepId: string,
    _formData: Record<string, unknown>,
    _userId: string
  ) {
    throw new Error('Not implemented')
  }

  async evaluateDecision(_instanceId: string, _nodeId: string) {
    throw new Error('Not implemented')
  }

  async runAutomation(_instanceId: string, _nodeId: string) {
    throw new Error('Not implemented')
  }

  async checkEscalations() {
    throw new Error('Not implemented')
  }
}

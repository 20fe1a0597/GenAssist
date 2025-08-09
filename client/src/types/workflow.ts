export interface WorkflowEntity {
  [key: string]: any;
}

export interface IntentResult {
  intent: string;
  entities: WorkflowEntity;
  confidence: number;
  domain: string;
}

export interface WorkflowStep {
  name: string;
  status: "pending" | "in_progress" | "completed" | "failed";
  message?: string;
}

export interface Workflow {
  id: string;
  title: string;
  description: string;
  domain: string;
  intent: string;
  entities: WorkflowEntity;
  status: "pending" | "in_progress" | "completed" | "failed";
  userId: string;
  progress: number;
  steps: WorkflowStep[];
  result?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowHistoryItem {
  id: string;
  workflowId: string;
  action: string;
  status: string;
  message: string;
  timestamp: string;
}

export interface CommandRequest {
  text: string;
  isVoice: boolean;
}

export interface CommandResponse {
  success: boolean;
  intent?: IntentResult;
  message?: string;
  error?: string;
}

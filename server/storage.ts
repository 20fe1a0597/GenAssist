import { type User, type InsertUser, type Workflow, type InsertWorkflow, type WorkflowHistory, type InsertWorkflowHistory } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Workflows
  getWorkflow(id: string): Promise<Workflow | undefined>;
  getWorkflowsByUser(userId: string): Promise<Workflow[]>;
  getActiveWorkflows(): Promise<Workflow[]>;
  createWorkflow(workflow: InsertWorkflow): Promise<Workflow>;
  updateWorkflow(id: string, updates: Partial<Workflow>): Promise<Workflow | undefined>;

  // Workflow History
  createWorkflowHistory(history: InsertWorkflowHistory): Promise<WorkflowHistory>;
  getWorkflowHistory(workflowId: string): Promise<WorkflowHistory[]>;
  getRecentActivity(limit?: number): Promise<WorkflowHistory[]>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private workflows: Map<string, Workflow>;
  private workflowHistory: Map<string, WorkflowHistory>;

  constructor() {
    this.users = new Map();
    this.workflows = new Map();
    this.workflowHistory = new Map();
    
    // Create a default user
    const defaultUser: User = {
      id: "default-user",
      username: "john.smith",
      password: "password",
      name: "John Smith",
      email: "john.smith@company.com",
      department: "IT",
      createdAt: new Date(),
    };
    this.users.set(defaultUser.id, defaultUser);
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      ...insertUser, 
      id,
      createdAt: new Date(),
    };
    this.users.set(id, user);
    return user;
  }

  async getWorkflow(id: string): Promise<Workflow | undefined> {
    return this.workflows.get(id);
  }

  async getWorkflowsByUser(userId: string): Promise<Workflow[]> {
    return Array.from(this.workflows.values()).filter(
      (workflow) => workflow.userId === userId,
    );
  }

  async getActiveWorkflows(): Promise<Workflow[]> {
    return Array.from(this.workflows.values()).filter(
      (workflow) => workflow.status === "in_progress" || workflow.status === "pending",
    );
  }

  async createWorkflow(insertWorkflow: InsertWorkflow): Promise<Workflow> {
    const id = randomUUID();
    const workflow: Workflow = {
      ...insertWorkflow,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.workflows.set(id, workflow);
    return workflow;
  }

  async updateWorkflow(id: string, updates: Partial<Workflow>): Promise<Workflow | undefined> {
    const workflow = this.workflows.get(id);
    if (!workflow) return undefined;

    const updatedWorkflow = {
      ...workflow,
      ...updates,
      updatedAt: new Date(),
    };
    this.workflows.set(id, updatedWorkflow);
    return updatedWorkflow;
  }

  async createWorkflowHistory(insertHistory: InsertWorkflowHistory): Promise<WorkflowHistory> {
    const id = randomUUID();
    const history: WorkflowHistory = {
      ...insertHistory,
      id,
      timestamp: new Date(),
    };
    this.workflowHistory.set(id, history);
    return history;
  }

  async getWorkflowHistory(workflowId: string): Promise<WorkflowHistory[]> {
    return Array.from(this.workflowHistory.values())
      .filter((history) => history.workflowId === workflowId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  async getRecentActivity(limit: number = 10): Promise<WorkflowHistory[]> {
    return Array.from(this.workflowHistory.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }
}

export const storage = new MemStorage();

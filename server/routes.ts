import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { commandRequestSchema, intentResponseSchema } from "@shared/schema";
import { z } from "zod";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY || "";

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

async function detectIntent(text: string): Promise<{ intent: string; entities: Record<string, any>; confidence: number; domain: string }> {
  if (!OPENAI_API_KEY) {
    throw new Error("OpenAI API key not configured");
  }

  const prompt = `
Analyze the following command and extract:
1. Intent (one of: HR_Onboarding, HR_Offboarding, IT_Ticket, IT_Password_Reset, Finance_Expense, Finance_Approval, Meeting_Schedule, General_Query)
2. Entities (key-value pairs of relevant information)
3. Confidence (0-1 score)
4. Domain (HR, IT, Finance, or General)

Command: "${text}"

Respond with ONLY a JSON object in this format:
{
  "intent": "HR_Onboarding",
  "entities": {"employee_name": "John Doe", "role": "Developer", "start_date": "Monday"},
  "confidence": 0.95,
  "domain": "HR"
}
`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are an AI assistant that analyzes business commands and extracts intents and entities. Always respond with valid JSON only."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data: OpenAIResponse = await response.json();
    const content = data.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error("No response from OpenAI");
    }

    return JSON.parse(content);
  } catch (error) {
    console.error("Intent detection error:", error);
    // Fallback to simple pattern matching
    return fallbackIntentDetection(text);
  }
}

function fallbackIntentDetection(text: string): { intent: string; entities: Record<string, any>; confidence: number; domain: string } {
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes("onboard") || lowerText.includes("hire") || lowerText.includes("new employee")) {
    return {
      intent: "HR_Onboarding",
      entities: extractEntities(text, ["employee_name", "role", "start_date"]),
      confidence: 0.8,
      domain: "HR"
    };
  } else if (lowerText.includes("ticket") || lowerText.includes("issue") || lowerText.includes("problem")) {
    return {
      intent: "IT_Ticket",
      entities: extractEntities(text, ["issue_type", "priority", "description"]),
      confidence: 0.8,
      domain: "IT"
    };
  } else if (lowerText.includes("expense") || lowerText.includes("reimburse") || lowerText.includes("receipt")) {
    return {
      intent: "Finance_Expense",
      entities: extractEntities(text, ["amount", "category", "description"]),
      confidence: 0.8,
      domain: "Finance"
    };
  }
  
  return {
    intent: "General_Query",
    entities: {},
    confidence: 0.5,
    domain: "General"
  };
}

function extractEntities(text: string, entityTypes: string[]): Record<string, any> {
  const entities: Record<string, any> = {};
  
  // Simple entity extraction - in a real app, this would be more sophisticated
  const words = text.split(" ");
  
  for (const type of entityTypes) {
    if (type === "employee_name") {
      // Look for capitalized words that might be names
      const namePattern = /([A-Z][a-z]+ [A-Z][a-z]+)/g;
      const matches = text.match(namePattern);
      if (matches) entities[type] = matches[0];
    } else if (type === "amount") {
      // Look for dollar amounts
      const amountPattern = /\$?\d+(?:\.\d{2})?/g;
      const matches = text.match(amountPattern);
      if (matches) entities[type] = matches[0];
    }
    // Add more entity extraction logic as needed
  }
  
  return entities;
}

async function executeWorkflow(intent: string, entities: Record<string, any>, domain: string, userId: string): Promise<string> {
  // Create workflow record
  const workflow = await storage.createWorkflow({
    title: getWorkflowTitle(intent, entities),
    description: getWorkflowDescription(intent, entities),
    domain,
    intent,
    entities,
    status: "in_progress",
    userId,
    progress: 0,
    steps: getWorkflowSteps(intent),
  });

  // Log workflow start
  await storage.createWorkflowHistory({
    workflowId: workflow.id,
    action: "workflow_started",
    status: "info",
    message: `Workflow initiated: ${workflow.title}`,
  });

  // Simulate workflow execution
  setTimeout(async () => {
    await storage.updateWorkflow(workflow.id, {
      status: "completed",
      progress: 100,
      result: "Workflow completed successfully",
    });

    await storage.createWorkflowHistory({
      workflowId: workflow.id,
      action: "workflow_completed",
      status: "success",
      message: "Workflow completed successfully",
    });
  }, 5000);

  return `Workflow ${workflow.title} has been initiated and is now in progress.`;
}

function getWorkflowTitle(intent: string, entities: Record<string, any>): string {
  switch (intent) {
    case "HR_Onboarding":
      return `Employee Onboarding - ${entities.employee_name || "New Employee"}`;
    case "IT_Ticket":
      return `IT Support Ticket - ${entities.issue_type || "Technical Issue"}`;
    case "Finance_Expense":
      return `Expense Report - ${entities.description || "Business Expense"}`;
    default:
      return `Workflow - ${intent}`;
  }
}

function getWorkflowDescription(intent: string, entities: Record<string, any>): string {
  switch (intent) {
    case "HR_Onboarding":
      return `Setting up accounts, scheduling orientation, and preparing workspace for ${entities.role || "new role"}.`;
    case "IT_Ticket":
      return `Investigating and resolving ${entities.description || "technical issue"}.`;
    case "Finance_Expense":
      return `Processing expense report for ${entities.amount || "business expense"}.`;
    default:
      return "Processing workflow request.";
  }
}

function getWorkflowSteps(intent: string): any[] {
  const stepTemplates: Record<string, any[]> = {
    HR_Onboarding: [
      { name: "Create employee record", status: "pending" },
      { name: "Setup IT accounts", status: "pending" },
      { name: "Schedule orientation", status: "pending" },
      { name: "Prepare workspace", status: "pending" },
      { name: "Send welcome email", status: "pending" },
    ],
    IT_Ticket: [
      { name: "Ticket creation", status: "pending" },
      { name: "Issue assessment", status: "pending" },
      { name: "Assign technician", status: "pending" },
      { name: "Resolve issue", status: "pending" },
    ],
    Finance_Expense: [
      { name: "Expense validation", status: "pending" },
      { name: "Manager approval", status: "pending" },
      { name: "Finance review", status: "pending" },
      { name: "Payment processing", status: "pending" },
    ],
  };

  return stepTemplates[intent] || [
    { name: "Process request", status: "pending" },
    { name: "Complete workflow", status: "pending" },
  ];
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Process voice/text commands
  app.post("/api/process-command", async (req, res) => {
    try {
      const { text, isVoice } = commandRequestSchema.parse(req.body);
      
      // Detect intent using OpenAI
      const intentResult = await detectIntent(text);
      
      // Execute workflow
      const result = await executeWorkflow(
        intentResult.intent,
        intentResult.entities,
        intentResult.domain,
        "default-user" // In a real app, this would come from authentication
      );

      res.json({
        success: true,
        intent: intentResult,
        message: result,
      });
    } catch (error) {
      console.error("Command processing error:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      });
    }
  });

  // Get active workflows
  app.get("/api/workflows/active", async (req, res) => {
    try {
      const workflows = await storage.getActiveWorkflows();
      res.json(workflows);
    } catch (error) {
      console.error("Error fetching active workflows:", error);
      res.status(500).json({ error: "Failed to fetch workflows" });
    }
  });

  // Get workflow by ID
  app.get("/api/workflows/:id", async (req, res) => {
    try {
      const workflow = await storage.getWorkflow(req.params.id);
      if (!workflow) {
        return res.status(404).json({ error: "Workflow not found" });
      }
      res.json(workflow);
    } catch (error) {
      console.error("Error fetching workflow:", error);
      res.status(500).json({ error: "Failed to fetch workflow" });
    }
  });

  // Get recent activity
  app.get("/api/activity/recent", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const activity = await storage.getRecentActivity(limit);
      res.json(activity);
    } catch (error) {
      console.error("Error fetching recent activity:", error);
      res.status(500).json({ error: "Failed to fetch activity" });
    }
  });

  // Get workflow statistics
  app.get("/api/stats", async (req, res) => {
    try {
      const allWorkflows = await storage.getWorkflowsByUser("default-user");
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const todaysWorkflows = allWorkflows.filter(w => 
        w.createdAt && w.createdAt >= today
      );

      const stats = {
        completed: todaysWorkflows.filter(w => w.status === "completed").length,
        inProgress: todaysWorkflows.filter(w => w.status === "in_progress").length,
        voiceCommands: todaysWorkflows.filter(w => w.description?.includes("voice")).length,
        totalToday: todaysWorkflows.length,
      };

      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ error: "Failed to fetch statistics" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

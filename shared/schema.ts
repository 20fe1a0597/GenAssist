import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, jsonb, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  department: text("department"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const workflows = pgTable("workflows", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  domain: text("domain").notNull(), // HR, IT, Finance
  intent: text("intent").notNull(),
  entities: jsonb("entities"),
  status: text("status").notNull().default("pending"), // pending, in_progress, completed, failed
  userId: varchar("user_id").references(() => users.id),
  progress: integer("progress").default(0), // 0-100
  steps: jsonb("steps"),
  result: text("result"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const workflowHistory = pgTable("workflow_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workflowId: varchar("workflow_id").references(() => workflows.id),
  action: text("action").notNull(),
  status: text("status").notNull(),
  message: text("message"),
  timestamp: timestamp("timestamp").defaultNow(),
});

// Zod schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertWorkflowSchema = createInsertSchema(workflows).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWorkflowHistorySchema = createInsertSchema(workflowHistory).omit({
  id: true,
  timestamp: true,
});

// Command request schema
export const commandRequestSchema = z.object({
  text: z.string().min(1),
  isVoice: z.boolean().default(false),
});

// Intent detection response schema
export const intentResponseSchema = z.object({
  intent: z.string(),
  entities: z.record(z.any()),
  confidence: z.number(),
  domain: z.string(),
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Workflow = typeof workflows.$inferSelect;
export type InsertWorkflow = z.infer<typeof insertWorkflowSchema>;

export type WorkflowHistory = typeof workflowHistory.$inferSelect;
export type InsertWorkflowHistory = z.infer<typeof insertWorkflowHistorySchema>;

export type CommandRequest = z.infer<typeof commandRequestSchema>;
export type IntentResponse = z.infer<typeof intentResponseSchema>;

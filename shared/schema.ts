import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ── Services ──────────────────────────────────────────────
export const services = sqliteTable("services", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description"),
  duration: integer("duration").notNull(),
  price: real("price").notNull(),
  category: text("category").notNull(),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
});
export const insertServiceSchema = createInsertSchema(services).omit({ id: true });
export type InsertService = z.infer<typeof insertServiceSchema>;
export type Service = typeof services.$inferSelect;

// ── Clients ───────────────────────────────────────────────
export const clients = sqliteTable("clients", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email"),
  phone: text("phone"),
  skinType: text("skin_type"),
  allergies: text("allergies"),
  notes: text("notes"),
  preferredFormula: text("preferred_formula"),
  intakeCompleted: integer("intake_completed", { mode: "boolean" }).notNull().default(false),
  waiverSigned: integer("waiver_signed", { mode: "boolean" }).notNull().default(false),
  waiverSignedAt: text("waiver_signed_at"),
  createdAt: text("created_at").notNull(),
});
export const insertClientSchema = createInsertSchema(clients).omit({ id: true });
export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clients.$inferSelect;

// ── Appointments ──────────────────────────────────────────
export const appointments = sqliteTable("appointments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clientId: integer("client_id").notNull(),
  serviceId: integer("service_id").notNull(),
  date: text("date").notNull(),
  time: text("time").notNull(),
  status: text("status").notNull().default("scheduled"),
  depositPaid: integer("deposit_paid", { mode: "boolean" }).notNull().default(false),
  depositAmount: real("deposit_amount"),
  source: text("source").notNull().default("owner"), // owner, booking_link
  notes: text("notes"),
  createdAt: text("created_at").notNull(),
});
export const insertAppointmentSchema = createInsertSchema(appointments).omit({ id: true });
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;
export type Appointment = typeof appointments.$inferSelect;

// ── Session Records ───────────────────────────────────────
export const sessionRecords = sqliteTable("session_records", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  appointmentId: integer("appointment_id").notNull(),
  clientId: integer("client_id").notNull(),
  formula: text("formula"),
  shade: text("shade"),
  rinseTime: integer("rinse_time"),
  aftercareNotes: text("aftercare_notes"),
  sessionNotes: text("session_notes"),
  createdAt: text("created_at").notNull(),
});
export const insertSessionRecordSchema = createInsertSchema(sessionRecords).omit({ id: true });
export type InsertSessionRecord = z.infer<typeof insertSessionRecordSchema>;
export type SessionRecord = typeof sessionRecords.$inferSelect;

// ── Packages ──────────────────────────────────────────────
export const packagePlans = sqliteTable("package_plans", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  sessions: integer("sessions").notNull(),
  price: real("price").notNull(),
  validDays: integer("valid_days").notNull().default(90),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
});
export const insertPackagePlanSchema = createInsertSchema(packagePlans).omit({ id: true });
export type InsertPackagePlan = z.infer<typeof insertPackagePlanSchema>;
export type PackagePlan = typeof packagePlans.$inferSelect;

// ── Client Packages ───────────────────────────────────────
export const clientPackages = sqliteTable("client_packages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clientId: integer("client_id").notNull(),
  packagePlanId: integer("package_plan_id").notNull(),
  sessionsRemaining: integer("sessions_remaining").notNull(),
  purchaseDate: text("purchase_date").notNull(),
  expiryDate: text("expiry_date").notNull(),
  status: text("status").notNull().default("active"),
});
export const insertClientPackageSchema = createInsertSchema(clientPackages).omit({ id: true });
export type InsertClientPackage = z.infer<typeof insertClientPackageSchema>;
export type ClientPackage = typeof clientPackages.$inferSelect;

// ── Payments ──────────────────────────────────────────────
export const payments = sqliteTable("payments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clientId: integer("client_id").notNull(),
  appointmentId: integer("appointment_id"),
  amount: real("amount").notNull(),
  type: text("type").notNull(),
  method: text("method").notNull().default("card"),
  createdAt: text("created_at").notNull(),
});
export const insertPaymentSchema = createInsertSchema(payments).omit({ id: true });
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof payments.$inferSelect;

// ── Intake Questions ──────────────────────────────────────
export const intakeQuestions = sqliteTable("intake_questions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  question: text("question").notNull(),
  type: text("type").notNull().default("text"), // text, select, checkbox, textarea
  options: text("options"), // JSON array for select/checkbox types
  required: integer("required", { mode: "boolean" }).notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
});
export const insertIntakeQuestionSchema = createInsertSchema(intakeQuestions).omit({ id: true });
export type InsertIntakeQuestion = z.infer<typeof insertIntakeQuestionSchema>;
export type IntakeQuestion = typeof intakeQuestions.$inferSelect;

// ── Intake Responses ──────────────────────────────────────
export const intakeResponses = sqliteTable("intake_responses", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clientId: integer("client_id").notNull(),
  questionId: integer("question_id").notNull(),
  answer: text("answer"),
  submittedAt: text("submitted_at").notNull(),
});
export const insertIntakeResponseSchema = createInsertSchema(intakeResponses).omit({ id: true });
export type InsertIntakeResponse = z.infer<typeof insertIntakeResponseSchema>;
export type IntakeResponse = typeof intakeResponses.$inferSelect;

// ── Waiver Template ───────────────────────────────────────
export const waiverTemplates = sqliteTable("waiver_templates", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  content: text("content").notNull(), // full waiver text (markdown)
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
});
export const insertWaiverTemplateSchema = createInsertSchema(waiverTemplates).omit({ id: true });
export type InsertWaiverTemplate = z.infer<typeof insertWaiverTemplateSchema>;
export type WaiverTemplate = typeof waiverTemplates.$inferSelect;

// ── Message Logs ──────────────────────────────────────────
export const messageLogs = sqliteTable("message_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clientId: integer("client_id").notNull(),
  appointmentId: integer("appointment_id"),
  type: text("type").notNull(), // booking_confirm, prep_reminder, rinse_reminder, aftercare, rebooking
  channel: text("channel").notNull().default("sms"), // sms, email
  to: text("to").notNull(),
  body: text("body").notNull(),
  status: text("status").notNull().default("sent"), // sent, delivered, failed, pending
  sentAt: text("sent_at").notNull(),
});
export const insertMessageLogSchema = createInsertSchema(messageLogs).omit({ id: true });
export type InsertMessageLog = z.infer<typeof insertMessageLogSchema>;
export type MessageLog = typeof messageLogs.$inferSelect;

// ── Inventory ─────────────────────────────────────────────
export const inventoryItems = sqliteTable("inventory_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  category: text("category").notNull(), // solution, product, supply
  brand: text("brand"),
  currentStock: real("current_stock").notNull().default(0), // units (oz, bottles, etc.)
  unit: text("unit").notNull().default("oz"),
  reorderLevel: real("reorder_level").notNull().default(0),
  costPerUnit: real("cost_per_unit"),
  notes: text("notes"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
});
export const insertInventoryItemSchema = createInsertSchema(inventoryItems).omit({ id: true });
export type InsertInventoryItem = z.infer<typeof insertInventoryItemSchema>;
export type InventoryItem = typeof inventoryItems.$inferSelect;

// ── Inventory Usage Log ───────────────────────────────────
export const inventoryUsage = sqliteTable("inventory_usage", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  itemId: integer("item_id").notNull(),
  sessionId: integer("session_id"),
  quantity: real("quantity").notNull(),
  usedAt: text("used_at").notNull(),
});
export const insertInventoryUsageSchema = createInsertSchema(inventoryUsage).omit({ id: true });
export type InsertInventoryUsage = z.infer<typeof insertInventoryUsageSchema>;
export type InventoryUsage = typeof inventoryUsage.$inferSelect;

// ── Business Settings ─────────────────────────────────────
export const businessSettings = sqliteTable("business_settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  businessName: text("business_name").notNull().default("My Tanning Studio"),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  timezone: text("timezone").notNull().default("America/Denver"),
  depositRequired: integer("deposit_required", { mode: "boolean" }).notNull().default(false),
  depositAmount: real("deposit_amount"),
  cancellationHours: integer("cancellation_hours").notNull().default(24),
  bookingEnabled: integer("booking_enabled", { mode: "boolean" }).notNull().default(true),
  bookingNotice: integer("booking_notice").notNull().default(60), // min minutes before appointment
  // Notification templates
  confirmationTemplate: text("confirmation_template"),
  prepTemplate: text("prep_template"),
  rinseTemplate: text("rinse_template"),
  aftercareTemplate: text("aftercare_template"),
  rebookingTemplate: text("rebooking_template"),
  // Operating hours (JSON: { mon: { open: "09:00", close: "18:00" }, ... })
  operatingHours: text("operating_hours"),
});
export const insertBusinessSettingsSchema = createInsertSchema(businessSettings).omit({ id: true });
export type InsertBusinessSettings = z.infer<typeof insertBusinessSettingsSchema>;
export type BusinessSettings = typeof businessSettings.$inferSelect;

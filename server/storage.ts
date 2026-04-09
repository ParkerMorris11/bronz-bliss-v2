import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";
import {
  services, type InsertService, type Service,
  clients, type InsertClient, type Client,
  appointments, type InsertAppointment, type Appointment,
  sessionRecords, type InsertSessionRecord, type SessionRecord,
  packagePlans, type InsertPackagePlan, type PackagePlan,
  clientPackages, type InsertClientPackage, type ClientPackage,
  payments, type InsertPayment, type Payment,
  intakeQuestions, type InsertIntakeQuestion, type IntakeQuestion,
  intakeResponses, type InsertIntakeResponse, type IntakeResponse,
  waiverTemplates, type InsertWaiverTemplate, type WaiverTemplate,
  messageLogs, type InsertMessageLog, type MessageLog,
  inventoryItems, type InsertInventoryItem, type InventoryItem,
  inventoryUsage, type InsertInventoryUsage, type InventoryUsage,
  businessSettings, type InsertBusinessSettings, type BusinessSettings,
  giftCards, type InsertGiftCard, type GiftCard,
  waitlist, type InsertWaitlist, type Waitlist,
  promoCodes, type InsertPromoCode, type PromoCode,
  loyaltyPoints, type InsertLoyaltyPoints, type LoyaltyPoints,
} from "@shared/schema";

const sqlite = new Database("bronzbliss.db");
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");
export const db = drizzle(sqlite);

// Create all tables
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS services (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    duration INTEGER NOT NULL,
    price REAL NOT NULL,
    category TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1
  );
  CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    skin_type TEXT,
    allergies TEXT,
    notes TEXT,
    preferred_formula TEXT,
    intake_completed INTEGER NOT NULL DEFAULT 0,
    waiver_signed INTEGER NOT NULL DEFAULT 0,
    waiver_signed_at TEXT,
    birthday TEXT,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS appointments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL,
    service_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'scheduled',
    deposit_paid INTEGER NOT NULL DEFAULT 0,
    deposit_amount REAL,
    source TEXT NOT NULL DEFAULT 'owner',
    notes TEXT,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS session_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    appointment_id INTEGER NOT NULL,
    client_id INTEGER NOT NULL,
    formula TEXT,
    shade TEXT,
    rinse_time INTEGER,
    aftercare_notes TEXT,
    session_notes TEXT,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS package_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    sessions INTEGER NOT NULL,
    price REAL NOT NULL,
    valid_days INTEGER NOT NULL DEFAULT 90,
    is_active INTEGER NOT NULL DEFAULT 1
  );
  CREATE TABLE IF NOT EXISTS client_packages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL,
    package_plan_id INTEGER NOT NULL,
    sessions_remaining INTEGER NOT NULL,
    purchase_date TEXT NOT NULL,
    expiry_date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active'
  );
  CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL,
    appointment_id INTEGER,
    amount REAL NOT NULL,
    type TEXT NOT NULL,
    method TEXT NOT NULL DEFAULT 'card',
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS intake_questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'text',
    options TEXT,
    required INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1
  );
  CREATE TABLE IF NOT EXISTS intake_responses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL,
    question_id INTEGER NOT NULL,
    answer TEXT,
    submitted_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS waiver_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1
  );
  CREATE TABLE IF NOT EXISTS message_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL,
    appointment_id INTEGER,
    type TEXT NOT NULL,
    channel TEXT NOT NULL DEFAULT 'sms',
    "to" TEXT NOT NULL,
    body TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'sent',
    sent_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS inventory_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    brand TEXT,
    current_stock REAL NOT NULL DEFAULT 0,
    unit TEXT NOT NULL DEFAULT 'oz',
    reorder_level REAL NOT NULL DEFAULT 0,
    cost_per_unit REAL,
    notes TEXT,
    is_active INTEGER NOT NULL DEFAULT 1
  );
  CREATE TABLE IF NOT EXISTS inventory_usage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id INTEGER NOT NULL,
    session_id INTEGER,
    quantity REAL NOT NULL,
    used_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS business_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    business_name TEXT NOT NULL DEFAULT 'Bronz Bliss',
    phone TEXT,
    email TEXT,
    address TEXT,
    timezone TEXT NOT NULL DEFAULT 'America/Denver',
    deposit_required INTEGER NOT NULL DEFAULT 0,
    deposit_amount REAL,
    cancellation_hours INTEGER NOT NULL DEFAULT 24,
    booking_enabled INTEGER NOT NULL DEFAULT 1,
    booking_notice INTEGER NOT NULL DEFAULT 60,
    confirmation_template TEXT,
    prep_template TEXT,
    rinse_template TEXT,
    aftercare_template TEXT,
    rebooking_template TEXT,
    operating_hours TEXT
  );
  CREATE TABLE IF NOT EXISTS gift_cards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,
    initial_amount REAL NOT NULL,
    balance REAL NOT NULL,
    purchaser_name TEXT,
    recipient_name TEXT,
    recipient_email TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    expires_at TEXT,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS promo_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,
    discount_type TEXT NOT NULL DEFAULT 'percent',
    discount_value REAL NOT NULL,
    max_uses INTEGER,
    used_count INTEGER NOT NULL DEFAULT 0,
    expires_at TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS loyalty_points (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL,
    points INTEGER NOT NULL,
    reason TEXT NOT NULL,
    appointment_id INTEGER,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS waitlist (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    service_id INTEGER NOT NULL,
    preferred_date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'waiting',
    notes TEXT,
    created_at TEXT NOT NULL
  );
`);

export interface IStorage {
  // Services
  getServices(): Service[];
  getService(id: number): Service | undefined;
  createService(data: InsertService): Service;
  updateService(id: number, data: Partial<InsertService>): Service | undefined;

  // Clients
  getClients(): Client[];
  getClient(id: number): Client | undefined;
  createClient(data: InsertClient): Client;
  updateClient(id: number, data: Partial<InsertClient>): Client | undefined;
  searchClients(query: string): Client[];

  // Appointments
  getAppointments(): Appointment[];
  getAppointmentsByDate(date: string): Appointment[];
  getAppointmentsByRange(start: string, end: string): Appointment[];
  getAppointmentsByClient(clientId: number): Appointment[];
  getAppointment(id: number): Appointment | undefined;
  createAppointment(data: InsertAppointment): Appointment;
  updateAppointment(id: number, data: Partial<InsertAppointment>): Appointment | undefined;

  // Session Records
  getSessionRecordsByClient(clientId: number): SessionRecord[];
  getSessionRecord(appointmentId: number): SessionRecord | undefined;
  createSessionRecord(data: InsertSessionRecord): SessionRecord;

  // Package Plans
  getPackagePlans(): PackagePlan[];
  createPackagePlan(data: InsertPackagePlan): PackagePlan;
  updatePackagePlan(id: number, data: Partial<InsertPackagePlan>): PackagePlan | undefined;

  // Client Packages
  getClientPackages(clientId: number): ClientPackage[];
  getAllClientPackages(): ClientPackage[];
  createClientPackage(data: InsertClientPackage): ClientPackage;
  updateClientPackage(id: number, data: Partial<InsertClientPackage>): ClientPackage | undefined;

  // Payments
  getPayments(): Payment[];
  getPaymentsByClient(clientId: number): Payment[];
  createPayment(data: InsertPayment): Payment;

  // Intake Questions
  getIntakeQuestions(): IntakeQuestion[];
  createIntakeQuestion(data: InsertIntakeQuestion): IntakeQuestion;
  updateIntakeQuestion(id: number, data: Partial<InsertIntakeQuestion>): IntakeQuestion | undefined;
  deleteIntakeQuestion(id: number): void;

  // Intake Responses
  getIntakeResponsesByClient(clientId: number): IntakeResponse[];
  createIntakeResponse(data: InsertIntakeResponse): IntakeResponse;
  deleteIntakeResponsesByClient(clientId: number): void;

  // Waiver Templates
  getWaiverTemplates(): WaiverTemplate[];
  getActiveWaiver(): WaiverTemplate | undefined;
  createWaiverTemplate(data: InsertWaiverTemplate): WaiverTemplate;
  updateWaiverTemplate(id: number, data: Partial<InsertWaiverTemplate>): WaiverTemplate | undefined;

  // Message Logs
  getMessageLogs(): MessageLog[];
  getMessageLogsByClient(clientId: number): MessageLog[];
  createMessageLog(data: InsertMessageLog): MessageLog;

  // Inventory Items
  getInventoryItems(): InventoryItem[];
  getInventoryItem(id: number): InventoryItem | undefined;
  createInventoryItem(data: InsertInventoryItem): InventoryItem;
  updateInventoryItem(id: number, data: Partial<InsertInventoryItem>): InventoryItem | undefined;
  getLowStockItems(): InventoryItem[];

  // Inventory Usage
  getInventoryUsage(itemId: number): InventoryUsage[];
  createInventoryUsage(data: InsertInventoryUsage): InventoryUsage;

  // Business Settings
  getBusinessSettings(): BusinessSettings;
  updateBusinessSettings(data: Partial<InsertBusinessSettings>): BusinessSettings;

  // Dashboard & Reports
  getDashboardStats(): {
    todayAppointments: number;
    totalClients: number;
    monthRevenue: number;
    activePackages: number;
    recentAppointments: (Appointment & { clientName: string; serviceName: string })[];
  };
  getRevenueByRange(startDate: string, endDate: string): { date: string; total: number }[];
  getNoShowRate(startDate: string, endDate: string): { total: number; noShows: number };
  getRebookingRate(startDate: string, endDate: string): { total: number; rebooked: number };
  getPopularServices(startDate: string, endDate: string): { serviceId: number; name: string; count: number }[];

  // Gift Cards
  getGiftCards(): GiftCard[];
  getGiftCard(id: number): GiftCard | undefined;
  getGiftCardByCode(code: string): GiftCard | undefined;
  createGiftCard(data: InsertGiftCard): GiftCard;
  updateGiftCard(id: number, data: Partial<InsertGiftCard>): GiftCard | undefined;

  // Waitlist
  getWaitlist(): Waitlist[];
  getWaitlistByDate(date: string): Waitlist[];
  createWaitlistEntry(data: InsertWaitlist): Waitlist;
  updateWaitlistEntry(id: number, data: Partial<InsertWaitlist>): Waitlist | undefined;
  deleteWaitlistEntry(id: number): void;

  // Analytics v2
  getClientLifetimeValues(): { clientId: number; name: string; totalSpent: number; visits: number; firstVisit: string; lastVisit: string }[];

  // Promo Codes
  getPromoCodes(): PromoCode[];
  getPromoCodeByCode(code: string): PromoCode | undefined;
  createPromoCode(data: InsertPromoCode): PromoCode;
  updatePromoCode(id: number, data: Partial<InsertPromoCode>): PromoCode | undefined;

  // Loyalty Points
  getLoyaltyPointsByClient(clientId: number): LoyaltyPoints[];
  getClientPointsBalance(clientId: number): number;
  createLoyaltyEntry(data: InsertLoyaltyPoints): LoyaltyPoints;

  // Search
  searchAll(query: string): { clients: Client[]; appointments: Appointment[] };

  // Birthdays
  getUpcomingBirthdays(days: number): Client[];
}

export class DatabaseStorage implements IStorage {
  // ── Services ─────────────────────────────────────────
  getServices(): Service[] {
    return db.select().from(services).all();
  }
  getService(id: number): Service | undefined {
    return db.select().from(services).where(eq(services.id, id)).get();
  }
  createService(data: InsertService): Service {
    return db.insert(services).values(data).returning().get();
  }
  updateService(id: number, data: Partial<InsertService>): Service | undefined {
    return db.update(services).set(data).where(eq(services.id, id)).returning().get();
  }

  // ── Clients ──────────────────────────────────────────
  getClients(): Client[] {
    return db.select().from(clients).orderBy(desc(clients.createdAt)).all();
  }
  getClient(id: number): Client | undefined {
    return db.select().from(clients).where(eq(clients.id, id)).get();
  }
  createClient(data: InsertClient): Client {
    return db.insert(clients).values(data).returning().get();
  }
  updateClient(id: number, data: Partial<InsertClient>): Client | undefined {
    return db.update(clients).set(data).where(eq(clients.id, id)).returning().get();
  }
  searchClients(query: string): Client[] {
    const q = `%${query.toLowerCase()}%`;
    return db.select().from(clients)
      .where(sql`lower(${clients.firstName} || ' ' || ${clients.lastName}) LIKE ${q}`)
      .all();
  }

  // ── Appointments ─────────────────────────────────────
  getAppointments(): Appointment[] {
    return db.select().from(appointments).orderBy(desc(appointments.date)).all();
  }
  getAppointmentsByDate(date: string): Appointment[] {
    return db.select().from(appointments).where(eq(appointments.date, date)).all();
  }
  getAppointmentsByRange(start: string, end: string): Appointment[] {
    return db.select().from(appointments)
      .where(and(gte(appointments.date, start), lte(appointments.date, end)))
      .orderBy(appointments.date, appointments.time)
      .all();
  }
  getAppointmentsByClient(clientId: number): Appointment[] {
    return db.select().from(appointments)
      .where(eq(appointments.clientId, clientId))
      .orderBy(desc(appointments.date))
      .all();
  }
  getAppointment(id: number): Appointment | undefined {
    return db.select().from(appointments).where(eq(appointments.id, id)).get();
  }
  createAppointment(data: InsertAppointment): Appointment {
    return db.insert(appointments).values(data).returning().get();
  }
  updateAppointment(id: number, data: Partial<InsertAppointment>): Appointment | undefined {
    return db.update(appointments).set(data).where(eq(appointments.id, id)).returning().get();
  }

  // ── Session Records ──────────────────────────────────
  getSessionRecordsByClient(clientId: number): SessionRecord[] {
    return db.select().from(sessionRecords)
      .where(eq(sessionRecords.clientId, clientId))
      .orderBy(desc(sessionRecords.createdAt))
      .all();
  }
  getSessionRecord(appointmentId: number): SessionRecord | undefined {
    return db.select().from(sessionRecords)
      .where(eq(sessionRecords.appointmentId, appointmentId))
      .get();
  }
  createSessionRecord(data: InsertSessionRecord): SessionRecord {
    return db.insert(sessionRecords).values(data).returning().get();
  }

  // ── Package Plans ────────────────────────────────────
  getPackagePlans(): PackagePlan[] {
    return db.select().from(packagePlans).all();
  }
  createPackagePlan(data: InsertPackagePlan): PackagePlan {
    return db.insert(packagePlans).values(data).returning().get();
  }
  updatePackagePlan(id: number, data: Partial<InsertPackagePlan>): PackagePlan | undefined {
    return db.update(packagePlans).set(data).where(eq(packagePlans.id, id)).returning().get();
  }

  // ── Client Packages ──────────────────────────────────
  getClientPackages(clientId: number): ClientPackage[] {
    return db.select().from(clientPackages)
      .where(eq(clientPackages.clientId, clientId))
      .all();
  }
  getAllClientPackages(): ClientPackage[] {
    return db.select().from(clientPackages).all();
  }
  createClientPackage(data: InsertClientPackage): ClientPackage {
    return db.insert(clientPackages).values(data).returning().get();
  }
  updateClientPackage(id: number, data: Partial<InsertClientPackage>): ClientPackage | undefined {
    return db.update(clientPackages).set(data).where(eq(clientPackages.id, id)).returning().get();
  }

  // ── Payments ─────────────────────────────────────────
  getPayments(): Payment[] {
    return db.select().from(payments).orderBy(desc(payments.createdAt)).all();
  }
  getPaymentsByClient(clientId: number): Payment[] {
    return db.select().from(payments)
      .where(eq(payments.clientId, clientId))
      .orderBy(desc(payments.createdAt))
      .all();
  }
  createPayment(data: InsertPayment): Payment {
    return db.insert(payments).values(data).returning().get();
  }

  // ── Intake Questions ─────────────────────────────────
  getIntakeQuestions(): IntakeQuestion[] {
    return db.select().from(intakeQuestions).orderBy(intakeQuestions.sortOrder).all();
  }
  createIntakeQuestion(data: InsertIntakeQuestion): IntakeQuestion {
    return db.insert(intakeQuestions).values(data).returning().get();
  }
  updateIntakeQuestion(id: number, data: Partial<InsertIntakeQuestion>): IntakeQuestion | undefined {
    return db.update(intakeQuestions).set(data).where(eq(intakeQuestions.id, id)).returning().get();
  }
  deleteIntakeQuestion(id: number): void {
    db.delete(intakeQuestions).where(eq(intakeQuestions.id, id)).run();
  }

  // ── Intake Responses ─────────────────────────────────
  getIntakeResponsesByClient(clientId: number): IntakeResponse[] {
    return db.select().from(intakeResponses)
      .where(eq(intakeResponses.clientId, clientId))
      .all();
  }
  createIntakeResponse(data: InsertIntakeResponse): IntakeResponse {
    return db.insert(intakeResponses).values(data).returning().get();
  }
  deleteIntakeResponsesByClient(clientId: number): void {
    db.delete(intakeResponses).where(eq(intakeResponses.clientId, clientId)).run();
  }

  // ── Waiver Templates ─────────────────────────────────
  getWaiverTemplates(): WaiverTemplate[] {
    return db.select().from(waiverTemplates).all();
  }
  getActiveWaiver(): WaiverTemplate | undefined {
    return db.select().from(waiverTemplates)
      .where(eq(waiverTemplates.isActive, true))
      .get();
  }
  createWaiverTemplate(data: InsertWaiverTemplate): WaiverTemplate {
    return db.insert(waiverTemplates).values(data).returning().get();
  }
  updateWaiverTemplate(id: number, data: Partial<InsertWaiverTemplate>): WaiverTemplate | undefined {
    return db.update(waiverTemplates).set(data).where(eq(waiverTemplates.id, id)).returning().get();
  }

  // ── Message Logs ─────────────────────────────────────
  getMessageLogs(): MessageLog[] {
    return db.select().from(messageLogs).orderBy(desc(messageLogs.sentAt)).all();
  }
  getMessageLogsByClient(clientId: number): MessageLog[] {
    return db.select().from(messageLogs)
      .where(eq(messageLogs.clientId, clientId))
      .orderBy(desc(messageLogs.sentAt))
      .all();
  }
  createMessageLog(data: InsertMessageLog): MessageLog {
    return db.insert(messageLogs).values(data).returning().get();
  }

  // ── Inventory Items ──────────────────────────────────
  getInventoryItems(): InventoryItem[] {
    return db.select().from(inventoryItems).all();
  }
  getInventoryItem(id: number): InventoryItem | undefined {
    return db.select().from(inventoryItems).where(eq(inventoryItems.id, id)).get();
  }
  createInventoryItem(data: InsertInventoryItem): InventoryItem {
    return db.insert(inventoryItems).values(data).returning().get();
  }
  updateInventoryItem(id: number, data: Partial<InsertInventoryItem>): InventoryItem | undefined {
    return db.update(inventoryItems).set(data).where(eq(inventoryItems.id, id)).returning().get();
  }
  getLowStockItems(): InventoryItem[] {
    return db.select().from(inventoryItems)
      .where(and(
        eq(inventoryItems.isActive, true),
        sql`${inventoryItems.currentStock} <= ${inventoryItems.reorderLevel}`
      ))
      .all();
  }

  // ── Inventory Usage ──────────────────────────────────
  getInventoryUsage(itemId: number): InventoryUsage[] {
    return db.select().from(inventoryUsage)
      .where(eq(inventoryUsage.itemId, itemId))
      .orderBy(desc(inventoryUsage.usedAt))
      .all();
  }
  createInventoryUsage(data: InsertInventoryUsage): InventoryUsage {
    // Deduct stock
    const item = db.select().from(inventoryItems).where(eq(inventoryItems.id, data.itemId)).get();
    if (item) {
      db.update(inventoryItems)
        .set({ currentStock: item.currentStock - data.quantity })
        .where(eq(inventoryItems.id, data.itemId))
        .run();
    }
    return db.insert(inventoryUsage).values(data).returning().get();
  }

  // ── Business Settings ────────────────────────────────
  getBusinessSettings(): BusinessSettings {
    let settings = db.select().from(businessSettings).get();
    if (!settings) {
      settings = db.insert(businessSettings).values({}).returning().get();
    }
    return settings;
  }
  updateBusinessSettings(data: Partial<InsertBusinessSettings>): BusinessSettings {
    const current = this.getBusinessSettings();
    return db.update(businessSettings).set(data).where(eq(businessSettings.id, current.id)).returning().get();
  }

  // ── Dashboard ────────────────────────────────────────
  getDashboardStats() {
    const today = new Date().toISOString().split("T")[0];
    const monthStart = today.substring(0, 7) + "-01";

    const todayAppts = db.select({ count: sql<number>`count(*)` })
      .from(appointments).where(eq(appointments.date, today)).get();

    const totalCl = db.select({ count: sql<number>`count(*)` })
      .from(clients).get();

    const monthRev = db.select({ total: sql<number>`COALESCE(sum(amount), 0)` })
      .from(payments).where(gte(payments.createdAt, monthStart)).get();

    const activePkgs = db.select({ count: sql<number>`count(*)` })
      .from(clientPackages).where(eq(clientPackages.status, "active")).get();

    const recentAppts = db.select().from(appointments)
      .orderBy(desc(appointments.date))
      .limit(5).all();

    const enriched = recentAppts.map(a => {
      const cl = db.select().from(clients).where(eq(clients.id, a.clientId)).get();
      const svc = db.select().from(services).where(eq(services.id, a.serviceId)).get();
      return {
        ...a,
        clientName: cl ? `${cl.firstName} ${cl.lastName}` : "Unknown",
        serviceName: svc ? svc.name : "Unknown",
      };
    });

    return {
      todayAppointments: todayAppts?.count ?? 0,
      totalClients: totalCl?.count ?? 0,
      monthRevenue: monthRev?.total ?? 0,
      activePackages: activePkgs?.count ?? 0,
      recentAppointments: enriched,
    };
  }

  // ── Reports ──────────────────────────────────────────
  getRevenueByRange(startDate: string, endDate: string): { date: string; total: number }[] {
    return db.select({
      date: payments.createdAt,
      total: sql<number>`sum(${payments.amount})`,
    })
      .from(payments)
      .where(and(gte(payments.createdAt, startDate), lte(payments.createdAt, endDate)))
      .groupBy(payments.createdAt)
      .orderBy(payments.createdAt)
      .all();
  }

  getNoShowRate(startDate: string, endDate: string): { total: number; noShows: number } {
    const total = db.select({ count: sql<number>`count(*)` })
      .from(appointments)
      .where(and(gte(appointments.date, startDate), lte(appointments.date, endDate)))
      .get();
    const noShows = db.select({ count: sql<number>`count(*)` })
      .from(appointments)
      .where(and(
        gte(appointments.date, startDate),
        lte(appointments.date, endDate),
        eq(appointments.status, "no_show"),
      ))
      .get();
    return { total: total?.count ?? 0, noShows: noShows?.count ?? 0 };
  }

  getRebookingRate(startDate: string, endDate: string): { total: number; rebooked: number } {
    const completed = db.select({ count: sql<number>`count(*)` })
      .from(appointments)
      .where(and(
        gte(appointments.date, startDate),
        lte(appointments.date, endDate),
        eq(appointments.status, "completed"),
      ))
      .get();
    // Clients who had a completed appointment in range AND have a future appointment
    const rebooked = db.select({ count: sql<number>`count(DISTINCT ${appointments.clientId})` })
      .from(appointments)
      .where(and(
        gte(appointments.date, startDate),
        lte(appointments.date, endDate),
        eq(appointments.status, "completed"),
      ))
      .get();
    return { total: completed?.count ?? 0, rebooked: rebooked?.count ?? 0 };
  }

  getPopularServices(startDate: string, endDate: string): { serviceId: number; name: string; count: number }[] {
    const rows = db.select({
      serviceId: appointments.serviceId,
      count: sql<number>`count(*)`,
    })
      .from(appointments)
      .where(and(gte(appointments.date, startDate), lte(appointments.date, endDate)))
      .groupBy(appointments.serviceId)
      .orderBy(sql`count(*) DESC`)
      .limit(10)
      .all();

    return rows.map(r => {
      const svc = db.select().from(services).where(eq(services.id, r.serviceId)).get();
      return { serviceId: r.serviceId, name: svc?.name ?? "Unknown", count: r.count };
    });
  }

  // ── Gift Cards ──────────────────────────────────────────
  getGiftCards(): GiftCard[] {
    return db.select().from(giftCards).orderBy(desc(giftCards.createdAt)).all();
  }
  getGiftCard(id: number): GiftCard | undefined {
    return db.select().from(giftCards).where(eq(giftCards.id, id)).get();
  }
  getGiftCardByCode(code: string): GiftCard | undefined {
    return db.select().from(giftCards).where(eq(giftCards.code, code)).get();
  }
  createGiftCard(data: InsertGiftCard): GiftCard {
    return db.insert(giftCards).values(data).returning().get();
  }
  updateGiftCard(id: number, data: Partial<InsertGiftCard>): GiftCard | undefined {
    return db.update(giftCards).set(data).where(eq(giftCards.id, id)).returning().get();
  }

  // ── Waitlist ────────────────────────────────────────────
  getWaitlist(): Waitlist[] {
    return db.select().from(waitlist).orderBy(desc(waitlist.createdAt)).all();
  }
  getWaitlistByDate(date: string): Waitlist[] {
    return db.select().from(waitlist)
      .where(and(eq(waitlist.preferredDate, date), eq(waitlist.status, "waiting")))
      .all();
  }
  createWaitlistEntry(data: InsertWaitlist): Waitlist {
    return db.insert(waitlist).values(data).returning().get();
  }
  updateWaitlistEntry(id: number, data: Partial<InsertWaitlist>): Waitlist | undefined {
    return db.update(waitlist).set(data).where(eq(waitlist.id, id)).returning().get();
  }
  deleteWaitlistEntry(id: number): void {
    db.delete(waitlist).where(eq(waitlist.id, id)).run();
  }

  // ── Analytics v2 ────────────────────────────────────────
  getClientLifetimeValues() {
    const allPayments = db.select().from(payments).all();
    const allClients = db.select().from(clients).all();
    const allAppts = db.select().from(appointments).where(eq(appointments.status, "completed")).all();

    return allClients.map(c => {
      const clientPayments = allPayments.filter(p => p.clientId === c.id);
      const clientAppts = allAppts.filter(a => a.clientId === c.id);
      const totalSpent = clientPayments.reduce((sum, p) => sum + p.amount, 0);
      const dates = clientAppts.map(a => a.date).sort();
      return {
        clientId: c.id,
        name: `${c.firstName} ${c.lastName}`,
        totalSpent,
        visits: clientAppts.length,
        firstVisit: dates[0] || c.createdAt,
        lastVisit: dates[dates.length - 1] || c.createdAt,
      };
    }).sort((a, b) => b.totalSpent - a.totalSpent);
  }

  // ── Promo Codes ───────────────────────────────────────
  getPromoCodes(): PromoCode[] {
    return db.select().from(promoCodes).orderBy(desc(promoCodes.createdAt)).all();
  }
  getPromoCodeByCode(code: string): PromoCode | undefined {
    return db.select().from(promoCodes).where(eq(promoCodes.code, code)).get();
  }
  createPromoCode(data: InsertPromoCode): PromoCode {
    return db.insert(promoCodes).values(data).returning().get();
  }
  updatePromoCode(id: number, data: Partial<InsertPromoCode>): PromoCode | undefined {
    return db.update(promoCodes).set(data).where(eq(promoCodes.id, id)).returning().get();
  }

  // ── Loyalty Points ────────────────────────────────────
  getLoyaltyPointsByClient(clientId: number): LoyaltyPoints[] {
    return db.select().from(loyaltyPoints)
      .where(eq(loyaltyPoints.clientId, clientId))
      .orderBy(desc(loyaltyPoints.createdAt)).all();
  }
  getClientPointsBalance(clientId: number): number {
    const rows = db.select().from(loyaltyPoints).where(eq(loyaltyPoints.clientId, clientId)).all();
    return rows.reduce((sum, r) => sum + r.points, 0);
  }
  createLoyaltyEntry(data: InsertLoyaltyPoints): LoyaltyPoints {
    return db.insert(loyaltyPoints).values(data).returning().get();
  }

  // ── Search ───────────────────────────────────────────
  searchAll(query: string) {
    const q = `%${query.toLowerCase()}%`;
    const matchedClients = db.select().from(clients)
      .where(sql`lower(${clients.firstName} || ' ' || ${clients.lastName}) LIKE ${q} OR lower(${clients.phone}) LIKE ${q} OR lower(${clients.email}) LIKE ${q}`)
      .all();
    const clientIds = matchedClients.map(c => c.id);
    const matchedAppts = clientIds.length > 0
      ? db.select().from(appointments).all().filter(a => clientIds.includes(a.clientId))
      : [];
    return { clients: matchedClients, appointments: matchedAppts };
  }

  // ── Birthdays ────────────────────────────────────────
  getUpcomingBirthdays(days: number): Client[] {
    const allClients = db.select().from(clients).all();
    const today = new Date();
    return allClients.filter(c => {
      if (!c.birthday) return false;
      const [, m, d] = c.birthday.split("-").map(Number);
      const bday = new Date(today.getFullYear(), m - 1, d);
      if (bday < today) bday.setFullYear(bday.getFullYear() + 1);
      const diff = (bday.getTime() - today.getTime()) / 86400000;
      return diff >= 0 && diff <= days;
    });
  }
}

export const storage = new DatabaseStorage();

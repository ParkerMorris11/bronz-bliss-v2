import { eq, and, gte, lte } from "drizzle-orm";
import { db, isPostgres, sqlite, pool } from "./db";
import {
  clients, services, appointments, packages,
  type Client, type InsertClient,
  type Service, type InsertService,
  type Appointment, type InsertAppointment,
  type Package, type InsertPackage,
} from "@shared/schema";

// ── Schema bootstrap ────────────────────────────────────────────────────────
// SQLite: create tables inline. Postgres: run migrations via drizzle-kit push.

const SQLITE_DDL = `
  CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    skin_tone TEXT,
    tan_history TEXT,
    waiver_signed INTEGER DEFAULT 0,
    intake_complete INTEGER DEFAULT 0,
    first_visit_date TEXT,
    last_visit_date TEXT,
    total_visits INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active',
    tags TEXT,
    notes TEXT,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS services (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    duration_minutes INTEGER NOT NULL,
    price REAL NOT NULL,
    description TEXT,
    active INTEGER DEFAULT 1
  );
  CREATE TABLE IF NOT EXISTS appointments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL,
    service_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    status TEXT DEFAULT 'scheduled',
    notes TEXT,
    revenue REAL,
    prep_reminder_sent INTEGER DEFAULT 0,
    rinse_reminder_sent INTEGER DEFAULT 0,
    review_request_sent INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    FOREIGN KEY (client_id) REFERENCES clients(id),
    FOREIGN KEY (service_id) REFERENCES services(id)
  );
  CREATE TABLE IF NOT EXISTS packages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    total_sessions INTEGER,
    used_sessions INTEGER DEFAULT 0,
    start_date TEXT NOT NULL,
    end_date TEXT,
    price REAL NOT NULL,
    active INTEGER DEFAULT 1,
    FOREIGN KEY (client_id) REFERENCES clients(id)
  );
`;

const PG_DDL = `
  CREATE TABLE IF NOT EXISTS clients (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    skin_tone TEXT,
    tan_history TEXT,
    waiver_signed BOOLEAN DEFAULT FALSE,
    intake_complete BOOLEAN DEFAULT FALSE,
    first_visit_date TEXT,
    last_visit_date TEXT,
    total_visits INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active',
    tags TEXT,
    notes TEXT,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS services (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    duration_minutes INTEGER NOT NULL,
    price NUMERIC NOT NULL,
    description TEXT,
    active BOOLEAN DEFAULT TRUE
  );
  CREATE TABLE IF NOT EXISTS appointments (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES clients(id),
    service_id INTEGER NOT NULL REFERENCES services(id),
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    status TEXT DEFAULT 'scheduled',
    notes TEXT,
    revenue NUMERIC,
    prep_reminder_sent BOOLEAN DEFAULT FALSE,
    rinse_reminder_sent BOOLEAN DEFAULT FALSE,
    review_request_sent BOOLEAN DEFAULT FALSE,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS packages (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES clients(id),
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    total_sessions INTEGER,
    used_sessions INTEGER DEFAULT 0,
    start_date TEXT NOT NULL,
    end_date TEXT,
    price NUMERIC NOT NULL,
    active BOOLEAN DEFAULT TRUE
  );
`;

export async function initDb() {
  if (isPostgres) {
    await pool.query(PG_DDL);
  } else {
    sqlite.exec(SQLITE_DDL);
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────
// Drizzle's better-sqlite3 driver is synchronous (.get()/.all())
// Drizzle's pg driver is async (returns Promises).
// We normalise everything to async so the routes work identically.

async function one<T>(q: any): Promise<T | undefined> {
  if (isPostgres) {
    const rows = await q;
    return (Array.isArray(rows) ? rows[0] : rows) as T | undefined;
  }
  return q.get() as T | undefined;
}
async function many<T>(q: any): Promise<T[]> {
  if (isPostgres) {
    const rows = await q;
    return (Array.isArray(rows) ? rows : [rows]) as T[];
  }
  return q.all() as T[];
}

// ── Storage interface ────────────────────────────────────────────────────────

export const storage = {
  // Clients
  async getClients(): Promise<Client[]> {
    return many(db.select().from(clients));
  },
  async getClient(id: number): Promise<Client | undefined> {
    return one(db.select().from(clients).where(eq(clients.id, id)));
  },
  async createClient(data: InsertClient): Promise<Client> {
    const result = await db.insert(clients).values(data).returning();
    return Array.isArray(result) ? result[0] : (result as any).get();
  },
  async updateClient(id: number, data: Partial<InsertClient>): Promise<Client | undefined> {
    const result = await db.update(clients).set(data).where(eq(clients.id, id)).returning();
    return Array.isArray(result) ? result[0] : (result as any).get();
  },
  async bulkImportClients(rows: InsertClient[]): Promise<{ imported: number; skipped: number }> {
    // Fetch existing phones to avoid duplicates
    const existing = await many<Client>(db.select().from(clients));
    const existingPhones = new Set(existing.map((c) => (c.phone || '').replace(/\D/g, '')));
    const existingNames = new Set(existing.map((c) => c.name.toLowerCase()));
    let imported = 0;
    let skipped = 0;
    for (const row of rows) {
      const phone = (row.phone || '').replace(/\D/g, '');
      if (phone && existingPhones.has(phone)) { skipped++; continue; }
      if (!phone && existingNames.has(row.name.toLowerCase())) { skipped++; continue; }
      await db.insert(clients).values(row).returning();
      if (phone) existingPhones.add(phone);
      existingNames.add(row.name.toLowerCase());
      imported++;
    }
    return { imported, skipped };
  },

  // Services
  async getServices(): Promise<Service[]> {
    return many(db.select().from(services));
  },
  async createService(data: InsertService): Promise<Service> {
    const result = await db.insert(services).values(data).returning();
    return Array.isArray(result) ? result[0] : (result as any).get();
  },

  // Appointments
  async getAppointments(date?: string): Promise<Appointment[]> {
    if (date) return many(db.select().from(appointments).where(eq(appointments.date, date)));
    return many(db.select().from(appointments));
  },
  async getAppointmentsByDateRange(start: string, end: string): Promise<Appointment[]> {
    return many(
      db.select().from(appointments)
        .where(and(gte(appointments.date, start), lte(appointments.date, end)))
    );
  },
  async createAppointment(data: InsertAppointment): Promise<Appointment> {
    const result = await db.insert(appointments).values(data).returning();
    return Array.isArray(result) ? result[0] : (result as any).get();
  },
  async updateAppointment(id: number, data: Partial<InsertAppointment>): Promise<Appointment | undefined> {
    const result = await db.update(appointments).set(data).where(eq(appointments.id, id)).returning();
    return Array.isArray(result) ? result[0] : (result as any).get();
  },

  // Packages
  async getPackages(): Promise<Package[]> {
    return many(db.select().from(packages));
  },
  async createPackage(data: InsertPackage): Promise<Package> {
    const result = await db.insert(packages).values(data).returning();
    return Array.isArray(result) ? result[0] : (result as any).get();
  },
  async updatePackage(id: number, data: Partial<InsertPackage>): Promise<Package | undefined> {
    const result = await db.update(packages).set(data).where(eq(packages.id, id)).returning();
    return Array.isArray(result) ? result[0] : (result as any).get();
  },

  // Dashboard aggregates
  async getDashboardData(today: string): Promise<DashboardData> {
    const allClients = await many<Client>(db.select().from(clients));
    const allServices = await many<Service>(db.select().from(services));
    const serviceMap = Object.fromEntries(allServices.map(s => [s.id, s]));
    const clientMap = Object.fromEntries(allClients.map(c => [c.id, c]));

    // Today's bookings
    const todayAppts = await many<Appointment>(
      db.select().from(appointments).where(eq(appointments.date, today))
    );
    const todayWithNames = todayAppts.map(a => ({
      ...a,
      clientName: clientMap[a.clientId]?.name ?? "Unknown",
      serviceName: serviceMap[a.serviceId]?.name ?? "Unknown",
      clientWaiver: clientMap[a.clientId]?.waiverSigned ?? false,
      clientIntake: clientMap[a.clientId]?.intakeComplete ?? false,
    })).sort((a, b) => a.time.localeCompare(b.time));

    const now = new Date();
    const nowStr = `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
    const upcoming = todayWithNames.filter(a => a.status === "scheduled" && a.time > nowStr);
    const nextClient = upcoming[0] ?? null;

    // Gaps
    const gaps: { start: string; end: string }[] = [];
    const sortedTimes = todayWithNames.map(a => ({
      start: a.time,
      end: addMinutes(a.time, serviceMap[a.serviceId]?.durationMinutes ?? 45),
    }));
    for (let i = 0; i < sortedTimes.length - 1; i++) {
      const gapStart = sortedTimes[i].end;
      const gapEnd = sortedTimes[i + 1].start;
      if (timeToMins(gapEnd) - timeToMins(gapStart) >= 30) {
        gaps.push({ start: gapStart, end: gapEnd });
      }
    }

    // Revenue
    const bookedToday = todayAppts.reduce((s, a) => s + (Number(serviceMap[a.serviceId]?.price) ?? 0), 0);
    const completedToday = todayAppts
      .filter(a => a.status === "completed")
      .reduce((s, a) => s + (Number(a.revenue) ?? Number(serviceMap[a.serviceId]?.price) ?? 0), 0);

    // 7-day trend
    const sevenDayTrend: { date: string; amount: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today + "T12:00:00"); d.setDate(d.getDate() - i);
      const ds = d.toISOString().slice(0, 10);
      const dayAppts = await many<Appointment>(
        db.select().from(appointments)
          .where(and(eq(appointments.date, ds), eq(appointments.status, "completed")))
      );
      const amt = dayAppts.reduce((s, a) => s + (Number(a.revenue) ?? Number(serviceMap[a.serviceId]?.price) ?? 0), 0);
      sevenDayTrend.push({ date: ds, amount: amt });
    }

    // Package liability
    const activePackages = await many<Package>(
      db.select().from(packages).where(eq(packages.active, true))
    );
    const packageLiability = {
      totalSessionsOwed: activePackages.reduce((s, p) => s + Math.max(0, (p.totalSessions ?? 0) - (p.usedSessions ?? 0)), 0),
      activePackages: activePackages.map(p => ({
        ...p,
        clientName: clientMap[p.clientId]?.name ?? "Unknown",
        sessionsRemaining: Math.max(0, (p.totalSessions ?? 0) - (p.usedSessions ?? 0)),
      })),
    };

    // Retention
    const dt30 = new Date(today + "T12:00:00"); dt30.setDate(dt30.getDate() - 30);
    const dt90 = new Date(today + "T12:00:00"); dt90.setDate(dt90.getDate() - 90);
    const t30 = dt30.toISOString().slice(0, 10);
    const t90 = dt90.toISOString().slice(0, 10);
    const firstTime = allClients.filter(c => c.totalVisits === 1).length;
    const activeRepeat = allClients.filter(c => (c.totalVisits ?? 0) > 1 && c.lastVisitDate && c.lastVisitDate >= t30).length;
    const atRisk = allClients.filter(c => (c.totalVisits ?? 0) > 1 && c.lastVisitDate && c.lastVisitDate < t30 && c.lastVisitDate >= t90).length;
    const dormant = allClients.filter(c => !c.lastVisitDate || c.lastVisitDate < t90).length;

    // Follow-up queue
    const dtTomorrow = new Date(today + "T12:00:00"); dtTomorrow.setDate(dtTomorrow.getDate() + 1);
    const tomorrowStr = dtTomorrow.toISOString().slice(0, 10);
    const dtYesterday = new Date(today + "T12:00:00"); dtYesterday.setDate(dtYesterday.getDate() - 1);
    const yesterdayStr = dtYesterday.toISOString().slice(0, 10);
    const dt3 = new Date(today + "T12:00:00"); dt3.setDate(dt3.getDate() - 3);
    const threeDaysAgoStr = dt3.toISOString().slice(0, 10);

    const tomorrowAppts = await many<Appointment>(db.select().from(appointments).where(eq(appointments.date, tomorrowStr)));
    const yesterdayCompleted = await many<Appointment>(
      db.select().from(appointments).where(and(eq(appointments.date, yesterdayStr), eq(appointments.status, "completed")))
    );
    const threeDayCompleted = await many<Appointment>(
      db.select().from(appointments).where(and(eq(appointments.date, threeDaysAgoStr), eq(appointments.status, "completed")))
    );

    const prepReminders = tomorrowAppts
      .filter(a => !a.prepReminderSent && a.status === "scheduled")
      .map(a => ({ ...a, clientName: clientMap[a.clientId]?.name ?? "Unknown", clientPhone: clientMap[a.clientId]?.phone ?? "" }));
    const rinseReminders = yesterdayCompleted
      .filter(a => !a.rinseReminderSent)
      .map(a => ({ ...a, clientName: clientMap[a.clientId]?.name ?? "Unknown", clientPhone: clientMap[a.clientId]?.phone ?? "" }));
    const reviewRequests = threeDayCompleted
      .filter(a => !a.reviewRequestSent)
      .map(a => ({ ...a, clientName: clientMap[a.clientId]?.name ?? "Unknown", clientPhone: clientMap[a.clientId]?.phone ?? "" }));

    // Service mix
    const thirtyDayAppts = await many<Appointment>(
      db.select().from(appointments)
        .where(and(gte(appointments.date, t30), eq(appointments.status, "completed")))
    );
    const mixMap: Record<number, { count: number; revenue: number }> = {};
    for (const a of thirtyDayAppts) {
      mixMap[a.serviceId] = mixMap[a.serviceId] ?? { count: 0, revenue: 0 };
      mixMap[a.serviceId].count++;
      mixMap[a.serviceId].revenue += Number(a.revenue) ?? Number(serviceMap[a.serviceId]?.price) ?? 0;
    }
    const serviceMix = Object.entries(mixMap).map(([id, v]) => ({
      serviceName: serviceMap[Number(id)]?.name ?? "Unknown",
      serviceType: serviceMap[Number(id)]?.type ?? "spray",
      count: v.count,
      revenue: v.revenue,
    })).sort((a, b) => b.count - a.count);

    // Calendar utilization
    const DAILY_SLOTS = 10;
    const calendarUtilization: { date: string; appointmentCount: number; filledSlots: number; totalSlots: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today + "T12:00:00"); d.setDate(d.getDate() - i);
      const ds = d.toISOString().slice(0, 10);
      const dayAppts = await many<Appointment>(db.select().from(appointments).where(eq(appointments.date, ds)));
      calendarUtilization.push({ date: ds, appointmentCount: dayAppts.length, filledSlots: dayAppts.length, totalSlots: DAILY_SLOTS });
    }

    return {
      todayBookings: { count: todayAppts.length, nextClient, gaps, appointments: todayWithNames },
      revenue: { bookedToday, completedToday, sevenDayTrend },
      packageLiability,
      clientRetention: { firstTime, activeRepeat, atRisk, dormant },
      followUpQueue: { prepReminders, rinseReminders, reviewRequests },
      serviceMix,
      calendarUtilization,
    };
  },
};

// ── Types ────────────────────────────────────────────────────────────────────
export interface DashboardData {
  todayBookings: {
    count: number;
    nextClient: (Appointment & { clientName: string; serviceName: string }) | null;
    gaps: { start: string; end: string }[];
    appointments: (Appointment & { clientName: string; serviceName: string; clientWaiver: boolean; clientIntake: boolean })[];
  };
  revenue: { bookedToday: number; completedToday: number; sevenDayTrend: { date: string; amount: number }[] };
  packageLiability: { totalSessionsOwed: number; activePackages: (Package & { clientName: string; sessionsRemaining: number })[] };
  clientRetention: { firstTime: number; activeRepeat: number; atRisk: number; dormant: number };
  followUpQueue: {
    prepReminders: (Appointment & { clientName: string; clientPhone: string })[];
    rinseReminders: (Appointment & { clientName: string; clientPhone: string })[];
    reviewRequests: (Appointment & { clientName: string; clientPhone: string })[];
  };
  serviceMix: { serviceName: string; serviceType: string; count: number; revenue: number }[];
  calendarUtilization: { date: string; appointmentCount: number; filledSlots: number; totalSlots: number }[];
}

function timeToMins(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}
function addMinutes(t: string, mins: number) {
  const total = timeToMins(t) + mins;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

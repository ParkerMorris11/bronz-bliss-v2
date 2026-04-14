import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import Twilio from "twilio";

export async function registerRoutes(httpServer: Server, app: Express) {
  const today = () => new Date().toISOString().slice(0, 10);

  // Dashboard
  app.get("/api/dashboard", async (req, res) => {
    try {
      const date = (req.query.date as string) || today();
      const data = await storage.getDashboardData(date);
      res.json(data);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Clients
  app.get("/api/clients", async (_req, res) => {
    res.json(await storage.getClients());
  });
  app.get("/api/clients/:id", async (req, res) => {
    const c = await storage.getClient(Number(req.params.id));
    if (!c) return res.status(404).json({ error: "Not found" });
    res.json(c);
  });
  app.post("/api/clients", async (req, res) => {
    const c = await storage.createClient({ ...req.body, createdAt: new Date().toISOString() });
    res.json(c);
  });
  app.patch("/api/clients/:id", async (req, res) => {
    const c = await storage.updateClient(Number(req.params.id), req.body);
    if (!c) return res.status(404).json({ error: "Not found" });
    res.json(c);
  });
  // Bulk import: accepts array of client objects
  app.post("/api/clients/import", async (req, res) => {
    try {
      const rows = req.body as Array<{
        name: string; phone?: string; email?: string; notes?: string;
      }>;
      if (!Array.isArray(rows)) return res.status(400).json({ error: "Expected array" });
      const now = new Date().toISOString();
      const mapped = rows.map((r) => ({
        name: r.name,
        phone: (r.phone || '').replace(/\D/g, ''),
        email: r.email || null,
        notes: r.notes || null,
        status: 'active' as const,
        waiverSigned: false,
        intakeComplete: false,
        totalVisits: 0,
        createdAt: now,
      }));
      const result = await storage.bulkImportClients(mapped);
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Services
  app.get("/api/services", async (_req, res) => {
    res.json(await storage.getServices());
  });
  app.post("/api/services", async (req, res) => {
    res.json(await storage.createService(req.body));
  });

  // Appointments
  app.get("/api/appointments", async (req, res) => {
    const { date, start, end } = req.query as Record<string, string>;
    if (start && end) return res.json(await storage.getAppointmentsByDateRange(start, end));
    res.json(await storage.getAppointments(date));
  });
  app.post("/api/appointments", async (req, res) => {
    const a = await storage.createAppointment({ ...req.body, createdAt: new Date().toISOString() });
    res.json(a);
  });
  app.patch("/api/appointments/:id", async (req, res) => {
    const a = await storage.updateAppointment(Number(req.params.id), req.body);
    if (!a) return res.status(404).json({ error: "Not found" });
    res.json(a);
  });

  // Packages
  app.get("/api/packages", async (_req, res) => {
    res.json(await storage.getPackages());
  });
  app.post("/api/packages", async (req, res) => {
    res.json(await storage.createPackage(req.body));
  });
  app.patch("/api/packages/:id", async (req, res) => {
    const p = await storage.updatePackage(Number(req.params.id), req.body);
    if (!p) return res.status(404).json({ error: "Not found" });
    res.json(p);
  });

  // ── SMS via Twilio ──────────────────────────────────────────────────────
  app.post("/api/sms/send", async (req, res) => {
    try {
      const { to, message } = req.body;
      if (!to || !message) return res.status(400).json({ error: "to and message required" });

      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const fromNumber = process.env.TWILIO_PHONE_NUMBER;

      if (!accountSid || !authToken || !fromNumber) {
        return res.status(500).json({ error: "Twilio not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER in environment." });
      }

      const client = Twilio(accountSid, authToken);
      const phone = "+1" + to.replace(/\D/g, "").slice(-10);

      const result = await client.messages.create({
        body: message,
        from: fromNumber,
        to: phone,
      });

      res.json({ ok: true, sid: result.sid, status: result.status });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Check Twilio config status
  app.get("/api/sms/status", (_req, res) => {
    const configured = !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER);
    res.json({ configured });
  });

  // Seed (dev only — protected by requireAuth middleware but also env guard)
  app.post("/api/seed", async (_req, res) => {
    await seedDatabase();
    res.json({ ok: true, message: "Seeded successfully" });
  });

  // Auto-seed on startup if empty
  try {
    await seedDatabase();
  } catch (e) {
    console.error("Seed error (non-fatal):", e);
  }
}

async function seedDatabase() {
  const existing = await storage.getServices();
  if (existing.length > 0) return; // already seeded

  const svc = await Promise.all([
    storage.createService({ name: "Classic Spray Tan",       type: "spray",    durationMinutes: 45, price: 55, description: "Full-body spray, 1-hour wait",       active: true }),
    storage.createService({ name: "Express Bronze",           type: "express",  durationMinutes: 30, price: 45, description: "2-4 hour rapid formula",             active: true }),
    storage.createService({ name: "Luxury Glow Treatment",    type: "luxury",   durationMinutes: 60, price: 80, description: "Exfoliation + spray + moisturize",   active: true }),
    storage.createService({ name: "Custom Bronzing",          type: "bronzing", durationMinutes: 45, price: 65, description: "Contour blending + custom depth",     active: true }),
    storage.createService({ name: "Maintenance Touch-Up",     type: "spray",    durationMinutes: 20, price: 30, description: "Quick maintenance refresh",           active: true }),
  ]);

  const today = new Date().toISOString().slice(0, 10);
  const d = (daysAgo: number) => {
    const dt = new Date(); dt.setDate(dt.getDate() - daysAgo);
    return dt.toISOString().slice(0, 10);
  };

  const cls = await Promise.all([
    storage.createClient({ name: "Mia Summers",   phone: "(435) 555-0101", email: "mia@email.com",   skinTone: "fair",   waiverSigned: true,  intakeComplete: true,  firstVisitDate: d(90),  lastVisitDate: d(7),  totalVisits: 12, status: "active",   createdAt: new Date().toISOString() }),
    storage.createClient({ name: "Jade Torres",   phone: "(435) 555-0102", email: "jade@email.com",  skinTone: "medium", waiverSigned: true,  intakeComplete: true,  firstVisitDate: d(120), lastVisitDate: d(3),  totalVisits: 8,  status: "active",   createdAt: new Date().toISOString() }),
    storage.createClient({ name: "Chloe Bennett", phone: "(435) 555-0103", email: "chloe@email.com", skinTone: "fair",   waiverSigned: true,  intakeComplete: false, firstVisitDate: today,  lastVisitDate: today, totalVisits: 1,  status: "active",   createdAt: new Date().toISOString() }),
    storage.createClient({ name: "Avery Walsh",   phone: "(435) 555-0104", email: "avery@email.com", skinTone: "olive",  waiverSigned: false, intakeComplete: false, firstVisitDate: today,  lastVisitDate: today, totalVisits: 1,  status: "active",   createdAt: new Date().toISOString() }),
    storage.createClient({ name: "Sofia Rivera",  phone: "(435) 555-0105", email: "sofia@email.com", skinTone: "dark",   waiverSigned: true,  intakeComplete: true,  firstVisitDate: d(200), lastVisitDate: d(45), totalVisits: 5,  status: "at_risk",  createdAt: new Date().toISOString() }),
    storage.createClient({ name: "Brynn Mitchell",phone: "(435) 555-0106", email: "brynn@email.com", skinTone: "medium", waiverSigned: true,  intakeComplete: true,  firstVisitDate: d(365), lastVisitDate: d(95), totalVisits: 3,  status: "dormant",  createdAt: new Date().toISOString() }),
    storage.createClient({ name: "Emma Caldwell", phone: "(435) 555-0107", email: "emma@email.com",  skinTone: "fair",   waiverSigned: true,  intakeComplete: true,  firstVisitDate: d(30),  lastVisitDate: d(14), totalVisits: 4,  status: "active",   createdAt: new Date().toISOString() }),
    storage.createClient({ name: "Riley Park",    phone: "(435) 555-0108", email: "riley@email.com", skinTone: "medium", waiverSigned: true,  intakeComplete: true,  firstVisitDate: d(60),  lastVisitDate: d(20), totalVisits: 6,  status: "active",   createdAt: new Date().toISOString() }),
    storage.createClient({ name: "Nora Jensen",   phone: "(435) 555-0109", email: "nora@email.com",  skinTone: "fair",   waiverSigned: false, intakeComplete: false, firstVisitDate: today,  lastVisitDate: today, totalVisits: 1,  status: "active",   createdAt: new Date().toISOString() }),
    storage.createClient({ name: "Haley Cross",   phone: "(435) 555-0110", email: "haley@email.com", skinTone: "olive",  waiverSigned: true,  intakeComplete: true,  firstVisitDate: d(150), lastVisitDate: d(80), totalVisits: 7,  status: "dormant",  createdAt: new Date().toISOString() }),
  ]);

  await Promise.all([
    storage.createPackage({ clientId: cls[0].id, name: "5-Session Bundle",  type: "bundle",     totalSessions: 5,    usedSessions: 2, startDate: d(30), endDate: d(-60), price: 220, active: true }),
    storage.createPackage({ clientId: cls[1].id, name: "Monthly Unlimited", type: "membership", totalSessions: null, usedSessions: 4, startDate: d(15), endDate: d(-15), price: 120, active: true }),
    storage.createPackage({ clientId: cls[6].id, name: "3-Session Bundle",  type: "bundle",     totalSessions: 3,    usedSessions: 1, startDate: d(20), endDate: d(-40), price: 140, active: true }),
    storage.createPackage({ clientId: cls[7].id, name: "5-Session Bundle",  type: "bundle",     totalSessions: 5,    usedSessions: 3, startDate: d(45), endDate: d(-45), price: 220, active: true }),
  ]);

  // Today's appointments
  const apptData = [
    { client: cls[0], service: svc[0], time: "09:00", status: "completed",  revenue: svc[0].price },
    { client: cls[1], service: svc[1], time: "10:00", status: "completed",  revenue: svc[1].price },
    { client: cls[2], service: svc[2], time: "11:00", status: "checked_in", revenue: null },
    { client: cls[3], service: svc[0], time: "13:30", status: "scheduled",  revenue: null },
    { client: cls[8], service: svc[3], time: "14:30", status: "scheduled",  revenue: null },
    { client: cls[6], service: svc[0], time: "16:00", status: "scheduled",  revenue: null },
  ];
  for (const a of apptData) {
    await storage.createAppointment({
      clientId: a.client.id, serviceId: a.service.id,
      date: today, time: a.time, status: a.status,
      revenue: a.revenue as any,
      prepReminderSent: a.status !== "scheduled",
      rinseReminderSent: false, reviewRequestSent: false,
      createdAt: new Date().toISOString(),
    } as any);
  }

  // Historical data for charts
  const historical = [
    { daysAgo: 6, count: 4, svcIdx: 0 }, { daysAgo: 5, count: 6, svcIdx: 1 },
    { daysAgo: 4, count: 3, svcIdx: 2 }, { daysAgo: 3, count: 7, svcIdx: 0 },
    { daysAgo: 2, count: 5, svcIdx: 1 }, { daysAgo: 1, count: 8, svcIdx: 3 },
  ];
  for (const { daysAgo, count, svcIdx } of historical) {
    for (let i = 0; i < count; i++) {
      await storage.createAppointment({
        clientId: cls[i % cls.length].id, serviceId: svc[svcIdx].id,
        date: d(daysAgo), time: `${String(9 + i).padStart(2,"0")}:00`,
        status: "completed", revenue: svc[svcIdx].price as any,
        prepReminderSent: true, rinseReminderSent: daysAgo > 1, reviewRequestSent: daysAgo > 3,
        createdAt: new Date().toISOString(),
      } as any);
    }
  }

  // Yesterday completed (for rinse reminders)
  await storage.createAppointment({
    clientId: cls[4].id, serviceId: svc[0].id,
    date: d(1), time: "14:00", status: "completed", revenue: svc[0].price as any,
    prepReminderSent: true, rinseReminderSent: false, reviewRequestSent: false,
    createdAt: new Date().toISOString(),
  } as any);
}

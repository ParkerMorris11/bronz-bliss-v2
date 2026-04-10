import type { Express } from "express";
import type { Server } from "http";
import bcrypt from "bcryptjs";
import { storage } from "./storage";
import twilio from "twilio";

declare global {
  namespace Express {
    interface Request {
      validated: any;
    }
  }
}
import {
  insertServiceSchema,
  insertClientSchema,
  insertAppointmentSchema,
  insertSessionRecordSchema,
  insertPackagePlanSchema,
  insertClientPackageSchema,
  insertPaymentSchema,
  insertInventoryItemSchema,
  insertGiftCardSchema,
  insertWaitlistSchema,
  insertPromoCodeSchema,
} from "@shared/schema";

const LEGACY_DAY_KEYS: Record<string, string> = {
  Monday: "mon",
  Tuesday: "tue",
  Wednesday: "wed",
  Thursday: "thu",
  Friday: "fri",
  Saturday: "sat",
  Sunday: "sun",
};

type AvailabilityError = {
  status: 404;
  body: { error: string };
};

type AvailabilitySuccess = {
  status: 200;
  body: { slots: string[]; closed: boolean };
  settings: ReturnType<typeof storage.getBusinessSettings>;
  service: NonNullable<ReturnType<typeof storage.getService>>;
};

async function ensureAdminHash() {
  const settings = storage.getBusinessSettings();
  if (settings.adminPasswordHash) return settings.adminPasswordHash;
  const hash = await bcrypt.hash("bronzbliss", 10);
  storage.updateBusinessSettings({ adminPasswordHash: hash });
  return hash;
}

function getCurrentDateParts(timezone: string) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const parts = formatter.formatToParts(new Date());
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return {
    today: `${get("year")}-${get("month")}-${get("day")}`,
    minutes: Number(get("hour")) * 60 + Number(get("minute")),
  };
}

function getOperatingWindow(operatingHours: string | null, date: string) {
  const weekday = new Date(`${date}T12:00:00`).toLocaleDateString("en-US", { weekday: "long" });
  let openMin = 9 * 60;
  let closeMin = 18 * 60;
  let isOpen = true;

  if (operatingHours) {
    try {
      const hours = JSON.parse(operatingHours);
      const dayHours = hours[weekday] ?? hours[LEGACY_DAY_KEYS[weekday]];
      if (!dayHours) {
        isOpen = false;
      } else {
        const [oh, om] = (dayHours.open || "09:00").split(":").map(Number);
        const [ch, cm] = (dayHours.close || "18:00").split(":").map(Number);
        openMin = oh * 60 + om;
        closeMin = ch * 60 + cm;
      }
    } catch {}
  }

  return { isOpen, openMin, closeMin };
}

function getAvailabilityForService(date: string, serviceId: number) {
  const settings = storage.getBusinessSettings();
  const service = storage.getService(serviceId);
  if (!service) {
    return { status: 404, body: { error: "Service not found" } } satisfies AvailabilityError;
  }

  if (!settings.bookingEnabled) {
    return { status: 200, body: { slots: [], closed: true }, settings, service } satisfies AvailabilitySuccess;
  }

  const { isOpen, openMin, closeMin } = getOperatingWindow(settings.operatingHours, date);
  if (!isOpen) {
    return { status: 200, body: { slots: [], closed: true }, settings, service } satisfies AvailabilitySuccess;
  }

  const timezone = settings.timezone || "America/Denver";
  const now = getCurrentDateParts(timezone);
  const notice = settings.bookingNotice ?? 60;
  const nowMin = date === now.today ? now.minutes + notice : 0;
  const existing = storage.getAppointmentsByDate(date).filter(
    (appointment) => appointment.status !== "cancelled" && appointment.status !== "no_show"
  );
  const blocks = existing.map((appointment) => {
    const bookedService = storage.getService(appointment.serviceId);
    const [hour, minute] = appointment.time.split(":").map(Number);
    const start = hour * 60 + minute;
    return { start, end: start + (bookedService?.duration ?? 30) };
  });

  const slots: string[] = [];
  for (let minute = openMin; minute + service.duration <= closeMin; minute += 15) {
    if (minute < nowMin) continue;
    if (!blocks.some((block) => minute < block.end && minute + service.duration > block.start)) {
      const hour = Math.floor(minute / 60).toString().padStart(2, "0");
      const minutePart = (minute % 60).toString().padStart(2, "0");
      slots.push(`${hour}:${minutePart}`);
    }
  }

  return { status: 200, body: { slots, closed: false }, settings, service } satisfies AvailabilitySuccess;
}

function validate(schema: { safeParse: (data: unknown) => { success: boolean; data?: any; error?: any } }) {
  return (req: any, res: any, next: any) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: "Invalid request data", details: result.error.flatten() });
    }
    req.validated = result.data;
    next();
  };
}

export async function registerRoutes(server: Server, app: Express) {
  // If ADMIN_PASSWORD env var is set, always sync it to DB on startup so
  // rotating the env credential takes effect on the next server restart.
  if (process.env.ADMIN_PASSWORD) {
    const hash = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);
    storage.updateBusinessSettings({ adminPasswordHash: hash });
  }

  // ── Auth ──────────────────────────────────────────────
  app.post("/api/auth/login", async (req, res) => {
    const { password } = req.body;
    const adminHash = await ensureAdminHash();
    const match = await bcrypt.compare(password || "", adminHash);
    if (match) {
      (req.session as any).authenticated = true;
      res.json({ success: true });
    } else {
      res.status(401).json({ success: false, error: "Wrong password" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => {});
    res.json({ success: true });
  });

  app.post("/api/auth/change-password", async (req, res) => {
    if (!(req.session as any)?.authenticated) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: "Invalid request. New password must be at least 8 characters." });
    }
    const adminHash = await ensureAdminHash();
    const match = await bcrypt.compare(currentPassword, adminHash);
    if (!match) return res.status(401).json({ error: "Current password is incorrect." });
    const nextHash = await bcrypt.hash(newPassword, 10);
    storage.updateBusinessSettings({ adminPasswordHash: nextHash });
    res.json({ success: true });
  });

  app.get("/api/auth/check", (req, res) => {
    res.json({ authenticated: !!(req.session as any)?.authenticated });
  });

  // ── Dashboard ─────────────────────────────────────────
  app.get("/api/dashboard", (_req, res) => {
    const stats = storage.getDashboardStats();
    res.json(stats);
  });

  // ── Services ──────────────────────────────────────────
  app.get("/api/services", (_req, res) => {
    res.json(storage.getServices());
  });
  app.get("/api/services/:id", (req, res) => {
    const svc = storage.getService(Number(req.params.id));
    if (!svc) return res.status(404).json({ error: "Service not found" });
    res.json(svc);
  });
  app.post("/api/services", validate(insertServiceSchema), (req, res) => {
    const svc = storage.createService(req.validated);
    res.status(201).json(svc);
  });
  app.patch("/api/services/:id", validate(insertServiceSchema.partial()), (req, res) => {
    const svc = storage.updateService(Number(req.params.id), req.validated);
    if (!svc) return res.status(404).json({ error: "Service not found" });
    res.json(svc);
  });

  // ── Clients ───────────────────────────────────────────
  app.get("/api/clients", (req, res) => {
    const q = req.query.q as string | undefined;
    if (q) {
      res.json(storage.searchClients(q));
    } else {
      res.json(storage.getClients());
    }
  });
  app.get("/api/clients/:id", (req, res) => {
    const client = storage.getClient(Number(req.params.id));
    if (!client) return res.status(404).json({ error: "Client not found" });
    res.json(client);
  });
  app.post("/api/clients", validate(insertClientSchema), (req, res) => {
    const client = storage.createClient(req.validated);
    res.status(201).json(client);
  });

  app.post("/api/clients/import", (req, res) => {
    const rows: unknown[] = req.body?.rows;
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: "No rows provided" });
    }
    const today = new Date().toISOString().split("T")[0];
    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];
    for (const row of rows) {
      const r = row as Record<string, string>;
      const firstName = r.firstName?.trim();
      const lastName = r.lastName?.trim();
      if (!firstName || !lastName) { skipped++; continue; }
      try {
        storage.createClient({
          firstName,
          lastName,
          phone: r.phone?.trim() || null,
          email: r.email?.trim() || null,
          skinType: r.skinType?.trim() || null,
          allergies: r.allergies?.trim() || null,
          notes: r.notes?.trim() || null,
          preferredFormula: r.preferredFormula?.trim() || null,
          createdAt: today,
        });
        imported++;
      } catch (e: any) {
        errors.push(`${firstName} ${lastName}: ${e.message}`);
        skipped++;
      }
    }
    res.json({ imported, skipped, errors });
  });
  app.patch("/api/clients/:id", validate(insertClientSchema.partial()), (req, res) => {
    const client = storage.updateClient(Number(req.params.id), req.validated);
    if (!client) return res.status(404).json({ error: "Client not found" });
    res.json(client);
  });

  // ── Appointments ──────────────────────────────────────
  app.get("/api/appointments", (req, res) => {
    const date = req.query.date as string | undefined;
    const start = req.query.start as string | undefined;
    const end = req.query.end as string | undefined;
    const clientId = req.query.clientId as string | undefined;
    if (start && end) {
      res.json(storage.getAppointmentsByRange(start, end));
    } else if (date) {
      res.json(storage.getAppointmentsByDate(date));
    } else if (clientId) {
      res.json(storage.getAppointmentsByClient(Number(clientId)));
    } else {
      res.json(storage.getAppointments());
    }
  });
  app.get("/api/appointments/:id", (req, res) => {
    const appt = storage.getAppointment(Number(req.params.id));
    if (!appt) return res.status(404).json({ error: "Appointment not found" });
    res.json(appt);
  });
  app.post("/api/appointments", validate(insertAppointmentSchema), (req, res) => {
    const appt = storage.createAppointment(req.validated);
    res.status(201).json(appt);
  });
  app.patch("/api/appointments/:id", validate(insertAppointmentSchema.partial()), (req, res) => {
    const appt = storage.updateAppointment(Number(req.params.id), req.validated);
    if (!appt) return res.status(404).json({ error: "Appointment not found" });
    res.json(appt);
  });

  // ── Session Records ───────────────────────────────────
  app.get("/api/sessions/client/:clientId", (req, res) => {
    res.json(storage.getSessionRecordsByClient(Number(req.params.clientId)));
  });
  app.get("/api/sessions/appointment/:appointmentId", (req, res) => {
    const rec = storage.getSessionRecord(Number(req.params.appointmentId));
    res.json(rec || null);
  });
  app.post("/api/sessions", validate(insertSessionRecordSchema), (req, res) => {
    const rec = storage.createSessionRecord(req.validated);
    res.status(201).json(rec);
  });

  // ── Package Plans ─────────────────────────────────────
  app.get("/api/package-plans", (_req, res) => {
    res.json(storage.getPackagePlans());
  });
  app.post("/api/package-plans", validate(insertPackagePlanSchema), (req, res) => {
    const plan = storage.createPackagePlan(req.validated);
    res.status(201).json(plan);
  });
  app.patch("/api/package-plans/:id", validate(insertPackagePlanSchema.partial()), (req, res) => {
    const plan = storage.updatePackagePlan(Number(req.params.id), req.validated);
    if (!plan) return res.status(404).json({ error: "Package plan not found" });
    res.json(plan);
  });

  // ── Client Packages ───────────────────────────────────
  app.get("/api/client-packages", (req, res) => {
    const clientId = req.query.clientId as string | undefined;
    if (clientId) {
      res.json(storage.getClientPackages(Number(clientId)));
    } else {
      res.json(storage.getAllClientPackages());
    }
  });
  app.post("/api/client-packages", validate(insertClientPackageSchema), (req, res) => {
    const pkg = storage.createClientPackage(req.validated);
    res.status(201).json(pkg);
  });
  app.patch("/api/client-packages/:id", validate(insertClientPackageSchema.partial()), (req, res) => {
    const pkg = storage.updateClientPackage(Number(req.params.id), req.validated);
    if (!pkg) return res.status(404).json({ error: "Client package not found" });
    res.json(pkg);
  });

  // ── Payments ──────────────────────────────────────────
  app.get("/api/payments", (req, res) => {
    const clientId = req.query.clientId as string | undefined;
    if (clientId) {
      res.json(storage.getPaymentsByClient(Number(clientId)));
    } else {
      res.json(storage.getPayments());
    }
  });
  app.post("/api/payments", validate(insertPaymentSchema), (req, res) => {
    const payment = storage.createPayment(req.validated);
    res.status(201).json(payment);
  });

  // ── Intake Questions ──────────────────────────────────
  app.get("/api/intake-questions", (_req, res) => {
    res.json(storage.getIntakeQuestions());
  });
  app.post("/api/intake-questions", (req, res) => {
    const q = storage.createIntakeQuestion(req.body);
    res.status(201).json(q);
  });
  app.patch("/api/intake-questions/:id", (req, res) => {
    const q = storage.updateIntakeQuestion(Number(req.params.id), req.body);
    if (!q) return res.status(404).json({ error: "Question not found" });
    res.json(q);
  });
  app.delete("/api/intake-questions/:id", (req, res) => {
    storage.deleteIntakeQuestion(Number(req.params.id));
    res.json({ ok: true });
  });

  // ── Intake Responses ──────────────────────────────────
  app.get("/api/intake-responses/:clientId", (req, res) => {
    res.json(storage.getIntakeResponsesByClient(Number(req.params.clientId)));
  });
  app.post("/api/intake-responses", (req, res) => {
    // Accepts { clientId, responses: [{ questionId, answer }] }
    const { clientId, responses } = req.body;
    const now = new Date().toISOString();
    // Clear old responses for this client first
    storage.deleteIntakeResponsesByClient(clientId);
    const saved = responses.map((r: { questionId: number; answer: string }) =>
      storage.createIntakeResponse({
        clientId,
        questionId: r.questionId,
        answer: r.answer,
        submittedAt: now,
      })
    );
    // Mark client intake as completed
    storage.updateClient(clientId, { intakeCompleted: true });
    res.status(201).json(saved);
  });

  // ── Waiver Templates ──────────────────────────────────
  app.get("/api/waiver-templates", (_req, res) => {
    res.json(storage.getWaiverTemplates());
  });
  app.get("/api/waiver-templates/active", (_req, res) => {
    const w = storage.getActiveWaiver();
    res.json(w || null);
  });
  app.post("/api/waiver-templates", (req, res) => {
    const w = storage.createWaiverTemplate(req.body);
    res.status(201).json(w);
  });
  app.patch("/api/waiver-templates/:id", (req, res) => {
    const w = storage.updateWaiverTemplate(Number(req.params.id), req.body);
    if (!w) return res.status(404).json({ error: "Waiver not found" });
    res.json(w);
  });

  // ── Sign Waiver (admin action) ────────────────────────
  app.post("/api/clients/:id/sign-waiver", (req, res) => {
    const updated = storage.updateClient(Number(req.params.id), {
      waiverSigned: true,
      waiverSignedAt: new Date().toISOString(),
    });
    if (!updated) return res.status(404).json({ error: "Client not found" });
    res.json(updated);
  });

  // ── Sign Waiver (public — onboarding flow) ────────────
  app.post("/api/public/sign-waiver/:id", (req, res) => {
    const updated = storage.updateClient(Number(req.params.id), {
      waiverSigned: true,
      waiverSignedAt: new Date().toISOString(),
    });
    if (!updated) return res.status(404).json({ error: "Client not found" });
    res.json(updated);
  });

  // ── Message Logs ──────────────────────────────────────
  app.get("/api/message-logs", (_req, res) => {
    res.json(storage.getMessageLogs());
  });
  app.get("/api/message-logs/client/:clientId", (req, res) => {
    res.json(storage.getMessageLogsByClient(Number(req.params.clientId)));
  });
  app.post("/api/message-logs", (req, res) => {
    const log = storage.createMessageLog(req.body);
    res.status(201).json(log);
  });

  // ── SMS Send ──────────────────────────────────────────
  app.post("/api/sms/send", async (req, res) => {
    const { clientId, appointmentId, type, to, body } = req.body;
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_FROM_NUMBER;
    let status = "sent";
    let errorMsg: string | undefined;
    if (sid && token && from && to) {
      try {
        const client = twilio(sid, token);
        await client.messages.create({ to, from, body });
      } catch (err: any) {
        status = "failed";
        errorMsg = err.message;
      }
    } else {
      status = "simulated";
    }
    const log = storage.createMessageLog({
      clientId,
      appointmentId: appointmentId || null,
      type,
      channel: "sms",
      to,
      body,
      status,
      sentAt: new Date().toISOString(),
    });
    res.status(201).json({ ...log, ...(errorMsg ? { error: errorMsg } : {}) });
  });

  // ── Inventory Items ───────────────────────────────────
  app.get("/api/inventory", (_req, res) => {
    res.json(storage.getInventoryItems());
  });
  app.get("/api/inventory/low-stock", (_req, res) => {
    res.json(storage.getLowStockItems());
  });
  app.get("/api/inventory/:id", (req, res) => {
    const item = storage.getInventoryItem(Number(req.params.id));
    if (!item) return res.status(404).json({ error: "Item not found" });
    res.json(item);
  });
  app.post("/api/inventory", validate(insertInventoryItemSchema), (req, res) => {
    const item = storage.createInventoryItem(req.validated);
    res.status(201).json(item);
  });
  app.patch("/api/inventory/:id", validate(insertInventoryItemSchema.partial()), (req, res) => {
    const item = storage.updateInventoryItem(Number(req.params.id), req.validated);
    if (!item) return res.status(404).json({ error: "Item not found" });
    res.json(item);
  });

  // ── Inventory Usage ───────────────────────────────────
  app.get("/api/inventory-usage/:itemId", (req, res) => {
    res.json(storage.getInventoryUsage(Number(req.params.itemId)));
  });
  app.post("/api/inventory-usage", (req, res) => {
    const usage = storage.createInventoryUsage(req.body);
    res.status(201).json(usage);
  });

  // ── Business Settings ─────────────────────────────────
  app.get("/api/settings", (_req, res) => {
    res.json(storage.getBusinessSettings());
  });
  app.patch("/api/settings", (req, res) => {
    const settings = storage.updateBusinessSettings(req.body);
    res.json(settings);
  });

  // ── Reports ───────────────────────────────────────────
  app.get("/api/reports/revenue", (req, res) => {
    const start = (req.query.start as string) || new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
    const end = (req.query.end as string) || new Date().toISOString().split("T")[0];
    res.json(storage.getRevenueByRange(start, end));
  });
  app.get("/api/reports/no-show-rate", (req, res) => {
    const start = (req.query.start as string) || new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
    const end = (req.query.end as string) || new Date().toISOString().split("T")[0];
    res.json(storage.getNoShowRate(start, end));
  });
  app.get("/api/reports/rebooking-rate", (req, res) => {
    const start = (req.query.start as string) || new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
    const end = (req.query.end as string) || new Date().toISOString().split("T")[0];
    res.json(storage.getRebookingRate(start, end));
  });
  app.get("/api/reports/popular-services", (req, res) => {
    const start = (req.query.start as string) || new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
    const end = (req.query.end as string) || new Date().toISOString().split("T")[0];
    res.json(storage.getPopularServices(start, end));
  });

  // ── Public Booking API ─────────────────────────────────

  // GET /api/public/settings — business info for the booking page
  app.get("/api/public/settings", (_req, res) => {
    const s = storage.getBusinessSettings();
    res.json({
      businessName: s.businessName,
      phone: s.phone,
      address: s.address,
      bookingEnabled: s.bookingEnabled,
      depositRequired: s.depositRequired,
      depositAmount: s.depositAmount,
      cancellationHours: s.cancellationHours,
      operatingHours: s.operatingHours,
      bookingNotice: s.bookingNotice,
    });
  });

  // GET /api/public/services
  app.get("/api/public/services", (_req, res) => {
    res.json(storage.getServices().filter(s => s.isActive));
  });

  // GET /api/public/availability?date=YYYY-MM-DD&serviceId=N
  app.get("/api/public/availability", (req, res) => {
    const date = req.query.date as string;
    const serviceId = Number(req.query.serviceId);
    if (!date || !serviceId) return res.status(400).json({ error: "date and serviceId required" });
    const availability = getAvailabilityForService(date, serviceId);
    return res.status(availability.status).json(availability.body);
  });

  // POST /api/public/book
  app.post("/api/public/book", (req, res) => {
    const { firstName, lastName, phone, email, notes, serviceId, date, time } = req.body;
    if (!firstName || !lastName || !serviceId || !date || !time) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    const availability = getAvailabilityForService(date, Number(serviceId));
    if (availability.status === 404) {
      return res.status(availability.status).json(availability.body);
    }
    if (availability.body.closed) {
      return res.status(403).json({ error: "Booking is closed for that day" });
    }
    if (!availability.body.slots.includes(time)) {
      return res.status(409).json({ error: "That time is no longer available" });
    }
    const settings = availability.settings;

    // Find or create client
    const allClients = storage.getClients();
    let client = allClients.find(c =>
      (phone && c.phone === phone) || (email && c.email === email)
    );
    if (!client) {
      client = storage.createClient({
        firstName, lastName,
        phone: phone || null, email: email || null,
        skinType: null, allergies: null, notes: null, preferredFormula: null,
        createdAt: new Date().toISOString().split("T")[0],
      });
    }

    const appointmentOrConflict = storage.bookAppointmentAtomically({
      clientId: client.id,
      serviceId: Number(serviceId),
      date, time, status: "scheduled", depositPaid: false,
      depositAmount: settings.depositRequired ? (settings.depositAmount ?? null) : null,
      source: "booking_link",
      notes: notes || null,
      createdAt: new Date().toISOString().split("T")[0],
    });
    if (appointmentOrConflict === "conflict") {
      return res.status(409).json({ error: "That time is no longer available" });
    }
    const appointment = appointmentOrConflict;

    // Log confirmation message
    if (client.phone) {
      const svc = storage.getService(Number(serviceId));
      const body = (settings.confirmationTemplate || "Hi {name}! Your {service} is confirmed for {date} at {time}.")
        .replace("{name}", firstName).replace("{service}", svc?.name ?? "appointment")
        .replace("{date}", date).replace("{time}", time);
      storage.createMessageLog({
        clientId: client.id, appointmentId: appointment.id, type: "booking_confirm",
        channel: "sms", to: client.phone, body, status: "sent",
        sentAt: new Date().toISOString(),
      });
    }

    res.status(201).json({
      appointment, client,
      depositRequired: settings.depositRequired,
      depositAmount: settings.depositAmount,
    });
  });

  // ── Gift Cards ─────────────────────────────────────────
  app.get("/api/gift-cards", (_req, res) => {
    res.json(storage.getGiftCards());
  });
  app.get("/api/gift-cards/:id", (req, res) => {
    const gc = storage.getGiftCard(Number(req.params.id));
    if (!gc) return res.status(404).json({ error: "Gift card not found" });
    res.json(gc);
  });
  app.get("/api/gift-cards/code/:code", (req, res) => {
    const gc = storage.getGiftCardByCode(req.params.code);
    if (!gc) return res.status(404).json({ error: "Invalid code" });
    res.json(gc);
  });
  app.post("/api/gift-cards", (req, res) => {
    // Auto-generate code if not provided
    const code = req.body.code || `BB-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const gc = storage.createGiftCard({
      ...req.body,
      code,
      balance: req.body.initialAmount,
      createdAt: new Date().toISOString().split("T")[0],
    });
    res.status(201).json(gc);
  });
  app.patch("/api/gift-cards/:id", validate(insertGiftCardSchema.partial()), (req, res) => {
    const gc = storage.updateGiftCard(Number(req.params.id), req.validated);
    if (!gc) return res.status(404).json({ error: "Gift card not found" });
    res.json(gc);
  });
  // Redeem gift card
  app.post("/api/gift-cards/:id/redeem", (req, res) => {
    const gc = storage.getGiftCard(Number(req.params.id));
    if (!gc) return res.status(404).json({ error: "Gift card not found" });
    if (gc.status !== "active") return res.status(400).json({ error: "Gift card is not active" });
    const amount = Number(req.body.amount);
    if (amount > gc.balance) return res.status(400).json({ error: "Insufficient balance" });
    const newBalance = gc.balance - amount;
    const updated = storage.updateGiftCard(gc.id, {
      balance: newBalance,
      status: newBalance <= 0 ? "used" : "active",
    });
    res.json(updated);
  });

  // ── Waitlist ───────────────────────────────────────────
  app.get("/api/waitlist", (_req, res) => {
    res.json(storage.getWaitlist());
  });
  app.get("/api/waitlist/date/:date", (req, res) => {
    res.json(storage.getWaitlistByDate(req.params.date));
  });
  app.post("/api/waitlist", validate(insertWaitlistSchema), (req, res) => {
    const entry = storage.createWaitlistEntry(req.validated);
    res.status(201).json(entry);
  });
  app.patch("/api/waitlist/:id", validate(insertWaitlistSchema.partial()), (req, res) => {
    const entry = storage.updateWaitlistEntry(Number(req.params.id), req.validated);
    if (!entry) return res.status(404).json({ error: "Waitlist entry not found" });
    res.json(entry);
  });
  app.delete("/api/waitlist/:id", (req, res) => {
    storage.deleteWaitlistEntry(Number(req.params.id));
    res.json({ ok: true });
  });

  // ── Analytics v2 ────────────────────────────────────────
  app.get("/api/analytics/clv", (_req, res) => {
    res.json(storage.getClientLifetimeValues());
  });

  // ── Promo Codes ───────────────────────────────────────
  app.get("/api/promo-codes", (_req, res) => {
    res.json(storage.getPromoCodes());
  });
  app.post("/api/promo-codes", validate(insertPromoCodeSchema), (req, res) => {
    const pc = storage.createPromoCode(req.validated);
    res.status(201).json(pc);
  });
  app.patch("/api/promo-codes/:id", validate(insertPromoCodeSchema.partial()), (req, res) => {
    const pc = storage.updatePromoCode(Number(req.params.id), req.validated);
    if (!pc) return res.status(404).json({ error: "Promo code not found" });
    res.json(pc);
  });
  app.get("/api/promo-codes/validate/:code", (req, res) => {
    const pc = storage.getPromoCodeByCode(req.params.code.toUpperCase());
    if (!pc || !pc.isActive) return res.status(404).json({ valid: false });
    if (pc.maxUses && pc.usedCount >= pc.maxUses) return res.json({ valid: false, reason: "Code has been fully redeemed" });
    if (pc.expiresAt && pc.expiresAt < new Date().toISOString().split("T")[0]) return res.json({ valid: false, reason: "Code has expired" });
    res.json({ valid: true, discountType: pc.discountType, discountValue: pc.discountValue });
  });

  // ── Loyalty Points ────────────────────────────────────
  app.get("/api/loyalty/:clientId", (req, res) => {
    const history = storage.getLoyaltyPointsByClient(Number(req.params.clientId));
    const balance = storage.getClientPointsBalance(Number(req.params.clientId));
    res.json({ balance, history });
  });
  app.post("/api/loyalty", (req, res) => {
    const entry = storage.createLoyaltyEntry({ ...req.body, createdAt: new Date().toISOString().split("T")[0] });
    res.status(201).json(entry);
  });

  // ── Search ──────────────────────────────────────────
  app.get("/api/search", (req, res) => {
    const q = (req.query.q as string) || "";
    if (!q) return res.json({ clients: [], appointments: [] });
    res.json(storage.searchAll(q));
  });

  // ── Birthdays ───────────────────────────────────────
  app.get("/api/birthdays", (req, res) => {
    const days = Number(req.query.days) || 30;
    res.json(storage.getUpcomingBirthdays(days));
  });

  // ── Export CSV ───────────────────────────────────────
  app.get("/api/export/clients", (_req, res) => {
    const allClients = storage.getClients();
    const csv = ["Name,Email,Phone,Skin Type,Birthday,Created"];
    allClients.forEach(c => csv.push(`"${c.firstName} ${c.lastName}","${c.email || ""}","${c.phone || ""}","${c.skinType || ""}","${c.birthday || ""}","${c.createdAt}"`));
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=bronzbliss-clients.csv");
    res.send(csv.join("\n"));
  });
  app.get("/api/export/appointments", (req, res) => {
    const start = (req.query.start as string) || "2020-01-01";
    const end = (req.query.end as string) || "2030-12-31";
    const appts = storage.getAppointmentsByRange(start, end);
    const csv = ["Date,Time,Client,Service,Status,Source"];
    appts.forEach(a => {
      const client = storage.getClient(a.clientId);
      const svc = storage.getService(a.serviceId);
      csv.push(`"${a.date}","${a.time}","${client ? client.firstName + ' ' + client.lastName : ''}","${svc?.name || ''}","${a.status}","${a.source}"`);
    });
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=bronzbliss-appointments.csv");
    res.send(csv.join("\n"));
  });
  app.get("/api/export/revenue", (req, res) => {
    const start = (req.query.start as string) || "2020-01-01";
    const end = (req.query.end as string) || "2030-12-31";
    const payments = storage.getPayments().filter(p => p.createdAt >= start && p.createdAt <= end);
    const csv = ["Date,Amount,Type,Method,Client"];
    payments.forEach(p => {
      const client = storage.getClient(p.clientId);
      csv.push(`"${p.createdAt}","${p.amount}","${p.type}","${p.method}","${client ? client.firstName + ' ' + client.lastName : ''}"`);
    });
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=bronzbliss-revenue.csv");
    res.send(csv.join("\n"));
  });

  // ── SMS Automation ────────────────────────────────────
  // Trigger all automated messages for an appointment
  app.post("/api/automation/trigger/:appointmentId", (req, res) => {
    const appt = storage.getAppointment(Number(req.params.appointmentId));
    if (!appt) return res.status(404).json({ error: "Appointment not found" });
    const client = storage.getClient(appt.clientId);
    if (!client?.phone) return res.status(400).json({ error: "Client has no phone" });
    const svc = storage.getService(appt.serviceId);
    const settings = storage.getBusinessSettings();
    const logs: any[] = [];

    const send = (type: string, template: string | null, fallback: string) => {
      const body = (template || fallback)
        .replace(/\{name\}/g, client.firstName)
        .replace(/\{service\}/g, svc?.name ?? "appointment")
        .replace(/\{date\}/g, appt.date)
        .replace(/\{time\}/g, appt.time)
        .replace(/\{hours\}/g, "8");
      const log = storage.createMessageLog({
        clientId: client.id, appointmentId: appt.id, type, channel: "sms",
        to: client.phone!, body, status: "sent", sentAt: new Date().toISOString(),
      });
      logs.push(log);
    };

    const { type } = req.body; // "booking_confirm" | "prep_reminder" | "rinse_reminder" | "aftercare" | "rebooking"
    if (type === "booking_confirm" || type === "all") {
      send("booking_confirm", settings.confirmationTemplate, "Hi {name}! Your {service} is confirmed for {date} at {time}.");
    }
    if (type === "prep_reminder" || type === "all") {
      send("prep_reminder", settings.prepTemplate, "Reminder: Your tan is tomorrow at {time}. Exfoliate tonight, no lotions day-of!");
    }
    if (type === "rinse_reminder" || type === "all") {
      send("rinse_reminder", settings.rinseTemplate, "Time to rinse! Lukewarm water only, no soap. Pat dry gently.");
    }
    if (type === "aftercare" || type === "all") {
      send("aftercare", settings.aftercareTemplate, "Thanks {name}! Avoid water 8 hrs, moisturize daily, no exfoliants 5 days.");
    }
    if (type === "rebooking" || type === "all") {
      send("rebooking", settings.rebookingTemplate, "Hi {name}! Ready to glow again? Book your next session!");
    }
    res.status(201).json({ sent: logs.length, logs, mock: true, note: "SMS simulated — connect Twilio for real delivery" });
  });

  // ── Review Request ─────────────────────────────────────
  app.post("/api/review-request/:appointmentId", (req, res) => {
    const appt = storage.getAppointment(Number(req.params.appointmentId));
    if (!appt) return res.status(404).json({ error: "Appointment not found" });
    const client = storage.getClient(appt.clientId);
    if (!client?.phone) return res.status(400).json({ error: "Client has no phone number" });
    const body = `Hi ${client.firstName}! Thanks for visiting Bronz Bliss. We'd love your feedback — please leave us a review! ⭐`;
    const log = storage.createMessageLog({
      clientId: client.id,
      appointmentId: appt.id,
      type: "review_request",
      channel: "sms",
      to: client.phone,
      body,
      status: "sent",
      sentAt: new Date().toISOString(),
    });
    res.status(201).json({ ...log, mock: true });
  });

  // ── Seed demo data ────────────────────────────────────
  app.post("/api/seed", (_req, res) => {
    if (process.env.NODE_ENV === "production") {
      return res.status(403).json({ error: "Seeding is disabled in production" });
    }
    const existingServices = storage.getServices();
    if (existingServices.length > 0) {
      return res.json({ message: "Already seeded" });
    }

    // Services — matches Izzy's real Bronz Bliss menu
    const s1 = storage.createService({ name: "The Custom Tan", description: "Choice of Rapid (3-5 hr) or Signature (8-12 hr) solution. Includes skin consultation, complimentary disposables, barrier cream & shimmer finishing powder.", duration: 20, price: 35, category: "spray_tan", isActive: true });
    const s2 = storage.createService({ name: "The Icon Tan (Ultra Dark)", description: "Our darkest, most dramatic bronze. Ultra-deep solution for maximum depth and tone. 8-12 hour rinse. Lasts 10-14 days with proper prep.", duration: 20, price: 45, category: "spray_tan", isActive: true });
    const s3 = storage.createService({ name: "The Contour Tan", description: "Full-body contouring with strategic shading & highlighting. Face, arms, legs, stomach & back. Airbrushed, but real life.", duration: 30, price: 55, category: "spray_tan", isActive: true });
    const s4 = storage.createService({ name: "Hydration Add-On", description: "Glow primer infused with skin-loving ingredients & pH balancing tech. Pre-tan hydration + post-spray lock for 30-40% longer lasting results.", duration: 10, price: 10, category: "add_on", isActive: true });
    const s5 = storage.createService({ name: "Mini Contour Add-On", description: "Sculpt two key areas of your choice: Face, Arms, Legs, Stomach, or Back. Definition without the full-body commitment.", duration: 10, price: 15, category: "add_on", isActive: true });

    // Clients
    const today = new Date().toISOString().split("T")[0];
    const c1 = storage.createClient({ firstName: "Sarah", lastName: "Johnson", email: "sarah@email.com", phone: "435-555-0101", skinType: "Type II", allergies: null, notes: "Prefers medium shade", preferredFormula: "SunFX Medium", intakeCompleted: true, waiverSigned: true, waiverSignedAt: "2026-01-15T10:00:00Z", createdAt: "2026-01-15" });
    const c2 = storage.createClient({ firstName: "Emily", lastName: "Chen", email: "emily@email.com", phone: "435-555-0102", skinType: "Type III", allergies: "Sensitive to DHA above 10%", notes: null, preferredFormula: "Aviva Pure 8%", intakeCompleted: true, waiverSigned: true, waiverSignedAt: "2026-02-01T09:30:00Z", createdAt: "2026-02-01" });
    const c3 = storage.createClient({ firstName: "Jessica", lastName: "Martinez", email: "jess@email.com", phone: "435-555-0103", skinType: "Type I", allergies: null, notes: "First-time client, nervous", preferredFormula: null, intakeCompleted: false, waiverSigned: false, waiverSignedAt: null, createdAt: "2026-03-10" });
    const c4 = storage.createClient({ firstName: "Olivia", lastName: "Taylor", email: "olivia@email.com", phone: "435-555-0104", skinType: "Type IV", allergies: null, notes: "Bride - wedding June 20", preferredFormula: "SunFX Dark", intakeCompleted: true, waiverSigned: true, waiverSignedAt: "2026-03-20T14:00:00Z", createdAt: "2026-03-20" });
    const c5 = storage.createClient({ firstName: "Megan", lastName: "Anderson", email: "megan@email.com", phone: "435-555-0105", skinType: "Type II", allergies: null, notes: "Package member", preferredFormula: "SunFX Medium", intakeCompleted: true, waiverSigned: true, waiverSignedAt: "2026-01-05T11:00:00Z", createdAt: "2026-01-05" });

    // Appointments (today and upcoming)
    storage.createAppointment({ clientId: c1.id, serviceId: s1.id, date: today, time: "09:00", status: "scheduled", depositPaid: true, depositAmount: 10, source: "booking_link", notes: null, createdAt: today });
    storage.createAppointment({ clientId: c2.id, serviceId: s2.id, date: today, time: "10:30", status: "scheduled", depositPaid: false, depositAmount: null, source: "owner", notes: "Touch-up from last week", createdAt: today });
    storage.createAppointment({ clientId: c4.id, serviceId: s5.id, date: today, time: "14:00", status: "scheduled", depositPaid: true, depositAmount: 15, source: "booking_link", notes: "Bridal trial", createdAt: today });
    storage.createAppointment({ clientId: c3.id, serviceId: s3.id, date: today, time: "16:00", status: "scheduled", depositPaid: false, depositAmount: null, source: "owner", notes: null, createdAt: today });

    // Past appointments
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
    const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString().split("T")[0];
    const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString().split("T")[0];
    storage.createAppointment({ clientId: c5.id, serviceId: s1.id, date: yesterday, time: "11:00", status: "completed", depositPaid: true, depositAmount: 10, source: "owner", notes: null, createdAt: yesterday });
    storage.createAppointment({ clientId: c1.id, serviceId: s4.id, date: twoDaysAgo, time: "13:00", status: "completed", depositPaid: false, depositAmount: null, source: "owner", notes: null, createdAt: twoDaysAgo });
    storage.createAppointment({ clientId: c2.id, serviceId: s1.id, date: threeDaysAgo, time: "10:00", status: "no_show", depositPaid: false, depositAmount: null, source: "booking_link", notes: null, createdAt: threeDaysAgo });

    // Package plans
    const pp1 = storage.createPackagePlan({ name: "Glow 5-Pack", sessions: 5, price: 175, validDays: 90, isActive: true });
    const pp2 = storage.createPackagePlan({ name: "Glow 10-Pack", sessions: 10, price: 300, validDays: 180, isActive: true });
    storage.createPackagePlan({ name: "Monthly Unlimited", sessions: 30, price: 99, validDays: 30, isActive: true });

    // Client packages
    storage.createClientPackage({ clientId: c5.id, packagePlanId: pp1.id, sessionsRemaining: 3, purchaseDate: "2026-03-01", expiryDate: "2026-05-30", status: "active" });
    storage.createClientPackage({ clientId: c1.id, packagePlanId: pp2.id, sessionsRemaining: 8, purchaseDate: "2026-03-15", expiryDate: "2026-09-10", status: "active" });

    // Payments (more varied for reports)
    storage.createPayment({ clientId: c5.id, appointmentId: 5, amount: 45, type: "service", method: "card", createdAt: yesterday });
    storage.createPayment({ clientId: c1.id, appointmentId: 6, amount: 15, type: "service", method: "cash", createdAt: twoDaysAgo });
    storage.createPayment({ clientId: c5.id, amount: 175, type: "package", method: "card", createdAt: "2026-03-01" });
    storage.createPayment({ clientId: c1.id, amount: 300, type: "package", method: "card", createdAt: "2026-03-15" });
    storage.createPayment({ clientId: c4.id, appointmentId: 3, amount: 55, type: "service", method: "card", createdAt: "2026-04-01" });
    storage.createPayment({ clientId: c2.id, amount: 35, type: "service", method: "venmo", createdAt: "2026-04-02" });
    storage.createPayment({ clientId: c3.id, amount: 20, type: "service", method: "card", createdAt: "2026-04-05" });

    // Session records
    storage.createSessionRecord({ appointmentId: 5, clientId: c5.id, formula: "SunFX Medium", shade: "medium", rinseTime: 8, aftercareNotes: "Avoid water for 8 hours. Moisturize after first rinse.", sessionNotes: "Even application, client happy with shade.", createdAt: yesterday });
    storage.createSessionRecord({ appointmentId: 6, clientId: c1.id, formula: null, shade: null, rinseTime: null, aftercareNotes: null, sessionNotes: "Standard bed session, 15 min.", createdAt: twoDaysAgo });

    // Intake Questions — Bronz Tan Quiz
    storage.createIntakeQuestion({ question: "How familiar are you with professional spray tanning?", type: "select", options: JSON.stringify(["I'm completely new to spray tanning", "I've had a few spray tans before with mixed results", "I'm experienced and know exactly what I want"]), required: true, sortOrder: 1, isActive: true });
    storage.createIntakeQuestion({ question: "What's your main reason for wanting a spray tan?", type: "select", options: JSON.stringify(["I am getting married!", "Vacation!", "I want to feel like my most confident self", "I'm ready to make spray tanning part of my regular routine"]), required: true, sortOrder: 2, isActive: true });
    storage.createIntakeQuestion({ question: "What kind of glow are you going for?", type: "select", options: JSON.stringify(["Subtle / natural \u2728 \u2013 Just a glow that enhances my skin tone", "Medium bronze \ud83e\udd0e \u2013 Noticeable, sunkissed, but still natural", "Ultra dark \ud83d\udda4 \u2013 I love a dramatic, rich, bronzed look"]), required: true, sortOrder: 3, isActive: true });
    storage.createIntakeQuestion({ question: "Do you want added definition or contouring?", type: "select", options: JSON.stringify(["Yes \u2014 full sculpting \ud83d\udd25 (I want that snatched, defined look)", "Maybe \u2014 just a little \u2728 (targeted areas like arms, stomach, or face)", "Not for me"]), required: true, sortOrder: 4, isActive: true });
    storage.createIntakeQuestion({ question: "Want your glow to last as long as possible?", type: "select", options: JSON.stringify(["Yes \u2014 I want it to last as long as possible \u2728", "I'm open to recommendations", "Not a priority"]), required: true, sortOrder: 5, isActive: true });
    storage.createIntakeQuestion({ question: "What's your biggest concern about getting a spray tan?", type: "select", options: JSON.stringify(["Looking orange or unnatural", "Dryness or skin feeling dull", "Fading unevenly or too quickly"]), required: false, sortOrder: 6, isActive: true });
    storage.createIntakeQuestion({ question: "Enter your email to get your results and the best spray / self tan tips!", type: "text", options: null, required: false, sortOrder: 7, isActive: true });

    // Waiver Template — matches Izzy's real cancellation policy & terms
    storage.createWaiverTemplate({
      title: "BRONZ Bliss Terms & Conditions",
      content: `🤎 CANCELLATION POLICY\n\nAppointments cancelled/rescheduled within 24 hours of the scheduled time will result in a 50% fee of total service booked.\n\n🤎 TERMS AND CONDITIONS\n\nDISCLAIMER: Understand that BRONZ Bliss's spray tan solution does not contain sunscreen and will not protect your skin from sunburn. By using BRONZ Bliss services, you release BRONZ Bliss from all liability related to these services. You assume all associated risks.\n\nINFORMED CONSENT: I voluntarily choose to undergo a spray tan service with BRONZ Bliss. I understand the procedures, potential risks, and expected outcomes. Risks include allergic reactions, skin sensitivity, uneven tan, and temporary fabric staining. Results may vary.\n\nIMPORTANT PRECAUTIONS: Understand that changes in medications, pregnancy, and "that time of the month" can cause your tan to not develop as dark or last as long. Ingredients are generally safe but can cause allergies. Inform your technician of any allergies, medical history, or prior adverse reactions if needed. Understand the importance of following the recommended tan care instructions previously sent upon booking.\n\nI release BRONZ Bliss from any claims arising from the spray tanning procedures, except those resulting from negligence or intentional misconduct.\n\nBy signing below, I acknowledge that I have read, understood, and agreed to the above terms and conditions.`,
      isActive: true,
    });

    // Inventory Items
    storage.createInventoryItem({ name: "SunFX Medium Solution", category: "solution", brand: "SunFX", currentStock: 32, unit: "oz", reorderLevel: 10, costPerUnit: 2.5, notes: null, isActive: true });
    storage.createInventoryItem({ name: "Aviva Pure 8% Solution", category: "solution", brand: "Aviva", currentStock: 18, unit: "oz", reorderLevel: 8, costPerUnit: 3.0, notes: "For sensitive skin clients", isActive: true });
    storage.createInventoryItem({ name: "SunFX Dark Solution", category: "solution", brand: "SunFX", currentStock: 24, unit: "oz", reorderLevel: 10, costPerUnit: 2.5, notes: null, isActive: true });
    storage.createInventoryItem({ name: "Barrier Cream", category: "supply", brand: null, currentStock: 5, unit: "tubes", reorderLevel: 3, costPerUnit: 8.0, notes: null, isActive: true });
    storage.createInventoryItem({ name: "Disposable Thongs", category: "supply", brand: null, currentStock: 45, unit: "pcs", reorderLevel: 20, costPerUnit: 0.5, notes: null, isActive: true });
    storage.createInventoryItem({ name: "Tan Extender Moisturizer", category: "product", brand: "SunFX", currentStock: 12, unit: "bottles", reorderLevel: 5, costPerUnit: 6.0, notes: "Retail product", isActive: true });

    // Business Settings
    storage.updateBusinessSettings({
      businessName: "BRONZ Bliss",
      phone: "",
      email: "",
      address: "668 E Fiddlers Cove Dr Unit 60, Cedar City, UT 84721",
      timezone: "America/Denver",
      depositRequired: true,
      depositAmount: 10,
      cancellationHours: 24,
      bookingEnabled: true,
      bookingNotice: 60,
      confirmationTemplate: "Hi {name}! Your {service} is confirmed for {date} at {time}. Reply STOP to opt out.",
      prepTemplate: "Reminder: Your tan appointment is tomorrow at {time}. Please exfoliate tonight and avoid lotions on the day of. See you soon!",
      rinseTemplate: "Time to rinse! It's been {hours} hours since your spray tan. Rinse with lukewarm water only — no soap. Pat dry gently.",
      aftercareTemplate: "Thanks for visiting, {name}! For best results: avoid water for 8 hrs, moisturize daily, and avoid exfoliants for 5 days.",
      rebookingTemplate: "Hi {name}! It's been 2 weeks since your last tan. Ready to glow again? Book your next session: {link}",
      operatingHours: JSON.stringify({
        Monday: { enabled: true, open: "16:30", close: "20:00" },
        Tuesday: { enabled: true, open: "16:30", close: "20:00" },
        Wednesday: { enabled: true, open: "16:30", close: "20:00" },
        Thursday: { enabled: true, open: "16:30", close: "20:00" },
        Friday: { enabled: true, open: "10:30", close: "13:00" },
        Saturday: null,
        Sunday: null,
      }),
    });

    // Message logs (sample)
    storage.createMessageLog({ clientId: c1.id, appointmentId: 1, type: "booking_confirm", channel: "sms", to: "435-555-0101", body: "Hi Sarah! Your Full Body Spray Tan is confirmed for today at 09:00.", status: "sent", sentAt: today + "T08:00:00Z" });
    storage.createMessageLog({ clientId: c4.id, appointmentId: 3, type: "prep_reminder", channel: "sms", to: "435-555-0104", body: "Reminder: Your tan appointment is today at 14:00. Please exfoliate and avoid lotions!", status: "sent", sentAt: today + "T07:00:00Z" });

    // Gift Cards
    storage.createGiftCard({ code: "BB-GLOW50", initialAmount: 50, balance: 50, purchaserName: "Mike Johnson", recipientName: "Sarah Johnson", recipientEmail: "sarah@email.com", status: "active", expiresAt: "2027-04-08", createdAt: "2026-03-15" });
    storage.createGiftCard({ code: "BB-TAN100", initialAmount: 100, balance: 65, purchaserName: "Lisa Chen", recipientName: "Emily Chen", recipientEmail: "emily@email.com", status: "active", expiresAt: "2027-01-01", createdAt: "2026-02-14" });
    storage.createGiftCard({ code: "BB-BRIDE", initialAmount: 200, balance: 0, purchaserName: "Olivia Taylor", recipientName: "Olivia Taylor", recipientEmail: "olivia@email.com", status: "used", expiresAt: null, createdAt: "2026-01-20" });

    // Waitlist
    storage.createWaitlistEntry({ clientId: null, firstName: "Ava", lastName: "Williams", phone: "435-555-0190", email: "ava@email.com", serviceId: s1.id, preferredDate: today, status: "waiting", notes: "First time, wants afternoon slot", createdAt: today });
    storage.createWaitlistEntry({ clientId: null, firstName: "Sophia", lastName: "Brown", phone: "435-555-0191", email: null, serviceId: s5.id, preferredDate: today, status: "waiting", notes: null, createdAt: yesterday });

    // Promo Codes
    storage.createPromoCode({ code: "GLOW20", discountType: "percent", discountValue: 20, maxUses: 50, usedCount: 12, expiresAt: "2026-12-31", isActive: true, createdAt: "2026-03-01" });
    storage.createPromoCode({ code: "NEWCLIENT", discountType: "fixed", discountValue: 10, maxUses: null, usedCount: 5, expiresAt: null, isActive: true, createdAt: "2026-01-15" });
    storage.createPromoCode({ code: "BRIDE15", discountType: "percent", discountValue: 15, maxUses: 10, usedCount: 10, expiresAt: "2026-06-01", isActive: true, createdAt: "2026-02-01" });

    // Loyalty Points (demo)
    storage.createLoyaltyEntry({ clientId: c1.id, points: 50, reason: "earned_visit", appointmentId: 5, createdAt: yesterday });
    storage.createLoyaltyEntry({ clientId: c5.id, points: 50, reason: "earned_visit", appointmentId: 6, createdAt: twoDaysAgo });
    storage.createLoyaltyEntry({ clientId: c1.id, points: 25, reason: "earned_referral", appointmentId: null, createdAt: "2026-03-01" });

    res.json({ message: "Demo data seeded" });
  });
}

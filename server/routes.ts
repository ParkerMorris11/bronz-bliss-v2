import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";

export async function registerRoutes(server: Server, app: Express) {
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
  app.post("/api/services", (req, res) => {
    const svc = storage.createService(req.body);
    res.status(201).json(svc);
  });
  app.patch("/api/services/:id", (req, res) => {
    const svc = storage.updateService(Number(req.params.id), req.body);
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
  app.post("/api/clients", (req, res) => {
    const client = storage.createClient(req.body);
    res.status(201).json(client);
  });
  app.patch("/api/clients/:id", (req, res) => {
    const client = storage.updateClient(Number(req.params.id), req.body);
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
  app.post("/api/appointments", (req, res) => {
    const appt = storage.createAppointment(req.body);
    res.status(201).json(appt);
  });
  app.patch("/api/appointments/:id", (req, res) => {
    const appt = storage.updateAppointment(Number(req.params.id), req.body);
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
  app.post("/api/sessions", (req, res) => {
    const rec = storage.createSessionRecord(req.body);
    res.status(201).json(rec);
  });

  // ── Package Plans ─────────────────────────────────────
  app.get("/api/package-plans", (_req, res) => {
    res.json(storage.getPackagePlans());
  });
  app.post("/api/package-plans", (req, res) => {
    const plan = storage.createPackagePlan(req.body);
    res.status(201).json(plan);
  });
  app.patch("/api/package-plans/:id", (req, res) => {
    const plan = storage.updatePackagePlan(Number(req.params.id), req.body);
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
  app.post("/api/client-packages", (req, res) => {
    const pkg = storage.createClientPackage(req.body);
    res.status(201).json(pkg);
  });
  app.patch("/api/client-packages/:id", (req, res) => {
    const pkg = storage.updateClientPackage(Number(req.params.id), req.body);
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
  app.post("/api/payments", (req, res) => {
    const payment = storage.createPayment(req.body);
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

  // ── Sign Waiver (client action) ───────────────────────
  app.post("/api/clients/:id/sign-waiver", (req, res) => {
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

  // ── SMS Send (mock — logs message, simulates Twilio) ──
  app.post("/api/sms/send", (req, res) => {
    const { clientId, appointmentId, type, to, body } = req.body;
    const log = storage.createMessageLog({
      clientId,
      appointmentId: appointmentId || null,
      type,
      channel: "sms",
      to,
      body,
      status: "sent",
      sentAt: new Date().toISOString(),
    });
    res.status(201).json({ ...log, mock: true, note: "SMS simulated — connect Twilio for real delivery" });
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
  app.post("/api/inventory", (req, res) => {
    const item = storage.createInventoryItem(req.body);
    res.status(201).json(item);
  });
  app.patch("/api/inventory/:id", (req, res) => {
    const item = storage.updateInventoryItem(Number(req.params.id), req.body);
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

    const settings = storage.getBusinessSettings();
    const service = storage.getService(serviceId);
    if (!service) return res.status(404).json({ error: "Service not found" });

    if (!settings.bookingEnabled) return res.json({ slots: [], closed: true });

    // Determine operating hours for this day
    const dayOfWeek = new Date(date + "T12:00:00").toLocaleDateString("en-US", { weekday: "long" });
    const DAY_KEYS: Record<string, string> = {
      Monday: "mon", Tuesday: "tue", Wednesday: "wed", Thursday: "thu",
      Friday: "fri", Saturday: "sat", Sunday: "sun",
    };
    let openMin = 9 * 60, closeMin = 18 * 60, isOpen = true;
    if (settings.operatingHours) {
      try {
        const hours = JSON.parse(settings.operatingHours);
        const dayHours = hours[DAY_KEYS[dayOfWeek]];
        if (!dayHours) { isOpen = false; }
        else {
          const [oh, om] = (dayHours.open || "09:00").split(":").map(Number);
          const [ch, cm] = (dayHours.close || "18:00").split(":").map(Number);
          openMin = oh * 60 + om; closeMin = ch * 60 + cm;
        }
      } catch {}
    }
    if (!isOpen) return res.json({ slots: [], closed: true });

    // Booking notice window
    const notice = settings.bookingNotice ?? 60;
    const today = new Date().toISOString().split("T")[0];
    const nowMin = date === today ? (new Date().getHours() * 60 + new Date().getMinutes() + notice) : 0;

    // Existing appointment blocks
    const existing = storage.getAppointmentsByDate(date).filter(
      a => a.status !== "cancelled" && a.status !== "no_show"
    );
    const blocks = existing.map(a => {
      const svc = storage.getService(a.serviceId);
      const [h, m] = a.time.split(":").map(Number);
      const start = h * 60 + m;
      return { start, end: start + (svc?.duration ?? 30) };
    });

    // Generate 30-min slots
    const duration = service.duration;
    const slots: string[] = [];
    for (let t = openMin; t + duration <= closeMin; t += 30) {
      if (t < nowMin) continue;
      if (!blocks.some(b => t < b.end && t + duration > b.start)) {
        const h = Math.floor(t / 60).toString().padStart(2, "0");
        const m = (t % 60).toString().padStart(2, "0");
        slots.push(`${h}:${m}`);
      }
    }
    res.json({ slots, closed: false });
  });

  // POST /api/public/book
  app.post("/api/public/book", (req, res) => {
    const { firstName, lastName, phone, email, notes, serviceId, date, time } = req.body;
    if (!firstName || !lastName || !serviceId || !date || !time) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    const settings = storage.getBusinessSettings();
    if (!settings.bookingEnabled) return res.status(403).json({ error: "Booking is disabled" });

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

    const appointment = storage.createAppointment({
      clientId: client.id,
      serviceId: Number(serviceId),
      date, time, status: "scheduled", depositPaid: false,
      depositAmount: settings.depositRequired ? (settings.depositAmount ?? null) : null,
      source: "booking_link",
      notes: notes || null,
      createdAt: new Date().toISOString().split("T")[0],
    });

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

  // ── Seed demo data ────────────────────────────────────
  app.post("/api/seed", (_req, res) => {
    const existingServices = storage.getServices();
    if (existingServices.length > 0) {
      return res.json({ message: "Already seeded" });
    }

    // Services
    const s1 = storage.createService({ name: "Full Body Spray Tan", description: "Custom airbrush full body application", duration: 30, price: 45, category: "spray_tan", isActive: true });
    const s2 = storage.createService({ name: "Express Spray Tan", description: "Quick dry formula, 1-hour rinse", duration: 20, price: 35, category: "spray_tan", isActive: true });
    const s3 = storage.createService({ name: "Booth Tan - Standard", description: "UV-free booth session", duration: 10, price: 20, category: "booth_tan", isActive: true });
    const s4 = storage.createService({ name: "Tanning Bed - 15 min", description: "Standard UV bed session", duration: 15, price: 15, category: "bed_tan", isActive: true });
    const s5 = storage.createService({ name: "Rapid Spray Tan", description: "2-hour develop, darker result", duration: 25, price: 55, category: "spray_tan", isActive: true });

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

    // Intake Questions (default set)
    storage.createIntakeQuestion({ question: "Have you ever had a spray tan before?", type: "select", options: JSON.stringify(["Yes", "No"]), required: true, sortOrder: 1, isActive: true });
    storage.createIntakeQuestion({ question: "Do you have any skin conditions or allergies?", type: "textarea", options: null, required: true, sortOrder: 2, isActive: true });
    storage.createIntakeQuestion({ question: "What shade are you hoping to achieve?", type: "select", options: JSON.stringify(["Light / Natural glow", "Medium / Sun-kissed", "Dark / Deep bronze", "Not sure — need guidance"]), required: true, sortOrder: 3, isActive: true });
    storage.createIntakeQuestion({ question: "Are you currently using any retinol or exfoliant products?", type: "select", options: JSON.stringify(["Yes", "No", "Not sure"]), required: true, sortOrder: 4, isActive: true });
    storage.createIntakeQuestion({ question: "Is there anything else we should know?", type: "textarea", options: null, required: false, sortOrder: 5, isActive: true });

    // Waiver Template
    storage.createWaiverTemplate({
      title: "Spray Tan Consent & Liability Waiver",
      content: `I understand that a spray tan involves the application of a cosmetic product (DHA-based solution) to my skin.\n\n**Risks & Acknowledgments:**\n- I confirm I am not allergic to any ingredients listed by the technician.\n- I understand results vary based on skin type, prep, and aftercare.\n- I acknowledge that spray tans are cosmetic and do NOT provide UV protection.\n- I will follow all aftercare instructions provided.\n\n**Liability Release:**\nI release this business, its owners, and staff from any liability related to adverse reactions, unsatisfactory results, or damage to personal property during my session.\n\nBy signing below, I confirm I have read and agree to these terms.`,
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
      businessName: "Bronz Bliss",
      phone: "435-555-0200",
      email: "hello@bronzbliss.com",
      address: "123 Main Street, Cedar City, UT 84720",
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
        mon: { open: "09:00", close: "18:00" },
        tue: { open: "09:00", close: "18:00" },
        wed: { open: "09:00", close: "18:00" },
        thu: { open: "09:00", close: "20:00" },
        fri: { open: "09:00", close: "20:00" },
        sat: { open: "10:00", close: "16:00" },
        sun: null,
      }),
    });

    // Message logs (sample)
    storage.createMessageLog({ clientId: c1.id, appointmentId: 1, type: "booking_confirm", channel: "sms", to: "435-555-0101", body: "Hi Sarah! Your Full Body Spray Tan is confirmed for today at 09:00.", status: "sent", sentAt: today + "T08:00:00Z" });
    storage.createMessageLog({ clientId: c4.id, appointmentId: 3, type: "prep_reminder", channel: "sms", to: "435-555-0104", body: "Reminder: Your tan appointment is today at 14:00. Please exfoliate and avoid lotions!", status: "sent", sentAt: today + "T07:00:00Z" });

    res.json({ message: "Demo data seeded" });
  });
}

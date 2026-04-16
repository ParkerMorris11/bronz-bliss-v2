import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { useState, useMemo } from "react";
import type { DashboardData } from "../../../server/storage";
import type { Appointment, Client, Service } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";

function ClientLink({ name, clientId }: { name: string; clientId?: number }) {
  const [, navigate] = useLocation();
  if (!clientId) return <span>{name}</span>;
  return (
    <button
      onClick={(e) => { e.stopPropagation(); navigate(`/clients?id=${clientId}`); }}
      style={{
        background: "none", border: "none", padding: 0, margin: 0,
        color: "inherit", fontWeight: "inherit", fontSize: "inherit",
        cursor: "pointer", textDecoration: "none",
        borderBottom: "1px dashed rgba(107,63,42,0.35)",
        transition: "border-color 0.15s",
      }}
      onMouseEnter={e => (e.currentTarget.style.borderBottomColor = "rgba(107,63,42,0.85)")}
      onMouseLeave={e => (e.currentTarget.style.borderBottomColor = "rgba(107,63,42,0.35)")}
    >{name}</button>
  );
}

const TODAY = new Date().toISOString().slice(0, 10);

function fmtTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h === 0 ? 12 : h > 12 ? h - 12 : h}:${String(m).padStart(2, "0")} ${ampm}`;
}
function fmtMoney(n: number) {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`;
  return `$${n.toFixed(0)}`;
}
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

export default function Dashboard() {
  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ["/api/dashboard", TODAY],
    queryFn: () => apiRequest("GET", `/api/dashboard?date=${TODAY}`).then(r => r.json()),
    refetchInterval: 60000,
  });

  const markReminderMutation = useMutation({
    mutationFn: ({ id, field }: { id: number; field: string }) =>
      apiRequest("PATCH", `/api/appointments/${id}`, { [field]: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] }),
  });

  if (isLoading || !data) {
    return (
      <div style={{ padding: "28px 32px", background: "var(--bg)", minHeight: "100%" }}>
        <Skeleton className="h-8 w-52 mb-8" style={{ background: "var(--border)" }} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginBottom: 24 }}>
          {[0,1,2].map(i => <Skeleton key={i} className="h-32 rounded-2xl" style={{ background: "var(--border)" }} />)}
        </div>
        <Skeleton className="h-96 rounded-2xl" style={{ background: "var(--border)" }} />
      </div>
    );
  }

  const { todayBookings, revenue, totalClients, followUpQueue } = data;
  const totalFollowUps = followUpQueue.prepReminders.length + followUpQueue.rinseReminders.length + followUpQueue.reviewRequests.length;

  const statusMeta: Record<string, { color: string; bg: string; border: string; label: string }> = {
    completed: { color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0", label: "Done" },
    checked_in: { color: "#d97706", bg: "#fffbeb", border: "#fde68a", label: "Here" },
    scheduled:  { color: "#6b7280", bg: "#f9fafb", border: "#e5e7eb", label: "Scheduled" },
    no_show:    { color: "#dc2626", bg: "#fef2f2", border: "#fecaca", label: "No-show" },
    cancelled:  { color: "#dc2626", bg: "#fef2f2", border: "#fecaca", label: "Cancelled" },
  };

  return (
    <div style={{ padding: "28px 32px", minHeight: "100%", background: "var(--bg)", color: "var(--text-primary)" }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: 0, fontSize: "1.35rem", fontWeight: 700, letterSpacing: "-0.02em", color: "var(--text-primary)" }}>
          Good {getGreeting()}, Izzy
        </h1>
        <p style={{ margin: "4px 0 0", fontSize: "0.82rem", color: "var(--text-muted)" }}>
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </p>
      </div>

      {/* ── 3 Hero Stat Cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 28 }}>

        {/* Today's Appointments */}
        <StatCard
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
            </svg>
          }
          iconColor="#6B3F2A"
          iconBg="var(--amber-light)"
          label="Today's Appointments"
          value={String(todayBookings.count)}
          sub={todayBookings.nextClient
            ? `Next: ${todayBookings.nextClient.clientName.split(" ")[0]} at ${fmtTime(todayBookings.nextClient.time)}`
            : "No more today"}
        />

        {/* Total Clients */}
        <StatCard
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          }
          iconColor="#3b82f6"
          iconBg="#eff6ff"
          label="Total Clients"
          value={String(totalClients ?? 0)}
          sub="in your studio"
        />

        {/* Monthly Revenue */}
        <StatCard
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
            </svg>
          }
          iconColor="#16a34a"
          iconBg="#f0fdf4"
          label="Monthly Revenue"
          value={fmtMoney(revenue.monthlyRevenue ?? 0)}
          sub={`${new Date().toLocaleDateString("en-US", { month: "long" })} · collected`}
        />
      </div>

      {/* ── Today's Appointments List ── */}
      <div style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: 20,
        boxShadow: "var(--shadow-md)",
        overflow: "hidden",
      }}>
        {/* Card header */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "20px 24px 16px",
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)" }}>
              Today's Appointments
            </h2>
            <p style={{ margin: "3px 0 0", fontSize: "0.75rem", color: "var(--text-muted)" }}>
              {todayBookings.count} {todayBookings.count === 1 ? "client" : "clients"} scheduled
            </p>
          </div>
          {totalFollowUps > 0 && (
            <span style={{
              fontSize: "0.75rem", fontWeight: 600, padding: "5px 12px", borderRadius: 999,
              background: "#fffbeb", color: "#d97706", border: "1px solid #fde68a",
            }}>
              {totalFollowUps} follow-up{totalFollowUps !== 1 ? "s" : ""} due
            </span>
          )}
        </div>

        {/* Next client hero banner */}
        {todayBookings.nextClient && (
          <div style={{
            margin: "0 20px 16px",
            padding: "14px 18px", borderRadius: 14,
            background: "var(--amber-light)", border: "1px solid rgba(107,63,42,0.2)",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div>
              <div style={{ fontSize: "0.7rem", color: "var(--amber)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>
                Up Next · {fmtTime(todayBookings.nextClient.time)}
              </div>
              <div style={{ fontWeight: 700, fontSize: "1rem", color: "var(--text-primary)" }}>
                <ClientLink name={todayBookings.nextClient.clientName} clientId={todayBookings.nextClient.clientId} />
              </div>
              <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: 2 }}>
                {todayBookings.nextClient.serviceName}
              </div>
            </div>
            <div style={{
              width: 44, height: 44, borderRadius: 999, flexShrink: 0,
              background: "rgba(107,63,42,0.12)", border: "2px solid rgba(107,63,42,0.25)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "1rem", fontWeight: 700, color: "var(--amber)",
            }}>
              {todayBookings.nextClient.clientName.split(" ").map((n: string) => n[0]).join("").slice(0,2).toUpperCase()}
            </div>
          </div>
        )}

        {/* Appointment rows */}
        {todayBookings.appointments.length === 0 ? (
          <div style={{ padding: "40px 24px", textAlign: "center", color: "var(--text-muted)", fontSize: "0.9rem" }}>
            No appointments today
          </div>
        ) : (
          <div style={{ padding: "0 12px 16px" }}>
            {todayBookings.appointments.map((appt, i) => {
              const meta = statusMeta[appt.status] ?? statusMeta.scheduled;
              const isLast = i === todayBookings.appointments.length - 1;
              return (
                <div key={appt.id} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "13px 14px",
                  borderRadius: 12,
                  marginBottom: isLast ? 0 : 4,
                  transition: "background 0.12s",
                }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--bg-hover)"}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
                >
                  {/* Left: dot + name + service */}
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{
                      width: 9, height: 9, borderRadius: 999,
                      background: meta.color, flexShrink: 0,
                    }} />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--text-primary)" }}>
                        <ClientLink name={appt.clientName} clientId={appt.clientId} />
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: 1 }}>
                        {appt.serviceName}
                      </div>
                    </div>
                  </div>

                  {/* Right: time + status badge */}
                  <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
                    <span style={{ fontSize: "0.82rem", color: "var(--text-secondary)", fontVariantNumeric: "tabular-nums" }}>
                      {fmtTime(appt.time)}
                    </span>
                    <span style={{
                      fontSize: "0.72rem", fontWeight: 600, padding: "3px 10px", borderRadius: 999,
                      background: meta.bg, color: meta.color, border: `1px solid ${meta.border}`,
                      minWidth: 64, textAlign: "center",
                    }}>
                      {meta.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Gaps footer */}
        {todayBookings.gaps.length > 0 && (
          <div style={{
            padding: "14px 24px 18px",
            borderTop: "1px solid var(--border)",
          }}>
            <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
              Open Gaps
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {todayBookings.gaps.map((g, i) => (
                <span key={i} style={{
                  fontSize: "0.75rem", padding: "4px 12px", borderRadius: 999,
                  background: "#eff6ff", color: "#3b82f6", border: "1px solid #bfdbfe",
                }}>
                  {fmtTime(g.start)} – {fmtTime(g.end)}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div style={{ height: 24 }} />

      {/* ── Month Calendar ── */}
      <MonthCalendar />

      <div style={{ height: 32 }} />
    </div>
  );
}

// ── Month Calendar ───────────────────────────────────────────────────────────
function MonthCalendar() {
  const [, navigate] = useLocation();
  const [cursor, setCursor] = useState(() => {
    const d = new Date(); d.setDate(1); return d;
  });
  const [selected, setSelected] = useState<string | null>(null);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startDow = first.getDay();
  const daysInMonth = last.getDate();
  const gridStart = new Date(year, month, 1 - startDow);
  const cells: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    cells.push(d);
  }
  const rangeStart = cells[0].toISOString().slice(0, 10);
  const rangeEnd = cells[cells.length - 1].toISOString().slice(0, 10);

  const { data: appts = [] } = useQuery<Appointment[]>({
    queryKey: ["/api/appointments", "range", rangeStart, rangeEnd],
    queryFn: () => apiRequest("GET", `/api/appointments?start=${rangeStart}&end=${rangeEnd}`).then(r => r.json()),
  });
  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
    queryFn: () => apiRequest("GET", "/api/clients").then(r => r.json()),
  });
  const { data: services = [] } = useQuery<Service[]>({
    queryKey: ["/api/services"],
    queryFn: () => apiRequest("GET", "/api/services").then(r => r.json()),
  });

  const byDate = useMemo(() => {
    const m = new Map<string, Appointment[]>();
    for (const a of appts) {
      if (!m.has(a.date)) m.set(a.date, []);
      m.get(a.date)!.push(a);
    }
    for (const list of m.values()) list.sort((a, b) => a.time.localeCompare(b.time));
    return m;
  }, [appts]);

  const clientById = useMemo(() => new Map(clients.map(c => [c.id, c])), [clients]);
  const serviceById = useMemo(() => new Map(services.map(s => [s.id, s])), [services]);

  const today = new Date().toISOString().slice(0, 10);
  const selectedAppts = selected ? (byDate.get(selected) ?? []) : [];

  const SERVICE_COLOR: Record<string, string> = {
    spray: "#b8895a", bridal: "#ec4899", contour: "#8b5cf6",
    addon: "#6b7280", express: "#f59e0b", luxury: "#0ea5e9", custom: "#10b981",
  };

  return (
    <div style={{
      background: "var(--bg-card)",
      border: "1px solid var(--border)",
      borderRadius: 20,
      boxShadow: "var(--shadow-md)",
      overflow: "hidden",
    }}>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "20px 24px 16px", borderBottom: "1px solid var(--border)",
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)" }}>
            {first.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </h2>
          <p style={{ margin: "3px 0 0", fontSize: "0.75rem", color: "var(--text-muted)" }}>
            {appts.length} appointment{appts.length === 1 ? "" : "s"} this view
          </p>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => setCursor(new Date(year, month - 1, 1))} style={navBtn}>‹</button>
          <button onClick={() => { const d = new Date(); d.setDate(1); setCursor(d); setSelected(null); }} style={{ ...navBtn, width: "auto", padding: "0 12px", fontSize: "0.75rem" }}>Today</button>
          <button onClick={() => setCursor(new Date(year, month + 1, 1))} style={navBtn}>›</button>
        </div>
      </div>

      <div style={{ padding: "0 12px 12px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, padding: "12px 4px 6px" }}>
          {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => (
            <div key={d} style={{ fontSize: "0.7rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", textAlign: "center" }}>{d}</div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
          {cells.map((d, i) => {
            const key = d.toISOString().slice(0, 10);
            const inMonth = d.getMonth() === month;
            const isToday = key === today;
            const isSelected = key === selected;
            const dayAppts = byDate.get(key) ?? [];
            const count = dayAppts.length;
            return (
              <button
                key={i}
                onClick={() => setSelected(isSelected ? null : key)}
                style={{
                  minHeight: 72,
                  padding: "6px 6px 4px",
                  background: isSelected ? "var(--amber-light)" : "var(--bg-card)",
                  border: isSelected ? "2px solid var(--amber)" : isToday ? "1px solid var(--amber)" : "1px solid var(--border)",
                  borderRadius: 10,
                  cursor: "pointer",
                  opacity: inMonth ? 1 : 0.4,
                  display: "flex", flexDirection: "column", alignItems: "flex-start",
                  gap: 4,
                  transition: "background 0.12s",
                  fontFamily: "inherit",
                }}
                onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = "var(--bg-hover)"; }}
                onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = "var(--bg-card)"; }}
              >
                <div style={{
                  fontSize: "0.78rem",
                  fontWeight: isToday ? 700 : 500,
                  color: isToday ? "var(--amber)" : "var(--text-primary)",
                }}>
                  {d.getDate()}
                </div>
                {count > 0 && (
                  <>
                    <div style={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                      {dayAppts.slice(0, 4).map(a => {
                        const svc = serviceById.get(a.serviceId);
                        const color = SERVICE_COLOR[svc?.type ?? "custom"] ?? "#6b7280";
                        return (
                          <span key={a.id} style={{ width: 6, height: 6, borderRadius: 999, background: color, display: "inline-block" }} />
                        );
                      })}
                      {count > 4 && (
                        <span style={{ fontSize: "0.62rem", color: "var(--text-muted)", lineHeight: 1 }}>+{count - 4}</span>
                      )}
                    </div>
                    <div style={{ fontSize: "0.65rem", fontWeight: 600, color: "var(--text-secondary)" }}>
                      {count} booked
                    </div>
                  </>
                )}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, padding: "14px 8px 4px", fontSize: "0.7rem", color: "var(--text-muted)" }}>
          {Object.entries({ spray: "Spray", bridal: "Bridal", contour: "Contour", addon: "Add-on" }).map(([k, label]) => (
            <span key={k} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 8, height: 8, borderRadius: 999, background: SERVICE_COLOR[k] }} /> {label}
            </span>
          ))}
        </div>
      </div>

      {/* Selected day detail */}
      {selected && (
        <div style={{
          borderTop: "1px solid var(--border)",
          padding: "16px 24px 20px",
          background: "var(--bg)",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
            <h3 style={{ margin: 0, fontSize: "0.9rem", fontWeight: 700, color: "var(--text-primary)" }}>
              {new Date(selected + "T12:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </h3>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
              {selectedAppts.length} appointment{selectedAppts.length === 1 ? "" : "s"}
            </span>
          </div>
          {selectedAppts.length === 0 ? (
            <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", padding: "12px 0" }}>
              No appointments this day.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {selectedAppts.map(a => {
                const c = clientById.get(a.clientId);
                const svc = serviceById.get(a.serviceId);
                const color = SERVICE_COLOR[svc?.type ?? "custom"] ?? "#6b7280";
                return (
                  <div key={a.id} style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "10px 12px", borderRadius: 10,
                    background: "var(--bg-card)", border: "1px solid var(--border)",
                  }}>
                    <span style={{ width: 9, height: 9, borderRadius: 999, background: color, flexShrink: 0 }} />
                    <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)", fontVariantNumeric: "tabular-nums", minWidth: 64 }}>
                      {fmtTime(a.time)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: "0.88rem", color: "var(--text-primary)" }}>
                        {c ? <button
                          onClick={(e) => { e.stopPropagation(); navigate(`/clients?id=${c.id}`); }}
                          style={{ background: "none", border: "none", padding: 0, color: "inherit", fontWeight: "inherit", fontSize: "inherit", cursor: "pointer", borderBottom: "1px dashed rgba(107,63,42,0.35)" }}
                        >{c.name}</button> : "Unknown"}
                      </div>
                      <div style={{ fontSize: "0.74rem", color: "var(--text-muted)", marginTop: 1 }}>
                        {svc?.name ?? "Service"}
                      </div>
                    </div>
                    <span style={{
                      fontSize: "0.7rem", fontWeight: 600, padding: "3px 10px", borderRadius: 999,
                      background: a.status === "completed" ? "#f0fdf4" : "#f9fafb",
                      color: a.status === "completed" ? "#16a34a" : "#6b7280",
                      border: `1px solid ${a.status === "completed" ? "#bbf7d0" : "#e5e7eb"}`,
                    }}>
                      {a.status === "checked_in" ? "Here" : a.status === "completed" ? "Done" : a.status === "no_show" ? "No-show" : a.status === "cancelled" ? "Cancelled" : "Scheduled"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const navBtn: React.CSSProperties = {
  width: 32, height: 32, borderRadius: 8,
  background: "var(--bg-card)", border: "1px solid var(--border)",
  color: "var(--text-primary)", cursor: "pointer", fontSize: "1rem", fontWeight: 600,
  display: "flex", alignItems: "center", justifyContent: "center",
  fontFamily: "inherit",
};

// ── StatCard ─────────────────────────────────────────────────────────────────
function StatCard({
  icon, iconColor, iconBg, label, value, sub,
}: {
  icon: React.ReactNode;
  iconColor: string;
  iconBg: string;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div style={{
      background: "var(--bg-card)",
      border: "1px solid var(--border)",
      borderRadius: 20,
      padding: "22px 24px",
      boxShadow: "var(--shadow-md)",
      display: "flex",
      flexDirection: "column",
      gap: 14,
    }}>
      {/* Icon */}
      <div style={{
        width: 44, height: 44, borderRadius: 12,
        background: iconBg, color: iconColor,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
      }}>
        {icon}
      </div>

      {/* Numbers */}
      <div>
        <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: 500, marginBottom: 4 }}>{label}</div>
        <div style={{ fontSize: "2rem", fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.03em", lineHeight: 1 }}>
          {value}
        </div>
        <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: 5 }}>{sub}</div>
      </div>
    </div>
  );
}

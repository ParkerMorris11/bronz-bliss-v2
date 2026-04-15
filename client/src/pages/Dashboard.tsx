import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import type { DashboardData } from "../../../server/storage";
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
        borderBottom: "1px dashed rgba(232,148,58,0.35)",
        transition: "border-color 0.15s",
      }}
      onMouseEnter={e => (e.currentTarget.style.borderBottomColor = "rgba(232,148,58,0.8)")}
      onMouseLeave={e => (e.currentTarget.style.borderBottomColor = "rgba(232,148,58,0.35)")}
    >{name}</button>
  );
}

const TODAY = new Date().toISOString().slice(0, 10);
const WEEKDAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function fmtDate(d: string) {
  const dt = new Date(d + "T12:00:00");
  return `${MONTHS[dt.getMonth()]} ${dt.getDate()}`;
}
function fmtTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h === 0 ? 12 : h > 12 ? h - 12 : h}:${String(m).padStart(2,"0")} ${ampm}`;
}
function fmtMoney(n: number) {
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
      <div style={{ padding: 28, background: "var(--bg)", minHeight: "100%" }}>
        <Skeleton className="h-8 w-48 mb-6" style={{ background: "var(--border)" }} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 18 }}>
          {[0,1,2,3].map(i => <Skeleton key={i} className="h-28 rounded-2xl" style={{ background: "var(--border)" }} />)}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 18 }}>
          <Skeleton className="h-64 rounded-2xl" style={{ background: "var(--border)" }} />
          <Skeleton className="h-64 rounded-2xl" style={{ background: "var(--border)" }} />
        </div>
      </div>
    );
  }

  const {
    todayBookings, revenue, packageLiability,
    clientRetention, followUpQueue, serviceMix,
    calendarUtilization,
  } = data;

  const totalFollowUps = followUpQueue.prepReminders.length + followUpQueue.rinseReminders.length + followUpQueue.reviewRequests.length;
  const maxRevenue = Math.max(...revenue.sevenDayTrend.map(d => d.amount), 1);
  const maxServiceCount = Math.max(...serviceMix.map(s => s.count), 1);

  return (
    <div style={{ padding: "24px 28px", minHeight: "100%", background: "var(--bg)", color: "var(--text-primary)" }}>
      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: "1.2rem", fontWeight: 700, letterSpacing: "-0.02em", color: "var(--text-primary)" }}>
            Good {getGreeting()}, Izzy
          </div>
          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: 2 }}>
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <StatusPill color="#16a34a" bg="#f0fdf4" border="#bbf7d0" label={`${todayBookings.count} bookings`} />
          {totalFollowUps > 0 && <StatusPill color="#d97706" bg="#fffbeb" border="#fde68a" label={`${totalFollowUps} follow-ups`} />}
        </div>
      </div>

      {/* ── Row 1: Today's Bookings + Check-In Queue ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1.35fr 1fr", gap: 16, marginBottom: 16 }}>

        {/* Today's Bookings */}
        <SectionCard title="Today's Bookings" eyebrow={`${todayBookings.count} clients`}>
          {todayBookings.nextClient && (
            <div style={{
              padding: "14px 16px", borderRadius: 12, marginBottom: 14,
              background: "var(--amber-light)", border: "1px solid rgba(232,148,58,0.2)",
            }}>
              <div style={{ fontSize: "0.7rem", color: "var(--amber)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>
                Next Up · {fmtTime(todayBookings.nextClient.time)}
              </div>
              <div style={{ fontWeight: 700, fontSize: "1rem", color: "var(--text-primary)" }}>
                <ClientLink name={todayBookings.nextClient.clientName} clientId={todayBookings.nextClient.clientId} />
              </div>
              <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginTop: 3 }}>
                {todayBookings.nextClient.serviceName}
              </div>
            </div>
          )}

          <div style={{ display: "grid", gap: 7 }}>
            {todayBookings.appointments.map(appt => (
              <ApptRow key={appt.id} appt={appt} />
            ))}
          </div>

          {todayBookings.gaps.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>
                Open Gaps
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {todayBookings.gaps.map((g, i) => (
                  <span key={i} style={{
                    fontSize: "0.75rem", padding: "4px 10px", borderRadius: 999,
                    background: "#eff6ff", color: "#3b82f6",
                    border: "1px solid #bfdbfe",
                  }}>
                    {fmtTime(g.start)} – {fmtTime(g.end)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </SectionCard>

        {/* Check-In Queue */}
        <SectionCard title="Check-In Queue" eyebrow="Arriving soon">
          {todayBookings.appointments.filter(a => a.status === "scheduled").length === 0 ? (
            <EmptyState label="No pending check-ins" />
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {todayBookings.appointments
                .filter(a => a.status === "scheduled")
                .slice(0, 6)
                .map(appt => (
                  <CheckInRow key={appt.id} appt={appt} />
                ))}
            </div>
          )}
        </SectionCard>
      </div>

      {/* ── Row 2: Revenue + Package Liability ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 16, marginBottom: 16 }}>

        {/* Revenue Snapshot */}
        <SectionCard title="Revenue" eyebrow="Today & 7-day">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 18 }}>
            <MiniStat label="Booked Today" value={fmtMoney(revenue.bookedToday)} color="var(--amber)" />
            <MiniStat label="Collected Today" value={fmtMoney(revenue.completedToday)} color="#16a34a" />
          </div>
          <div>
            <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>
              7-Day Revenue
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 64 }}>
              {revenue.sevenDayTrend.map((d, i) => {
                const pct = Math.max((d.amount / maxRevenue) * 100, 5);
                const isToday = d.date === TODAY;
                return (
                  <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, height: "100%" }}>
                    <div style={{ flex: 1, display: "flex", alignItems: "flex-end", width: "100%" }}>
                      <div
                        title={`${fmtDate(d.date)}: ${fmtMoney(d.amount)}`}
                        style={{
                          width: "100%", height: `${pct}%`,
                          borderRadius: "4px 4px 0 0",
                          background: isToday
                            ? "linear-gradient(to top, #e8943a, #f5a623)"
                            : "var(--border)",
                          transition: "height 0.3s ease",
                        }}
                      />
                    </div>
                    <span style={{ fontSize: "0.65rem", color: isToday ? "var(--amber)" : "var(--text-muted)" }}>
                      {WEEKDAYS[new Date(d.date + "T12:00:00").getDay()]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </SectionCard>

        {/* Package Liability */}
        <SectionCard title="Package Liability" eyebrow={`${packageLiability.totalSessionsOwed} sessions owed`}>
          {packageLiability.activePackages.length === 0 ? (
            <EmptyState label="No active packages" />
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {packageLiability.activePackages.slice(0, 5).map(pkg => (
                <div key={pkg.id} style={{
                  padding: "10px 14px", borderRadius: 12,
                  background: "var(--bg)", border: "1px solid var(--border)",
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "0.88rem", color: "var(--text-primary)" }}>
                      <ClientLink name={pkg.clientName} clientId={pkg.clientId} />
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 2 }}>{pkg.name}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    {pkg.type === "bundle" ? (
                      <span style={{ fontSize: "0.75rem", padding: "4px 10px", borderRadius: 999, background: "#fffbeb", color: "#d97706", border: "1px solid #fde68a" }}>
                        {pkg.sessionsRemaining} left
                      </span>
                    ) : (
                      <span style={{ fontSize: "0.75rem", padding: "4px 10px", borderRadius: 999, background: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0" }}>
                        Unlimited
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      {/* ── Row 3: Client Retention + Follow-Up Queue ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.3fr", gap: 16, marginBottom: 16 }}>

        {/* Client Retention */}
        <SectionCard title="Client Retention" eyebrow="Status breakdown">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <RetentionTile label="First Time" count={clientRetention.firstTime} color="#3b82f6" bg="#eff6ff" />
            <RetentionTile label="Active Repeat" count={clientRetention.activeRepeat} color="#16a34a" bg="#f0fdf4" />
            <RetentionTile label="At Risk" count={clientRetention.atRisk} color="#d97706" bg="#fffbeb" />
            <RetentionTile label="Dormant" count={clientRetention.dormant} color="#dc2626" bg="#fef2f2" />
          </div>
        </SectionCard>

        {/* Follow-Up Queue */}
        <SectionCard title="Follow-Up Queue" eyebrow={`${totalFollowUps} pending`}>
          {totalFollowUps === 0 ? (
            <EmptyState label="All caught up" />
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {followUpQueue.prepReminders.length > 0 && (
                <FollowUpGroup
                  label="Prep Reminders"
                  color="#3b82f6"
                  bg="#eff6ff"
                  border="#bfdbfe"
                  items={followUpQueue.prepReminders}
                  onMark={(id) => markReminderMutation.mutate({ id, field: "prepReminderSent" })}
                  template={(name) => `Hi ${name}! Your spray tan tomorrow – avoid moisturizer, wear loose dark clothing 🌟`}
                />
              )}
              {followUpQueue.rinseReminders.length > 0 && (
                <FollowUpGroup
                  label="Rinse Reminders"
                  color="#d97706"
                  bg="#fffbeb"
                  border="#fde68a"
                  items={followUpQueue.rinseReminders}
                  onMark={(id) => markReminderMutation.mutate({ id, field: "rinseReminderSent" })}
                  template={(name) => `Hi ${name}! Time to rinse – use cool water, pat dry. Your glow is setting beautifully 🌟`}
                />
              )}
              {followUpQueue.reviewRequests.length > 0 && (
                <FollowUpGroup
                  label="Review Requests"
                  color="#16a34a"
                  bg="#f0fdf4"
                  border="#bbf7d0"
                  items={followUpQueue.reviewRequests}
                  onMark={(id) => markReminderMutation.mutate({ id, field: "reviewRequestSent" })}
                  template={(name) => `Hi ${name}! Loved having you in! Would you mind leaving a quick review? It means the world 🌟`}
                />
              )}
            </div>
          )}
        </SectionCard>
      </div>

      {/* ── Row 4: Service Mix + Calendar Utilization ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 16 }}>

        {/* Service Mix */}
        <SectionCard title="Service Mix" eyebrow="Last 30 days">
          {serviceMix.length === 0 ? (
            <EmptyState label="No completed services yet" />
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {serviceMix.slice(0, 5).map((s, i) => (
                <div key={i}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-primary)" }}>{s.serviceName}</span>
                    <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                      {s.count}× · {fmtMoney(s.revenue)}
                    </span>
                  </div>
                  <div style={{ height: 6, borderRadius: 999, background: "var(--border)", overflow: "hidden" }}>
                    <div style={{
                      height: "100%", borderRadius: 999,
                      width: `${(s.count / maxServiceCount) * 100}%`,
                      background: "linear-gradient(90deg, var(--amber), #f5a623)",
                      transition: "width 0.5s ease",
                    }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {/* Calendar Utilization */}
        <SectionCard title="Calendar Utilization" eyebrow="14-day view">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 5 }}>
            {calendarUtilization.map((d, i) => {
              const pct = d.appointmentCount / d.totalSlots;
              const isToday = d.date === TODAY;
              const dt = new Date(d.date + "T12:00:00");
              const bg = pct === 0 ? "var(--bg)"
                : pct < 0.4 ? "rgba(232,148,58,0.12)"
                : pct < 0.7 ? "rgba(232,148,58,0.3)"
                : "rgba(232,148,58,0.6)";
              return (
                <div key={i} title={`${fmtDate(d.date)}: ${d.appointmentCount}/${d.totalSlots}`} style={{
                  aspectRatio: "1", borderRadius: 8,
                  background: bg,
                  border: isToday ? "2px solid var(--amber)" : "1px solid var(--border)",
                  display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center", gap: 2,
                }}>
                  <span style={{ fontSize: "0.6rem", color: "var(--text-muted)" }}>
                    {WEEKDAYS[dt.getDay()].slice(0,1)}
                  </span>
                  <span style={{ fontSize: "0.72rem", fontWeight: 700, color: isToday ? "var(--amber)" : "var(--text-primary)" }}>
                    {dt.getDate()}
                  </span>
                  {d.appointmentCount > 0 && (
                    <span style={{ fontSize: "0.6rem", color: "var(--text-muted)" }}>{d.appointmentCount}</span>
                  )}
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: 12, display: "flex", gap: 14, fontSize: "0.72rem", color: "var(--text-muted)" }}>
            {[["Low","rgba(232,148,58,0.12)"],["Medium","rgba(232,148,58,0.3)"],["Busy","rgba(232,148,58,0.6)"]].map(([l,c]) => (
              <span key={l} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: c as string, border: "1px solid var(--border)" }} />
                {l}
              </span>
            ))}
          </div>
        </SectionCard>
      </div>

      <div style={{ height: 32 }} />
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────

function SectionCard({ title, eyebrow, children }: { title: string; eyebrow: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: "var(--bg-card)",
      border: "1px solid var(--border)",
      borderRadius: 16,
      padding: 20,
      boxShadow: "var(--shadow-md)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.01em" }}>{title}</h2>
        <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 500 }}>{eyebrow}</span>
      </div>
      {children}
    </div>
  );
}

function ApptRow({ appt }: { appt: any }) {
  const statusMeta: Record<string, { color: string; bg: string; border: string; label: string }> = {
    completed: { color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0", label: "Done" },
    checked_in: { color: "#d97706", bg: "#fffbeb", border: "#fde68a", label: "Here" },
    scheduled:  { color: "#6b7280", bg: "#f9fafb", border: "#e5e7eb", label: "Sched." },
    no_show:    { color: "#dc2626", bg: "#fef2f2", border: "#fecaca", label: "No-show" },
    cancelled:  { color: "#dc2626", bg: "#fef2f2", border: "#fecaca", label: "Cancelled" },
  };
  const meta = statusMeta[appt.status] ?? statusMeta.scheduled;
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "10px 12px", borderRadius: 12,
      background: "var(--bg)", border: "1px solid var(--border)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 8, height: 8, borderRadius: 999,
          background: meta.color, flexShrink: 0,
        }} />
        <div>
          <div style={{ fontWeight: 600, fontSize: "0.875rem", color: "var(--text-primary)" }}>
            <ClientLink name={appt.clientName} clientId={appt.clientId} />
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>{appt.serviceName}</div>
        </div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontVariantNumeric: "tabular-nums" }}>
          {fmtTime(appt.time)}
        </div>
        <span style={{ fontSize: "0.7rem", padding: "2px 8px", borderRadius: 999, background: meta.bg, color: meta.color, border: `1px solid ${meta.border}`, marginTop: 3, display: "inline-block" }}>
          {meta.label}
        </span>
      </div>
    </div>
  );
}

function CheckInRow({ appt }: { appt: any }) {
  return (
    <div style={{
      padding: "12px 14px", borderRadius: 12,
      background: "var(--bg)", border: "1px solid var(--border)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: "0.88rem", color: "var(--text-primary)" }}>
            <ClientLink name={appt.clientName} clientId={appt.clientId} />
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: 2 }}>
            {fmtTime(appt.time)} · {appt.serviceName}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
        <StatusChip ok={appt.clientWaiver} label="Waiver" />
        <StatusChip ok={appt.clientIntake} label="Intake" />
      </div>
    </div>
  );
}

function StatusChip({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span style={{
      fontSize: "0.7rem", fontWeight: 600, padding: "3px 9px", borderRadius: 999,
      background: ok ? "#f0fdf4" : "#fef2f2",
      color: ok ? "#16a34a" : "#dc2626",
      border: `1px solid ${ok ? "#bbf7d0" : "#fecaca"}`,
    }}>
      {ok ? "✓" : "✗"} {label}
    </span>
  );
}

function MiniStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{
      padding: "14px 16px", borderRadius: 14,
      background: "var(--bg)", border: "1px solid var(--border)",
    }}>
      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: "1.5rem", fontWeight: 800, color, fontVariantNumeric: "tabular-nums" }}>{value}</div>
    </div>
  );
}

function RetentionTile({ label, count, color, bg }: { label: string; count: number; color: string; bg: string }) {
  return (
    <div style={{
      padding: "14px 16px", borderRadius: 14,
      background: bg, border: `1px solid ${color}30`,
    }}>
      <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: "1.6rem", fontWeight: 800, color, fontVariantNumeric: "tabular-nums" }}>{count}</div>
    </div>
  );
}

function FollowUpGroup({
  label, color, bg, border, items, onMark, template
}: {
  label: string; color: string; bg: string; border: string;
  items: any[];
  onMark: (id: number) => void;
  template: (name: string) => string;
}) {
  return (
    <div>
      <div style={{
        fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase",
        letterSpacing: "0.1em", color, marginBottom: 6,
      }}>
        {label} ({items.length})
      </div>
      <div style={{ display: "grid", gap: 6 }}>
        {items.slice(0, 3).map(item => (
          <div key={item.id} style={{
            padding: "10px 12px", borderRadius: 10,
            background: "var(--bg)", border: "1px solid var(--border)",
            display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10,
          }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: "0.83rem", color: "var(--text-primary)" }}>
                <ClientLink name={item.clientName} clientId={item.clientId} />
              </div>
              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 2 }}>
                {item.clientPhone}
              </div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button
                onClick={() => navigator.clipboard?.writeText(template(item.clientName.split(" ")[0]))}
                style={{
                  fontSize: "0.72rem", padding: "5px 10px", borderRadius: 8,
                  background: "var(--bg)", border: "1px solid var(--border)",
                  color: "var(--text-secondary)", cursor: "pointer",
                }}
              >
                Copy
              </button>
              <button
                onClick={() => onMark(item.id)}
                style={{
                  fontSize: "0.72rem", padding: "5px 10px", borderRadius: 8,
                  background: bg, border: `1px solid ${border}`,
                  color, cursor: "pointer", fontWeight: 600,
                }}
              >
                Sent ✓
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusPill({ color, bg, border, label }: { color: string; bg: string; border: string; label: string }) {
  return (
    <div style={{
      fontSize: "0.78rem", fontWeight: 600, padding: "6px 14px", borderRadius: 999,
      background: bg, border: `1px solid ${border}`, color,
    }}>
      {label}
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div style={{
      padding: "20px", textAlign: "center",
      color: "var(--text-muted)", fontSize: "0.85rem", borderRadius: 12,
      background: "var(--bg)", border: "1px solid var(--border)",
    }}>
      {label}
    </div>
  );
}

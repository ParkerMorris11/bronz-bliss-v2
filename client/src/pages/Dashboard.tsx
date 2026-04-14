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
        borderBottom: "1px dashed rgba(231,181,111,0.3)",
        transition: "border-color 0.15s",
      }}
      onMouseEnter={e => (e.currentTarget.style.borderBottomColor = "rgba(231,181,111,0.7)")}
      onMouseLeave={e => (e.currentTarget.style.borderBottomColor = "rgba(231,181,111,0.3)")}
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
      <div style={{ padding: 28 }}>
        <Skeleton className="h-8 w-48 mb-6" style={{ background: "rgba(255,255,255,0.07)" }} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 18 }}>
          {[0,1,2,3].map(i => <Skeleton key={i} className="h-28 rounded-2xl" style={{ background: "rgba(255,255,255,0.05)" }} />)}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 18 }}>
          <Skeleton className="h-64 rounded-2xl" style={{ background: "rgba(255,255,255,0.05)" }} />
          <Skeleton className="h-64 rounded-2xl" style={{ background: "rgba(255,255,255,0.05)" }} />
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

  // Revenue sparkline max
  const maxRevenue = Math.max(...revenue.sevenDayTrend.map(d => d.amount), 1);

  // Service mix max
  const maxServiceCount = Math.max(...serviceMix.map(s => s.count), 1);

  // Calendar max
  const maxCal = Math.max(...calendarUtilization.map(d => d.appointmentCount), 1);

  return (
    <div style={{ padding: "24px 28px", minHeight: "100%", color: "rgba(255,255,255,0.92)" }}>
      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
        <div>
          <div style={{ fontSize: "1.15rem", fontWeight: 700, letterSpacing: "-0.015em" }}>
            Good {getGreeting()}, Izzy
          </div>
          <div style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.4)", marginTop: 2 }}>
            {new Date().toLocaleDateString("en-US", { weekday:"long", month:"long", day:"numeric" })}
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <StatusPill color="var(--success)" label={`${todayBookings.count} bookings`} />
          {totalFollowUps > 0 && <StatusPill color="var(--warning)" label={`${totalFollowUps} follow-ups`} />}
        </div>
      </div>

      {/* ── Row 1: Today's Bookings + Check-In Queue ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1.35fr 1fr", gap: 16, marginBottom: 16 }}>

        {/* Today's Bookings */}
        <SectionCard title="Today's Bookings" eyebrow={`${todayBookings.count} clients`}>
          {/* Next client hero */}
          {todayBookings.nextClient && (
            <div style={{
              padding: "14px 16px", borderRadius: 14, marginBottom: 14,
              background: "var(--amber-soft)", border: "1px solid rgba(231,181,111,0.22)",
            }}>
              <div style={{ fontSize: "0.72rem", color: "var(--amber)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>
                Next Up · {fmtTime(todayBookings.nextClient.time)}
              </div>
              <div style={{ fontWeight: 700, fontSize: "1rem" }}><ClientLink name={todayBookings.nextClient.clientName} clientId={todayBookings.nextClient.clientId} /></div>
              <div style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.5)", marginTop: 3 }}>
                {todayBookings.nextClient.serviceName}
              </div>
            </div>
          )}

          {/* Appointment list */}
          <div style={{ display: "grid", gap: 8 }}>
            {todayBookings.appointments.map(appt => (
              <ApptRow key={appt.id} appt={appt} />
            ))}
          </div>

          {/* Gaps */}
          {todayBookings.gaps.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>
                Open Gaps
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {todayBookings.gaps.map((g, i) => (
                  <span key={i} style={{
                    fontSize: "0.75rem", padding: "4px 10px", borderRadius: 999,
                    background: "rgba(126,200,227,0.08)", color: "var(--info)",
                    border: "1px solid rgba(126,200,227,0.18)",
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
            <MiniStat label="Collected Today" value={fmtMoney(revenue.completedToday)} color="var(--success)" />
          </div>
          {/* 7-day sparkline */}
          <div>
            <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>
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
                        className="spark-bar"
                        title={`${fmtDate(d.date)}: ${fmtMoney(d.amount)}`}
                        style={{
                          width: "100%",
                          height: `${pct}%`,
                          background: isToday
                            ? "linear-gradient(to top, rgba(231,181,111,0.9), rgba(231,181,111,0.4))"
                            : "rgba(255,255,255,0.12)",
                        }}
                      />
                    </div>
                    <span style={{ fontSize: "0.65rem", color: isToday ? "rgba(231,181,111,0.9)" : "rgba(255,255,255,0.3)" }}>
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
                  background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)",
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "0.88rem" }}><ClientLink name={pkg.clientName} clientId={pkg.clientId} /></div>
                    <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)", marginTop: 2 }}>{pkg.name}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    {pkg.type === "bundle" ? (
                      <span className="badge-warning" style={{ fontSize: "0.75rem", padding: "4px 10px", borderRadius: 999 }}>
                        {pkg.sessionsRemaining} left
                      </span>
                    ) : (
                      <span className="badge-success" style={{ fontSize: "0.75rem", padding: "4px 10px", borderRadius: 999 }}>
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
            <RetentionTile label="First Time" count={clientRetention.firstTime} color="var(--info)" icon="✦" />
            <RetentionTile label="Active Repeat" count={clientRetention.activeRepeat} color="var(--success)" icon="↑" />
            <RetentionTile label="At Risk" count={clientRetention.atRisk} color="var(--warning)" icon="⚠" />
            <RetentionTile label="Dormant" count={clientRetention.dormant} color="var(--danger)" icon="○" />
          </div>
        </SectionCard>

        {/* Follow-Up Queue */}
        <SectionCard
          title="Follow-Up Queue"
          eyebrow={`${totalFollowUps} pending`}
        >
          {totalFollowUps === 0 ? (
            <EmptyState label="All caught up" />
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {/* Prep reminders */}
              {followUpQueue.prepReminders.length > 0 && (
                <FollowUpGroup
                  label="Prep Reminders"
                  color="var(--info)"
                  items={followUpQueue.prepReminders}
                  onMark={(id) => markReminderMutation.mutate({ id, field: "prepReminderSent" })}
                  template={(name) => `Hi ${name}! Your spray tan tomorrow – avoid moisturizer, wear loose dark clothing 🌟`}
                />
              )}
              {/* Rinse reminders */}
              {followUpQueue.rinseReminders.length > 0 && (
                <FollowUpGroup
                  label="Rinse Reminders"
                  color="var(--amber)"
                  items={followUpQueue.rinseReminders}
                  onMark={(id) => markReminderMutation.mutate({ id, field: "rinseReminderSent" })}
                  template={(name) => `Hi ${name}! Time to rinse – use cool water, pat dry. Your glow is setting beautifully 🌟`}
                />
              )}
              {/* Review requests */}
              {followUpQueue.reviewRequests.length > 0 && (
                <FollowUpGroup
                  label="Review Requests"
                  color="var(--success)"
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
            <div style={{ display: "grid", gap: 10 }}>
              {serviceMix.slice(0, 5).map((s, i) => (
                <div key={i}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                    <span style={{ fontSize: "0.85rem", fontWeight: 500 }}>{s.serviceName}</span>
                    <span style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.45)" }}>
                      {s.count}× · {fmtMoney(s.revenue)}
                    </span>
                  </div>
                  <div style={{ height: 5, borderRadius: 999, background: "rgba(255,255,255,0.07)", overflow: "hidden" }}>
                    <div style={{
                      height: "100%", borderRadius: 999,
                      width: `${(s.count / maxServiceCount) * 100}%`,
                      background: `linear-gradient(90deg, var(--amber), rgba(231,181,111,0.4))`,
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
              const color = pct === 0 ? "rgba(255,255,255,0.04)"
                : pct < 0.4 ? "rgba(231,181,111,0.15)"
                : pct < 0.7 ? "rgba(231,181,111,0.35)"
                : "rgba(231,181,111,0.7)";
              return (
                <div key={i} title={`${fmtDate(d.date)}: ${d.appointmentCount}/${d.totalSlots}`} style={{
                  aspectRatio: "1", borderRadius: 8,
                  background: color,
                  border: isToday ? "1px solid rgba(231,181,111,0.6)" : "1px solid rgba(255,255,255,0.06)",
                  display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center", gap: 2,
                }}>
                  <span style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.45)" }}>
                    {WEEKDAYS[dt.getDay()].slice(0,1)}
                  </span>
                  <span style={{ fontSize: "0.72rem", fontWeight: 700, color: isToday ? "var(--amber)" : "rgba(255,255,255,0.75)" }}>
                    {dt.getDate()}
                  </span>
                  {d.appointmentCount > 0 && (
                    <span style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.4)" }}>{d.appointmentCount}</span>
                  )}
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: 12, display: "flex", gap: 12, fontSize: "0.72rem", color: "rgba(255,255,255,0.35)" }}>
            {[["Low","rgba(231,181,111,0.15)"],["Medium","rgba(231,181,111,0.35)"],["Busy","rgba(231,181,111,0.7)"]].map(([l,c]) => (
              <span key={l} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: c as string }} />
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

// ── Sub-components ──────────────────────────────────────────────────────────

function SectionCard({ title, eyebrow, children }: { title: string; eyebrow: string; children: React.ReactNode }) {
  return (
    <div className="glass-card" style={{ padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <h2 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700, letterSpacing: "-0.01em" }}>{title}</h2>
        <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.35)", fontWeight: 500 }}>{eyebrow}</span>
      </div>
      {children}
    </div>
  );
}

function ApptRow({ appt }: { appt: any }) {
  const statusColors: Record<string, string> = {
    completed: "var(--success)",
    checked_in: "var(--amber)",
    scheduled: "rgba(255,255,255,0.3)",
    no_show: "var(--danger)",
    cancelled: "var(--danger)",
  };
  const statusLabels: Record<string, string> = {
    completed: "Done",
    checked_in: "Here",
    scheduled: "Sched.",
    no_show: "No-show",
    cancelled: "Cancelled",
  };
  return (
    <div data-testid={`appt-row-${appt.id}`} style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "10px 12px", borderRadius: 12,
      background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 7, height: 7, borderRadius: 999,
          background: statusColors[appt.status] ?? "rgba(255,255,255,0.3)",
          flexShrink: 0,
        }} />
        <div>
          <div style={{ fontWeight: 600, fontSize: "0.875rem" }}><ClientLink name={appt.clientName} clientId={appt.clientId} /></div>
          <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)" }}>{appt.serviceName}</div>
        </div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.6)", fontVariantNumeric: "tabular-nums" }}>
          {fmtTime(appt.time)}
        </div>
        <div style={{ fontSize: "0.72rem", color: statusColors[appt.status] ?? "rgba(255,255,255,0.3)", marginTop: 2 }}>
          {statusLabels[appt.status] ?? appt.status}
        </div>
      </div>
    </div>
  );
}

function CheckInRow({ appt }: { appt: any }) {
  const waiverOk = appt.clientWaiver;
  const intakeOk = appt.clientIntake;
  return (
    <div data-testid={`checkin-${appt.id}`} style={{
      padding: "12px 14px", borderRadius: 12,
      background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.07)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: "0.88rem" }}><ClientLink name={appt.clientName} clientId={appt.clientId} /></div>
          <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)", marginTop: 2 }}>
            {fmtTime(appt.time)} · {appt.serviceName}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
        <StatusChip ok={waiverOk} label="Waiver" />
        <StatusChip ok={intakeOk} label="Intake" />
      </div>
    </div>
  );
}

function StatusChip({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span style={{
      fontSize: "0.7rem", fontWeight: 600, padding: "3px 8px", borderRadius: 999,
      background: ok ? "var(--success-bg)" : "var(--danger-bg)",
      color: ok ? "var(--success)" : "var(--danger)",
    }}>
      {ok ? "✓" : "✗"} {label}
    </span>
  );
}

function MiniStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{
      padding: "14px 16px", borderRadius: 14,
      background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)",
    }}>
      <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)", marginBottom: 6 }}>{label}</div>
      <div className="tabular count-anim" style={{ fontSize: "1.5rem", fontWeight: 800, color }}>{value}</div>
    </div>
  );
}

function RetentionTile({ label, count, color, icon }: { label: string; count: number; color: string; icon: string }) {
  return (
    <div style={{
      padding: "14px 16px", borderRadius: 14,
      background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)",
    }}>
      <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)", marginBottom: 4 }}>{label}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: "1.5rem", fontWeight: 800, color }} className="tabular count-anim">{count}</span>
        <span style={{ fontSize: "1rem", color, opacity: 0.6 }}>{icon}</span>
      </div>
    </div>
  );
}

function FollowUpGroup({
  label, color, items, onMark, template
}: {
  label: string;
  color: string;
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
            background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
            display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10,
          }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: "0.83rem" }}><ClientLink name={item.clientName} clientId={item.clientId} /></div>
              <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.35)", marginTop: 2 }}>
                {item.clientPhone}
              </div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button
                data-testid={`copy-${item.id}`}
                onClick={() => navigator.clipboard?.writeText(template(item.clientName.split(" ")[0]))}
                style={{
                  fontSize: "0.72rem", padding: "5px 10px", borderRadius: 8,
                  background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
                  color: "rgba(255,255,255,0.6)", cursor: "pointer",
                }}
              >
                Copy
              </button>
              <button
                data-testid={`sent-${item.id}`}
                onClick={() => onMark(item.id)}
                style={{
                  fontSize: "0.72rem", padding: "5px 10px", borderRadius: 8,
                  background: "rgba(118,213,156,0.1)", border: "1px solid rgba(118,213,156,0.2)",
                  color: "var(--success)", cursor: "pointer",
                }}
              >
                Sent
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusPill({ color, label }: { color: string; label: string }) {
  return (
    <div style={{
      fontSize: "0.78rem", fontWeight: 600, padding: "6px 14px", borderRadius: 999,
      background: `${color}18`, border: `1px solid ${color}30`, color,
    }}>
      {label}
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div style={{
      padding: "20px", textAlign: "center",
      color: "rgba(255,255,255,0.25)", fontSize: "0.85rem", borderRadius: 12,
      background: "rgba(255,255,255,0.02)",
    }}>
      {label}
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

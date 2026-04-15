import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Appointment, Client, Service } from "../../../shared/schema";

const ACCENT = "#e8943a";
const OPEN_HOUR = 9;
const CLOSE_HOUR = 20;
const SLOT_MINUTES = 20;

const SERVICE_COLORS = [
  { bg: "#fff7ed", border: "#fed7aa", text: "#c2410c" },
  { bg: "#f0fdf4", border: "#bbf7d0", text: "#15803d" },
  { bg: "#eff6ff", border: "#bfdbfe", text: "#1d4ed8" },
  { bg: "#fdf4ff", border: "#e9d5ff", text: "#7e22ce" },
  { bg: "#fff1f2", border: "#fecdd3", text: "#be123c" },
  { bg: "#fefce8", border: "#fef08a", text: "#a16207" },
];

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
function formatTime(hour: number, minute: number) {
  const h = hour % 12 || 12;
  const m = minute.toString().padStart(2, "0");
  const ampm = hour < 12 ? "am" : "pm";
  return `${h}:${m}${ampm}`;
}
function timeToMinutes(time: string) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}
function generateSlots() {
  const slots: { hour: number; minute: number; label: string }[] = [];
  for (let h = OPEN_HOUR; h < CLOSE_HOUR; h++) {
    for (let m = 0; m < 60; m += SLOT_MINUTES) {
      slots.push({ hour: h, minute: m, label: formatTime(h, m) });
    }
  }
  return slots;
}

const ALL_SLOTS = generateSlots();
const SLOT_HEIGHT = 44;

// ── New Appointment Modal ─────────────────────────────────────────────────────
function NewApptModal({ date, time, onClose }: { date: string; time: string; onClose: () => void }) {
  const qc = useQueryClient();
  const { data: clients } = useQuery<Client[]>({ queryKey: ["/api/clients"], queryFn: () => apiRequest("GET", "/api/clients").then(r => r.json()) });
  const { data: services } = useQuery<Service[]>({ queryKey: ["/api/services"], queryFn: () => apiRequest("GET", "/api/services").then(r => r.json()) });

  const [clientId, setClientId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [apptTime, setApptTime] = useState(time);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  const mutation = useMutation({
    mutationFn: () => {
      if (!clientId || !serviceId) throw new Error("Client and service required");
      const service = (services ?? []).find(s => s.id === Number(serviceId));
      const durationMins = service?.durationMinutes ?? 20;
      const [h, m] = apptTime.split(":").map(Number);
      const endMin = h * 60 + m + durationMins;
      const endTime = `${Math.floor(endMin / 60).toString().padStart(2, "0")}:${(endMin % 60).toString().padStart(2, "0")}`;
      return apiRequest("POST", "/api/appointments", {
        clientId: Number(clientId), serviceId: Number(serviceId),
        date, time: apptTime, endTime, notes,
        status: "scheduled", revenue: service?.price ?? 0,
        prepReminderSent: false, rinseReminderSent: false, reviewRequestSent: false,
        createdAt: new Date().toISOString(),
      }).then(r => { if (!r.ok) throw new Error("Failed"); return r.json(); });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/appointments"] }); onClose(); },
    onError: (e: any) => setError(e.message),
  });

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 14px", borderRadius: 10, boxSizing: "border-box",
    background: "var(--bg)", border: "1px solid var(--border)",
    color: "var(--text-primary)", fontSize: "0.88rem", outline: "none", appearance: "none",
    fontFamily: "inherit",
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 300,
      background: "rgba(0,0,0,0.25)", backdropFilter: "blur(6px)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    }} onClick={onClose}>
      <div style={{
        background: "#fff", borderRadius: 20, padding: 28,
        width: "100%", maxWidth: 420,
        boxShadow: "0 24px 60px rgba(0,0,0,0.15)",
        border: "1px solid var(--border)",
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)" }}>New Appointment</h2>
            <p style={{ margin: "3px 0 0", fontSize: "0.75rem", color: "var(--text-muted)" }}>{date} · {time}</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "1.4rem", lineHeight: 1 }}>×</button>
        </div>

        {[
          { label: "Client", el: (
            <select value={clientId} onChange={e => setClientId(e.target.value)} style={inputStyle}>
              <option value="">Select client…</option>
              {(clients ?? []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )},
          { label: "Service", el: (
            <select value={serviceId} onChange={e => setServiceId(e.target.value)} style={inputStyle}>
              <option value="">Select service…</option>
              {(services ?? []).map(s => <option key={s.id} value={s.id}>{s.name} ({s.durationMinutes}min · ${s.price})</option>)}
            </select>
          )},
          { label: "Time", el: (
            <input type="time" value={apptTime} onChange={e => setApptTime(e.target.value)} style={inputStyle} />
          )},
          { label: "Notes", el: (
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              style={{ ...inputStyle, resize: "none" }} placeholder="Optional notes…" />
          )},
        ].map(({ label, el }) => (
          <div key={label} style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-muted)", marginBottom: 6 }}>{label}</label>
            {el}
          </div>
        ))}

        {error && <p style={{ color: "#dc2626", fontSize: "0.8rem", margin: "8px 0" }}>{error}</p>}

        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "11px 0", borderRadius: 12, border: "1px solid var(--border)", background: "transparent", color: "var(--text-secondary)", cursor: "pointer", fontWeight: 600, fontSize: "0.88rem" }}>Cancel</button>
          <button onClick={() => mutation.mutate()} disabled={mutation.isPending}
            style={{ flex: 2, padding: "11px 0", borderRadius: 12, border: "none", background: ACCENT, color: "#fff", cursor: "pointer", fontWeight: 700, fontSize: "0.88rem", opacity: mutation.isPending ? 0.7 : 1 }}>
            {mutation.isPending ? "Saving…" : "Book Appointment"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Calendar Page ─────────────────────────────────────────────────────────────
export default function Calendar() {
  const [date, setDate] = useState(todayStr());
  const [newAppt, setNewAppt] = useState<{ time: string } | null>(null);

  const { data: appointments } = useQuery<Appointment[]>({
    queryKey: ["/api/appointments", date],
    queryFn: () => apiRequest("GET", `/api/appointments?date=${date}`).then(r => r.json()),
  });
  const { data: clients } = useQuery<Client[]>({ queryKey: ["/api/clients"], queryFn: () => apiRequest("GET", "/api/clients").then(r => r.json()) });
  const { data: services } = useQuery<Service[]>({ queryKey: ["/api/services"], queryFn: () => apiRequest("GET", "/api/services").then(r => r.json()) });

  const clientMap = useMemo(() => Object.fromEntries((clients ?? []).map(c => [c.id, c])), [clients]);
  const serviceMap = useMemo(() => Object.fromEntries((services ?? []).map(s => [s.id, s])), [services]);
  const serviceColor = useMemo(() => {
    const map: Record<number, typeof SERVICE_COLORS[0]> = {};
    (services ?? []).forEach((s, i) => { map[s.id] = SERVICE_COLORS[i % SERVICE_COLORS.length]; });
    return map;
  }, [services]);

  const apptsBySlot = useMemo(() => {
    const map: Record<string, Appointment[]> = {};
    (appointments ?? []).forEach(a => {
      const key = a.time?.slice(0, 5);
      if (!key) return;
      if (!map[key]) map[key] = [];
      map[key].push(a);
    });
    return map;
  }, [appointments]);

  const occupiedMinutes = useMemo(() => {
    const occupied = new Set<number>();
    (appointments ?? []).forEach(a => {
      const service = serviceMap[a.serviceId];
      const dur = service?.durationMinutes ?? SLOT_MINUTES;
      const start = timeToMinutes(a.time ?? "00:00");
      for (let m = start; m < start + dur; m += SLOT_MINUTES) occupied.add(m);
    });
    return occupied;
  }, [appointments, serviceMap]);

  function changeDate(delta: number) {
    const d = new Date(date);
    d.setDate(d.getDate() + delta);
    setDate(d.toISOString().slice(0, 10));
  }

  const displayDate = new Date(date + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const isToday = date === todayStr();

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100dvh", background: "var(--bg)", color: "var(--text-primary)" }}>
      {newAppt && (
        <NewApptModal date={date} time={newAppt.time} onClose={() => setNewAppt(null)} />
      )}

      {/* Header */}
      <div style={{ padding: "20px 24px 16px", flexShrink: 0, borderBottom: "1px solid var(--border)", background: "var(--bg-card)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <NavBtn onClick={() => changeDate(-1)}>‹</NavBtn>
            <div>
              <div style={{ fontWeight: 700, fontSize: "1rem", color: "var(--text-primary)" }}>{displayDate}</div>
              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 2 }}>
                {(appointments ?? []).length} appointment{(appointments ?? []).length !== 1 ? "s" : ""}
              </div>
            </div>
            <NavBtn onClick={() => changeDate(1)}>›</NavBtn>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {!isToday && (
              <button onClick={() => setDate(todayStr())} style={{
                padding: "7px 14px", borderRadius: 10, border: "1px solid var(--border)",
                background: "transparent", color: "var(--text-secondary)", cursor: "pointer", fontSize: "0.8rem", fontWeight: 600,
              }}>Today</button>
            )}
            <button onClick={() => setNewAppt({ time: "10:00" })} style={{
              padding: "7px 16px", borderRadius: 10, border: "none",
              background: ACCENT, color: "#fff",
              cursor: "pointer", fontSize: "0.82rem", fontWeight: 700,
            }}>+ Book</button>
          </div>
        </div>
      </div>

      {/* Calendar grid */}
      <div style={{ flex: 1, overflowY: "auto", padding: "8px 16px 24px" }}>
        <div style={{ position: "relative", minWidth: 320 }}>
          {ALL_SLOTS.map((slot) => {
            const slotKey = `${slot.hour.toString().padStart(2, "0")}:${slot.minute.toString().padStart(2, "0")}`;
            const slotMin = slot.hour * 60 + slot.minute;
            const isHour = slot.minute === 0;
            const appts = apptsBySlot[slotKey] ?? [];
            const isOccupied = occupiedMinutes.has(slotMin) && appts.length === 0;

            return (
              <div key={slotKey} style={{
                display: "flex", alignItems: "stretch", minHeight: SLOT_HEIGHT,
                borderTop: isHour
                  ? "1px solid var(--border)"
                  : "1px solid rgba(232,220,205,0.4)",
              }}>
                {/* Time label */}
                <div style={{
                  width: 56, flexShrink: 0, paddingTop: 6, paddingRight: 12,
                  textAlign: "right", fontSize: "0.72rem",
                  fontWeight: isHour ? 600 : 400,
                  color: isHour ? "var(--text-secondary)" : "transparent",
                  userSelect: "none",
                }}>
                  {isHour ? slot.label : ""}
                </div>

                {/* Slot area */}
                <div style={{ flex: 1, position: "relative", padding: "3px 0" }}>
                  {appts.length > 0 ? (
                    appts.map(a => {
                      const service = serviceMap[a.serviceId];
                      const dur = service?.durationMinutes ?? SLOT_MINUTES;
                      const slots = Math.ceil(dur / SLOT_MINUTES);
                      const colors = serviceColor[a.serviceId] ?? SERVICE_COLORS[0];
                      const client = clientMap[a.clientId];
                      return (
                        <div key={a.id} style={{
                          position: "absolute", inset: "2px 4px",
                          height: slots * SLOT_HEIGHT - 6,
                          borderRadius: 10, padding: "8px 12px",
                          background: colors.bg,
                          border: `1px solid ${colors.border}`,
                          zIndex: 2, overflow: "hidden",
                          boxShadow: "var(--shadow-sm)",
                        }}>
                          <div style={{ fontWeight: 700, fontSize: "0.82rem", color: colors.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {client?.name ?? "Client"}
                          </div>
                          <div style={{ fontSize: "0.72rem", color: colors.text, opacity: 0.7, marginTop: 2 }}>
                            {service?.name ?? "Service"} · {dur}min
                          </div>
                          {a.revenue != null && (
                            <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: 2 }}>${a.revenue}</div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    !isOccupied && (
                      <button
                        onClick={() => setNewAppt({ time: slotKey })}
                        style={{
                          width: "100%", height: "100%", minHeight: SLOT_HEIGHT - 6,
                          background: "transparent", border: "none", borderRadius: 8,
                          cursor: "pointer", transition: "background 0.12s",
                          textAlign: "left", padding: "0 8px",
                          color: "transparent", fontSize: "0.72rem",
                        }}
                        onMouseEnter={e => {
                          (e.currentTarget as HTMLElement).style.background = "rgba(232,148,58,0.08)";
                          (e.currentTarget as HTMLElement).style.color = ACCENT;
                          (e.currentTarget as HTMLElement).textContent = "+ Book";
                        }}
                        onMouseLeave={e => {
                          (e.currentTarget as HTMLElement).style.background = "transparent";
                          (e.currentTarget as HTMLElement).style.color = "transparent";
                          (e.currentTarget as HTMLElement).textContent = "";
                        }}
                      />
                    )
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function NavBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{
      width: 32, height: 32, borderRadius: 10,
      border: "1px solid var(--border)",
      background: "var(--bg)", color: "var(--text-secondary)",
      cursor: "pointer", fontSize: "1.2rem",
      display: "flex", alignItems: "center", justifyContent: "center",
      transition: "all 0.12s",
    }}>{children}</button>
  );
}

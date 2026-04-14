import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import type { Client, Appointment, Service } from "../../../shared/schema";

const ACCENT = "#e7b56f";
const BG = "hsl(30 8% 7%)";

const statusColors: Record<string, string> = {
  active: "#76d59c",
  at_risk: "#ffb86b",
  dormant: "#ff7f8d",
};
const statusLabels: Record<string, string> = {
  active: "Active",
  at_risk: "At Risk",
  dormant: "Dormant",
};

function initials(name: string) {
  return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
}

// ── Add Client Modal ─────────────────────────────────────────────────────────
function AddClientModal({ onClose, prefillName }: { onClose: () => void; prefillName?: string }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: prefillName ?? "", phone: "", email: "" });
  const [error, setError] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/api/clients", {
        ...form,
        status: "active",
        waiverSigned: false,
        intakeComplete: false,
        totalVisits: 0,
        createdAt: new Date().toISOString(),
      }).then(r => { if (!r.ok) throw new Error("Failed"); return r.json(); }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/clients"] }); onClose(); },
    onError: (e: any) => setError(e.message),
  });

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    }} onClick={onClose}>
      <div style={{
        background: "hsl(30 8% 10%)", border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 20, padding: 28, width: "100%", maxWidth: 400,
        boxShadow: "0 24px 60px rgba(0,0,0,0.6)",
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
          <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "rgba(255,255,255,0.92)" }}>Add New Client</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: "1.3rem" }}>×</button>
        </div>
        {(["name", "phone", "email"] as const).map(key => (
          <div key={key} style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 600, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>
              {key}{key === "name" && <span style={{ color: ACCENT }}> *</span>}
            </label>
            <input
              value={form[key]}
              onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
              type={key === "email" ? "email" : key === "phone" ? "tel" : "text"}
              style={{
                width: "100%", padding: "10px 14px", borderRadius: 10, boxSizing: "border-box",
                background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
                color: "rgba(255,255,255,0.9)", fontSize: "0.9rem", outline: "none",
              }}
            />
          </div>
        ))}
        {error && <p style={{ color: "#ff7f8d", fontSize: "0.8rem", margin: "8px 0" }}>{error}</p>}
        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "11px 0", borderRadius: 12, border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "rgba(255,255,255,0.6)", cursor: "pointer", fontWeight: 600 }}>Cancel</button>
          <button onClick={() => { if (!form.name.trim()) { setError("Name is required"); return; } mutation.mutate(); }}
            disabled={mutation.isPending}
            style={{ flex: 2, padding: "11px 0", borderRadius: 12, border: "none", background: `linear-gradient(135deg, ${ACCENT}, #c9943a)`, color: "#1a1208", cursor: "pointer", fontWeight: 700, opacity: mutation.isPending ? 0.7 : 1 }}>
            {mutation.isPending ? "Adding…" : "Add Client"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── SMS Composer ─────────────────────────────────────────────────────────────
const QUICK_TEMPLATES = [
  { label: "Prep Reminder", msg: (name: string) => `Hi ${name.split(" ")[0]}! Reminder for your tan tomorrow ☀️ Please exfoliate tonight, no deodorant/lotion day-of, and wear loose dark clothes. See you soon! — Bronz Bliss` },
  { label: "Rinse Reminder", msg: (name: string) => `Hi ${name.split(" ")[0]}! Time to rinse your tan — rinse with water only (no soap) and pat dry gently. Moisturize after! 💛 — Bronz Bliss` },
  { label: "Review Request", msg: (name: string) => `Hi ${name.split(" ")[0]}! Thank you for visiting Bronz Bliss! If you loved your tan, we'd appreciate a quick Google review ⭐ — Bronz Bliss` },
  { label: "Book Again", msg: (name: string) => `Hi ${name.split(" ")[0]}! It's been a while — ready for a fresh glow? Book your next session with us anytime! ☀️ — Bronz Bliss` },
];

function SmsComposer({ client, onClose }: { client: Client; onClose: () => void }) {
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/api/sms/send", { to: client.phone, message }).then(async r => {
        if (!r.ok) { const d = await r.json(); throw new Error(d.error); }
        return r.json();
      }),
    onSuccess: () => { setSent(true); setError(""); },
    onError: (e: any) => setError(e.message),
  });

  if (sent) {
    return (
      <div style={{ textAlign: "center", padding: "20px 0" }}>
        <div style={{ fontSize: "1.5rem", marginBottom: 8 }}>✓</div>
        <div style={{ fontSize: "0.88rem", color: "#76d59c", fontWeight: 600, marginBottom: 14 }}>Text sent to {client.name.split(" ")[0]}</div>
        <button onClick={onClose} style={{
          padding: "8px 20px", borderRadius: 10, border: "none",
          background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)",
          cursor: "pointer", fontSize: "0.82rem", fontWeight: 600,
        }}>Done</button>
      </div>
    );
  }

  return (
    <div>
      {/* Quick templates */}
      <div style={{ fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", color: "rgba(255,255,255,0.3)", marginBottom: 8 }}>Quick Messages</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
        {QUICK_TEMPLATES.map(t => (
          <button key={t.label} onClick={() => setMessage(t.msg(client.name))} style={{
            padding: "6px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)",
            background: message === t.msg(client.name) ? `${ACCENT}22` : "rgba(255,255,255,0.04)",
            color: message === t.msg(client.name) ? ACCENT : "rgba(255,255,255,0.6)",
            cursor: "pointer", fontSize: "0.75rem", fontWeight: 600, transition: "all 0.15s",
          }}>{t.label}</button>
        ))}
      </div>

      {/* Message input */}
      <textarea
        value={message}
        onChange={e => setMessage(e.target.value)}
        placeholder={`Message to ${client.name.split(" ")[0]}…`}
        rows={4}
        style={{
          width: "100%", padding: "12px 14px", borderRadius: 12, boxSizing: "border-box",
          background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
          color: "rgba(255,255,255,0.85)", fontSize: "0.85rem", outline: "none", resize: "none",
          fontFamily: "inherit",
        }}
      />
      <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.25)", marginTop: 4, textAlign: "right" }}>{message.length} chars</div>

      {error && <p style={{ color: "#ff7f8d", fontSize: "0.8rem", margin: "8px 0" }}>{error}</p>}

      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <button onClick={onClose} style={{
          flex: 1, padding: "10px 0", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)",
          background: "transparent", color: "rgba(255,255,255,0.5)", cursor: "pointer", fontWeight: 600, fontSize: "0.84rem",
        }}>Cancel</button>
        <button
          onClick={() => { if (!message.trim()) { setError("Message is empty"); return; } mutation.mutate(); }}
          disabled={mutation.isPending || !message.trim()}
          style={{
            flex: 2, padding: "10px 0", borderRadius: 10, border: "none",
            background: `linear-gradient(135deg, #4a9eff, #2d7ed9)`,
            color: "#fff", cursor: "pointer", fontWeight: 700, fontSize: "0.84rem",
            opacity: mutation.isPending || !message.trim() ? 0.5 : 1,
          }}>
          {mutation.isPending ? "Sending…" : "Send Text"}
        </button>
      </div>
    </div>
  );
}

// ── Client Detail Panel ──────────────────────────────────────────────────────
function ClientDetail({ client, onClose }: { client: Client; onClose: () => void }) {
  const [showSms, setShowSms] = useState(false);

  const { data: appointments } = useQuery<Appointment[]>({
    queryKey: ["/api/appointments"],
    queryFn: () => apiRequest("GET", "/api/appointments").then(r => r.json()),
  });
  const { data: services } = useQuery<Service[]>({
    queryKey: ["/api/services"],
    queryFn: () => apiRequest("GET", "/api/services").then(r => r.json()),
  });

  const clientAppts = (appointments ?? [])
    .filter(a => a.clientId === client.id)
    .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));

  const upcomingAppts = clientAppts.filter(a => a.date >= new Date().toISOString().slice(0, 10));
  const pastAppts = clientAppts.filter(a => a.date < new Date().toISOString().slice(0, 10));

  const serviceMap = Object.fromEntries((services ?? []).map(s => [s.id, s]));
  const color = statusColors[client.status ?? "active"];

  return (
    <div style={{
      height: "100%", overflowY: "auto", padding: "28px 24px",
      color: "rgba(255,255,255,0.88)",
    }}>
      {/* Close button mobile */}
      <button onClick={onClose} style={{
        display: "none", marginBottom: 16,
        background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 10, padding: "8px 14px", color: "rgba(255,255,255,0.6)",
        cursor: "pointer", fontSize: "0.85rem",
      }} className="detail-close-btn">← Back</button>

      {/* Avatar + name */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
        <div style={{
          width: 56, height: 56, borderRadius: 999, flexShrink: 0,
          background: `linear-gradient(135deg, ${ACCENT}44, ${ACCENT}18)`,
          border: `2px solid ${ACCENT}40`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontWeight: 700, fontSize: "1.1rem", color: ACCENT,
        }}>{initials(client.name)}</div>
        <div>
          <h2 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700 }}>{client.name}</h2>
          <span style={{
            display: "inline-block", marginTop: 5, fontSize: "0.72rem", fontWeight: 600,
            padding: "3px 10px", borderRadius: 999,
            background: `${color}18`, color, border: `1px solid ${color}30`,
          }}>{statusLabels[client.status ?? "active"]}</span>
        </div>
      </div>

      {/* Contact info with text button */}
      <div style={{
        background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 14, padding: "16px 18px", marginBottom: 16,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 10, marginBottom: 10, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div>
            <span style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.35)" }}>Phone</span>
            <div style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.75)", fontWeight: 500, marginTop: 2 }}>{client.phone || "—"}</div>
          </div>
          {client.phone && (
            <button
              onClick={() => setShowSms(!showSms)}
              style={{
                padding: "7px 14px", borderRadius: 10, border: "none",
                background: showSms ? "rgba(74,158,255,0.15)" : "linear-gradient(135deg, #4a9eff, #2d7ed9)",
                color: showSms ? "#4a9eff" : "#fff",
                cursor: "pointer", fontSize: "0.78rem", fontWeight: 700,
                display: "flex", alignItems: "center", gap: 5,
                transition: "all 0.15s",
              }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              Text
            </button>
          )}
        </div>
        <Row label="Email" value={client.email || "—"} />
        <Row label="First Visit" value={client.firstVisitDate || "—"} />
        <Row label="Last Visit" value={client.lastVisitDate || "—"} last />
      </div>

      {/* SMS Composer */}
      {showSms && client.phone && (
        <div style={{
          background: "rgba(74,158,255,0.06)", border: "1px solid rgba(74,158,255,0.15)",
          borderRadius: 14, padding: "16px 18px", marginBottom: 16,
        }}>
          <SmsComposer client={client} onClose={() => setShowSms(false)} />
        </div>
      )}

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
        {[
          { label: "Total Visits", value: client.totalVisits ?? 0 },
          { label: "Upcoming", value: upcomingAppts.length },
        ].map(s => (
          <div key={s.label} style={{
            background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 12, padding: "14px 16px", textAlign: "center",
          }}>
            <div style={{ fontSize: "1.5rem", fontWeight: 700, color: ACCENT }}>{s.value}</div>
            <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.4)", marginTop: 3 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Notes */}
      {client.notes && (
        <div style={{
          background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 14, padding: "14px 18px", marginBottom: 16,
          fontSize: "0.85rem", color: "rgba(255,255,255,0.6)",
        }}>
          <div style={{ fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", color: "rgba(255,255,255,0.3)", marginBottom: 6 }}>Notes</div>
          {client.notes}
        </div>
      )}

      {/* Upcoming appointments */}
      {upcomingAppts.length > 0 && (
        <Section title="Upcoming">
          {upcomingAppts.slice(0, 3).map(a => (
            <ApptRow key={a.id} appt={a} service={serviceMap[a.serviceId]} />
          ))}
        </Section>
      )}

      {/* Past appointments */}
      {pastAppts.length > 0 && (
        <Section title="Past Visits">
          {pastAppts.slice(0, 5).map(a => (
            <ApptRow key={a.id} appt={a} service={serviceMap[a.serviceId]} />
          ))}
        </Section>
      )}
    </div>
  );
}

function Row({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: last ? 0 : 10, marginBottom: last ? 0 : 10, borderBottom: last ? "none" : "1px solid rgba(255,255,255,0.06)" }}>
      <span style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.35)" }}>{label}</span>
      <span style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.75)", fontWeight: 500 }}>{value}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", color: "rgba(255,255,255,0.3)", marginBottom: 8 }}>{title}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>{children}</div>
    </div>
  );
}

function ApptRow({ appt, service }: { appt: Appointment; service?: Service }) {
  const statusColor = appt.status === "completed" ? "#76d59c" : appt.status === "cancelled" ? "#ff7f8d" : ACCENT;
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "10px 14px", borderRadius: 10,
      background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)",
    }}>
      <div>
        <div style={{ fontSize: "0.82rem", fontWeight: 600 }}>{service?.name ?? "Service"}</div>
        <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.4)", marginTop: 2 }}>{appt.date} · {appt.time}</div>
      </div>
      <span style={{ fontSize: "0.7rem", fontWeight: 600, padding: "3px 9px", borderRadius: 999, background: `${statusColor}18`, color: statusColor, border: `1px solid ${statusColor}30` }}>
        {appt.status}
      </span>
    </div>
  );
}

// ── Main Clients Page ────────────────────────────────────────────────────────
export default function Clients() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Client | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [location] = useLocation();

  const { data: clients, isLoading } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
    queryFn: () => apiRequest("GET", "/api/clients").then(r => r.json()),
  });

  // Auto-select client from URL param (e.g. /clients?id=42)
  useEffect(() => {
    if (!clients?.length) return;
    const params = new URLSearchParams(window.location.hash.split("?")[1] || "");
    const id = params.get("id");
    if (id) {
      const client = clients.find(c => c.id === Number(id));
      if (client) setSelected(client);
    }
  }, [clients, location]);

  const filtered = (clients ?? []).filter(c => {
    const q = search.toLowerCase();
    return c.name.toLowerCase().includes(q) || (c.phone ?? "").includes(q) || (c.email ?? "").toLowerCase().includes(q);
  });

  return (
    <div style={{ display: "flex", height: "100dvh", overflow: "hidden", background: BG }}>
      <style>{`
        .client-card:hover { background: rgba(255,255,255,0.07) !important; border-color: rgba(231,181,111,0.2) !important; }
        .client-card.selected { background: rgba(231,181,111,0.08) !important; border-color: rgba(231,181,111,0.3) !important; }
        @media (max-width: 768px) {
          .client-list-pane { display: ${selected ? "none" : "flex"} !important; }
          .client-detail-pane { display: ${selected ? "flex" : "none"} !important; }
          .detail-close-btn { display: block !important; }
        }
      `}</style>

      {showAdd && <AddClientModal onClose={() => setShowAdd(false)} />}

      {/* LEFT: List pane */}
      <div className="client-list-pane" style={{
        width: selected ? "340px" : "100%", minWidth: selected ? 300 : undefined,
        flexShrink: 0, display: "flex", flexDirection: "column",
        borderRight: selected ? "1px solid rgba(255,255,255,0.07)" : "none",
        transition: "width 0.2s ease",
      }}>
        {/* Header */}
        <div style={{ padding: "24px 20px 14px", flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div>
              <h1 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "rgba(255,255,255,0.92)" }}>Clients</h1>
              <p style={{ margin: "3px 0 0", fontSize: "0.75rem", color: "rgba(255,255,255,0.35)" }}>
                {filtered.length} {search ? "matching" : "total"}
              </p>
            </div>
            <button onClick={() => setShowAdd(true)} style={{
              padding: "8px 16px", borderRadius: 10, border: "none",
              background: `linear-gradient(135deg, ${ACCENT}, #c9943a)`,
              color: "#1a1208", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer", whiteSpace: "nowrap",
            }}>+ Add</button>
          </div>
          <input
            type="search" placeholder="Search name, phone, email…" value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: "100%", padding: "9px 14px", borderRadius: 10, boxSizing: "border-box",
              background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)",
              color: "rgba(255,255,255,0.85)", fontSize: "0.85rem", outline: "none",
            }}
          />
        </div>

        {/* Scrollable list */}
        <div style={{ flex: 1, overflowY: "auto", padding: "0 12px 20px" }}>
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={{ height: 70, borderRadius: 14, background: "rgba(255,255,255,0.04)", marginBottom: 6 }} />
            ))
          ) : filtered.length === 0 ? (
            <p style={{ textAlign: "center", color: "rgba(255,255,255,0.3)", padding: "40px 0", fontSize: "0.9rem" }}>No clients found</p>
          ) : (
            filtered.map(c => {
              const color = statusColors[c.status ?? "active"];
              const isSelected = selected?.id === c.id;
              return (
                <div
                  key={c.id}
                  className={`client-card${isSelected ? " selected" : ""}`}
                  onClick={() => setSelected(isSelected ? null : c)}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "12px 14px", borderRadius: 14, marginBottom: 5,
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    cursor: "pointer", transition: "all 0.15s ease",
                  }}
                >
                  <div style={{
                    width: 40, height: 40, borderRadius: 999, flexShrink: 0,
                    background: `linear-gradient(135deg, ${ACCENT}30, ${ACCENT}10)`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontWeight: 700, fontSize: "0.85rem", color: ACCENT,
                  }}>{initials(c.name)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: "0.88rem", color: "rgba(255,255,255,0.9)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.name}</div>
                    <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.38)", marginTop: 2 }}>{c.phone || c.email || "No contact info"}</div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
                    <span style={{
                      fontSize: "0.68rem", fontWeight: 600, padding: "2px 8px", borderRadius: 999,
                      background: `${color}18`, color, border: `1px solid ${color}28`,
                    }}>{statusLabels[c.status ?? "active"]}</span>
                    {(c.totalVisits ?? 0) > 0 && (
                      <span style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.3)" }}>{c.totalVisits}v</span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT: Detail pane */}
      {selected && (
        <div className="client-detail-pane" style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <ClientDetail client={selected} onClose={() => setSelected(null)} />
        </div>
      )}

      {/* Empty state when no client selected (desktop) */}
      {!selected && (
        <div style={{
          display: "none", // hidden when list is full-width
        }} />
      )}
    </div>
  );
}

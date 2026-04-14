import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Client } from "../../../shared/schema";
import { Skeleton } from "@/components/ui/skeleton";

const ACCENT = "#e7b56f";

const statusColors: Record<string, string> = {
  active: "var(--success)",
  at_risk: "var(--warning)",
  dormant: "var(--danger)",
};
const statusLabels: Record<string, string> = {
  active: "Active",
  at_risk: "At Risk",
  dormant: "Dormant",
};

function AddClientModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: "", phone: "", email: "" });
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
      }).then((r) => {
        if (!r.ok) throw new Error("Failed to add client");
        return r.json();
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/clients"] });
      onClose();
    },
    onError: (e: any) => setError(e.message),
  });

  const field = (label: string, key: keyof typeof form, type = "text", required = false) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "rgba(255,255,255,0.5)", letterSpacing: "0.05em", textTransform: "uppercase" }}>
        {label}{required && <span style={{ color: ACCENT }}> *</span>}
      </label>
      <input
        type={type}
        value={form[key]}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        style={{
          background: "rgba(255,255,255,0.06)",
          border: `1px solid ${error && required && !form[key] ? "#ff7f8d" : "rgba(255,255,255,0.12)"}`,
          borderRadius: 10, padding: "10px 14px",
          color: "rgba(255,255,255,0.9)", fontSize: "0.9rem", outline: "none",
          transition: "border-color 0.2s",
        }}
        onFocus={(e) => (e.target.style.borderColor = ACCENT)}
        onBlur={(e) => (e.target.style.borderColor = error && required && !form[key] ? "#ff7f8d" : "rgba(255,255,255,0.12)")}
        placeholder={label}
      />
    </div>
  );

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 20,
    }} onClick={onClose}>
      <div style={{
        background: "hsl(30 8% 10%)", border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 20, padding: 28, width: "100%", maxWidth: 420,
        boxShadow: "0 24px 60px rgba(0,0,0,0.6)",
      }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
          <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "rgba(255,255,255,0.92)" }}>Add New Client</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: "1.2rem", lineHeight: 1 }}>×</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {field("Name", "name", "text", true)}
          {field("Phone", "phone", "tel")}
          {field("Email", "email", "email")}
        </div>

        {error && (
          <p style={{ color: "#ff7f8d", fontSize: "0.8rem", marginTop: 12, marginBottom: 0 }}>{error}</p>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
          <button onClick={onClose} style={{
            flex: 1, padding: "11px 0", borderRadius: 12, border: "1px solid rgba(255,255,255,0.12)",
            background: "transparent", color: "rgba(255,255,255,0.6)", cursor: "pointer", fontSize: "0.88rem", fontWeight: 600,
          }}>
            Cancel
          </button>
          <button
            onClick={() => {
              if (!form.name.trim()) { setError("Name is required"); return; }
              mutation.mutate();
            }}
            disabled={mutation.isPending}
            style={{
              flex: 2, padding: "11px 0", borderRadius: 12, border: "none",
              background: `linear-gradient(135deg, ${ACCENT}, #c9943a)`,
              color: "#1a1208", cursor: "pointer", fontSize: "0.88rem", fontWeight: 700,
              opacity: mutation.isPending ? 0.7 : 1,
            }}>
            {mutation.isPending ? "Adding…" : "Add Client"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Clients() {
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  const { data: clients, isLoading } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
    queryFn: () => apiRequest("GET", "/api/clients").then((r) => r.json()),
  });

  const filtered = (clients ?? []).filter((c) => {
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.phone ?? "").includes(q) ||
      (c.email ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div style={{ padding: "24px 28px", color: "rgba(255,255,255,0.92)" }}>
      {showAdd && <AddClientModal onClose={() => setShowAdd(false)} />}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0 }}>Clients</h1>
          <p style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.4)", marginTop: 4 }}>
            {filtered.length} {search ? "matching" : "total"} client{filtered.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          style={{
            padding: "9px 18px", borderRadius: 12, border: "none",
            background: `linear-gradient(135deg, ${ACCENT}, #c9943a)`,
            color: "#1a1208", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer",
            whiteSpace: "nowrap",
          }}>
          + Add Client
        </button>
      </div>

      {/* Search */}
      <div style={{ marginBottom: 16 }}>
        <input
          type="search"
          placeholder="Search by name, phone, or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: "100%", padding: "10px 14px", borderRadius: 12,
            background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
            color: "rgba(255,255,255,0.85)", fontSize: "0.88rem", outline: "none",
            boxSizing: "border-box",
          }}
        />
      </div>

      {/* List */}
      {isLoading ? (
        <div style={{ display: "grid", gap: 10 }}>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 rounded-xl" style={{ background: "rgba(255,255,255,0.05)" }} />
          ))}
        </div>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {filtered.length === 0 && (
            <p style={{ textAlign: "center", color: "rgba(255,255,255,0.3)", padding: "40px 0", fontSize: "0.9rem" }}>
              No clients found
            </p>
          )}
          {filtered.map((c) => (
            <div key={c.id} data-testid={`client-row-${c.id}`} style={{
              padding: "14px 18px", borderRadius: 14,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 999,
                  background: "linear-gradient(135deg, rgba(231,181,111,0.3), rgba(231,181,111,0.1))",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontWeight: 700, fontSize: "0.9rem", color: "rgba(231,181,111,0.9)",
                  flexShrink: 0,
                }}>
                  {c.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>{c.name}</div>
                  <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)", marginTop: 2 }}>
                    {c.phone}{c.email ? ` · ${c.email}` : ""}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.4)" }}>{c.totalVisits ?? 0} visits</div>
                  {c.lastVisitDate && (
                    <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.25)", marginTop: 2 }}>
                      Last: {c.lastVisitDate}
                    </div>
                  )}
                </div>
                <span style={{
                  fontSize: "0.72rem", fontWeight: 600, padding: "4px 10px", borderRadius: 999,
                  background: `${statusColors[c.status ?? "active"]}18`,
                  color: statusColors[c.status ?? "active"],
                  border: `1px solid ${statusColors[c.status ?? "active"]}30`,
                }}>
                  {statusLabels[c.status ?? "active"]}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

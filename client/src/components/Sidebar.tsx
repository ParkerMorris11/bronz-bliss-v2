import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/lib/auth";

const C = {
  bg: "#faf7f2", card: "#ffffff", hover: "#f5f0e8",
  amber: "#6B3F2A", amberLight: "#f3ebe4",
  text: "#1c1917", muted: "#78716c", faint: "#a8a29e",
  border: "#e8e0d5", borderLight: "#f0ebe3",
  danger: "#dc2626",
};

const NAV = [
  {
    section: "MAIN",
    items: [
      { href: "/", label: "Dashboard", icon: <GridIcon /> },
      { href: "/calendar", label: "Calendar", icon: <CalendarIcon /> },
      { href: "/clients", label: "Clients", icon: <UsersIcon /> },
    ],
  },
  {
    section: "STUDIO",
    items: [
      { href: "/appointments", label: "Appointments", icon: <ClipboardIcon /> },
      { href: "/packages", label: "Packages", icon: <PackageIcon /> },
    ],
  },
];

export default function Sidebar() {
  const [location] = useLocation();
  const { logout } = useAuth();
  const [expanded, setExpanded] = useState<string>("/");

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div style={{ padding: "20px 20px 16px", borderBottom: `1px solid ${C.borderLight}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
            background: "linear-gradient(135deg, #8B5E3C, #6B3F2A)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 12px rgba(107,63,42,0.3)",
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="9" r="4" fill="white" opacity="0.95"/>
              <path d="M6 20c0-3.314 2.686-6 6-6s6 2.686 6 6" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              <path d="M12 2L12 3.5M17.5 4.5L16.4 5.6M20 10.5L18.5 10.5M17.5 16.5L16.4 15.4M6.5 4.5L7.6 5.6M4 10.5L5.5 10.5" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: C.text }}>Bronz Bliss</div>
            <div style={{ fontSize: 11, color: C.faint, marginTop: 1 }}>Studio Manager</div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div style={{ padding: "12px 14px", borderBottom: `1px solid ${C.borderLight}` }}>
        <div style={{ position: "relative" }}>
          <svg style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: C.faint, pointerEvents: "none" }} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input placeholder="Search..." style={{
            width: "100%", padding: "8px 12px 8px 30px", borderRadius: 10,
            border: `1.5px solid ${C.borderLight}`, background: C.bg,
            color: C.text, fontSize: 12.5, outline: "none", fontFamily: "inherit",
          }} />
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "14px 10px", overflowY: "auto" }}>
        {NAV.map(section => (
          <div key={section.section} style={{ marginBottom: 22 }}>
            <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: "0.09em", textTransform: "uppercase", color: C.faint, padding: "0 8px", marginBottom: 6 }}>
              {section.section}
            </div>
            {section.items.map(item => {
              const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
              const isExpanded = expanded === item.href;
              const hasSub = !!(item.sub?.length);
              return (
                <div key={item.href}>
                  <Link href={item.href}>
                    <button
                      onClick={() => hasSub && setExpanded(isExpanded ? "" : item.href)}
                      style={{
                        width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "9px 10px", borderRadius: 10, border: "none", marginBottom: 2,
                        background: isActive ? C.amberLight : "transparent",
                        color: isActive ? C.amber : C.muted,
                        fontWeight: isActive ? 600 : 500, fontSize: 13.5, cursor: "pointer",
                        transition: "all 0.15s", textAlign: "left",
                      }}
                      onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = C.hover; }}
                      onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                    >
                      <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ opacity: isActive ? 1 : 0.55 }}>{item.icon}</span>
                        {item.label}
                      </span>
                      {hasSub && (
                        <svg style={{ transition: "transform 0.2s", transform: isExpanded ? "rotate(180deg)" : "none", opacity: 0.4, flexShrink: 0 }} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m6 9 6 6 6-6"/></svg>
                      )}
                    </button>
                  </Link>
                  {hasSub && isExpanded && (
                    <div style={{ marginLeft: 24, marginBottom: 4, borderLeft: `1.5px solid ${C.borderLight}`, paddingLeft: 12 }}>
                      {item.sub!.map(label => (
                        <button key={label} style={{
                          display: "block", width: "100%", textAlign: "left",
                          padding: "7px 10px", borderRadius: 8, border: "none",
                          background: "transparent", color: C.faint, fontSize: 13,
                          cursor: "pointer", fontWeight: 400, transition: "all 0.15s",
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = C.text; (e.currentTarget as HTMLElement).style.background = C.hover; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = C.faint; (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                        >{label}</button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </nav>

      {/* User footer */}
      <div style={{ padding: "12px 14px", borderTop: `1px solid ${C.borderLight}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 99, flexShrink: 0,
            background: "linear-gradient(135deg, #8B5E3C, #6B3F2A)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 700, fontSize: 12, color: "#fff",
          }}>IZ</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 13, color: C.text }}>Izzy Morris</div>
            <div style={{ fontSize: 11, color: C.faint, marginTop: 1 }}>Cedar City, UT</div>
          </div>
          <button onClick={logout} title="Sign out" style={{
            background: "none", border: "none", cursor: "pointer",
            color: C.faint, padding: 6, borderRadius: 8, transition: "color 0.15s",
          }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = C.danger}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = C.faint}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          </button>
        </div>
      </div>
    </aside>
  );
}

function GridIcon() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/></svg>; }
function CalendarIcon() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>; }
function UsersIcon() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>; }
function ClipboardIcon() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/></svg>; }
function PackageIcon() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m12 3-8 4.5v9L12 21l8-4.5v-9L12 3z"/><path d="m12 12 8-4.5M12 12v9M12 12 4 7.5"/></svg>; }

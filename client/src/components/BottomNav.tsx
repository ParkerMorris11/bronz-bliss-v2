import { useLocation, Link } from "wouter";
import { useAuth } from "@/lib/auth";

const tabs = [
  {
    href: "/",
    label: "Dashboard",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
        <rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>
      </svg>
    ),
  },
  {
    href: "/calendar",
    label: "Calendar",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
      </svg>
    ),
  },
  {
    href: "/clients",
    label: "Clients",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
  },
  {
    href: null,
    label: "Sign Out",
    isLogout: true,
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
        <polyline points="16 17 21 12 16 7"/>
        <line x1="21" y1="12" x2="9" y2="12"/>
      </svg>
    ),
  },
];

export default function BottomNav() {
  const [location] = useLocation();
  const { logout } = useAuth();

  return (
    <nav
      data-testid="bottom-nav"
      style={{
        display: "none",
        position: "fixed", bottom: 0, left: 0, right: 0,
        background: "rgba(255,255,255,0.96)",
        borderTop: "1px solid var(--border)",
        backdropFilter: "blur(20px)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        zIndex: 100,
        boxShadow: "0 -4px 16px rgba(0,0,0,0.06)",
      }}
      className="bottom-nav"
    >
      <div style={{ display: "flex", alignItems: "stretch" }}>
        {tabs.map(tab => {
          const isActive = tab.href !== null && location === tab.href;

          if (tab.isLogout) {
            return (
              <button
                key="logout"
                data-testid="nav-logout"
                onClick={logout}
                style={{
                  flex: 1, display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center", gap: 4,
                  padding: "10px 4px 12px",
                  background: "transparent", border: "none",
                  color: "#dc2626", cursor: "pointer",
                  fontSize: "0.65rem", fontWeight: 500,
                }}
              >
                {tab.icon}
                {tab.label}
              </button>
            );
          }

          return (
            <Link key={tab.href} href={tab.href!}>
              <button
                data-testid={`nav-${tab.label.toLowerCase()}`}
                style={{
                  flex: 1, display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center", gap: 4,
                  padding: "10px 4px 12px", width: "100%",
                  background: "transparent", border: "none",
                  color: isActive ? "var(--amber)" : "var(--text-muted)",
                  cursor: "pointer", fontSize: "0.65rem",
                  fontWeight: isActive ? 700 : 500,
                  transition: "color 0.18s ease",
                }}
              >
                <span style={{ position: "relative" }}>
                  {tab.icon}
                  {isActive && (
                    <span style={{
                      position: "absolute", bottom: -5, left: "50%",
                      transform: "translateX(-50%)",
                      width: 4, height: 4, borderRadius: 999,
                      background: "var(--amber)",
                    }} />
                  )}
                </span>
                {tab.label}
              </button>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

import { useState } from "react";
import { useAuth } from "@/lib/auth";

export default function Login() {
  const { login } = useAuth();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");
    const ok = await login(password);
    if (!ok) { setError("Incorrect password — try again"); setLoading(false); }
  }

  return (
    <div style={{
      minHeight: "100dvh", display: "flex",
      background: "linear-gradient(135deg, #fdf6ec 0%, #fcebd6 50%, #f5dfc0 100%)",
      alignItems: "center", justifyContent: "center", padding: 24,
    }}>
      {/* Decorative blobs */}
      <div style={{ position: "fixed", top: -80, right: -80, width: 320, height: 320, borderRadius: "50%", background: "rgba(232,148,58,0.12)", pointerEvents: "none" }} />
      <div style={{ position: "fixed", bottom: -60, left: -60, width: 260, height: 260, borderRadius: "50%", background: "rgba(245,166,35,0.08)", pointerEvents: "none" }} />

      <div style={{
        background: "#fff", borderRadius: 24, padding: "40px 36px",
        width: "100%", maxWidth: 400,
        boxShadow: "0 20px 60px rgba(0,0,0,0.1), 0 4px 16px rgba(0,0,0,0.06)",
        position: "relative", zIndex: 1,
      }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16, margin: "0 auto 16px",
            background: "linear-gradient(135deg, #f5a623, #e8943a)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 8px 24px rgba(232,148,58,0.35)",
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="9" r="4" fill="white" opacity="0.95"/>
              <path d="M6 20c0-3.314 2.686-6 6-6s6 2.686 6 6" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#1c1917", margin: 0 }}>Bronz Bliss</h1>
          <p style={{ fontSize: 13, color: "#78716c", marginTop: 4 }}>Studio Manager · Cedar City, UT</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", color: "#78716c", marginBottom: 8 }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => { setPassword(e.target.value); setError(""); }}
              placeholder="Enter your password"
              autoFocus
              style={{
                width: "100%", padding: "11px 14px", borderRadius: 12,
                border: `1.5px solid ${error ? "#dc2626" : "#e8e0d5"}`,
                background: "#faf7f2", color: "#1c1917", fontSize: 14,
                outline: "none", transition: "border-color 0.15s", fontFamily: "inherit",
              }}
              onFocus={e => { if (!error) e.target.style.borderColor = "#e8943a"; }}
              onBlur={e => { if (!error) e.target.style.borderColor = "#e8e0d5"; }}
            />
            {error && <p style={{ color: "#dc2626", fontSize: 12.5, marginTop: 7, marginBottom: 0 }}>{error}</p>}
          </div>

          <button type="submit" disabled={loading || !password} style={{
            width: "100%", padding: "12px 0", borderRadius: 12, border: "none",
            background: "linear-gradient(135deg, #f5a623, #e8943a)",
            color: "#fff", fontWeight: 700, fontSize: 14.5, cursor: loading ? "wait" : "pointer",
            opacity: !password || loading ? 0.6 : 1,
            boxShadow: "0 4px 16px rgba(232,148,58,0.3)",
            transition: "opacity 0.15s", fontFamily: "inherit",
          }}>
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}

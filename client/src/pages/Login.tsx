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
      <div style={{ position: "fixed", top: -80, right: -80, width: 320, height: 320, borderRadius: "50%", background: "rgba(107,63,42,0.1)", pointerEvents: "none" }} />
      <div style={{ position: "fixed", bottom: -60, left: -60, width: 260, height: 260, borderRadius: "50%", background: "rgba(139,94,60,0.07)", pointerEvents: "none" }} />

      <div style={{
        background: "#fff", borderRadius: 24, padding: "40px 36px",
        width: "100%", maxWidth: 400,
        boxShadow: "0 20px 60px rgba(0,0,0,0.1), 0 4px 16px rgba(0,0,0,0.06)",
        position: "relative", zIndex: 1,
      }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
            <svg width="160" height="50" viewBox="0 0 200 62" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Bronz Bliss">
              <circle cx="22" cy="31" r="20" fill="#e8d5bd" opacity="0.85"/>
              <circle cx="37" cy="31" r="20" fill="#b8895a" opacity="0.80"/>
              <circle cx="52" cy="31" r="20" fill="#6B3F2A" opacity="0.90"/>
              <text x="82" y="38" fontFamily="'Cormorant Garamond', Georgia, serif" fontSize="28" fontWeight="500" letterSpacing="3" fill="#6B3F2A">Bronz</text>
            </svg>
          </div>
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
              onFocus={e => { if (!error) e.target.style.borderColor = "#6B3F2A"; }}
              onBlur={e => { if (!error) e.target.style.borderColor = "#e8e0d5"; }}
            />
            {error && <p style={{ color: "#dc2626", fontSize: 12.5, marginTop: 7, marginBottom: 0 }}>{error}</p>}
          </div>

          <button type="submit" disabled={loading || !password} style={{
            width: "100%", padding: "12px 0", borderRadius: 12, border: "none",
            background: "linear-gradient(135deg, #8B5E3C, #6B3F2A)",
            color: "#fff", fontWeight: 700, fontSize: 14.5, cursor: loading ? "wait" : "pointer",
            opacity: !password || loading ? 0.6 : 1,
            boxShadow: "0 4px 16px rgba(107,63,42,0.3)",
            transition: "opacity 0.15s", fontFamily: "inherit",
          }}>
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}

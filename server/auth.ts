/**
 * auth.ts — session-based authentication
 *
 * Uses express-session with:
 *   - SQLite store locally (memory fallback)
 *   - connect-pg-simple store in production (sessions survive restarts)
 *
 * Password is stored as a bcrypt hash in the ADMIN_PASSWORD_HASH env var.
 * Generate one with:  node -e "require('bcrypt').hash('yourpassword',10).then(console.log)"
 *
 * Default dev password: "bronzbliss2024"
 */

import session from "express-session";
import bcrypt from "bcrypt";
import type { Express, Request, Response, NextFunction } from "express";
import { isPostgres, pool } from "./db";

// Default hash for "bronzbliss2024" — override with ADMIN_PASSWORD_HASH in prod
const DEFAULT_HASH = "$2b$10$s/jYb1lfhvTUh9Le4900bux0gm.qU6.JE20JIHvgc/tCx6YvYWEeu";

declare module "express-session" {
  interface SessionData {
    authenticated: boolean;
  }
}

export function setupAuth(app: Express) {
  // ── Session store ──────────────────────────────────────────────────────
  let store: session.Store | undefined;

  if (isPostgres) {
    const ConnectPgSimple = require("connect-pg-simple")(session);
    store = new ConnectPgSimple({
      pool,
      tableName: "user_sessions",
      createTableIfMissing: true,
    });
  }
  // SQLite / local: use default in-memory store

  app.use(
    session({
      store,
      secret: process.env.SESSION_SECRET ?? "dev-secret-change-in-production",
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      },
    })
  );
}

// ── Auth routes ───────────────────────────────────────────────────────────
export function registerAuthRoutes(app: Express) {
  // POST /api/auth/login
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    const { password } = req.body ?? {};
    if (!password) return res.status(400).json({ error: "Password required" });

    const hash = process.env.ADMIN_PASSWORD_HASH ?? DEFAULT_HASH;
    const match = await bcrypt.compare(password, hash);

    if (!match) {
      return res.status(401).json({ error: "Incorrect password" });
    }

    req.session.authenticated = true;
    res.json({ ok: true });
  });

  // POST /api/auth/logout
  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.session.destroy(() => {
      res.clearCookie("connect.sid");
      res.json({ ok: true });
    });
  });

  // GET /api/auth/me — check session status
  app.get("/api/auth/me", (req: Request, res: Response) => {
    res.json({ authenticated: !!req.session?.authenticated });
  });
}

// ── Middleware: protect all /api routes except auth ───────────────────────
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  // Allow auth routes through
  if (req.path.startsWith("/auth")) return next();
  // Allow seed in dev
  if (req.path === "/seed" && process.env.NODE_ENV !== "production") return next();

  if (!req.session?.authenticated) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

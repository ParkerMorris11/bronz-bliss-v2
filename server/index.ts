import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import session from "express-session";
import MemoryStore from "memorystore";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

// ── Startup Guards ───────────────────────────────────────
if (process.env.NODE_ENV === "production" && !process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET must be set in production");
}

const SessionStore = MemoryStore(session);

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

// ── Security Headers ────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false, // disabled for dev/iframe compat
  crossOriginEmbedderPolicy: false,
}));

// ── Session Auth ────────────────────────────────────────
app.use(session({
  secret: process.env.SESSION_SECRET || "bronzbliss-dev-secret",
  resave: false,
  saveUninitialized: false,
  store: new SessionStore({ checkPeriod: 86400000 }), // prune expired entries every 24h
  cookie: {
    secure: process.env.NODE_ENV === "production" && !!process.env.RAILWAY_ENVIRONMENT,
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    sameSite: "lax",
  },
}));

// ── Rate Limiting ───────────────────────────────────────
const loginLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  message: { error: "Too many login attempts. Try again in a minute." },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/auth/login", loginLimiter);

const bookingLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: "Too many requests. Please slow down." },
});
app.use("/api/public/book", bookingLimiter);

// General API rate limit
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
});
app.use("/api/", apiLimiter);

// ── Body Parsing ────────────────────────────────────────
app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);
app.use(express.urlencoded({ extended: false }));

// ── API Auth Middleware ─────────────────────────────────
// Protect admin routes — public routes are exempt
const publicPaths = [
  "/api/auth/",
  "/api/public/",
  "/api/seed",
  "/api/intake-questions",
  "/api/intake-responses",
  "/api/waiver-templates/active",
];

app.use("/api/", (req: Request, res: Response, next: NextFunction) => {
  // Allow public paths
  if (publicPaths.some(p => req.path.startsWith(p.replace("/api", "")))) {
    return next();
  }
  // Allow if session is authenticated
  if ((req.session as any)?.authenticated) {
    return next();
  }
  // In dev mode, allow all
  if (process.env.NODE_ENV !== "production") {
    return next();
  }
  return res.status(401).json({ error: "Unauthorized" });
});

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      log(logLine);
    }
  });

  next();
});

(async () => {
  console.log("Starting Bronz Bliss server...");
  console.log(`Node ${process.version}, PORT=${process.env.PORT || '5000'}, ENV=${process.env.NODE_ENV || 'development'}`);
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    console.error("Internal Server Error:", err);
    if (res.headersSent) return next(err);
    return res.status(status).json({ message });
  });

  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen({ port, host: "0.0.0.0" }, () => {
    log(`serving on port ${port}`);
  });
})();

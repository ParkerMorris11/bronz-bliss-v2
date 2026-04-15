import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  // Serve static assets (JS, CSS, images) from the dist folder
  app.use(express.static(distPath));

  // Landing page at root
  app.get("/", (_req, res) => {
    res.sendFile(path.resolve(distPath, "landing.html"));
  });

  // Admin SPA at /admin — React handles hash-based sub-routes internally
  app.use("/admin/{*path}", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
  app.get("/admin", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}

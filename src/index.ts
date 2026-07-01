// Bootstrap: config, DB migrate (via import side-effect), static, routes, serve.
import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { logger } from "hono/logger";
import { config } from "./config.ts";
import "./db.ts"; // Opening the DB runs schema.sql (idempotent) on import.
import { gate, identity, type AppEnv } from "./middleware/auth.ts";
import { board } from "./routes/board.tsx";
import { ideas } from "./routes/ideas.tsx";
import { attachments } from "./routes/attachments.tsx";
import { identity as identityRoutes } from "./routes/identity.tsx";

const app = new Hono<AppEnv>();

app.use("*", logger());

// Health check is public (no gate) for Dokploy.
app.get("/healthz", (c) => c.text("ok"));

// Static assets (vendored htmx/sortable, voice.js, built css).
app.use("/*.js", serveStatic({ root: "./public" }));
app.use("/*.css", serveStatic({ root: "./public" }));

// Team-wide gate + per-user identity for everything else.
app.use("*", gate);
app.use("*", identity);

app.route("/", identityRoutes);
app.route("/", board);
app.route("/", ideas);
app.route("/", attachments);

app.notFound((c) => c.text("Not found", 404));

console.log(`Idea Bucket listening on http://localhost:${config.PORT}`);

export default {
  port: config.PORT,
  fetch: app.fetch,
  // Allow uploads up to the configured max (Bun default request cap is 128MB).
  maxRequestBodySize: config.MAX_UPLOAD_BYTES + 8 * 1024 * 1024,
};

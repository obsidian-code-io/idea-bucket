// Per-user identity: onboarding panel, upsert, cookie, and reset.
import { Hono } from "hono";
import { db, type UserRow } from "../db.ts";
import {
  clearIdentityCookie,
  setIdentityCookie,
  type AppEnv,
} from "../middleware/auth.ts";
import { newId } from "../lib/ids.ts";
import { onboardingSchema } from "../lib/validation.ts";
import { OnboardingPanel } from "../views/components.tsx";

export const identity = new Hono<AppEnv>();

const getByEmail = db.query<UserRow, [string]>(
  "SELECT * FROM users WHERE email = ?",
);
const insertUser = db.query(
  "INSERT INTO users (id, username, email, phone, created_at) VALUES (?, ?, ?, ?, ?)",
);
const updateUser = db.query(
  "UPDATE users SET username = ?, phone = ? WHERE id = ?",
);

// GET /identity/panel — the onboarding fragment (loaded on first visit).
identity.get("/identity/panel", (c) => c.html(<OnboardingPanel />));

// POST /identity — validate + upsert (keyed by email), then set the cookie.
identity.post("/identity", async (c) => {
  const form = await c.req.parseBody();
  const parsed = onboardingSchema.safeParse({
    username: form.username,
    email: form.email,
    phone: form.phone,
  });
  if (!parsed.success) {
    return c.html(
      <OnboardingPanel
        error={parsed.error.issues[0]?.message ?? "Invalid input"}
        values={{
          username: String(form.username ?? ""),
          email: String(form.email ?? ""),
          phone: String(form.phone ?? ""),
        }}
      />,
    );
  }

  const { username, email, phone } = parsed.data;
  const existing = getByEmail.get(email);
  let userId: string;
  if (existing) {
    userId = existing.id;
    updateUser.run(username, phone, userId);
  } else {
    userId = newId();
    insertUser.run(userId, username, email, phone, Date.now());
  }

  await setIdentityCookie(c, userId);
  // Reload so the header + board reflect the new identity.
  c.header("HX-Refresh", "true");
  return c.body(null, 200);
});

// GET /identity/change — clear the cookie and reopen onboarding.
identity.get("/identity/change", (c) => {
  clearIdentityCookie(c);
  return c.redirect("/");
});

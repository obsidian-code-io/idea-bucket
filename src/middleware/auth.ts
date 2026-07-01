// Two access layers:
//  1. Optional team-wide HTTP Basic Auth gate (env-toggled).
//  2. Per-user identity via a signed cookie holding the user id.
import type { Context, MiddlewareHandler } from "hono";
import { basicAuth } from "hono/basic-auth";
import { getSignedCookie, setSignedCookie, deleteCookie } from "hono/cookie";
import { config } from "../config.ts";
import { db, type UserRow } from "../db.ts";

export const COOKIE_NAME = "ib_uid";

export interface AppVars {
  user: UserRow | null;
}

export type AppEnv = { Variables: AppVars };

// Team-wide door. No-op middleware when disabled so mounting is unconditional.
export const gate: MiddlewareHandler = config.ENABLE_BASIC_AUTH
  ? basicAuth({
      username: config.APP_BASIC_AUTH_USER,
      password: config.APP_BASIC_AUTH_PASS,
    })
  : async (_c, next) => next();

const getUser = db.query<UserRow, [string]>("SELECT * FROM users WHERE id = ?");

// Resolves the current user (if any) from the signed cookie and stores it on
// the context for downstream handlers.
export const identity: MiddlewareHandler<AppEnv> = async (c, next) => {
  let user: UserRow | null = null;
  const uid = await getSignedCookie(c, config.COOKIE_SECRET, COOKIE_NAME);
  if (uid) {
    user = getUser.get(uid) ?? null;
  }
  c.set("user", user);
  await next();
};

export async function setIdentityCookie(c: Context, userId: string) {
  await setSignedCookie(c, COOKIE_NAME, userId, config.COOKIE_SECRET, {
    httpOnly: true,
    sameSite: "Lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 year
    secure: config.PUBLIC_BASE_URL.startsWith("https://"),
  });
}

export function clearIdentityCookie(c: Context) {
  deleteCookie(c, COOKIE_NAME, { path: "/" });
}

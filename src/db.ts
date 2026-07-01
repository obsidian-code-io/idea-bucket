// SQLite connection via bun:sqlite. Runs schema.sql on boot (idempotent).
import { Database } from "bun:sqlite";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { config } from "./config.ts";

// Ensure data + upload directories exist before opening the DB file.
mkdirSync(config.DATA_DIR, { recursive: true });
mkdirSync(config.UPLOAD_DIR, { recursive: true });
mkdirSync(dirname(config.DB_PATH), { recursive: true });

export const db = new Database(config.DB_PATH, { create: true });

// Sensible pragmas for a small concurrent web app.
db.exec("PRAGMA journal_mode = WAL;");
db.exec("PRAGMA foreign_keys = ON;");

const schemaPath = join(import.meta.dir, "schema.sql");
if (!existsSync(schemaPath)) {
  throw new Error(`schema.sql not found at ${schemaPath}`);
}
db.exec(await Bun.file(schemaPath).text());

// --- Row types -------------------------------------------------------------
export interface UserRow {
  id: string;
  username: string;
  email: string;
  phone: string;
  created_at: number;
}

export interface IdeaRow {
  id: string;
  public_id: string;
  title: string;
  description: string | null;
  status: string;
  creator_id: string | null;
  creator_name: string;
  created_at: number;
  updated_at: number;
}

export interface AttachmentRow {
  id: string;
  idea_id: string;
  kind: string;
  original_name: string;
  stored_name: string;
  mime_type: string;
  size_bytes: number;
  created_at: number;
}

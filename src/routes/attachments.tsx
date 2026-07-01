// Attachment upload, voice upload, and streaming download.
import { Hono } from "hono";
import { config } from "../config.ts";
import { db, type AttachmentRow } from "../db.ts";
import type { AppEnv } from "../middleware/auth.ts";
import { newId } from "../lib/ids.ts";
import { resolveStoredPath, saveUpload } from "../lib/storage.ts";
import { ideaQueries } from "./ideas.tsx";
import { AttachmentList } from "../views/components.tsx";

export const attachments = new Hono<AppEnv>();

const insertAttachment = db.query(
  `INSERT INTO attachments (id, idea_id, kind, original_name, stored_name, mime_type, size_bytes, created_at)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
);
const getAttachment = db.query<AttachmentRow, [string]>(
  "SELECT * FROM attachments WHERE id = ?",
);

function requireCreator(c: any): { ok: true } | { ok: false; res: Response } {
  const user = c.get("user");
  const idea = ideaQueries.getById.get(c.req.param("id"));
  if (!idea) return { ok: false, res: c.notFound() };
  if (!user || user.id !== idea.creator_id) {
    return { ok: false, res: c.text("Only the creator can add attachments", 403) };
  }
  return { ok: true };
}

// POST /ideas/:id/attachments — multipart file upload (multiple allowed).
attachments.post("/ideas/:id/attachments", async (c) => {
  const guard = requireCreator(c);
  if (!guard.ok) return guard.res;
  const ideaId = c.req.param("id");

  const body = await c.req.parseBody({ all: true });
  const raw = body["files"];
  const files = (Array.isArray(raw) ? raw : [raw]).filter(
    (f): f is File => f instanceof File && f.size > 0,
  );

  if (files.length === 0) {
    return renderAttachments(c, ideaId, "No file selected.");
  }

  for (const file of files) {
    if (file.size > config.MAX_UPLOAD_BYTES) {
      return renderAttachments(
        c,
        ideaId,
        `"${file.name}" exceeds the ${config.MAX_UPLOAD_MB} MB limit.`,
      );
    }
  }

  for (const file of files) {
    const saved = await saveUpload(file);
    insertAttachment.run(
      newId(),
      ideaId,
      "file",
      file.name || "file",
      saved.storedName,
      file.type || "application/octet-stream",
      saved.size,
      Date.now(),
    );
  }

  return renderAttachments(c, ideaId);
});

// POST /ideas/:id/voice — a single recorded audio blob.
attachments.post("/ideas/:id/voice", async (c) => {
  const guard = requireCreator(c);
  if (!guard.ok) return guard.res;
  const ideaId = c.req.param("id");

  const body = await c.req.parseBody();
  const blob = body["audio"];
  if (!(blob instanceof File) || blob.size === 0) {
    return c.text("No audio provided", 400);
  }
  if (blob.size > config.MAX_UPLOAD_BYTES) {
    return c.text(`Recording exceeds the ${config.MAX_UPLOAD_MB} MB limit.`, 413);
  }

  const saved = await saveUpload(blob);
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  // Voice notes are always audio/webm;codecs=opus. The browser/Bun can tag a
  // .webm part as video/webm, so store the correct audio type explicitly.
  insertAttachment.run(
    newId(),
    ideaId,
    "voice",
    `voice-note-${stamp}.webm`,
    saved.storedName,
    "audio/webm",
    saved.size,
    Date.now(),
  );

  return renderAttachments(c, ideaId);
});

// GET /attachments/:id — stream the file. Path is built only from stored_name.
attachments.get("/attachments/:id", (c) => {
  const a = getAttachment.get(c.req.param("id"));
  if (!a) return c.notFound();

  const file = Bun.file(resolveStoredPath(a.stored_name));
  c.header("Content-Type", a.mime_type);
  c.header("Content-Length", String(a.size_bytes));
  c.header(
    "Content-Disposition",
    `inline; filename="${encodeURIComponent(a.original_name)}"`,
  );
  return c.body(file.stream());
});

function renderAttachments(c: any, ideaId: string, error?: string) {
  const list = ideaQueries.listAttachments.all(ideaId);
  return c.html(
    <>
      <AttachmentList attachments={list} />
      {error ? (
        <p
          id="upload-error"
          hx-swap-oob="true"
          class="mt-1 text-sm text-red-600"
        >
          {error}
        </p>
      ) : null}
    </>,
  );
}

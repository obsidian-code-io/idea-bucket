// Idea CRUD + shareable detail page.
import { Hono } from "hono";
import { config } from "../config.ts";
import { db, type AttachmentRow, type IdeaRow } from "../db.ts";
import type { AppEnv } from "../middleware/auth.ts";
import { newId, newPublicId } from "../lib/ids.ts";
import { deleteStored } from "../lib/storage.ts";
import { newIdeaSchema, statusSchema } from "../lib/validation.ts";
import { Layout } from "../views/layout.tsx";
import { Card, NewIdeaForm } from "../views/components.tsx";
import { IdeaDetail } from "../views/idea-detail.tsx";

export const ideas = new Hono<AppEnv>();

const getById = db.query<IdeaRow, [string]>("SELECT * FROM ideas WHERE id = ?");
const getByPublicId = db.query<IdeaRow, [string]>(
  "SELECT * FROM ideas WHERE public_id = ?",
);
const insertIdea = db.query(
  `INSERT INTO ideas (id, public_id, title, description, status, creator_id, creator_name, created_at, updated_at)
   VALUES (?, ?, ?, ?, 'backlog', ?, ?, ?, ?)`,
);
const listAttachments = db.query<AttachmentRow, [string]>(
  "SELECT * FROM attachments WHERE idea_id = ? ORDER BY created_at ASC",
);
const countForIdea = db.query<{ n: number }, [string]>(
  "SELECT COUNT(*) AS n FROM attachments WHERE idea_id = ?",
);
const updateStatus = db.query(
  "UPDATE ideas SET status = ?, updated_at = ? WHERE id = ?",
);
const deleteIdea = db.query("DELETE FROM ideas WHERE id = ?");

// POST /ideas — create a new idea from the modal form.
ideas.post("/ideas", async (c) => {
  const user = c.get("user");
  if (!user) return c.text("Identity required", 401);

  const form = await c.req.parseBody();
  const parsed = newIdeaSchema.safeParse({
    title: form.title,
    description: form.description,
  });
  if (!parsed.success) {
    return c.html(
      <NewIdeaForm error={parsed.error.issues[0]?.message ?? "Invalid input"} />,
    );
  }

  const now = Date.now();
  const id = newId();
  const publicId = newPublicId();
  insertIdea.run(
    id,
    publicId,
    parsed.data.title,
    parsed.data.description || null,
    user.id,
    user.username,
    now,
    now,
  );

  const idea = getById.get(id)!;
  // Close the modal, and add the new card to the backlog column via OOB swap.
  return c.html(
    <>
      <div id="modal"></div>
      <div hx-swap-oob="beforeend:[data-status='backlog']">
        <Card idea={idea} attachmentCount={0} />
      </div>
    </>,
  );
});

// GET /i/:publicId — shareable detail page (full page).
ideas.get("/i/:publicId", (c) => {
  const user = c.get("user");
  const idea = getByPublicId.get(c.req.param("publicId"));
  if (!idea) return c.notFound();

  const attachments = listAttachments.all(idea.id);
  const shareUrl = `${config.PUBLIC_BASE_URL.replace(/\/$/, "")}/i/${idea.public_id}`;
  // Anyone behind the gate can view; only the creator gets edit controls.
  const canEdit = !!user && user.id === idea.creator_id;

  return c.html(
    <Layout title={idea.title} user={user} needsOnboarding={!user}>
      <IdeaDetail
        idea={idea}
        attachments={attachments}
        shareUrl={shareUrl}
        canEdit={canEdit}
      />
    </Layout>,
  );
});

// PATCH /ideas/:id/status — move on the board.
ideas.patch("/ideas/:id/status", async (c) => {
  const id = c.req.param("id");
  const idea = getById.get(id);
  if (!idea) return c.notFound();

  const form = await c.req.parseBody();
  const parsed = statusSchema.safeParse(form.status);
  if (!parsed.success) return c.text("Invalid status", 400);

  updateStatus.run(parsed.data, Date.now(), id);
  return c.body(null, 204);
});

// DELETE /ideas/:id — remove idea, cascade rows, delete files from disk.
ideas.delete("/ideas/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const idea = getById.get(id);
  if (!idea) return c.notFound();
  if (!user || user.id !== idea.creator_id) {
    return c.text("Only the creator can delete this idea", 403);
  }

  const files = listAttachments.all(id);
  deleteIdea.run(id); // ON DELETE CASCADE removes attachment rows.
  await Promise.all(files.map((f) => deleteStored(f.stored_name)));

  // Redirect the browser back to the board.
  c.header("HX-Redirect", "/");
  return c.body(null, 200);
});

// Shared helpers for the attachments routes.
export const ideaQueries = { getById, listAttachments, countForIdea };

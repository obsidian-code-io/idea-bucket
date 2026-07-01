// Board page + new-idea form fragment.
import { Hono } from "hono";
import { db, type IdeaRow } from "../db.ts";
import type { AppEnv } from "../middleware/auth.ts";
import { STATUSES, type Status } from "../lib/validation.ts";
import { Layout } from "../views/layout.tsx";
import { Board, type BoardIdea } from "../views/board.tsx";
import { NewIdeaForm } from "../views/components.tsx";

export const board = new Hono<AppEnv>();

const listIdeas = db.query<IdeaRow, []>(
  "SELECT * FROM ideas ORDER BY created_at DESC",
);
const countAttachments = db.query<{ idea_id: string; n: number }, []>(
  "SELECT idea_id, COUNT(*) AS n FROM attachments GROUP BY idea_id",
);

board.get("/", (c) => {
  const user = c.get("user");
  const counts = new Map<string, number>();
  for (const row of countAttachments.all()) counts.set(row.idea_id, row.n);

  const byStatus = Object.fromEntries(
    STATUSES.map((s) => [s, [] as BoardIdea[]]),
  ) as Record<Status, BoardIdea[]>;

  for (const idea of listIdeas.all()) {
    const status = (STATUSES as readonly string[]).includes(idea.status)
      ? (idea.status as Status)
      : "backlog";
    byStatus[status].push({
      idea,
      attachmentCount: counts.get(idea.id) ?? 0,
    });
  }

  return c.html(
    <Layout user={user} needsOnboarding={!user}>
      <Board byStatus={byStatus} />
    </Layout>,
  );
});

// New-idea form fragment (loaded into #modal by HTMX).
board.get("/ideas/new", (c) => {
  return c.html(<NewIdeaForm />);
});

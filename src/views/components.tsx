// Reusable UI fragments: cards, columns, modal, forms, attachment rows.
import type { FC, PropsWithChildren } from "hono/jsx";
import type { AttachmentRow, IdeaRow } from "../db.ts";
import { relativeTime } from "../lib/time.ts";
import { isPreviewSafe } from "../lib/storage.ts";
import {
  STATUSES,
  STATUS_LABELS,
  type Status,
} from "../lib/validation.ts";

// --- Modal shell -----------------------------------------------------------
// Dismissable modal used for the new-idea form. Clicking the backdrop or the
// close button empties #modal.
export const Modal: FC<
  PropsWithChildren<{ title: string; dismissable?: boolean }>
> = ({ title, dismissable = true, children }) => (
  <div class="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
    <div class="w-full max-w-lg rounded-lg bg-white shadow-xl">
      <div class="flex items-center justify-between border-b border-neutral-200 px-5 py-3">
        <h2 class="font-semibold">{title}</h2>
        {dismissable ? (
          <button
            type="button"
            class="text-neutral-400 hover:text-neutral-700"
            onclick="document.getElementById('modal').innerHTML=''"
          >
            ✕
          </button>
        ) : null}
      </div>
      <div class="px-5 py-4">{children}</div>
    </div>
  </div>
);

// --- New idea form ---------------------------------------------------------
export const NewIdeaForm: FC<{ error?: string }> = ({ error }) => (
  <Modal title="New idea">
    <form
      hx-post="/ideas"
      hx-target="#modal"
      hx-swap="innerHTML"
      class="space-y-3"
    >
      {error ? <p class="text-sm text-red-600">{error}</p> : null}
      <div>
        <label class="mb-1 block text-sm font-medium">Title</label>
        <input
          name="title"
          required
          maxlength={200}
          autofocus
          class="w-full rounded border border-neutral-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          placeholder="Short, descriptive title"
        />
      </div>
      <div>
        <label class="mb-1 block text-sm font-medium">Description</label>
        <textarea
          name="description"
          rows={4}
          maxlength={5000}
          class="w-full rounded border border-neutral-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          placeholder="Optional details"
        ></textarea>
      </div>
      <div class="flex justify-end gap-2 pt-1">
        <button
          type="button"
          class="rounded px-3 py-2 text-sm text-neutral-600 hover:bg-neutral-100"
          onclick="document.getElementById('modal').innerHTML=''"
        >
          Cancel
        </button>
        <button
          type="submit"
          class="rounded bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Create idea
        </button>
      </div>
    </form>
  </Modal>
);

// --- Onboarding panel ------------------------------------------------------
// Non-dismissable overlay collecting identity details.
export const OnboardingPanel: FC<{
  error?: string;
  values?: { username?: string; email?: string; phone?: string };
}> = ({ error, values }) => (
  <Modal title="Welcome — tell us who you are" dismissable={false}>
    <p class="mb-3 text-sm text-neutral-600">
      This identifies the ideas you create. It stays on this browser.
    </p>
    <form
      hx-post="/identity"
      hx-target="#modal"
      hx-swap="innerHTML"
      class="space-y-3"
    >
      {error ? <p class="text-sm text-red-600">{error}</p> : null}
      <div>
        <label class="mb-1 block text-sm font-medium">Username</label>
        <input
          name="username"
          required
          value={values?.username ?? ""}
          class="w-full rounded border border-neutral-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
        />
      </div>
      <div>
        <label class="mb-1 block text-sm font-medium">Email</label>
        <input
          name="email"
          type="email"
          required
          value={values?.email ?? ""}
          class="w-full rounded border border-neutral-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
        />
      </div>
      <div>
        <label class="mb-1 block text-sm font-medium">Phone number</label>
        <input
          name="phone"
          required
          value={values?.phone ?? ""}
          class="w-full rounded border border-neutral-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
        />
      </div>
      <div class="flex justify-end pt-1">
        <button
          type="submit"
          class="rounded bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Continue
        </button>
      </div>
    </form>
  </Modal>
);

// --- Board card ------------------------------------------------------------
export const Card: FC<{ idea: IdeaRow; attachmentCount: number }> = ({
  idea,
  attachmentCount,
}) => (
  <div
    class="group rounded-md border border-neutral-200 bg-white p-3 shadow-sm hover:border-indigo-300"
    data-id={idea.id}
  >
    <a
      href={`/i/${idea.public_id}`}
      hx-boost="false"
      class="block font-medium text-neutral-900 hover:text-indigo-700"
    >
      {idea.title}
    </a>
    <div class="mt-2 flex items-center justify-between text-xs text-neutral-500">
      <span>{idea.creator_name}</span>
      <span>{relativeTime(idea.created_at)}</span>
    </div>
    <div class="mt-2 flex items-center justify-between">
      <span class="text-xs text-neutral-500">
        {attachmentCount > 0 ? `📎 ${attachmentCount}` : ""}
      </span>
      {/* No-JS fallback status control. */}
      <select
        class="rounded border border-neutral-200 bg-neutral-50 px-1 py-0.5 text-xs text-neutral-600"
        hx-patch={`/ideas/${idea.id}/status`}
        hx-swap="none"
        name="status"
      >
        {STATUSES.map((s) => (
          <option value={s} selected={s === idea.status}>
            {STATUS_LABELS[s]}
          </option>
        ))}
      </select>
    </div>
  </div>
);

// --- Board column ----------------------------------------------------------
export const Column: FC<{
  status: Status;
  ideas: Array<{ idea: IdeaRow; attachmentCount: number }>;
}> = ({ status, ideas }) => (
  <div class="flex w-72 shrink-0 flex-col rounded-lg bg-neutral-200/60">
    <div class="flex items-center justify-between px-3 py-2 text-sm font-semibold text-neutral-700">
      <span>{STATUS_LABELS[status]}</span>
      <span class="rounded-full bg-white px-2 py-0.5 text-xs text-neutral-500">
        {ideas.length}
      </span>
    </div>
    <div
      class="board-column flex min-h-[60px] flex-1 flex-col gap-2 px-2 pb-3"
      data-status={status}
    >
      {ideas.map(({ idea, attachmentCount }) => (
        <Card idea={idea} attachmentCount={attachmentCount} />
      ))}
    </div>
  </div>
);

// --- Attachment row (used on the detail page + refreshed after upload) -----
const AttachmentItem: FC<{ attachment: AttachmentRow }> = ({
  attachment: a,
}) => {
  const previewable = isPreviewSafe(a.mime_type);
  const isAudio = a.mime_type.startsWith("audio/");
  const isImage = a.mime_type.startsWith("image/");
  return (
    <li class="rounded border border-neutral-200 bg-white p-3">
      <div class="flex items-center justify-between gap-2">
        <div class="min-w-0">
          <span class="block truncate text-sm font-medium">
            {a.kind === "voice" ? "🎙 " : "📄 "}
            {a.original_name}
          </span>
          <span class="text-xs text-neutral-500">
            {formatBytes(a.size_bytes)} · {a.mime_type}
          </span>
        </div>
        <a
          href={`/attachments/${a.id}`}
          hx-boost="false"
          class="shrink-0 rounded border border-neutral-300 px-2 py-1 text-xs hover:bg-neutral-100"
        >
          Download
        </a>
      </div>
      {isAudio ? (
        <audio controls class="mt-2 w-full" src={`/attachments/${a.id}`}></audio>
      ) : null}
      {isImage && previewable ? (
        <img
          src={`/attachments/${a.id}`}
          alt={a.original_name}
          class="mt-2 max-h-64 rounded border border-neutral-200"
        />
      ) : null}
    </li>
  );
};

export const AttachmentList: FC<{ attachments: AttachmentRow[] }> = ({
  attachments,
}) => (
  <ul id="attachments" class="space-y-2">
    {attachments.length === 0 ? (
      <li class="text-sm text-neutral-500">No attachments yet.</li>
    ) : (
      attachments.map((a) => <AttachmentItem attachment={a} />)
    )}
  </ul>
);

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

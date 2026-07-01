// Shareable idea detail page body.
import type { FC } from "hono/jsx";
import type { AttachmentRow, IdeaRow } from "../db.ts";
import { relativeTime } from "../lib/time.ts";
import { STATUS_LABELS, type Status } from "../lib/validation.ts";
import { AttachmentList } from "./components.tsx";

export const IdeaDetail: FC<{
  idea: IdeaRow;
  attachments: AttachmentRow[];
  shareUrl: string;
  canEdit: boolean;
}> = ({ idea, attachments, shareUrl, canEdit }) => (
  <div class="mx-auto max-w-3xl">
    <a href="/" class="text-sm text-indigo-600 hover:underline">
      ← Back to board
    </a>

    <div class="mt-3 rounded-lg border border-neutral-200 bg-white p-6">
      <div class="flex items-start justify-between gap-4">
        <h1 class="text-xl font-semibold">{idea.title}</h1>
        <span class="shrink-0 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700">
          {STATUS_LABELS[idea.status as Status] ?? idea.status}
        </span>
      </div>

      <div class="mt-2 text-sm text-neutral-500">
        Created by <span class="font-medium">{idea.creator_name}</span> ·{" "}
        {relativeTime(idea.created_at)}
      </div>

      {idea.description ? (
        <p class="mt-4 whitespace-pre-wrap text-sm text-neutral-800">
          {idea.description}
        </p>
      ) : (
        <p class="mt-4 text-sm italic text-neutral-400">No description.</p>
      )}

      <div class="mt-4 rounded border border-neutral-200 bg-neutral-50 p-3">
        <div class="mb-1 text-xs font-medium text-neutral-600">Share link</div>
        <input
          readonly
          value={shareUrl}
          onclick="this.select()"
          class="w-full rounded border border-neutral-300 bg-white px-2 py-1 font-mono text-xs"
        />
      </div>
    </div>

    <div class="mt-6 rounded-lg border border-neutral-200 bg-white p-6">
      <h2 class="mb-3 font-semibold">Attachments</h2>
      <AttachmentList attachments={attachments} />

      {canEdit ? (
        <div class="mt-5 space-y-4 border-t border-neutral-200 pt-4">
          <div>
            <label class="mb-1 block text-sm font-medium">Upload files</label>
            <form
              hx-post={`/ideas/${idea.id}/attachments`}
              hx-target="#attachments"
              hx-swap="outerHTML"
              hx-encoding="multipart/form-data"
              class="flex items-center gap-2"
            >
              <input
                type="file"
                name="files"
                multiple
                required
                class="text-sm"
              />
              <button
                type="submit"
                class="rounded bg-neutral-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-900"
              >
                Upload
              </button>
            </form>
            <p
              id="upload-error"
              class="mt-1 text-sm text-red-600 empty:hidden"
            ></p>
          </div>

          <VoiceRecorder ideaId={idea.id} />
        </div>
      ) : null}
    </div>

    {canEdit ? (
      <div class="mt-6">
        <button
          hx-delete={`/ideas/${idea.id}`}
          hx-confirm="Delete this idea and all its attachments?"
          class="rounded border border-red-300 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
        >
          Delete idea
        </button>
      </div>
    ) : null}
  </div>
);

const VoiceRecorder: FC<{ ideaId: string }> = ({ ideaId }) => (
  <div data-voice-recorder data-idea-id={ideaId}>
    <label class="mb-1 block text-sm font-medium">Voice note</label>
    <div class="flex flex-wrap items-center gap-2">
      <button
        type="button"
        data-voice-record
        class="rounded bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
      >
        ● Record
      </button>
      <button
        type="button"
        data-voice-stop
        disabled
        class="rounded border border-neutral-300 px-3 py-1.5 text-sm disabled:opacity-40"
      >
        ■ Stop
      </button>
      <span data-voice-status class="text-sm text-neutral-500"></span>
    </div>
    <audio data-voice-preview controls class="mt-2 hidden w-full"></audio>
  </div>
);

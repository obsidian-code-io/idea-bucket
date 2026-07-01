// Kanban board page body.
import type { FC } from "hono/jsx";
import type { IdeaRow } from "../db.ts";
import { STATUSES, type Status } from "../lib/validation.ts";
import { Column } from "./components.tsx";

export type BoardIdea = { idea: IdeaRow; attachmentCount: number };

export const Board: FC<{ byStatus: Record<Status, BoardIdea[]> }> = ({
  byStatus,
}) => (
  <>
    <div class="mb-4 flex items-center justify-between">
      <h1 class="text-lg font-semibold">Board</h1>
      <button
        hx-get="/ideas/new"
        hx-target="#modal"
        hx-swap="innerHTML"
        class="rounded bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
      >
        + New idea
      </button>
    </div>
    <div class="flex gap-3 overflow-x-auto pb-4">
      {STATUSES.map((status) => (
        <Column status={status} ideas={byStatus[status]} />
      ))}
    </div>
    <BoardScript />
  </>
);

// Wires SortableJS across the columns and PATCHes status on drop.
const BoardScript: FC = () => (
  <script
    dangerouslySetInnerHTML={{
      __html: `
        (function () {
          function wire() {
            if (!window.Sortable) { setTimeout(wire, 50); return; }
            document.querySelectorAll('.board-column').forEach(function (col) {
              if (col._sortable) return;
              col._sortable = Sortable.create(col, {
                group: 'ideas',
                animation: 120,
                ghostClass: 'opacity-40',
                onAdd: function (evt) {
                  var id = evt.item.getAttribute('data-id');
                  var status = evt.to.getAttribute('data-status');
                  var sel = evt.item.querySelector('select[name=status]');
                  if (sel) sel.value = status;
                  fetch('/ideas/' + id + '/status', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: 'status=' + encodeURIComponent(status)
                  });
                }
              });
            });
          }
          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', wire);
          } else { wire(); }
        })();
      `,
    }}
  />
);

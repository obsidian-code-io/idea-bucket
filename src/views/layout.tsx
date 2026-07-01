// Full-page HTML shell.
import type { FC, PropsWithChildren } from "hono/jsx";
import type { UserRow } from "../db.ts";

interface LayoutProps {
  title?: string;
  user: UserRow | null;
  // When true, render the (non-dismissable) onboarding overlay on load.
  needsOnboarding?: boolean;
}

export const Layout: FC<PropsWithChildren<LayoutProps>> = ({
  title,
  user,
  needsOnboarding,
  children,
}) => {
  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{title ? `${title} · Idea Bucket` : "Idea Bucket"}</title>
        <link rel="stylesheet" href="/styles.css" />
        <script src="/htmx.min.js" defer></script>
        <script src="/sortable.min.js" defer></script>
        <script src="/voice.js" defer></script>
      </head>
      <body class="min-h-screen bg-neutral-100 text-neutral-900">
        <Header user={user} />
        <main class="mx-auto max-w-[1400px] px-4 py-4">{children}</main>

        {/* Slot HTMX drops modal fragments into (new idea form, etc). */}
        <div id="modal"></div>

        {needsOnboarding ? <OnboardingScript /> : null}
      </body>
    </html>
  );
};

const Header: FC<{ user: UserRow | null }> = ({ user }) => (
  <header class="border-b border-neutral-200 bg-white">
    <div class="mx-auto flex max-w-[1400px] items-center justify-between px-4 py-3">
      <a href="/" class="flex items-center gap-2 font-semibold">
        <span class="inline-block h-5 w-5 rounded bg-indigo-600"></span>
        <span>Idea Bucket</span>
      </a>
      <div class="flex items-center gap-3 text-sm">
        {user ? (
          <>
            <span class="text-neutral-600">
              <span class="font-medium text-neutral-900">{user.username}</span>
              <span class="ml-2 rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-xs text-neutral-500">
                {user.id}
              </span>
            </span>
            <a
              href="/identity/change"
              class="text-indigo-600 hover:underline"
              hx-boost="false"
            >
              Change details
            </a>
          </>
        ) : (
          <span class="text-neutral-500">Not signed in</span>
        )}
      </div>
    </div>
  </header>
);

// Opens the onboarding modal on first load. Small inline bootstrap that just
// fetches the panel fragment into #modal.
const OnboardingScript: FC = () => (
  <script
    // eslint-disable-next-line
    dangerouslySetInnerHTML={{
      __html: `
        (function () {
          function load() {
            fetch('/identity/panel')
              .then(function (r) { return r.text(); })
              .then(function (html) {
                document.getElementById('modal').innerHTML = html;
                if (window.htmx) window.htmx.process(document.getElementById('modal'));
              });
          }
          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', load);
          } else { load(); }
        })();
      `,
    }}
  />
);

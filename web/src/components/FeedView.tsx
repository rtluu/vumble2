import { setViewAction } from "@/app/actions/prefs";
import { PostCard } from "@/components/PostCard";
import type { FeedSort, FeedSurface } from "@/lib/feed/feed";
import { getFeed } from "@/lib/feed/feed";
import { getDb } from "@/lib/db/client";
import { getView, type ViewMode } from "@/lib/prefs/view";

const SORTS: FeedSort[] = ["hot", "new", "top"];

function basePath(slug?: string) {
  return slug ? `/v/${slug}` : "/";
}

const VIEWS: { mode: ViewMode; label: string; hint: string }[] = [
  { mode: "compact", label: "Compact", hint: "Thumbnails beside the text" },
  { mode: "expanded", label: "Expanded", hint: "Play inline" },
];

/**
 * Density control.
 *
 * Segmented rather than a single toggle, to match the sort and surface
 * controls beside it — a lone button labelled with a mode is ambiguous about
 * whether that is the current state or the thing clicking does.
 *
 * Forms rather than links because the preference lives in a cookie and
 * applies site-wide, not only to the page it was clicked from.
 */
function ViewToggle({ current }: { current: ViewMode }) {
  return (
    <span className="view-toggle">
      {VIEWS.map(({ mode, label, hint }) => (
        <form action={setViewAction} key={mode} className="inline-form">
          <input type="hidden" name="view" value={mode} />
          <button
            type="submit"
            className={mode === current ? "on" : ""}
            aria-pressed={mode === current}
            // Explicit, so the mode name is part of the accessible name
            // rather than being replaced by the hover hint.
            aria-label={`${label} view — ${hint.toLowerCase()}`}
            title={hint}
          >
            {label}
          </button>
        </form>
      ))}
    </span>
  );
}

export async function FeedView({
  communitySlug,
  sort = "hot",
  surface = "promoted",
  viewerId = null,
  signedIn = false,
}: {
  communitySlug?: string;
  sort?: FeedSort;
  surface?: FeedSurface;
  viewerId?: number | null;
  signedIn?: boolean;
}) {
  const [db, view] = await Promise.all([getDb(), getView()]);
  const { items } = await getFeed(db, {
    communitySlug,
    sort,
    surface,
    viewerId,
  });

  const base = basePath(communitySlug);
  const q = (next: Record<string, string>) => {
    const params = new URLSearchParams({ sort, surface, ...next });
    return `${base}?${params}`;
  };

  return (
    <>
      <nav className="feed-nav">
        <div className="sorts">
          {SORTS.map((s) => (
            <a key={s} href={q({ sort: s })} className={s === sort ? "on" : ""}>
              {s}
            </a>
          ))}
        </div>
        <div className="surfaces">
          <a
            href={q({ surface: "promoted" })}
            className={surface === "promoted" ? "on" : ""}
          >
            Promoted
          </a>
          <a
            href={q({ surface: "proposed" })}
            className={surface === "proposed" ? "on" : ""}
          >
            Proposed
          </a>
          <ViewToggle current={view} />
        </div>
      </nav>

      {surface === "proposed" && (
        <p className="queue-note">
          Submissions waiting on human validation. Agents propose freely; only
          people promote.
        </p>
      )}

      {items.length === 0 ? (
        <p className="empty">
          {surface === "proposed"
            ? "Nothing in the queue."
            : "Nothing promoted yet — check the proposal queue."}
        </p>
      ) : (
        <div className={`feed ${view}`}>
          {items.map((item) => (
            <PostCard
              key={item.postId}
              item={item}
              signedIn={signedIn}
              view={view}
            />
          ))}
        </div>
      )}
    </>
  );
}

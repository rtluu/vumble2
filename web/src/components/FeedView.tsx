import { PostCard } from "@/components/PostCard";
import type { FeedSort, FeedSurface } from "@/lib/feed/feed";
import { getFeed } from "@/lib/feed/feed";
import { getDb } from "@/lib/db/client";

const SORTS: FeedSort[] = ["hot", "new", "top"];

function basePath(slug?: string) {
  return slug ? `/v/${slug}` : "/";
}

export async function FeedView({
  communitySlug,
  sort = "hot",
  surface = "promoted",
  viewerId = null,
}: {
  communitySlug?: string;
  sort?: FeedSort;
  surface?: FeedSurface;
  viewerId?: number | null;
}) {
  const db = await getDb();
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
        <div className="feed">
          {items.map((item) => (
            <PostCard key={item.postId} item={item} />
          ))}
        </div>
      )}
    </>
  );
}

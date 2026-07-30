import { FeedView } from "@/components/FeedView";
import { SiteHeader } from "@/components/SiteHeader";
import { getCurrentUser } from "@/lib/auth/current-user";
import { joinedSlugs } from "@/lib/community/membership";
import { getDb } from "@/lib/db/client";
import type { FeedSort, FeedSurface } from "@/lib/feed/feed";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; surface?: string }>;
}) {
  const params = await searchParams;
  const sort = (["hot", "new", "top"] as const).includes(
    params.sort as FeedSort,
  )
    ? (params.sort as FeedSort)
    : "hot";
  const surface: FeedSurface =
    params.surface === "proposed" ? "proposed" : "promoted";

  const [user, db] = await Promise.all([getCurrentUser(), getDb()]);
  const [communities, joined] = await Promise.all([
    db.selectFrom("communities").select(["slug", "name"]).orderBy("slug").execute(),
    joinedSlugs(db, user?.id),
  ]);

  return (
    <main className="shell">
      <SiteHeader user={user} communities={communities} />

      {user && joined.length === 0 && (
        <p className="queue-note">
          You have not joined anything yet — join a community to post to it.
        </p>
      )}

      <FeedView
        sort={sort}
        surface={surface}
        viewerId={user?.id ?? null}
        signedIn={!!user}
      />
    </main>
  );
}

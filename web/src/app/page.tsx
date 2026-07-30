import { FeedView } from "@/components/FeedView";
import { getCurrentUser } from "@/lib/auth/current-user";
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
  const communities = await db
    .selectFrom("communities")
    .select(["slug", "name"])
    .orderBy("slug")
    .execute();

  return (
    <main className="shell">
      <header className="site-header">
        <a href="/" className="wordmark">
          Vumble
        </a>
        <nav className="communities">
          {communities.map((c) => (
            <a key={c.slug} href={`/v/${c.slug}`}>
              /v/{c.slug}
            </a>
          ))}
        </nav>
        <span className="who">{user ? user.handle : "signed out"}</span>
      </header>

      <FeedView sort={sort} surface={surface} viewerId={user?.id ?? null} />
    </main>
  );
}

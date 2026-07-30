import { notFound } from "next/navigation";
import { FeedView } from "@/components/FeedView";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getDb } from "@/lib/db/client";
import type { FeedSort, FeedSurface } from "@/lib/feed/feed";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const db = await getDb();
  const community = await db
    .selectFrom("communities")
    .select(["name", "description"])
    .where("slug", "=", slug)
    .executeTakeFirst();

  if (!community) return { title: "Not found" };
  return {
    title: community.name,
    description: community.description || undefined,
  };
}

export default async function CommunityPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ sort?: string; surface?: string }>;
}) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);

  const db = await getDb();
  const community = await db
    .selectFrom("communities")
    .select(["slug", "name", "description"])
    .where("slug", "=", slug)
    .executeTakeFirst();

  if (!community) notFound();

  const sort = (["hot", "new", "top"] as const).includes(sp.sort as FeedSort)
    ? (sp.sort as FeedSort)
    : "hot";
  const surface: FeedSurface =
    sp.surface === "proposed" ? "proposed" : "promoted";

  const user = await getCurrentUser();

  return (
    <main className="shell">
      <header className="site-header">
        <a href="/" className="wordmark">
          Vumble
        </a>
        <span className="who">{user ? user.handle : "signed out"}</span>
      </header>

      <div className="community-header">
        <h1>/v/{community.slug}</h1>
        {community.description && <p>{community.description}</p>}
      </div>

      <FeedView
        communitySlug={community.slug}
        sort={sort}
        surface={surface}
        viewerId={user?.id ?? null}
      />
    </main>
  );
}

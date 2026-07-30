import { notFound } from "next/navigation";
import { FeedView } from "@/components/FeedView";
import { JoinButton } from "@/components/JoinButton";
import { SiteHeader } from "@/components/SiteHeader";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getMembership, memberCounts } from "@/lib/community/membership";
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
  const [membership, counts] = await Promise.all([
    getMembership(db, user?.id, community.slug),
    memberCounts(db),
  ]);

  return (
    <main className="shell">
      <SiteHeader user={user} />

      <div className="community-header">
        <h1>/v/{community.slug}</h1>
        {community.description && <p>{community.description}</p>}
        <JoinButton
          slug={community.slug}
          joined={!!membership}
          signedIn={!!user}
          memberCount={counts.get(community.slug) ?? 0}
        />
      </div>

      <FeedView
        communitySlug={community.slug}
        sort={sort}
        surface={surface}
        viewerId={user?.id ?? null}
        signedIn={!!user}
      />
    </main>
  );
}

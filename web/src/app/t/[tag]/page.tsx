import { notFound } from "next/navigation";
import { PostCard } from "@/components/PostCard";
import { SiteHeader } from "@/components/SiteHeader";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getDb } from "@/lib/db/client";
import { getFeed, type FeedSort } from "@/lib/feed/feed";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tag: string }>;
}) {
  const { tag } = await params;
  const db = await getDb();
  const row = await db
    .selectFrom("tags")
    .select(["label", "facet"])
    .where("slug", "=", tag)
    .executeTakeFirst();

  if (!row) return { title: "Not found" };
  return { title: `${row.label} (${row.facet})` };
}

/**
 * A facet tag across every community.
 *
 * This is the retrieval axis: /v/horror is where horror people talk,
 * /t/folk-horror is everything tagged folk horror wherever it was posted.
 * Stacking facets is what replaces Netflix's enumerated micro-genres.
 */
export default async function TagPage({
  params,
  searchParams,
}: {
  params: Promise<{ tag: string }>;
  searchParams: Promise<{ sort?: string }>;
}) {
  const [{ tag }, sp] = await Promise.all([params, searchParams]);

  const db = await getDb();
  const meta = await db
    .selectFrom("tags")
    .select(["slug", "label", "facet", "description"])
    .where("slug", "=", tag)
    .executeTakeFirst();

  if (!meta) notFound();

  const sort = (["hot", "new", "top"] as const).includes(sp.sort as FeedSort)
    ? (sp.sort as FeedSort)
    : "hot";

  const user = await getCurrentUser();
  const { items } = await getFeed(db, {
    tag: meta.slug,
    sort,
    viewerId: user?.id ?? null,
  });

  // Tags that co-occur with this one — the composable-facet payoff.
  const related = await db
    .selectFrom("title_tags as a")
    .innerJoin("title_tags as b", "b.title_id", "a.title_id")
    .innerJoin("tags", "tags.slug", "b.tag")
    .select((eb) => [
      "b.tag",
      "tags.facet",
      eb.fn.countAll<number>().as("n"),
    ])
    .where("a.tag", "=", meta.slug)
    .where("b.tag", "!=", meta.slug)
    .groupBy(["b.tag", "tags.facet"])
    .orderBy("n", "desc")
    .limit(8)
    .execute();

  return (
    <main className="shell">
      <SiteHeader user={user} />

      <div className="community-header">
        <h1>
          {meta.label} <span className="facet-chip">{meta.facet}</span>
        </h1>
        {meta.description && <p>{meta.description}</p>}
      </div>

      {related.length > 0 && (
        <div className="related">
          <span className="related-label">Often with</span>
          {related.map((r) => (
            <a key={r.tag} href={`/t/${r.tag}`} className="tag">
              {r.tag}
            </a>
          ))}
        </div>
      )}

      {items.length === 0 ? (
        <p className="empty">Nothing tagged {meta.label} yet.</p>
      ) : (
        <div className="feed">
          {items.map((item) => (
            <PostCard key={item.postId} item={item} signedIn={!!user} />
          ))}
        </div>
      )}
    </main>
  );
}

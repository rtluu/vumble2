import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/SiteHeader";
import { SubmitForm } from "@/components/SubmitForm";
import { getCurrentUser } from "@/lib/auth/current-user";
import { joinedSlugs } from "@/lib/community/membership";
import { getDb } from "@/lib/db/client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Post" };

export default async function SubmitPage({
  searchParams,
}: {
  searchParams: Promise<{ v?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/signin");

  const [{ v }, db] = await Promise.all([searchParams, getDb()]);

  const all = await db
    .selectFrom("communities")
    .select(["slug", "name"])
    .orderBy("slug")
    .execute();

  const joined = new Set(await joinedSlugs(db, user.id));

  return (
    <main className="shell narrow">
      <SiteHeader user={user} />

      <div className="community-header">
        <h1>Post a video</h1>
        <p>
          Anything a resolver understands — YouTube, Vimeo, Twitch, Streamable,
          Dailymotion. Channels, playlists, and live streams are not posts.
        </p>
      </div>

      <SubmitForm
        communities={all.map((c) => ({ ...c, joined: joined.has(c.slug) }))}
        defaultSlug={v && joined.has(v) ? v : undefined}
      />
    </main>
  );
}

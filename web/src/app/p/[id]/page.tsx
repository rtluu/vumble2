import { notFound } from "next/navigation";
import { Comments } from "@/components/Comments";
import { PostCard } from "@/components/PostCard";
import { SiteHeader } from "@/components/SiteHeader";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getThread } from "@/lib/comments/comments";
import { getDb } from "@/lib/db/client";
import { getPost } from "@/lib/feed/feed";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const postId = Number(id);
  if (!Number.isInteger(postId)) return { title: "Not found" };

  const db = await getDb();
  const post = await getPost(db, postId);
  if (!post) return { title: "Not found" };

  return {
    title: post.headline,
    description: post.body || post.title.canonicalName,
  };
}

export default async function PostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const postId = Number(id);
  if (!Number.isInteger(postId) || postId < 1) notFound();

  const [user, db] = await Promise.all([getCurrentUser(), getDb()]);
  const post = await getPost(db, postId, user?.id ?? null);

  if (!post || post.state === "removed") notFound();

  const thread = await getThread(db, postId, user?.id ?? null);

  return (
    <main className="shell">
      <SiteHeader user={user} />

      <div className="crumb">
        <a href={`/v/${post.community.slug}`}>/v/{post.community.slug}</a>
      </div>

      <PostCard item={post} signedIn={!!user} expanded />

      <Comments postId={postId} thread={thread} signedIn={!!user} />
    </main>
  );
}

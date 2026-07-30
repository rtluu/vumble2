"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { addComment, voteComment } from "@/lib/comments/comments";
import { getMembership } from "@/lib/community/membership";
import { getDb } from "@/lib/db/client";
import { submitUrl } from "@/lib/submit/submit";
import { castVote, retractVote } from "@/lib/submit/vote";

/**
 * Mutations behind the UI.
 *
 * Every one of these re-reads the session rather than trusting an id from
 * the form — that is the whole point of the auth boundary. The domain
 * functions take an author id and trust it; these make sure it is real.
 */

export type SubmitState = { error?: string } | undefined;

export async function submitAction(
  _prev: SubmitState,
  formData: FormData,
): Promise<SubmitState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Sign in to post." };

  const slug = String(formData.get("community") ?? "").trim();
  const url = String(formData.get("url") ?? "").trim();
  const headline = String(formData.get("headline") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();

  if (!slug) return { error: "Pick a community." };

  const db = await getDb();

  // Posting into a room you have not joined is how drive-by spam works.
  const membership = await getMembership(db, user.id, slug);
  if (!membership) return { error: `Join /v/${slug} before posting to it.` };

  const res = await submitUrl(db, {
    url,
    communitySlug: slug,
    authorId: user.id,
    headline,
    body,
  });

  if (!res.ok) {
    if (res.reason === "already_posted") {
      redirect(`/p/${res.postId}`);
    }
    return { error: res.message };
  }

  revalidatePath(`/v/${slug}`);
  revalidatePath("/");
  redirect(`/p/${res.postId}`);
}

export async function votePostAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Sign in to vote.");

  const postId = Number(formData.get("postId"));
  const value = Number(formData.get("value"));
  const current = Number(formData.get("current") ?? 0);

  const db = await getDb();

  // Clicking the direction you already voted clears it, as everywhere else.
  if (current === value) {
    await retractVote(db, user.id, postId);
  } else {
    const res = await castVote(db, {
      userId: user.id,
      postId,
      value: value === 1 ? 1 : -1,
    });
    if (!res.ok) throw new Error(res.message);
  }

  revalidatePath(`/p/${postId}`);
  revalidatePath("/");
}

export async function commentAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Sign in to comment.");

  const postId = Number(formData.get("postId"));
  const rawParent = formData.get("parentId");
  const parentId = rawParent ? Number(rawParent) : null;
  const body = String(formData.get("body") ?? "");

  const db = await getDb();
  const res = await addComment(db, {
    postId,
    authorId: user.id,
    parentId,
    body,
  });

  if (!res.ok) throw new Error(res.message);
  revalidatePath(`/p/${postId}`);
}

export async function voteCommentAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Sign in to vote.");

  const commentId = Number(formData.get("commentId"));
  const postId = Number(formData.get("postId"));
  const value = Number(formData.get("value")) === 1 ? 1 : -1;

  const db = await getDb();
  const res = await voteComment(db, { userId: user.id, commentId, value });
  if (!res.ok) throw new Error(res.message);

  revalidatePath(`/p/${postId}`);
}

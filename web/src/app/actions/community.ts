"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/current-user";
import { joinCommunity, leaveCommunity } from "@/lib/community/membership";
import { getDb } from "@/lib/db/client";

export async function joinAction(formData: FormData) {
  const slug = String(formData.get("slug") ?? "");
  const user = await getCurrentUser();
  if (!user) throw new Error("Sign in to join a community.");

  const db = await getDb();
  const res = await joinCommunity(db, user.id, slug);
  if (!res.ok) throw new Error(`No community /v/${slug}`);

  revalidatePath(`/v/${slug}`);
  revalidatePath("/");
}

export async function leaveAction(formData: FormData) {
  const slug = String(formData.get("slug") ?? "");
  const user = await getCurrentUser();
  if (!user) throw new Error("Sign in to leave a community.");

  const db = await getDb();
  await leaveCommunity(db, user.id, slug);

  revalidatePath(`/v/${slug}`);
  revalidatePath("/");
}

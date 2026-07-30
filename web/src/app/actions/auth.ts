"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  cookieOptions,
  createSession,
  destroySession,
  SESSION_COOKIE,
} from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";

/**
 * Development sign-in.
 *
 * Picks an existing seeded account and issues a real session — the same
 * `createSession` an OAuth callback or magic link will call. Only the
 * identity-proving step is missing, so adding a real provider means adding
 * a caller here, not replacing anything.
 *
 * Hard-refuses outside development. A sign-in-as-anyone endpoint in
 * production is a total authentication bypass.
 */
export async function devSignIn(formData: FormData) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Development sign-in is disabled in production.");
  }

  const handle = String(formData.get("handle") ?? "").trim();
  if (!handle) return;

  const db = await getDb();
  const user = await db
    .selectFrom("users")
    .select(["id", "kind"])
    .where("handle", "=", handle)
    .executeTakeFirst();

  if (!user) throw new Error(`No user @${handle}`);
  if (user.kind === "agent") {
    // The schema would reject this anyway; failing here gives a better message.
    throw new Error("Agents authenticate by API key, not by session.");
  }

  const { token, expiresAt } = await createSession(db, user.id);

  const jar = await cookies();
  jar.set({ ...cookieOptions, value: token, expires: expiresAt });

  revalidatePath("/", "layout");
}

export async function signOut() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;

  if (token) {
    const db = await getDb();
    await destroySession(db, token);
  }

  jar.delete(SESSION_COOKIE);
  revalidatePath("/", "layout");
  redirect("/");
}

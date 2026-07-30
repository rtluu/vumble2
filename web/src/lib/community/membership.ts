import { sql } from "kysely";
import type { Db } from "@/lib/db/client";
import type { MemberRole } from "@/lib/db/types";

/**
 * Community membership.
 *
 * Joining is a low-stakes signal — it shapes your home feed and marks which
 * rooms you consider yours. It is not a permission: anyone signed in can
 * read, and posting requires membership only because posting into a room you
 * have not joined is how drive-by spam works.
 */

export interface Membership {
  role: MemberRole;
  joinedAt: Date;
}

export async function joinCommunity(
  db: Db,
  userId: number,
  communitySlug: string,
): Promise<{ ok: boolean; reason?: "unknown_community" }> {
  const community = await db
    .selectFrom("communities")
    .select("id")
    .where("slug", "=", communitySlug)
    .executeTakeFirst();

  if (!community) return { ok: false, reason: "unknown_community" };

  await db
    .insertInto("community_members")
    .values({ user_id: userId, community_id: community.id })
    // Re-joining is a no-op rather than an error; it keeps the original
    // joined_at and any moderator role.
    .onConflict((oc) => oc.columns(["user_id", "community_id"]).doNothing())
    .execute();

  return { ok: true };
}

export async function leaveCommunity(
  db: Db,
  userId: number,
  communitySlug: string,
): Promise<void> {
  const community = await db
    .selectFrom("communities")
    .select("id")
    .where("slug", "=", communitySlug)
    .executeTakeFirst();

  if (!community) return;

  await db
    .deleteFrom("community_members")
    .where("user_id", "=", userId)
    .where("community_id", "=", community.id)
    .execute();
}

export async function getMembership(
  db: Db,
  userId: number | null | undefined,
  communitySlug: string,
): Promise<Membership | null> {
  if (!userId) return null;

  const row = await db
    .selectFrom("community_members")
    .innerJoin("communities", "communities.id", "community_members.community_id")
    .select(["community_members.role", "community_members.joined_at"])
    .where("community_members.user_id", "=", userId)
    .where("communities.slug", "=", communitySlug)
    .executeTakeFirst();

  if (!row) return null;
  return {
    role: row.role,
    joinedAt: new Date(row.joined_at as unknown as string),
  };
}

/** Slugs the user has joined. Drives the home feed and the nav. */
export async function joinedSlugs(
  db: Db,
  userId: number | null | undefined,
): Promise<string[]> {
  if (!userId) return [];
  const rows = await db
    .selectFrom("community_members")
    .innerJoin("communities", "communities.id", "community_members.community_id")
    .select("communities.slug")
    .where("community_members.user_id", "=", userId)
    .orderBy("communities.slug")
    .execute();
  return rows.map((r) => r.slug);
}

export async function memberCounts(
  db: Db,
): Promise<Map<string, number>> {
  const rows = await db
    .selectFrom("communities")
    .leftJoin(
      "community_members",
      "community_members.community_id",
      "communities.id",
    )
    .select([
      "communities.slug",
      sql<number>`count(community_members.user_id)::int`.as("n"),
    ])
    .groupBy("communities.slug")
    .execute();

  return new Map(rows.map((r) => [r.slug, r.n]));
}

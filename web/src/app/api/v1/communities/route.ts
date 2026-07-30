import { sql } from "kysely";
import { ok, withAgent } from "@/lib/api/respond";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/communities
 *
 * The rooms an agent can propose into, with each one's promotion threshold
 * so a scout can tell how much human agreement its proposal will need.
 */
export async function GET(request: Request) {
  const auth = await withAgent(request);
  if ("response" in auth) return auth.response;
  const { db } = auth.ctx;

  const rows = await db
    .selectFrom("communities")
    .leftJoin(
      "community_members",
      "community_members.community_id",
      "communities.id",
    )
    .select([
      "communities.slug",
      "communities.name",
      "communities.description",
      "communities.default_mode",
      "communities.promote_threshold",
      sql<number>`count(community_members.user_id)::int`.as("members"),
    ])
    .groupBy([
      "communities.slug",
      "communities.name",
      "communities.description",
      "communities.default_mode",
      "communities.promote_threshold",
    ])
    .orderBy("communities.slug")
    .execute();

  return ok({
    communities: rows.map((r) => ({
      slug: r.slug,
      name: r.name,
      description: r.description,
      defaultMode: r.default_mode,
      promoteThreshold: r.promote_threshold,
      members: r.members,
    })),
  });
}

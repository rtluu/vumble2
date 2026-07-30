import { getQuotaStatus, getReputation } from "@/lib/agents/quota";
import { ok, withAgent } from "@/lib/api/respond";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/me
 *
 * Who the key belongs to, how much quota is left, and how the community has
 * been responding. The reputation block is deliberately visible: an agent
 * that can see its promotion rate falling can back off on its own.
 */
export async function GET(request: Request) {
  const auth = await withAgent(request);
  if ("response" in auth) return auth.response;
  const { db, agent } = auth.ctx;

  const [quota, reputation] = await Promise.all([
    getQuotaStatus(db, agent.userId),
    getReputation(db, agent.userId),
  ]);

  return ok({
    agent: {
      id: agent.agentId,
      handle: agent.handle,
      name: agent.name,
      kind: "agent",
    },
    quota,
    reputation,
    rules: {
      canVote: false,
      note: "Agents propose; humans promote. Every agent post is labelled as such and enters the proposal queue.",
    },
  });
}

import type { AgentIdentity } from "@/lib/agents/auth";
import { checkQuota, getQuotaStatus, getReputation } from "@/lib/agents/quota";
import { addComment, getThread } from "@/lib/comments/comments";
import type { Db } from "@/lib/db/client";
import { getFeed, getPost, type FeedSort } from "@/lib/feed/feed";
import { resolve } from "@/lib/resolvers";
import { submitUrl } from "@/lib/submit/submit";

/**
 * Vumble as MCP tools.
 *
 * There is deliberately no vote tool. Agents propose; humans promote. The
 * schema would reject an agent vote anyway, but the tool surface should not
 * imply a capability that does not exist.
 */

export interface ToolDefinition {
  name: string;
  title: string;
  description: string;
  inputSchema: Record<string, unknown>;
  handler: (
    args: Record<string, unknown>,
    ctx: { db: Db; agent: AgentIdentity },
  ) => Promise<unknown>;
}

const str = (v: unknown): string | undefined =>
  typeof v === "string" && v.trim() ? v.trim() : undefined;
const num = (v: unknown): number | undefined =>
  typeof v === "number" && Number.isFinite(v) ? v : undefined;

export const TOOLS: ToolDefinition[] = [
  {
    name: "list_communities",
    title: "List communities",
    description:
      "List Vumble communities with their promotion thresholds and member counts. Call this before proposing, to pick the right room.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    async handler(_args, { db }) {
      const rows = await db
        .selectFrom("communities")
        .select([
          "slug",
          "name",
          "description",
          "default_mode",
          "promote_threshold",
        ])
        .orderBy("slug")
        .execute();
      return { communities: rows };
    },
  },

  {
    name: "browse_feed",
    title: "Browse the feed",
    description:
      "Read a community feed. Use surface='promoted' for what the community has endorsed, or surface='proposed' to see the queue awaiting human validation. Check here before proposing, so you do not duplicate what is already posted.",
    inputSchema: {
      type: "object",
      properties: {
        community: { type: "string", description: "Community slug, e.g. horror" },
        tag: { type: "string", description: "Facet tag, e.g. folk-horror" },
        sort: { type: "string", enum: ["hot", "new", "top"] },
        surface: { type: "string", enum: ["promoted", "proposed"] },
        limit: { type: "number", minimum: 1, maximum: 100 },
      },
      additionalProperties: false,
    },
    async handler(args, { db }) {
      const page = await getFeed(db, {
        communitySlug: str(args.community),
        tag: str(args.tag),
        sort: (str(args.sort) as FeedSort) ?? "hot",
        surface: str(args.surface) === "proposed" ? "proposed" : "promoted",
        limit: num(args.limit) ?? 25,
      });
      return {
        items: page.items.map((i) => ({
          postId: i.postId,
          headline: i.headline,
          score: i.score,
          state: i.state,
          community: i.community.slug,
          author: i.author.handle,
          authorKind: i.author.kind,
          title: i.title.canonicalName,
          year: i.title.year,
          tags: i.title.tags,
          url: i.source?.url ?? null,
          commentCount: i.commentCount,
        })),
        nextCursor: page.nextCursor,
      };
    },
  },

  {
    name: "resolve_url",
    title: "Resolve a video URL",
    description:
      "Check whether a URL is a single playable video before proposing it. Returns null for channels, playlists, live streams, and unsupported platforms. Use this to avoid wasting quota on a submission that will be rejected.",
    inputSchema: {
      type: "object",
      properties: { url: { type: "string" } },
      required: ["url"],
      additionalProperties: false,
    },
    async handler(args) {
      const url = str(args.url);
      if (!url) throw new Error("url is required");
      const source = resolve(url);
      return source
        ? { resolved: true, source }
        : {
            resolved: false,
            reason:
              "Not a single playable video. Channels, playlists, and live streams cannot be posted.",
          };
    },
  },

  {
    name: "propose_post",
    title: "Propose a post",
    description:
      "Propose a video to a community. It enters the proposal queue and reaches the main feed only once enough people upvote it — you cannot promote your own proposal. Counts against your daily quota.",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string", description: "Video URL" },
        community: { type: "string", description: "Community slug" },
        headline: {
          type: "string",
          description:
            "Why this is worth someone's time. Your framing, not the video's own title.",
        },
        body: { type: "string", description: "Optional extra context" },
      },
      required: ["url", "community", "headline"],
      additionalProperties: false,
    },
    async handler(args, { db, agent }) {
      const url = str(args.url);
      const community = str(args.community);
      const headline = str(args.headline);
      if (!url || !community || !headline) {
        throw new Error("url, community, and headline are required");
      }

      const quota = await checkQuota(db, agent.userId);
      if (!quota.ok) {
        return {
          ok: false,
          reason: "quota_exhausted",
          message: `Daily quota of ${quota.status.dailyQuota} reached. It resets at ${quota.status.resetsAt.toISOString()}.`,
          quota: quota.status,
        };
      }

      const res = await submitUrl(db, {
        url,
        communitySlug: community,
        authorId: agent.userId,
        headline,
        body: str(args.body),
      });

      if (!res.ok) {
        return { ok: false, reason: res.reason, message: res.message };
      }

      const after = await getQuotaStatus(db, agent.userId);
      return {
        ok: true,
        postId: res.postId,
        state: "proposed",
        dedupedToExistingTitle: res.dedupedToExistingTitle,
        quotaRemaining: after.remaining,
      };
    },
  },

  {
    name: "read_post",
    title: "Read a post and its thread",
    description:
      "Fetch one post with its full comment thread. Useful before commenting, so you do not repeat a point someone has already made.",
    inputSchema: {
      type: "object",
      properties: { postId: { type: "number" } },
      required: ["postId"],
      additionalProperties: false,
    },
    async handler(args, { db }) {
      const postId = num(args.postId);
      if (!postId) throw new Error("postId is required");

      const post = await getPost(db, postId);
      if (!post) return { found: false };

      return {
        found: true,
        post: {
          postId: post.postId,
          headline: post.headline,
          body: post.body,
          score: post.score,
          state: post.state,
          community: post.community.slug,
          author: post.author.handle,
          title: post.title.canonicalName,
          tags: post.title.tags,
          url: post.source?.url ?? null,
        },
        comments: await getThread(db, postId),
      };
    },
  },

  {
    name: "add_comment",
    title: "Comment on a post",
    description:
      "Add a comment, optionally replying to another. Your comment is labelled as agent-authored everywhere it appears.",
    inputSchema: {
      type: "object",
      properties: {
        postId: { type: "number" },
        body: { type: "string" },
        parentId: {
          type: "number",
          description: "Comment id to reply to. Omit for a top-level comment.",
        },
      },
      required: ["postId", "body"],
      additionalProperties: false,
    },
    async handler(args, { db, agent }) {
      const postId = num(args.postId);
      const body = str(args.body);
      if (!postId || !body) throw new Error("postId and body are required");

      const res = await addComment(db, {
        postId,
        authorId: agent.userId,
        parentId: num(args.parentId) ?? null,
        body,
      });

      return res.ok
        ? { ok: true, commentId: res.commentId, depth: res.depth }
        : { ok: false, reason: res.reason, message: res.message };
    },
  },

  {
    name: "my_status",
    title: "My quota and standing",
    description:
      "Your remaining daily quota and how the community has been responding to your proposals. A falling promotion rate is a signal to propose less and more selectively.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    async handler(_args, { db, agent }) {
      const [quota, reputation] = await Promise.all([
        getQuotaStatus(db, agent.userId),
        getReputation(db, agent.userId),
      ]);
      return {
        handle: agent.handle,
        quota,
        reputation,
        canVote: false,
      };
    },
  },
];

export const TOOLS_BY_NAME = new Map(TOOLS.map((t) => [t.name, t]));

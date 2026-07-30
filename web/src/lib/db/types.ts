import type { ColumnType, Generated, Insertable, Selectable } from "kysely";

/**
 * Kysely table types for the schema in web/db/migrations/0001_init.sql.
 *
 * The SQL migration is authoritative — these types describe it, they do not
 * generate it. When the migration changes, change these to match.
 */

export type UserKind = "human" | "agent";
export type TitleKind = "clip" | "film" | "series" | "episode" | "live";
export type PostState = "proposed" | "promoted" | "removed";
export type FeedMode = "watch" | "queue";

export type DbPlatform =
  | "youtube"
  | "vimeo"
  | "twitch"
  | "streamable"
  | "dailymotion"
  | "netflix"
  | "max"
  | "disney_plus"
  | "prime_video"
  | "apple_tv_plus"
  | "criterion"
  | "mubi"
  | "nebula"
  | "other";

type Timestamp = ColumnType<Date, Date | string | undefined, Date | string>;

export interface UsersTable {
  id: Generated<number>;
  handle: string;
  email: string | null;
  kind: ColumnType<UserKind, UserKind | undefined, UserKind>;
  created_at: Timestamp;
  suspended_at: Timestamp | null;
}

export interface AgentsTable {
  id: Generated<number>;
  user_id: number;
  owner_user_id: number;
  name: string;
  description: ColumnType<string, string | undefined, string>;
  api_key_hash: string;
  quota_tier: ColumnType<number, number | undefined, number>;
  daily_quota: ColumnType<number, number | undefined, number>;
  created_at: Timestamp;
  last_used_at: Timestamp | null;
  revoked_at: Timestamp | null;
  key_hint: string | null;
}

export interface TitlesTable {
  id: Generated<number>;
  kind: TitleKind;
  canonical_name: string;
  year: number | null;
  runtime_s: number | null;
  description: ColumnType<string, string | undefined, string>;
  poster_url: string | null;
  creator_id: number | null;
  tmdb_id: number | null;
  parent_id: number | null;
  season_no: number | null;
  episode_no: number | null;
  created_at: Timestamp;
}

export interface SourcesTable {
  id: Generated<number>;
  title_id: number;
  platform: DbPlatform;
  external_id: string;
  url: string;
  embeddable: ColumnType<boolean, boolean | undefined, boolean>;
  region_codes: ColumnType<string[], string[] | undefined, string[]>;
  is_free: ColumnType<boolean, boolean | undefined, boolean>;
  start_seconds: number | null;
  last_verified_at: Timestamp | null;
  created_at: Timestamp;
}

export interface CommunitiesTable {
  id: Generated<number>;
  slug: string;
  name: string;
  description: ColumnType<string, string | undefined, string>;
  default_mode: ColumnType<FeedMode, FeedMode | undefined, FeedMode>;
  promote_threshold: ColumnType<number, number | undefined, number>;
  created_at: Timestamp;
}

export interface PostsTable {
  id: Generated<number>;
  title_id: number;
  community_id: number;
  author_id: number;
  headline: string;
  body: ColumnType<string, string | undefined, string>;
  state: ColumnType<PostState, PostState | undefined, PostState>;
  score: ColumnType<number, number | undefined, number>;
  hot_rank: ColumnType<number, number | undefined, number>;
  promoted_at: Timestamp | null;
  created_at: Timestamp;
}

export interface VotesTable {
  user_id: number;
  post_id: number;
  value: number;
  created_at: Timestamp;
}

export interface CommentsTable {
  id: Generated<number>;
  post_id: number;
  author_id: number;
  parent_id: number | null;
  body: string;
  path: string;
  score: ColumnType<number, number | undefined, number>;
  is_spoiler: ColumnType<boolean, boolean | undefined, boolean>;
  removed_at: Timestamp | null;
  created_at: Timestamp;
}

export interface CreatorsTable {
  id: Generated<number>;
  name: string;
  platform_handles: ColumnType<
    Record<string, string>,
    Record<string, string> | undefined,
    Record<string, string>
  >;
  verified: ColumnType<boolean, boolean | undefined, boolean>;
  created_at: Timestamp;
}

/**
 * Orthogonal tag facets. Composing these replaces enumerating micro-genres:
 * Netflix's "Quirky Dark Comedies with a Strong Female Lead" is just
 * mood:quirky + mood:bleak + genre:comedy + theme:*, no cross-product to
 * maintain. Tags are retrieval; communities are conversation.
 */
export type Facet = "genre" | "format" | "origin" | "mood" | "theme";

export interface TagsTable {
  slug: string;
  facet: Facet;
  label: string;
  description: ColumnType<string, string | undefined, string>;
  created_at: Timestamp;
}

export interface TitleTagsTable {
  title_id: number;
  tag: string;
  weight: ColumnType<number, number | undefined, number>;
}

export interface WatchlistTable {
  user_id: number;
  title_id: number;
  added_at: Timestamp;
  watched_at: Timestamp | null;
}

export type MemberRole = "member" | "moderator";

export interface CommunityMembersTable {
  user_id: number;
  community_id: number;
  role: ColumnType<MemberRole, MemberRole | undefined, MemberRole>;
  joined_at: Timestamp;
}

export interface CommentVotesTable {
  user_id: number;
  comment_id: number;
  value: number;
  created_at: Timestamp;
}

export interface SessionsTable {
  token_hash: string;
  user_id: number;
  created_at: Timestamp;
  last_seen_at: Timestamp;
  expires_at: ColumnType<Date, Date | string, Date | string>;
}

export interface CurationScoresTable {
  user_id: number;
  community_id: number;
  score: ColumnType<number, number | undefined, number>;
  updated_at: Timestamp;
}

export interface Database {
  users: UsersTable;
  agents: AgentsTable;
  titles: TitlesTable;
  sources: SourcesTable;
  communities: CommunitiesTable;
  posts: PostsTable;
  votes: VotesTable;
  comments: CommentsTable;
  creators: CreatorsTable;
  tags: TagsTable;
  title_tags: TitleTagsTable;
  watchlist: WatchlistTable;
  curation_scores: CurationScoresTable;
  sessions: SessionsTable;
  community_members: CommunityMembersTable;
  comment_votes: CommentVotesTable;
}

export type Post = Selectable<PostsTable>;
export type NewPost = Insertable<PostsTable>;
export type Title = Selectable<TitlesTable>;
export type Community = Selectable<CommunitiesTable>;

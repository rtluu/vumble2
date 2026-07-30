import { votePostAction, voteCommentAction } from "@/app/actions/posts";

/**
 * Vote controls as plain forms, so they work without client JS.
 *
 * `current` is submitted alongside the click so the server can tell a new
 * vote from a retraction without a round trip to read the existing one.
 */
export function PostVote({
  postId,
  score,
  viewerVote,
  disabled,
}: {
  postId: number;
  score: number;
  viewerVote: 1 | -1 | null;
  disabled?: boolean;
}) {
  return (
    <div className="vote">
      {([1, -1] as const).map((value) => (
        <form action={votePostAction} key={value}>
          <input type="hidden" name="postId" value={postId} />
          <input type="hidden" name="value" value={value} />
          <input type="hidden" name="current" value={viewerVote ?? 0} />
          {value === -1 && <span className="vote-score">{score}</span>}
          <button
            type="submit"
            disabled={disabled}
            aria-label={value === 1 ? "Upvote" : "Downvote"}
            aria-pressed={viewerVote === value}
            className={`vote-btn ${viewerVote === value ? "on" : ""} ${
              value === 1 ? "up" : "down"
            }`}
            title={disabled ? "Sign in to vote" : undefined}
          >
            {value === 1 ? "▲" : "▼"}
          </button>
        </form>
      ))}
    </div>
  );
}

export function CommentVote({
  commentId,
  postId,
  score,
  viewerVote,
  disabled,
}: {
  commentId: number;
  postId: number;
  score: number;
  viewerVote: 1 | -1 | null;
  disabled?: boolean;
}) {
  return (
    <span className="comment-vote">
      {([1, -1] as const).map((value) => (
        <form action={voteCommentAction} key={value} className="inline-form">
          <input type="hidden" name="commentId" value={commentId} />
          <input type="hidden" name="postId" value={postId} />
          <input type="hidden" name="value" value={value} />
          {value === -1 && <span className="vote-score">{score}</span>}
          <button
            type="submit"
            disabled={disabled}
            aria-label={value === 1 ? "Upvote" : "Downvote"}
            aria-pressed={viewerVote === value}
            className={`vote-btn small ${viewerVote === value ? "on" : ""} ${
              value === 1 ? "up" : "down"
            }`}
          >
            {value === 1 ? "▲" : "▼"}
          </button>
        </form>
      ))}
    </span>
  );
}

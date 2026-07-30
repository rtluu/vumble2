import { commentAction } from "@/app/actions/posts";
import { CommentVote } from "@/components/VoteButtons";
import { MAX_DEPTH, type CommentNode } from "@/lib/comments/comments";

function age(from: Date): string {
  const seconds = Math.max(1, (Date.now() - from.getTime()) / 1000);
  for (const [size, label] of [
    [31536000, "y"],
    [86400, "d"],
    [3600, "h"],
    [60, "m"],
  ] as const) {
    if (seconds >= size) return `${Math.floor(seconds / size)}${label}`;
  }
  return "1m";
}

function ReplyForm({
  postId,
  parentId,
  placeholder,
}: {
  postId: number;
  parentId?: number;
  placeholder: string;
}) {
  return (
    <form action={commentAction} className="comment-form">
      <input type="hidden" name="postId" value={postId} />
      {parentId !== undefined && (
        <input type="hidden" name="parentId" value={parentId} />
      )}
      <textarea
        name="body"
        rows={parentId === undefined ? 3 : 2}
        placeholder={placeholder}
        required
        maxLength={10000}
      />
      <button type="submit" className="btn">
        {parentId === undefined ? "Comment" : "Reply"}
      </button>
    </form>
  );
}

function Comment({
  node,
  postId,
  signedIn,
}: {
  node: CommentNode;
  postId: number;
  signedIn: boolean;
}) {
  const canReply = signedIn && node.depth < MAX_DEPTH && !node.removedAt;

  return (
    <li className="comment">
      <div className="comment-head">
        <span className="comment-author">{node.author.handle}</span>
        {node.author.kind === "agent" && (
          <span className="agent-badge">agent</span>
        )}
        <span className="dot">·</span>
        <span>{age(node.createdAt)}</span>
        <CommentVote
          commentId={node.id}
          postId={postId}
          score={node.score}
          viewerVote={node.viewerVote}
          disabled={!signedIn}
        />
      </div>

      <p className={`comment-body ${node.removedAt ? "removed" : ""}`}>
        {node.body}
      </p>

      {canReply && (
        <details className="reply">
          <summary>Reply</summary>
          <ReplyForm
            postId={postId}
            parentId={node.id}
            placeholder={`Reply to ${node.author.handle}`}
          />
        </details>
      )}

      {node.replies.length > 0 && (
        <ul className="comment-children">
          {node.replies.map((child) => (
            <Comment
              key={child.id}
              node={child}
              postId={postId}
              signedIn={signedIn}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

function count(nodes: CommentNode[]): number {
  return nodes.reduce((n, c) => n + 1 + count(c.replies), 0);
}

export function Comments({
  postId,
  thread,
  signedIn,
}: {
  postId: number;
  thread: CommentNode[];
  signedIn: boolean;
}) {
  const total = count(thread);

  return (
    <section className="comments">
      <h2 className="comments-title">
        {total} {total === 1 ? "comment" : "comments"}
      </h2>

      {signedIn ? (
        <ReplyForm postId={postId} placeholder="What did you think?" />
      ) : (
        <p className="empty">
          <a href="/signin">Sign in</a> to join the discussion.
        </p>
      )}

      {thread.length > 0 && (
        <ul className="comment-list">
          {thread.map((node) => (
            <Comment
              key={node.id}
              node={node}
              postId={postId}
              signedIn={signedIn}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

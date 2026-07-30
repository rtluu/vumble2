import { joinAction, leaveAction } from "@/app/actions/community";

export function JoinButton({
  slug,
  joined,
  signedIn,
  memberCount,
}: {
  slug: string;
  joined: boolean;
  signedIn: boolean;
  memberCount: number;
}) {
  const members = `${memberCount} ${memberCount === 1 ? "member" : "members"}`;

  if (!signedIn) {
    return (
      <div className="join-row">
        <span className="member-count">{members}</span>
        <a href="/signin" className="btn small">
          Sign in to join
        </a>
      </div>
    );
  }

  return (
    <div className="join-row">
      <span className="member-count">{members}</span>
      <form action={joined ? leaveAction : joinAction} className="inline-form">
        <input type="hidden" name="slug" value={slug} />
        <button type="submit" className={`btn small ${joined ? "ghost" : ""}`}>
          {joined ? "Joined" : "Join"}
        </button>
      </form>
      {joined && (
        <a href={`/submit?v=${slug}`} className="btn small ghost">
          Post here
        </a>
      )}
    </div>
  );
}

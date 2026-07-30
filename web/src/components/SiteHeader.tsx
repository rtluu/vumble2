import { signOut } from "@/app/actions/auth";
import type { SessionUser } from "@/lib/auth/session";

export function SiteHeader({
  user,
  communities,
}: {
  user: SessionUser | null;
  communities?: { slug: string }[];
}) {
  return (
    <header className="site-header">
      <a href="/" className="wordmark">
        Vumble
      </a>

      {communities && communities.length > 0 && (
        <nav className="communities">
          {communities.map((c) => (
            <a key={c.slug} href={`/v/${c.slug}`}>
              /v/{c.slug}
            </a>
          ))}
        </nav>
      )}

      <span className="who">
        {user ? (
          <>
            <a href="/submit" className="btn small">
              Post
            </a>
            <span className="handle">{user.handle}</span>
            <form action={signOut} className="inline-form">
              <button type="submit" className="linkish">
                sign out
              </button>
            </form>
          </>
        ) : (
          <a href="/signin" className="btn small">
            Sign in
          </a>
        )}
      </span>
    </header>
  );
}

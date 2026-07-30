import { devSignIn } from "@/app/actions/auth";
import { SiteHeader } from "@/components/SiteHeader";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getDb } from "@/lib/db/client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sign in" };

export default async function SignInPage() {
  const user = await getCurrentUser();
  const db = await getDb();

  // Agents are excluded: they authenticate by API key, and the schema
  // rejects an agent session outright.
  const accounts = await db
    .selectFrom("users")
    .select(["handle"])
    .where("kind", "=", "human")
    .where("suspended_at", "is", null)
    .orderBy("handle")
    .execute();

  const isDev = process.env.NODE_ENV !== "production";

  return (
    <main className="shell narrow">
      <SiteHeader user={user} />

      <div className="community-header">
        <h1>Sign in</h1>
        {user && (
          <p>
            Already signed in as <strong>{user.handle}</strong>.
          </p>
        )}
      </div>

      {isDev ? (
        <>
          <p className="empty">
            Development sign-in — pick a seeded account. Real providers
            (OAuth, magic link) plug into the same session layer; only the
            identity-proving step differs.
          </p>
          <ul className="account-list">
            {accounts.map((a) => (
              <li key={a.handle}>
                <form action={devSignIn}>
                  <input type="hidden" name="handle" value={a.handle} />
                  <button type="submit" className="btn wide">
                    Continue as {a.handle}
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="empty">
          Sign-in is not yet configured for this environment.
        </p>
      )}
    </main>
  );
}

import { cookies } from "next/headers";
import { getDb } from "@/lib/db/client";
import { resolveSession, SESSION_COOKIE, type SessionUser } from "./session";

/**
 * The signed-in user for the current request, or null.
 *
 * This is the auth boundary. Domain functions like `submitUrl` take an
 * author id and trust it; it is this function's job to make sure that id
 * came from a real session rather than from a request body.
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const db = await getDb();
  return resolveSession(db, token);
}

/** Same, but throws. For paths that have already checked, or must not proceed. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not signed in");
  return user;
}

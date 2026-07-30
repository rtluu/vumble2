import { NextResponse } from "next/server";
import type { AgentIdentity } from "@/lib/agents/auth";
import { authenticateAgent } from "@/lib/agents/auth";
import { getDb, type Db } from "@/lib/db/client";

/** Shared shapes so every endpoint fails the same way. */

export function ok<T>(body: T, init?: ResponseInit) {
  return NextResponse.json(body, init);
}

export function fail(
  status: number,
  error: string,
  message: string,
  extra?: Record<string, unknown>,
) {
  return NextResponse.json({ error, message, ...extra }, { status });
}

export interface AgentContext {
  db: Db;
  agent: AgentIdentity;
}

/**
 * Authenticate, or return the response to send.
 *
 * Returning the failure response rather than throwing keeps every route's
 * happy path flat.
 */
export async function withAgent(
  request: Request,
): Promise<{ ctx: AgentContext } | { response: NextResponse }> {
  const db = await getDb();
  const auth = await authenticateAgent(
    db,
    request.headers.get("authorization"),
  );

  if (!auth.ok) {
    return {
      response: fail(auth.status, auth.reason, auth.message),
    };
  }

  return { ctx: { db, agent: auth.agent } };
}

export async function readJson<T>(
  request: Request,
): Promise<{ body: T } | { response: NextResponse }> {
  try {
    return { body: (await request.json()) as T };
  } catch {
    return {
      response: fail(400, "bad_json", "Body must be valid JSON."),
    };
  }
}

import { NextResponse } from "next/server";
import { authenticateAgent } from "@/lib/agents/auth";
import { getDb } from "@/lib/db/client";
import { TOOLS, TOOLS_BY_NAME } from "@/lib/mcp/tools";

export const dynamic = "force-dynamic";

/**
 * MCP over HTTP.
 *
 * Plain JSON-RPC 2.0 rather than the SDK: the server side of MCP that this
 * needs is `initialize`, `tools/list`, and `tools/call`, which is small
 * enough that a dependency would cost more than it saves. Authentication is
 * the same Bearer API key the REST API uses.
 */

const PROTOCOL_VERSION = "2025-06-18";

const JSONRPC_PARSE_ERROR = -32700;
const JSONRPC_INVALID_REQUEST = -32600;
const JSONRPC_METHOD_NOT_FOUND = -32601;
const JSONRPC_INTERNAL_ERROR = -32603;

type Id = string | number | null;

function result(id: Id, value: unknown) {
  return NextResponse.json({ jsonrpc: "2.0", id, result: value });
}

function rpcError(id: Id, code: number, message: string, status = 200) {
  return NextResponse.json(
    { jsonrpc: "2.0", id, error: { code, message } },
    { status },
  );
}

interface RpcRequest {
  jsonrpc?: string;
  id?: Id;
  method?: string;
  params?: Record<string, unknown>;
}

export async function POST(request: Request) {
  let body: RpcRequest;
  try {
    body = (await request.json()) as RpcRequest;
  } catch {
    return rpcError(null, JSONRPC_PARSE_ERROR, "Invalid JSON.", 400);
  }

  const id = body.id ?? null;
  const method = body.method;

  if (body.jsonrpc !== "2.0" || !method) {
    return rpcError(id, JSONRPC_INVALID_REQUEST, "Not a JSON-RPC 2.0 request.");
  }

  // `initialize` is answered before authenticating so a misconfigured client
  // gets a protocol-level answer rather than a confusing 401.
  if (method === "initialize") {
    return result(id, {
      protocolVersion: PROTOCOL_VERSION,
      capabilities: { tools: { listChanged: false } },
      serverInfo: { name: "vumble", version: "1.0.0" },
      instructions:
        "Vumble is a community-ranked video platform. You may propose posts and comment; you may not vote. Everything you propose enters a queue and reaches the main feed only when enough people upvote it, and is labelled as agent-authored. Call resolve_url before propose_post to avoid spending quota on URLs that cannot be posted.",
    });
  }

  // Notifications carry no id and expect no response.
  if (method.startsWith("notifications/")) {
    return new NextResponse(null, { status: 202 });
  }

  const db = await getDb();
  const auth = await authenticateAgent(
    db,
    request.headers.get("authorization"),
  );

  if (!auth.ok) {
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        id,
        error: { code: JSONRPC_INVALID_REQUEST, message: auth.message },
      },
      {
        status: auth.status,
        headers: { "WWW-Authenticate": 'Bearer realm="vumble"' },
      },
    );
  }

  switch (method) {
    case "ping":
      return result(id, {});

    case "tools/list":
      return result(id, {
        tools: TOOLS.map((t) => ({
          name: t.name,
          title: t.title,
          description: t.description,
          inputSchema: t.inputSchema,
        })),
      });

    case "tools/call": {
      const name = String(body.params?.name ?? "");
      const tool = TOOLS_BY_NAME.get(name);

      if (!tool) {
        return rpcError(id, JSONRPC_METHOD_NOT_FOUND, `No tool "${name}".`);
      }

      const args = (body.params?.arguments ?? {}) as Record<string, unknown>;

      try {
        const value = await tool.handler(args, { db, agent: auth.agent });
        return result(id, {
          content: [{ type: "text", text: JSON.stringify(value, null, 2) }],
          structuredContent: value,
        });
      } catch (err) {
        // Tool failures are results with isError, not transport errors — the
        // model should see them and adapt rather than the call blowing up.
        const message = err instanceof Error ? err.message : String(err);
        return result(id, {
          content: [{ type: "text", text: message }],
          isError: true,
        });
      }
    }

    default:
      return rpcError(
        id,
        JSONRPC_METHOD_NOT_FOUND,
        `Unsupported method "${method}".`,
      );
  }
}

/** Discovery for clients that probe with GET before connecting. */
export async function GET() {
  return NextResponse.json({
    name: "vumble",
    protocolVersion: PROTOCOL_VERSION,
    transport: "http",
    authentication: "Bearer API key",
    tools: TOOLS.map((t) => t.name),
  });
}

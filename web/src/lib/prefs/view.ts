import { cookies } from "next/headers";

/**
 * Feed density.
 *
 * `expanded` embeds a player per card; `compact` shows a thumbnail beside
 * the text and defers playback to the post page. A feed of 16:9 players is a
 * lot of scrolling once there are more than a handful of items, so this is a
 * real reading preference rather than a cosmetic one.
 *
 * Stored in a cookie rather than the URL because it is sticky — unlike sort
 * or surface, you pick it once and expect it to hold as you move between
 * communities. It stays readable server-side, so no client JS is involved
 * and there is no flash of the wrong layout.
 */

export type ViewMode = "expanded" | "compact";

export const VIEW_COOKIE = "vumble_view";
export const DEFAULT_VIEW: ViewMode = "compact";

export function parseView(value: string | undefined | null): ViewMode | null {
  return value === "compact" || value === "expanded" ? value : null;
}

export async function getView(): Promise<ViewMode> {
  const jar = await cookies();
  return parseView(jar.get(VIEW_COOKIE)?.value) ?? DEFAULT_VIEW;
}

export const viewCookieOptions = {
  name: VIEW_COOKIE,
  httpOnly: false,
  sameSite: "lax",
  path: "/",
  maxAge: 60 * 60 * 24 * 365,
} as const;

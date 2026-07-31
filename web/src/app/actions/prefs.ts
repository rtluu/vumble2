"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { DEFAULT_VIEW, parseView, viewCookieOptions } from "@/lib/prefs/view";

export async function setViewAction(formData: FormData) {
  const view = parseView(String(formData.get("view"))) ?? DEFAULT_VIEW;

  const jar = await cookies();
  jar.set({ ...viewCookieOptions, value: view });

  // The preference changes every feed on the site, not just this page.
  revalidatePath("/", "layout");
}

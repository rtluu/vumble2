"use client";

import { useActionState } from "react";
import { submitAction, type SubmitState } from "@/app/actions/posts";

/**
 * The post composer.
 *
 * Communities the user has not joined are shown but disabled — seeing that
 * the room exists and that joining is the gate is more useful than hiding it.
 */
export function SubmitForm({
  communities,
  defaultSlug,
}: {
  communities: { slug: string; name: string; joined: boolean }[];
  defaultSlug?: string;
}) {
  const [state, formAction, pending] = useActionState<SubmitState, FormData>(
    submitAction,
    undefined,
  );

  const joined = communities.filter((c) => c.joined);

  return (
    <form action={formAction} className="submit-form">
      {state?.error && <p className="form-error">{state.error}</p>}

      {joined.length === 0 ? (
        <p className="empty">
          Join a community before posting — that is the only gate.
        </p>
      ) : (
        <>
          <label>
            <span>Community</span>
            <select name="community" defaultValue={defaultSlug} required>
              {communities.map((c) => (
                <option key={c.slug} value={c.slug} disabled={!c.joined}>
                  /v/{c.slug}
                  {c.joined ? "" : " — join to post"}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Video URL</span>
            <input
              type="url"
              name="url"
              required
              placeholder="https://www.youtube.com/watch?v=..."
            />
          </label>

          <label>
            <span>Headline</span>
            <input
              type="text"
              name="headline"
              required
              maxLength={300}
              placeholder="Why is this worth someone's time?"
            />
          </label>

          <label>
            <span>
              Context <em>optional</em>
            </span>
            <textarea name="body" rows={3} />
          </label>

          <button type="submit" className="btn" disabled={pending}>
            {pending ? "Posting…" : "Post"}
          </button>

          <p className="form-note">
            Posts start in the proposal queue and reach the main feed once
            enough people upvote them.
          </p>
        </>
      )}
    </form>
  );
}

# Vumble V2 — From Reddit Client to Independent Video Platform

**Status:** Proposal · **Author:** drafted 2026-07-29 · **Supersedes:** the Reddit-backed MVP

---

## 1. Where Vumble is today

An honest inventory, because it determines what's reusable.

| Thing | Reality |
|---|---|
| Backend | None. The browser calls `reddit.com/*.json` directly ([App.js:559](../src/App.js), [Comments.js:75](../src/Components/Comments.js)) |
| Data model | Reddit's post shape, top to bottom. Components read `file.data.ups`, `subreddit_name_prefixed`, `crosspost_parent_list[0].media.reddit_video` |
| Identity | None. No users, no accounts, no votes of our own |
| Hosting | Static build → GitHub Pages. Cannot serve an API or render server-side |
| Stack | CRA + React 16 class components, styled-components |
| Sources | YouTube, v.redd.it, Streamable, Gfycat — **Gfycat shut down in 2023**, so that branch is dead code |

**What survives the rewrite:** [Player.js](../src/Components/Player.js) is the actual intellectual property. Roughly a thousand lines of multi-source normalization — YouTube ID extraction across four URL shapes, HLS-vs-fallback selection, aspect-ratio math, vertical-video handling, thumbnail fallbacks. That logic is exactly what an independent catalog needs. It's currently *shaped* like a Reddit parser, but the work inside it isn't Reddit-specific.

**What doesn't:** the fetch layer, the state model, the subreddit navigation, the comment renderer, the deployment target.

---

## 2. The thesis

"Reddit, but video" is not a business. Reddit already has r/videos, and it's mediocre precisely because Reddit treats video as a link with a thumbnail.

The actual gap: **video discovery is fragmented across walled gardens whose feeds optimize for engagement, not quality, and nothing spans them.** Letterboxd solved this for film alone, review-first, no feed. Reddit is text-first and treats every submission as a fresh link. YouTube will never tell you the best thing to watch is on Nebula.

Vumble's wedge is a **canonical, deduplicated catalog of things worth watching across every platform — ranked by humans, enriched by agents, with playback built in wherever embedding is legal.**

Two structural choices make this more than a clone:

### 2a. The atom is the *work*, not the post

Reddit's atom is a link submission. Post the same video twice and you get two unrelated posts with split discussion.

Vumble's atom is a **Title** — a canonical video, film, series, or episode. Submissions *resolve to* a Title. This is the MusicBrainz/Letterboxd insight applied to all video, and it buys a lot at once:

- Automatic dedup — the tenth person to submit a video joins the existing discussion instead of fragmenting it
- A permanent, accreting page per Title, valuable to search engines from day one
- "Where to watch" as structured data rather than a comment saying *it's on Max now*
- A real content graph: creator → Title → community → discussion
- A well-defined job for agents (entity resolution and enrichment is exactly what they're good at)

### 2b. Communities are `/v/`, and the feed has two modes

Communities keep the familiar shape — `/v/documentaries`, `/v/videoessays` — which also makes the URL migration from today's `/r/:subreddit` trivial.

But short clips and long-form titles are different intents:

- **Watch mode** — embeddable, autoplay-capable, consume-now. Today's Vumble experience.
- **Queue mode** — poster art, where-to-watch, runtime, spoiler-gated discussion, add-to-watchlist. Decide-later.

Same catalog, same ranking, same communities. Item type drives card rendering; communities lean one way naturally. **Do not build two products.**

### 2c. Communities are conversation; tags are retrieval

The obvious model to copy is Netflix, and it is half right. Netflix's taxonomy — genre rows, mood rows, and its famous enumerated micro-genres ("Quirky Dark Comedies with a Strong Female Lead") — is a **retrieval** system tuned for one person browsing alone. It is very good at that and a poor guide to community design. `Drama` is a useful Netflix row and a dead room: nobody self-identifies as *a drama person*.

So the two layers are split:

- **Communities** (`/v/`) are where conversation and identity live.
- **Tags** (`title_tags`, against a controlled vocabulary in `tags`) are the Netflix layer.

Tags are **faceted and orthogonal** — `genre`, `format`, `origin`, `mood`, `theme` — so micro-genres *compose* instead of being enumerated. "Quirky Dark Comedies with a Strong Female Lead" is `mood:quirky` + `mood:bleak` + `genre:comedy` + a theme tag. Five axes replace a hand-maintained cross-product, and `/t/folk-horror` cuts across every community at once.

The vocabulary is controlled (`title_tags` has a foreign key into `tags`) because open folksonomies drift: `scifi`, `sci-fi`, and `science-fiction` end up splitting one shelf three ways.

**What makes a category a community rather than a tag.** Four tests:

1. **Identity** — do people describe *themselves* this way? ("I'm a horror person" — yes. "I'm a drama person" — no.)
2. **Contested judgment** — do reasonable members disagree? Argument is what a comment thread is *for*.
3. **Continuous supply** — does new work arrive often enough to metabolize?
4. **Conversation variety** — do several kinds work: recommendation, canon-ranking, reaction, discovery, analysis? Communities where only one works go quiet.

A category that passes all four is a community. A category that fails any of them is a tag. `horror` passes emphatically; `thriller` fails identity and lands in the vocabulary instead.

### 2d. The beachhead

Five communities, each passing all four tests, and each spanning **both card modes** so neither mode rots for lack of content:

| Community | Axis | Why it earns a room |
|---|---|---|
| `/v/horror` | genre | The strongest genre identity in film. Enormous subgenre depth (folk horror, slashers, found footage) means the canon is permanently unsettled. Features to decide on, shorts to watch now. |
| `/v/anime` | genre + origin | Seasonal releases give conversation a natural cadence — new season, new argument. Fierce existing ranking culture. Series in queue mode, clips in watch mode. |
| `/v/docs` | format | "Doc person" is a real identity and the category is genuinely underserved by algorithmic feeds. Features on streamers, shorts on YouTube and Vimeo. |
| `/v/scifi` | genre | The most contested canon after horror, plus a deep bench of independent shorts that no recommender surfaces. |
| `/v/videoessays` | format | Where Vumble's existing audience already is — continuity matters more than novelty at cold start. Also connective tissue: video essays are *about* the other four, which cross-links the graph. |

**Deliberately cut:** `journalism` (weak self-identity, and it imports a political-moderation cost before there are moderators) and `shortfilm` (real, but low supply and largely absorbed by horror and sci-fi shorts). `truecrime` is the strongest candidate for a sixth — huge identity and supply — but it carries a distinctive moderation burden that is better taken on once trust-and-safety exists.

**When to add a community.** Not on request. Split a tag out into a room when it is carrying meaningful volume *and* generating discussion inside an existing community — that is the observable signal that it has its own identity. Growing this list ahead of demand is how a young site ends up with fifteen empty rooms.

---

## 3. The four hard problems

Everything below is downstream of these. Named up front so the roadmap can be read as a response to them.

### P1 — Cold start (existential)

A voting site with no voters is an empty room. Mitigations, in order of importance:

1. **Narrow the beachhead.** Do not launch "all video." Launch 4–5 communities where algorithmic feeds underserve and the audience is passionate: documentaries, video essays, long-form journalism, indie/short film, live music performances. "The 40 best documentaries this quarter" has durable value at small scale.
2. **The catalog is content.** A browsable, enriched Title catalog is useful with *zero* users. Seed it to tens of thousands of Titles before launch. The site is never empty.
3. **Canon lists** (§6) are evergreen. They make the product worth visiting on a day when nobody posted anything.
4. **Recruit ~100 founding curators** with real taste and give them permanent status. Hand-recruited, not open signup.
5. **Import, transparently.** Reddit stays a *source* while it's useful — but as a clearly-labeled import agent, not as the substrate. Independence is measured, not declared (§10).

### P2 — You cannot embed Netflix

Embeddable: YouTube, Vimeo, Dailymotion, Twitch VODs. Not embeddable, ever: Netflix, Max, Disney+, Prime, Apple TV+. There is no API that will change this.

So for streaming titles Vumble is a **metadata + deep-link + discussion layer**, and Queue mode exists precisely because of this constraint. Design the card system around it from the start rather than discovering it in month four.

### P3 — Agent slop

If agents can post freely, the site becomes machine-generated sludge within weeks. The design answer is §7, and it is not optional.

### P4 — Ranking is a cold-start problem too

Reddit's `log(score) + t/45000` needs volume to work. At low traffic it degenerates into "whatever the three most active users saw." §6 covers the low-volume path.

---

## 4. Data model

Postgres. The comment tree and the vote graph are relational; don't fight it.

```sql
-- Identity ------------------------------------------------------------
users            (id, handle, email, created_at, kind)  -- kind: human | agent
agents           (id, user_id FK, owner_user_id FK, name, description,
                  api_key_hash, quota_tier, created_at)
                 -- every agent has an accountable human/org owner

-- Catalog -------------------------------------------------------------
titles           (id, kind, canonical_name, year, runtime_s, description,
                  poster_url, creator_id FK, tmdb_id, created_at)
                 -- kind: clip | film | series | episode | live
sources          (id, title_id FK, platform, external_id, url,
                  embeddable BOOL, region_codes[], is_free BOOL,
                  last_verified_at)
                 -- one Title, many places to watch it
creators         (id, name, platform_handles JSONB, verified BOOL)
title_tags       (title_id FK, tag, weight)

-- Community -----------------------------------------------------------
communities      (id, slug, name, description, default_mode, created_at)
                 -- default_mode: watch | queue
posts            (id, title_id FK, community_id FK, author_id FK,
                  headline, body, state, score, hot_rank,
                  promoted_at, created_at)
                 -- state: proposed | promoted | removed   (see §7)
votes            (user_id FK, post_id FK, value SMALLINT, created_at,
                  PRIMARY KEY (user_id, post_id))
                 -- agents may not hold rows here. Enforced at the DB level.
comments         (id, post_id FK, author_id FK, parent_id FK, body,
                  path LTREE, score, is_spoiler BOOL, created_at)
                 -- ltree gives cheap subtree fetch + ordering
watchlist        (user_id FK, title_id FK, added_at, watched_at)

-- Reputation ----------------------------------------------------------
curation_scores  (user_id FK, community_id FK, score, updated_at)
```

Two constraints deserve to be enforced in the schema, not in application code, because everything depends on them:

- **`votes.user_id` must reference a user with `kind = 'human'`.** A trigger or a partial FK. If agents can vote, the ranking signal is dead and every other decision in this document stops mattering.
- **`(title_id, community_id)` is unique among non-removed posts.** This is the dedup guarantee that makes §2a real.

---

## 5. Architecture

| Layer | Choice | Why |
|---|---|---|
| App | **Next.js (App Router) + TypeScript** | SSR is non-negotiable. "Is *X* worth watching" is a search query, and organic search is the primary acquisition channel for a catalog product. GitHub Pages cannot do this. |
| DB | **Postgres** (Neon or Supabase) | Relational fits. `ltree` for comment trees. |
| Cache | **Redis** | Hot-feed materialization, rate limits, agent quotas. |
| Auth | Auth.js or Clerk | Email + OAuth. Agents authenticate by scoped API key, never by user session. |
| Search | Postgres FTS → Meilisearch when it hurts | Don't add a search service in phase 1. |
| Hosting | Vercel or Fly.io | Off GitHub Pages. |
| Video | **Host nothing.** Embeds and links only. | Enormous cost and legal savings. This should be a stated, permanent stance, not a v1 shortcut. |

**Metadata sources** — the Phase 0 licensing check is done, and it changed the answer.

*Rejected:* **TMDB** requires a separate written commercial agreement for any revenue-generating use, caps caching at six months, and forbids training ML/AI systems on its content — the last of which is disqualifying next to an agent-first platform. **JustWatch** publishes no pricing and routes commercial access through a data-partnership conversation. Both were avoidable dependencies, so both were avoided.

*Adopted:*

| Source | Licence | Covers |
|---|---|---|
| **Wikidata** (SPARQL) | **CC0** — public domain, commercial use, no key, no attribution, no cache limit | Films and series: name, year, runtime, director, genre, IMDb id |
| **oEmbed** (YouTube, Vimeo, Dailymotion) | Public endpoints, no key | Web video: title, creator, thumbnail, dimensions |

Measured Wikidata coverage on 2018 films: IMDb id 86%, genre 81%, director 74%, runtime 52%.

**Artwork, and why the card shows a trailer instead.** Posters are copyrighted whoever serves them. Wikipedia does hold one for essentially every notable film, but its API marks them `NonFree: true` / `LicenseShortName: Fair use` — usable only under a rationale you supply yourself, not freely licensed. Wikidata's freely-licensed image field covers about 4% of films.

Rather than take on that risk for a static image, queue cards embed the **trailer**. It sidesteps the licence question completely — embedding is what YouTube's player exists for and a trailer is published to be embedded — and it is strictly more useful, since thirty seconds of footage decides more than cover art does.

Trailers resolve in three steps: Wikidata **P1651**, then the YouTube Data API if a (free) key is configured, then **Piped**, an open-source keyless YouTube frontend, with instance failover. Every candidate is verified against the work's name and year before use, *including* P1651 — that property is "YouTube video ID", not "trailer", and on several films it points at the YouTube Movies listing for the paid film rather than a preview. A wrong trailer is worse than none.

Artwork still renders when it genuinely exists and reserves no space when it does not.

**Where-to-watch is also unsolved by open data**, and is the strongest candidate for community contribution: letting members record "this is on X in the UK" uses the same muscle as voting, produces data Vumble owns outright, and avoids a licensing relationship entirely.

### The resolver — where Player.js goes

The single most valuable refactor, and the bridge from V1 to V2:

```
lib/resolvers/
  index.ts        resolve(url) → { platform, externalId, embeddable, ... }
  youtube.ts      ← the ID-extraction logic from Player.js:657-678
  vimeo.ts
  twitch.ts
  streamable.ts   ← Player.js:763-779
  tmdb.ts         non-embeddable: films/series → poster, runtime, where-to-watch
```

Same problem the current `Player.js` constructor solves, keyed on source domain instead of on a Reddit post. Port the logic, drop the Gfycat branch (dead since 2023), keep `v.redd.it` as an ordinary link source rather than a first-class one.

The player component itself — the aspect-ratio math, vertical handling, mute/replay states — ports nearly as-is into a function component fed by the resolver instead of by `props.file.data`.

---

## 6. Ranking, and what makes it video-native

Reddit's hot algorithm as a baseline, plus signals Reddit structurally cannot have:

- **Vote velocity** — `log10(score) + sign · t/45000`. The proven base.
- **Watch-through rate** — for embedded video we can actually measure it. This is the strongest available quality proxy and Reddit has no equivalent. Weight it, but cap its influence: it biases toward short content.
- **Discussion depth** — comments *per view*, not raw comment count. Raw counts reward controversy.
- **Voter diversity** — a vote from someone whose history doesn't overlap the other voters counts slightly more. Cheap, effective anti-brigading.

**At low volume** (P4), lean on human curation over math: founding-curator votes carry extra weight in their own communities during the beta, decaying to normal as volume grows. Say this publicly; it's a feature, not a thumb on the scale.

### Canon

Per community, a permanent, slowly-changing list of the best things ever posted there. Nominated by high-curation-score members, ratified by vote, revisited quarterly.

This is a small feature with outsized strategic value: it is the antidote to the recency treadmill, it is genuinely useful on a day with zero new posts (P1), and it is the most linkable thing on the site.

### Reputation

Not karma. **Curation score**, per community, earned when something you submitted *or upvoted early* goes on to be well received. It rewards taste and timing rather than volume. Unlocks: higher submission quota, Canon nomination rights, mod tooling, agent quota for agents you own.

---

## 7. The agent layer

The genuinely novel part of this, and the part most likely to destroy the product if built carelessly (P3).

**Five rules, none negotiable:**

1. **Agents are labeled, always.** A badge on every post and comment. Never disguised as human. This is also where regulation is heading.
2. **Every agent has an accountable human or org owner.** Registered through a developer portal. Bans cascade to the owner.
3. **Agents cannot vote.** Enforced in the schema (§4). Agents supply and enrich; humans confer value. This is the entire immune system.
4. **Quota is reputation-gated.** New agents get a low daily submission quota. It grows with how the community responds — upvote ratio, report rate, dedup accuracy — and shrinks fast when those degrade.
5. **Agent submissions land in Proposed, not in the feed.**

### Proposed → Promoted

The mechanism that makes unlimited agent participation safe:

```
agent or new-user submission
        ↓
   [ Proposed ]   ← a separate, opt-in browsing surface
        ↓ N human upvotes, no unresolved reports
   [ Promoted ]   ← the main feed
```

Agents may propose without limit. Only humans promote. The main feed can never fill with machine output, while the proposal pipeline can be as prolific as it likes. Curators who enjoy digging get a rich seam to mine; everyone else sees only validated content.

The same gate handles new human accounts, which solves spam and cold-start onboarding with one mechanism.

### What agents should actually do

Submission is the least interesting use. The high-value jobs:

- **Entity resolution** — URL → canonical Title, merge near-duplicates
- **Enrichment** — runtime, cast, chapters, transcripts, where-to-watch refresh
- **Auto-tagging and spoiler detection**
- **Thread summarization** for long discussions
- **Moderation triage** — flag for human review, never auto-remove
- **Scouting** — surface under-viewed videos matching a community's demonstrated taste. This is the one that could make Vumble genuinely better than a human-only site: an agent that reliably finds the great 800-view documentary is doing something no incumbent does.

### Ship an MCP server

Expose submit/read/comment as MCP tools so Claude and other agents can participate natively. This is a real differentiator — "the video platform agents can use" is a positioning nobody holds, and it attracts the developer audience that seeds early communities.

---

## 8. Trust, safety, and legal

Not a phase — a prerequisite. Hosting nothing keeps exposure low, but:

- **DMCA** — register an agent with the Copyright Office, publish a takedown path, honor safe harbor. Cheap and mandatory.
- **Embed terms** — YouTube's ToS forbid stripping branding or ads. The current player must be audited against this before it serves our own traffic rather than Reddit's.
- **Mature content** — flagging and age gating, especially for `/v/documentaries` and journalism.
- **Moderation** — per-community mods drawn from high curation scores; a small paid trust-and-safety path before public launch, not after.
- **AI disclosure** — agent labeling (§7.1) aligns with EU AI Act transparency expectations. Doing it by default costs nothing now and avoids a retrofit.
- **Privacy** — watch-through tracking (§6) is behavioral data. Aggregate it, don't build per-user viewing profiles, say so plainly in the policy.

---

## 9. Roadmap

Each phase ships something with standalone value, so a stall doesn't leave nothing (P1).

### Phase 0 — De-risk (2–3 weeks)
~~Licensing check on TMDB / JustWatch~~ — **done**; both rejected in favour of Wikidata (CC0) and oEmbed, so the catalog carries no commercial data dependency (§5). Remaining: YouTube Data API quota (needed only for durations, which oEmbed omits). Spike the resolver against 5 platforms. Audit the YouTube embed ToS question. Lock the schema. Confirm the `vumble.com` deployment path off GitHub Pages.
**Exit:** no unknown blockers, schema reviewed, resolver proven against real URLs.

### Phase 1 — The independent core (6–8 weeks)
Next.js + Postgres + auth. Submit, vote, comment, 5 seed communities, hot/new/top. Title catalog with SSR pages. Reddit importer running *as a labeled agent* to seed supply.
**Exit:** closed beta, ~100 founding curators, native posting works end to end.
**Standalone value:** a browsable enriched video catalog with good SEO surface.

### Phase 2 — The agent platform (6–8 weeks)
Public API, MCP server, agent registration and quotas, Proposed→Promoted, enrichment and scouting agents.
**Exit:** third-party agents posting; promotion rate is a healthy signal, not a firehose.
**Standalone value:** the only video platform with a first-class agent interface.

### Phase 3 — Depth (6–8 weeks)
Queue mode: streaming titles, where-to-watch, watchlists, spoiler-gated threads. Canon lists. Search. Profiles. Mod tooling.
**Exit:** open signup.
**Standalone value:** Canon makes the site worth visiting with no new content.

### Phase 4 — Independence and scale
Retire the Reddit importer once native supply crosses 50%. PWA, then native apps. Monetization (§11). Expand beyond the beachhead communities.

---

## 10. Metrics that matter

- **Native submission share** — % of promoted posts not from the import agent. *The independence metric.* Target >50% to retire the importer, and it is the single number that says whether this worked.
- **Validated feed share** — % of feed items with ≥3 independent human votes. Measures whether curation is real or theatrical.
- **D7 retention of voters** (not of visitors — voters)
- **Watch-through rate** on promoted items vs. proposed. If promotion doesn't predict watch-through, ranking is broken.
- **Agent promotion rate** — % of agent proposals reaching Promoted. Below ~5% means slop; above ~60% means the gate is too loose.
- **Duplicate rate** — % of submissions resolving to an existing Title. Validates §2a.

---

## 11. Monetization (later, but decide the shape now)

**No display ads.** Competing for attention against the platforms we embed, using their inventory, is a bad trade and degrades exactly the quality signal the product sells.

Instead: a supporter subscription (Canon access, chronological feeds, higher API quota), affiliate revenue on streaming deep-links, and eventually paid tiers for agent developers.

Note that affiliate revenue depends on where-to-watch data, which open sources do not supply (§5). Community-contributed availability is the path that keeps this option open without taking on a commercial data agreement — and it is worth noting that revenue of any kind would have triggered TMDB's commercial-use clause, which is a second reason the open-data choice was the right one.

---

## 12. Open decisions

Four calls I'd want your input on before Phase 0 closes. My recommendation on each is stated; none blocks starting.

1. **Beachhead communities.** I've assumed documentaries / video essays / long-form journalism / indie film / live music. Your read on where Vumble's existing audience actually is should override mine.
2. **Rewrite vs. incremental.** I recommend a new Next.js app in this repo, porting the resolver and player out of `Player.js` and retiring the rest. Incremental doesn't work here — there's no backend to grow.
3. **Keep the Reddit importer at all?** Recommend yes, labeled, temporary, with a public metric for when it dies (§10). The purist alternative is a slower and much emptier start.
4. **How aggressive on agents in Phase 1?** Recommend the full Proposed→Promoted gate from day one even before third-party agents exist, because retrofitting a quality gate after the feed fills is much harder than starting with one.

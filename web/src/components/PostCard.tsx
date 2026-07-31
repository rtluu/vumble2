import { PostVote } from "@/components/VoteButtons";
import { cardMode, thumbnailFor, type FeedItem } from "@/lib/feed/feed";
import type { ViewMode } from "@/lib/prefs/view";
import { embedUrl } from "@/lib/resolvers/embed";

/** Compact relative age, matching the V1 player's format (2d, 4h, 30m). */
function age(from: Date): string {
  const seconds = Math.max(1, (Date.now() - from.getTime()) / 1000);
  const units: [number, string][] = [
    [31536000, "y"],
    [86400, "d"],
    [3600, "h"],
    [60, "m"],
  ];
  for (const [size, label] of units) {
    if (seconds >= size) return `${Math.floor(seconds / size)}${label}`;
  }
  return "1m";
}

function runtime(seconds: number | null): string | null {
  if (!seconds) return null;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m >= 60
    ? `${Math.floor(m / 60)}h ${m % 60}m`
    : `${m}:${String(s).padStart(2, "0")}`;
}

function Meta({ item }: { item: FeedItem }) {
  return (
    <div className="post-meta">
      <a href={`/v/${item.community.slug}`} className="community">
        /v/{item.community.slug}
      </a>
      <span className="dot">·</span>
      <span>
        {item.author.handle}
        {/* Agent posts are labelled everywhere, always (plan §7 rule 1). */}
        {item.author.kind === "agent" && <span className="agent-badge">agent</span>}
      </span>
      <span className="dot">·</span>
      <span>{age(item.createdAt)}</span>
      {item.state === "proposed" && <span className="proposed-badge">proposed</span>}
    </div>
  );
}

/** Facet tags — the retrieval layer, distinct from the community (plan §2c). */
function Tags({ tags }: { tags: string[] }) {
  if (tags.length === 0) return null;
  return (
    <div className="tags">
      {tags.map((t) => (
        <a key={t} href={`/t/${t}`} className="tag">
          {t}
        </a>
      ))}
    </div>
  );
}

function Footer({
  item,
  signedIn,
  /** Queue cards carry creator and runtime in their facts line already. */
  omitFacts = false,
}: {
  item: FeedItem;
  signedIn: boolean;
  omitFacts?: boolean;
}) {
  const time = omitFacts ? null : runtime(item.title.runtimeSeconds);
  return (
    <div className="post-footer">
      <PostVote
        postId={item.postId}
        score={item.score}
        viewerVote={item.viewerVote}
        disabled={!signedIn}
      />
      <a href={`/p/${item.postId}`} className="comment-link">
        {item.commentCount} {item.commentCount === 1 ? "comment" : "comments"}
      </a>
      {!omitFacts && item.title.creator && (
        <span className="creator" title="Creator">
          {item.title.creator}
        </span>
      )}
      {time && <span>{time}</span>}
      {item.source && <span className="platform">{item.source.platform}</span>}
    </div>
  );
}

/**
 * Compact: one row per post, thumbnail right of the text.
 *
 * Used for both watch and queue items — the point of compact is a scannable
 * list, so the distinction between "playable here" and "decide and go
 * elsewhere" is carried by the metadata rather than by the layout. Playback
 * happens on the post page; the thumbnail is a still, so a feed of fifty
 * items loads fifty images rather than fifty players.
 */
function CompactCard({
  item,
  signedIn,
}: {
  item: FeedItem;
  signedIn: boolean;
}) {
  const thumb = thumbnailFor(item);
  const isQueue = cardMode(item) === "queue";
  const time = runtime(item.title.runtimeSeconds);

  return (
    <article className="post-card compact">
      <div className="compact-body">
        <div className="compact-text">
          <Meta item={item} />
          <h2 className="headline">
            <a href={`/p/${item.postId}`}>{item.headline}</a>
          </h2>
          {isQueue && (
            <p className="canonical compact-canonical">
              {item.title.canonicalName}
              {item.title.year && (
                <span className="year"> ({item.title.year})</span>
              )}
            </p>
          )}
          <Tags tags={item.title.tags} />
          <Footer item={item} signedIn={signedIn} omitFacts={isQueue} />
        </div>

        {thumb && (
          <a href={`/p/${item.postId}`} className="compact-thumb">
            {/* Remote still; we host no media. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={thumb} alt="" loading="lazy" />
            {time && <span className="compact-duration">{time}</span>}
            {/* A trailer thumbnail must not read as the work itself. */}
            {isQueue && item.trailer && (
              <span className="compact-badge">Trailer</span>
            )}
          </a>
        )}
      </div>
    </article>
  );
}

/**
 * Watch mode: the embeddable, consume-now card. This is the V1 Vumble
 * experience, and the reason the resolver exists.
 */
function WatchCard({
  item,
  signedIn,
  expanded,
}: {
  item: FeedItem;
  signedIn: boolean;
  expanded?: boolean;
}) {
  const src = item.source
    ? embedUrl(item.source.platform, item.source.externalId, item.source.startSeconds)
    : null;

  return (
    <article className="post-card watch">
      <Meta item={item} />
      <h2 className="headline">
        {expanded ? (
          item.headline
        ) : (
          <a href={`/p/${item.postId}`}>{item.headline}</a>
        )}
      </h2>
      <div className="frame">
        {src ? (
          <iframe
            src={src}
            title={item.headline}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture"
            allowFullScreen
            loading="lazy"
          />
        ) : (
          <div className="frame-fallback">Preview unavailable</div>
        )}
      </div>
      <Tags tags={item.title.tags} />
      {expanded && item.body && <p className="body">{item.body}</p>}
      <Footer item={item} signedIn={signedIn} />
    </article>
  );
}

/**
 * Queue mode: decide now, watch later. Exists because the platforms that
 * carry films and series cannot be embedded at all (plan §3/P2), so the
 * card links out rather than pretending to play.
 */
function QueueCard({
  item,
  signedIn,
  expanded,
}: {
  item: FeedItem;
  signedIn: boolean;
  expanded?: boolean;
}) {
  const kindLabel: Record<string, string> = {
    film: "Film",
    series: "Series",
    episode: "Episode",
    live: "Live",
    clip: "Clip",
  };

  // Year, runtime, and creator come from Wikidata and are present far more
  // often than artwork is (director 74%, runtime 52%, image 4%), so the card
  // leads with them. See the note on the poster below.
  const facts = [
    kindLabel[item.title.kind],
    item.title.year ? String(item.title.year) : null,
    runtime(item.title.runtimeSeconds),
    item.title.creator,
  ].filter(Boolean);

  return (
    <article className="post-card queue">
      <div className="queue-body">
        {/*
          No poster column. Wikidata's image field is not poster art — for
          Arrival it is a 1268x156 wordmark — so forcing it into a 2:3 frame
          crops a banner into a sliver that reads as a broken image. The
          trailer below is the visual, and unlike a poster it carries no
          licensing question and tells you far more.
        */}
        <div className="queue-text">
          <Meta item={item} />
          <h2 className="headline">
            {expanded ? (
              item.headline
            ) : (
              <a href={`/p/${item.postId}`}>{item.headline}</a>
            )}
          </h2>
          <p className="canonical">{item.title.canonicalName}</p>
          {facts.length > 0 && (
            <p className="facts">
              {facts.map((f, i) => (
                <span key={f as string}>
                  {i > 0 && <span className="dot">·</span>}
                  {f}
                </span>
              ))}
            </p>
          )}
          {item.body && <p className="body">{item.body}</p>}
          <Tags tags={item.title.tags} />

          {/*
            A preview, not the work. `role = 'trailer'` keeps it out of the
            source that decides card mode, so this cannot turn a film into a
            two-minute watch-mode post. Lazily framed so a feed of these does
            not open a dozen players at once.
          */}
          {item.trailer && (
            <div className="trailer">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${item.trailer.videoId}?rel=0&modestbranding=1`}
                title={`${item.title.canonicalName} — trailer`}
                allow="accelerometer; clipboard-write; encrypted-media; picture-in-picture"
                allowFullScreen
                loading="lazy"
              />
              <span className="trailer-label">Trailer</span>
            </div>
          )}

          {item.source && (
            <a
              className="watch-link"
              href={item.source.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              Watch on {item.source.platform} →
            </a>
          )}
          <Footer item={item} signedIn={signedIn} omitFacts />
        </div>
      </div>
    </article>
  );
}

export function PostCard({
  item,
  signedIn = false,
  expanded = false,
  view = "expanded",
}: {
  item: FeedItem;
  signedIn?: boolean;
  /** True on the post's own page: no self-link, body always shown. */
  expanded?: boolean;
  view?: ViewMode;
}) {
  // The post's own page always shows the player, whatever the feed density —
  // you followed a link to this specific thing, so hiding it behind another
  // click would be perverse.
  if (view === "compact" && !expanded) {
    return <CompactCard item={item} signedIn={signedIn} />;
  }

  return cardMode(item) === "watch" ? (
    <WatchCard item={item} signedIn={signedIn} expanded={expanded} />
  ) : (
    <QueueCard item={item} signedIn={signedIn} expanded={expanded} />
  );
}

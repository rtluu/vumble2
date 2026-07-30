import { cardMode, type FeedItem } from "@/lib/feed/feed";
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

function Footer({ item }: { item: FeedItem }) {
  const time = runtime(item.title.runtimeSeconds);
  return (
    <div className="post-footer">
      <span className="score">{item.score}</span>
      <span>{item.commentCount} comments</span>
      {time && <span>{time}</span>}
      {item.source && <span className="platform">{item.source.platform}</span>}
    </div>
  );
}

/**
 * Watch mode: the embeddable, consume-now card. This is the V1 Vumble
 * experience, and the reason the resolver exists.
 */
function WatchCard({ item }: { item: FeedItem }) {
  const src = item.source
    ? embedUrl(item.source.platform, item.source.externalId, item.source.startSeconds)
    : null;

  return (
    <article className="post-card watch">
      <Meta item={item} />
      <h2 className="headline">{item.headline}</h2>
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
      <Footer item={item} />
    </article>
  );
}

/**
 * Queue mode: decide now, watch later. Exists because the platforms that
 * carry films and series cannot be embedded at all (plan §3/P2), so the
 * card links out rather than pretending to play.
 */
function QueueCard({ item }: { item: FeedItem }) {
  return (
    <article className="post-card queue">
      <div className="queue-body">
        {item.title.posterUrl ? (
          // Remote poster art; we host no media.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            className="poster"
            src={item.title.posterUrl}
            alt=""
            loading="lazy"
          />
        ) : (
          <div className="poster poster-empty" aria-hidden="true" />
        )}
        <div className="queue-text">
          <Meta item={item} />
          <h2 className="headline">{item.headline}</h2>
          <p className="canonical">
            {item.title.canonicalName}
            {item.title.year && <span className="year"> ({item.title.year})</span>}
          </p>
          {item.body && <p className="body">{item.body}</p>}
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
          <Footer item={item} />
        </div>
      </div>
    </article>
  );
}

export function PostCard({ item }: { item: FeedItem }) {
  return cardMode(item) === "watch" ? (
    <WatchCard item={item} />
  ) : (
    <QueueCard item={item} />
  );
}

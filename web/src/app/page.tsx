import { resolve, sourceKey, SUPPORTED_PLATFORMS } from "@/lib/resolvers";

/**
 * Placeholder home page. It exists to prove the stack wires together — the
 * resolver runs server-side during render, which is the path the real submit
 * flow will take. Replaced by the community feed in Phase 1.
 */
export default function Home() {
  const examples = [
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=43",
    "https://vimeo.com/123456789",
    "https://clips.twitch.tv/SomeClipSlug",
    "https://www.youtube.com/playlist?list=PLabc123",
  ];

  return (
    <main style={{ maxWidth: "44rem", margin: "0 auto", padding: "3rem 1.5rem" }}>
      <h1 style={{ margin: 0, fontSize: "1.75rem" }}>Vumble</h1>
      <p style={{ color: "var(--muted)", marginTop: "0.25rem" }}>
        The best things to watch, across every platform.
      </p>

      <h2 style={{ fontSize: "1rem", marginTop: "2.5rem" }}>
        Resolver ({SUPPORTED_PLATFORMS.length} platforms)
      </h2>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
        <tbody>
          {examples.map((url) => {
            const source = resolve(url);
            return (
              <tr key={url} style={{ borderTop: "1px solid var(--border)" }}>
                <td style={{ padding: "0.5rem 0", wordBreak: "break-all" }}>{url}</td>
                <td
                  style={{
                    padding: "0.5rem 0",
                    textAlign: "right",
                    color: source ? "var(--fg)" : "var(--muted)",
                    whiteSpace: "nowrap",
                    paddingLeft: "1rem",
                  }}
                >
                  {source ? sourceKey(source) : "not a video"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </main>
  );
}

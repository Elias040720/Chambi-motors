/** Credentials may travel only to an HTTPS origin, or loopback during local development. */
export function trustedSupabaseUrl(): string | null {
  const raw = process.env.SUPABASE_URL;
  if (!raw) return null;
  try {
    const url = new URL(raw);
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    if (url.username || url.password || url.search || url.hash || url.pathname !== "/") return null;
    if (
      url.protocol !== "https:" &&
      !(url.protocol === "http:" && local && process.env.NODE_ENV !== "production")
    )
      return null;
    return url.origin;
  } catch {
    return null;
  }
}

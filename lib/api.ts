/**
 * Safe JSON fetch — never throws, always returns null on failure.
 * Prevents "Unexpected token '<'" crashes from HTML error responses.
 */
export async function safeFetch<T = any>(
  url: string,
  options?: RequestInit
): Promise<T | null> {
  try {
    const res = await fetch(url, options);

    // Non-2xx — read body for debugging but return null
    if (!res.ok) {
      const preview = await res.text().catch(() => '');
      console.error(`[safeFetch] ${url} → HTTP ${res.status}`, preview.slice(0, 120));
      return null;
    }

    const text = await res.text();
    if (!text.trim()) return null;

    // Detect HTML responses (404/500 pages) — never parse them as JSON
    if (text.trimStart().startsWith('<!')) {
      console.error(`[safeFetch] ${url} returned HTML instead of JSON`);
      return null;
    }

    try {
      return JSON.parse(text) as T;
    } catch (parseErr) {
      console.error(`[safeFetch] ${url} JSON parse failed:`, parseErr);
      return null;
    }
  } catch (networkErr) {
    console.error(`[safeFetch] ${url} network error:`, networkErr);
    return null;
  }
}

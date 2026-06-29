// Einfacher In-Memory Rate-Limiter (pro Server-Instanz).
// Hinweis: Auf Vercel laufen ggf. mehrere/kalte Instanzen — das hier ist eine
// solide Basis-Bremse gegen Missbrauch, aber nicht kugelsicher. Der harte
// Kostendeckel bleibt das Anthropic-Spending-Limit.

type Hit = { count: number; resetAt: number };

const buckets = new Map<string, Hit>();

// Verhindert, dass die Map unbegrenzt wächst.
function sweep(now: number) {
  if (buckets.size < 10000) return;
  for (const [key, hit] of buckets) {
    if (now > hit.resetAt) buckets.delete(key);
  }
}

export function getClientIp(request: Request): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return request.headers.get("x-real-ip") || "unknown";
}

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  sweep(now);

  const hit = buckets.get(key);
  if (!hit || now > hit.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }

  if (hit.count >= limit) {
    return { ok: false, retryAfter: Math.ceil((hit.resetAt - now) / 1000) };
  }

  hit.count += 1;
  return { ok: true, retryAfter: 0 };
}

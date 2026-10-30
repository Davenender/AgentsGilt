import { NextResponse } from "next/server";
import { karteSigOk } from "@/lib/lead-suche";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Kartenbild für die Lead-Suche (Discord lädt es als Bild der Nachricht).
// Der Zustand steckt signiert in der Adresse (d = Daten, k = Siegel). Den Google-Schlüssel sieht niemand.
//   c: [lat, lon]   Mitte (Suchort)
//   r: km           Umkreis, wird als Kreis eingezeichnet
//   m: [[lat, lon], …]  nummerierte Treffer

type Daten = { lat?: number; lon?: number; r?: number; m?: [number, number][] };

function kreis(lat: number, lon: number, km: number): string {
  const pts: string[] = [];
  for (let i = 0; i <= 48; i++) {
    const w = (i / 48) * 2 * Math.PI;
    const dLat = (km / 111.32) * Math.cos(w);
    const dLon = (km / (111.32 * Math.cos((lat * Math.PI) / 180))) * Math.sin(w);
    pts.push(`${(lat + dLat).toFixed(5)},${(lon + dLon).toFixed(5)}`);
  }
  return pts.join("|");
}

export async function GET(request: Request) {
  const u = new URL(request.url);
  const d = u.searchParams.get("d") ?? "";
  if (!karteSigOk(d, u.searchParams.get("k"))) return new NextResponse("Nicht erlaubt", { status: 401 });
  const key = process.env.GOOGLE_PLACES_KEY?.trim();
  if (!key) return new NextResponse("Kein Schlüssel", { status: 500 });

  let daten: Daten;
  try {
    daten = JSON.parse(Buffer.from(d, "base64url").toString("utf8")) as Daten;
  } catch {
    return new NextResponse("Ungültig", { status: 400 });
  }

  const q = new URLSearchParams({ size: "640x300", scale: "2", language: "de", maptype: "roadmap", key });
  q.append("style", "feature:poi.business|visibility:off");
  q.append("style", "feature:transit|visibility:off");
  const hatMitte = typeof daten.lat === "number" && typeof daten.lon === "number";
  if (hatMitte && daten.r) {
    const lat = daten.lat!;
    const lon = daten.lon!;
    q.append("path", `fillcolor:0xD4A23C33|color:0xD4A23CFF|weight:3|${kreis(lat, lon, daten.r)}`);
    if (!daten.m?.length) {
      // Zoom so wählen, dass der Kreis das Bild gut füllt (Bildhöhe 300 px, Kreis soll ~75 % davon belegen).
      const meterProPixel = (daten.r * 1000 * 2) / (300 * 0.75);
      const zoom = Math.round(Math.log2((156543.03 * Math.cos((lat * Math.PI) / 180)) / meterProPixel));
      q.set("center", `${lat},${lon}`);
      q.set("zoom", String(Math.min(16, Math.max(6, zoom))));
      q.append("markers", `color:0xD4A23C|${lat},${lon}`);
    }
  }
  (daten.m ?? []).slice(0, 9).forEach(([la, lo], i) => q.append("markers", `color:0x22C55E|label:${i + 1}|${la},${lo}`));

  try {
    const res = await fetch(`https://maps.googleapis.com/maps/api/staticmap?${q.toString()}`, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) {
      console.error(`[lead-karte] Google HTTP ${res.status}: ${(await res.text().catch(() => "")).slice(0, 200)}`);
      return new NextResponse("Karte nicht verfügbar", { status: 502 });
    }
    return new NextResponse(await res.arrayBuffer(), {
      headers: { "Content-Type": res.headers.get("content-type") ?? "image/png", "Cache-Control": "public, max-age=604800, immutable" },
    });
  } catch {
    return new NextResponse("Karte nicht verfügbar", { status: 502 });
  }
}

const BASE = process.env.NEXT_PUBLIC_REVERSE_GEO_BASE;
let lastRequest = 0;
const cache = new Map<string, GeocodeResult | null>();
const pending = new Map<string, Promise<GeocodeResult | null>>();

interface GeocodeResult {
  city: string;
  region: string;
  displayName: string;
}

async function rateLimitedFetch(url: string): Promise<Response> {
  const now = Date.now();
  const elapsed = now - lastRequest;
  if (elapsed < 1100) {
    await new Promise((r) => setTimeout(r, 1100 - elapsed));
  }
  lastRequest = Date.now();
  return fetch(url, { headers: { "User-Agent": "Lapah/1.0" } });
}

export async function reverseGeocode(
  lat: number,
  lon: number
): Promise<GeocodeResult | null> {
  if (!BASE) return null;
  const key = `${lat.toFixed(4)},${lon.toFixed(4)}`;

  if (cache.has(key)) return cache.get(key)!;

  if (pending.has(key)) return pending.get(key)!;

  const promise = doReverseGeocode(lat, lon, key);
  pending.set(key, promise);
  return promise;
}

async function doReverseGeocode(
  lat: number,
  lon: number,
  key: string
): Promise<GeocodeResult | null> {
  try {
    const res = await rateLimitedFetch(
      `${BASE}/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=id`
    );
    if (!res.ok) {
      pending.delete(key);
      return null;
    }
    const data = await res.json();
    if (!data || data.error) {
      pending.delete(key);
      return null;
    }

    const addr = data.address || {};
    const city =
      addr.city ||
      addr.town ||
      addr.village ||
      addr.county ||
      addr.municipality ||
      "";
    const region = addr.state || addr.region || "";
    const display = data.display_name || "";

    const result: GeocodeResult = {
      city,
      region,
      displayName: display.split(",")[0] || display,
    };
    cache.set(key, result);
    pending.delete(key);
    return result;
  } catch {
    pending.delete(key);
    return null;
  }
}

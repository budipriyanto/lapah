import { NextRequest, NextResponse } from "next/server";
import provinsiMap from "@/data/provinsi-adm4.json";
import kotaMap from "@/data/kota-adm4.json";

const BMKG_OFFICIAL = process.env.BMKG_OFFICIAL_API_BASE;
const DEFAULT_ADM4 = "18.71.01.1003";

interface WeatherData {
  location: string;
  temperature: number;
  humidity: number;
  condition: string;
  conditionEn: string;
  weatherCode: number;
  iconUrl: string;
  windSpeed: number;
  _fallback: boolean;
  _errors: string[];
}

export async function GET(request: NextRequest) {
  if (!BMKG_OFFICIAL) {
    return NextResponse.json(
      { error: "BMKG_OFFICIAL_API_BASE not configured" },
      { status: 500 },
    );
  }

  const { searchParams } = new URL(request.url);
  const lat = searchParams.get("lat");
  const lon = searchParams.get("lon");

  let adm4 = DEFAULT_ADM4;
  let locationName = "Bandar Lampung";
  const errors: string[] = [];
  let fallback = false;

  if (lat && lon) {
    let city = "";
    let province = "";

    try {
      const geoRes = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=id`,
        { signal: AbortSignal.timeout(5000) },
      );
      if (geoRes.ok) {
        const geoData = await geoRes.json();
        city = (geoData.city || geoData.locality || "").toLowerCase().trim();

        const admin = geoData.localityInfo?.administrative ?? [];
        const provEntry = admin.find((a: { adminLevel: number }) => a.adminLevel === 4);
        province = (provEntry?.name ?? "").toLowerCase().trim();

        if (!city && !province) {
          errors.push("Reverse geocode returned no location");
        }
      } else {
        errors.push(`Reverse geocode HTTP ${geoRes.status}`);
      }
    } catch (e) {
      errors.push(`Reverse geocode error: ${e instanceof Error ? e.message : "Unknown"}`);
    }

    if (city && province) {
      locationName = city;
      const cleanCity = city.replace(/^kota\s+/i, "").replace(/^kabupaten\s+/i, "").trim();
      const cityKey = `${cleanCity},${province}`;

      adm4 =
        (kotaMap as Record<string, string>)[cityKey] ||
        (provinsiMap as Record<string, string>)[province] ||
        DEFAULT_ADM4;

      if (adm4 === DEFAULT_ADM4) {
        errors.push(`Lokasi '${city}' tidak ditemukan di mapping, pakai default`);
        fallback = true;
      }
    } else {
      fallback = true;
      if (!city) errors.push("No city from reverse geocode");
      if (!province) errors.push("No province from reverse geocode");
    }
  }

  if (errors.length > 0) fallback = true;

  try {
    const weatherRes = await fetch(
      `${BMKG_OFFICIAL}/prakiraan-cuaca?adm4=${adm4}`,
      { next: { revalidate: 600 } },
    );

    if (!weatherRes.ok) {
      return NextResponse.json(
        { error: "Weather API unavailable", _errors: errors, _fallback: fallback },
        { status: 502 },
      );
    }

    const raw = await weatherRes.json();
    const firstDay = raw.data?.[0];
    const cuaca = firstDay?.cuaca?.[0];

    if (!cuaca?.[0]) {
      return NextResponse.json(
        { error: "Invalid weather data", _errors: errors, _fallback: fallback },
        { status: 502 },
      );
    }

    const entry = cuaca[0];
    const lokasi = raw.lokasi;

    const data: WeatherData = {
      location: [lokasi.kecamatan, lokasi.kotkab].filter(Boolean).join(", ") || locationName,
      temperature: entry.t,
      humidity: entry.hu,
      condition: entry.weather_desc,
      conditionEn: entry.weather_desc_en,
      weatherCode: entry.weather,
      iconUrl: entry.image,
      windSpeed: entry.ws,
      _fallback: fallback,
      _errors: errors,
    };

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1200",
      },
    });
  } catch (e) {
    return NextResponse.json(
      {
        error: "Failed to fetch weather",
        _errors: [...errors, e instanceof Error ? e.message : "Unknown"],
        _fallback: true,
      },
      { status: 502 },
    );
  }
}

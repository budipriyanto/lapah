"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface PrayerTime {
  subuh: string;
  dzuhur: string;
  ashar: string;
  maghrib: string;
  isya: string;
  tanggal: string;
}

const API = process.env.NEXT_PUBLIC_API_PRAYER;

const PRAYERS = [
  { key: "subuh", label: "Subuh" },
  { key: "dzuhur", label: "Dzuhur" },
  { key: "ashar", label: "Ashar" },
  { key: "maghrib", label: "Maghrib" },
  { key: "isya", label: "Isya" },
] as const;

const DEFAULT_CITY = { id: 1005, name: "Lampung Timur" };

function getCurrentPrayer(prayers: PrayerTime): string | null {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const times: { key: string; minutes: number }[] = [];
  for (const p of PRAYERS) {
    const [h, m] = prayers[p.key as keyof PrayerTime].split(":").map(Number);
    times.push({ key: p.key, minutes: h * 60 + m });
  }

  let active: string | null = null;
  for (let i = times.length - 1; i >= 0; i--) {
    if (currentMinutes >= times[i].minutes) {
      active = times[i].key;
      break;
    }
  }
  return active;
}

function PrayerSkeleton() {
  return (
    <div className="mb-6 rounded-xl bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-3 h-5 w-44 animate-pulse rounded bg-zinc-200" />
      <div className="grid grid-cols-5 gap-1.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="animate-pulse rounded-lg bg-zinc-100 p-2 text-center"
          >
            <div className="mx-auto mb-1.5 h-3 w-10 rounded bg-zinc-200" />
            <div className="mx-auto h-5 w-12 rounded bg-zinc-200" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PrayerCard() {
  const [prayer, setPrayer] = useState<PrayerTime | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cityName, setCityName] = useState(DEFAULT_CITY.name);
  const [usingGps, setUsingGps] = useState(false);
  const cityIdRef = useRef(DEFAULT_CITY.id);

  async function findCityId(lat: number, lon: number): Promise<number> {
    try {
      const geoRes = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=id`
      );
      const geo = await geoRes.json();
      const city = geo.city || geo.locality || geo.principalSubdivision;
      if (!city) return DEFAULT_CITY.id;

      const searchRes = await fetch(
        `${API}/sholat/kota/cari/${encodeURIComponent(city)}`
      );
      const search = await searchRes.json();
      if (search.status && search.data && search.data.length > 0) {
        setCityName(search.data[0].lokasi);
        return Number(search.data[0].id);
      }

      const region = geo.principalSubdivision;
      if (region) {
        const regionRes = await fetch(
          `${API}/sholat/kota/cari/${encodeURIComponent(region)}`
        );
        const regionSearch = await regionRes.json();
        if (regionSearch.status && regionSearch.data && regionSearch.data.length > 0) {
          setCityName(regionSearch.data[0].lokasi);
          return Number(regionSearch.data[0].id);
        }
      }
    } catch {
      // fallback
    }
    return DEFAULT_CITY.id;
  }

  const fetchPrayer = useCallback(async (cityId?: number) => {
    setError(false);
    const id = cityId ?? cityIdRef.current;
    cityIdRef.current = id;

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    try {
      const res = await fetch(
        `${API}/sholat/jadwal/${id}/${year}/${month}/${day}`
      );
      const json = await res.json();
      if (json.status && json.data?.jadwal) {
        const j = json.data.jadwal;
        setPrayer({
          subuh: j.subuh,
          dzuhur: j.dzuhur,
          ashar: j.ashar,
          maghrib: j.maghrib,
          isya: j.isya,
          tanggal: j.tanggal,
        });
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const id = setTimeout(() => {
      fetchPrayer(DEFAULT_CITY.id);

      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            setUsingGps(true);
            const foundId = await findCityId(pos.coords.latitude, pos.coords.longitude);
            fetchPrayer(foundId);
          },
          () => {},
          { timeout: 5000, enableHighAccuracy: false },
        );
      }
    }, 0);

    return () => clearTimeout(id);
  }, [fetchPrayer]);

  async function refresh() {
    setRefreshing(true);
    setError(false);

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          setUsingGps(true);
          const foundId = await findCityId(pos.coords.latitude, pos.coords.longitude);
          await fetchPrayer(foundId);
          setRefreshing(false);
        },
        async () => {
          setUsingGps(false);
          await fetchPrayer(DEFAULT_CITY.id);
          setRefreshing(false);
        },
        { timeout: 5000, enableHighAccuracy: false },
      );
    } else {
      setUsingGps(false);
      await fetchPrayer(DEFAULT_CITY.id);
      setRefreshing(false);
    }
  }

  if (loading) return <PrayerSkeleton />;

  const currentPrayer = prayer ? getCurrentPrayer(prayer) : null;

  return (
    <div className="mb-6 rounded-xl bg-white p-4 shadow-sm sm:p-5">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-[#1a1a1a]">
            🕌 Jadwal Sholat
          </h3>
          <p className="text-xs text-[#737373]">
            {cityName}{error ? "" : prayer ? ` · ${prayer.tanggal}` : ""}
            {usingGps && (
              <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-zinc-100">
                GPS
              </span>
            )}
          </p>
        </div>
        <button
          onClick={refresh}
          disabled={refreshing}
          className="p-1 rounded hover:bg-zinc-100 transition-colors disabled:opacity-50"
          title="Refresh jadwal"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#737373"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={refreshing ? "animate-spin" : ""}
          >
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
        </button>
      </div>

      {/* Error */}
      {error && (
        <p className="mb-3 text-xs text-red-500">
          Gagal memuat jadwal sholat
        </p>
      )}

      {/* Horizontal row - 5 columns */}
      <div className="grid grid-cols-5 gap-1.5">
        {PRAYERS.map((p) => {
          const isActive = currentPrayer === p.key;
          const time = prayer ? prayer[p.key as keyof PrayerTime] : "--:--";

          return (
            <div
              key={p.key}
              className={`rounded-lg px-2 py-2.5 text-center transition-colors ${
                isActive
                  ? "bg-[#0066cc] text-white shadow-sm ring-2 ring-[#0066cc]"
                  : "bg-zinc-50 text-[#1a1a1a]"
              }`}
            >
              <p className="text-[11px] font-medium leading-tight opacity-70">
                {p.label}
              </p>
              <p className="mt-0.5 text-sm font-bold leading-tight">{time}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

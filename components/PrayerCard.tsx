"use client";

import { useCallback, useEffect, useState } from "react";
import { reverseGeocode } from "@/utils/geocode";

const PRAYER_BASE = process.env.NEXT_PUBLIC_PRAYER_BASE;

interface PrayerTime {
  subuh: string;
  dzuhur: string;
  ashar: string;
  maghrib: string;
  isya: string;
}

interface DateInfo {
  gregorian: string;
  hijri: string;
  weekday: string;
}

const DAYS_ID: Record<string, string> = {
  Monday: "Senin",
  Tuesday: "Selasa",
  Wednesday: "Rabu",
  Thursday: "Kamis",
  Friday: "Jumat",
  Saturday: "Sabtu",
  Sunday: "Minggu",
};

const MONTHS_ID: Record<string, string> = {
  Jan: "Januari",
  Januari: "Januari",
  Feb: "Februari",
  Februari: "Februari",
  Mar: "Maret",
  Maret: "Maret",
  Apr: "April",
  April: "April",
  May: "Mei",
  Mei: "Mei",
  Jun: "Juni",
  Juni: "Juni",
  Jul: "Juli",
  Juli: "Juli",
  Aug: "Agustus",
  Agustus: "Agustus",
  Sep: "September",
  September: "September",
  Oct: "Oktober",
  Oktober: "Oktober",
  Nov: "November",
  November: "November",
  Dec: "Desember",
  Desember: "Desember",
};

const PRAYERS = [
  { key: "subuh", label: "Subuh" },
  { key: "dzuhur", label: "Dzuhur" },
  { key: "ashar", label: "Ashar" },
  { key: "maghrib", label: "Maghrib" },
  { key: "isya", label: "Isya" },
] as const;

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
  const [dateInfo, setDateInfo] = useState<DateInfo | null>(null);
  const [error, setError] = useState(false);
  const [locationName, setLocationName] = useState("");
  const [gpsStatus, setGpsStatus] = useState<"idle" | "locating" | "done" | "denied">("idle");
  const [loading, setLoading] = useState(false);

  const fetchPrayer = useCallback(async (lat: number, lon: number) => {
    if (!PRAYER_BASE) {
      setError(true);
      setLoading(false);
      return;
    }

    setError(false);

    try {
      const geo = await reverseGeocode(lat, lon);
      setLocationName(
        geo ? [geo.city, geo.region].filter(Boolean).join(", ") : ""
      );

      const res = await fetch(
        `${PRAYER_BASE}/timings?latitude=${lat}&longitude=${lon}&method=11`
      );
      const json = await res.json();

      if (json.code === 200 && json.data?.timings) {
        const t = json.data.timings;
        setPrayer({
          subuh: t.Fajr,
          dzuhur: t.Dhuhr,
          ashar: t.Asr,
          maghrib: t.Maghrib,
          isya: t.Isha,
        });

        const d = json.data.date;
        if (d) {
          const g = d.gregorian;
          const dayNum = g.day;
          const monthEn = g.month?.en ?? g.month?.number ?? "";
          const year = g.year;
          setDateInfo({
            gregorian: `${dayNum} ${MONTHS_ID[monthEn] || monthEn} ${year}`,
            hijri: d.hijri
              ? `${d.hijri.day} ${d.hijri.month.en} ${d.hijri.year}`
              : "",
            weekday: DAYS_ID[g?.weekday?.en] || g?.weekday?.en || "",
          });
        }
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
      if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
        setGpsStatus("denied");
        return;
      }

      setGpsStatus("locating");
      setLoading(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGpsStatus("done");
          fetchPrayer(pos.coords.latitude, pos.coords.longitude);
        },
        () => {
          setGpsStatus("denied");
          setLoading(false);
        },
        { timeout: 5000, enableHighAccuracy: false }
      );
    }, 0);
    return () => clearTimeout(id);
  }, [fetchPrayer]);

  if (loading) return <PrayerSkeleton />;

  if (gpsStatus === "denied" && !prayer) {
    return (
      <div className="mb-6 rounded-xl bg-white p-4 shadow-sm sm:p-5">
        <p className="mb-2 text-sm font-semibold text-[#1a1a1a]">
          🕌 Jadwal Sholat
        </p>
        <p className="text-center text-xs text-[#737373]">
          Aktifkan GPS untuk melihat jadwal sholat
        </p>
      </div>
    );
  }

  if (error && !prayer) {
    return (
      <div className="mb-6 rounded-xl bg-white p-4 shadow-sm sm:p-5">
        <p className="mb-2 text-sm font-semibold text-[#1a1a1a]">
          🕌 Jadwal Sholat
        </p>
        <p className="text-center text-xs text-red-500">
          Gagal memuat jadwal sholat
        </p>
      </div>
    );
  }

  if (!prayer) return null;

  const currentPrayer = getCurrentPrayer(prayer);

  const subtitle = [
    locationName,
    dateInfo?.hijri ? `${dateInfo.hijri} H` : "",
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="mb-6 rounded-xl bg-white shadow-sm">
      <div className="px-4 pt-3.5 pb-2">
        {dateInfo && (
          <p className="text-sm font-semibold text-[#1a1a1a]">
            🕌 {dateInfo.weekday}, {dateInfo.gregorian}
          </p>
        )}
        {subtitle && (
          <p className="mt-0.5 text-[11px] text-[#737373]">📍 {subtitle}</p>
        )}
      </div>

      {error && (
        <p className="mb-3 text-xs text-red-500">
          Gagal memuat jadwal sholat
        </p>
      )}

      <div className="grid grid-cols-5 gap-1 px-4 pb-2">
        {PRAYERS.map((p) => {
          const isActive = currentPrayer === p.key;
          const time = prayer[p.key as keyof PrayerTime];

          return (
            <div
              key={p.key}
              className={`rounded-lg px-1 py-2 text-center transition-colors ${
                isActive
                  ? "bg-[#0066cc] text-white shadow-sm ring-2 ring-[#0066cc]"
                  : "bg-zinc-50 text-[#1a1a1a]"
              }`}
            >
              <p className="text-[10px] font-medium leading-tight opacity-70">
                {p.label}
              </p>
              <p className="mt-0.5 text-xs font-bold leading-tight">{time}</p>
            </div>
          );
        })}
      </div>
      {PRAYER_BASE && (
        <p className="px-4 pb-1.5 text-right text-[10px] text-[#737373] opacity-50">
          Sumber: {new URL(PRAYER_BASE).hostname.split(".").slice(-2).join(".")}
        </p>
      )}
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { reverseGeocode } from "@/utils/geocode";

const WEATHER_BASE = process.env.NEXT_PUBLIC_WEATHER_BASE;

interface WeatherData {
  location: string;
  temperature: number;
  humidity: number;
  condition: string;
  weatherCode: number;
  windSpeed: number;
}

const WMO_CONDITIONS: Record<number, string> = {
  0: "Cerah",
  1: "Cerah Berawan",
  2: "Berawan",
  3: "Berawan Tebal",
  45: "Berkabut",
  48: "Berkabut",
  51: "Gerimis Ringan",
  53: "Gerimis Sedang",
  55: "Gerimis Deras",
  56: "Gerimis Beku Ringan",
  57: "Gerimis Beku Deras",
  61: "Hujan Ringan",
  63: "Hujan Sedang",
  65: "Hujan Deras",
  66: "Hujan Beku Ringan",
  67: "Hujan Beku Deras",
  71: "Salju Ringan",
  73: "Salju Sedang",
  75: "Salju Deras",
  77: "Butiran Salju",
  80: "Hujan Lokal Ringan",
  81: "Hujan Lokal Sedang",
  82: "Hujan Lokal Deras",
  85: "Salju Lokal Ringan",
  86: "Salju Lokal Deras",
  95: "Badai Petir",
  96: "Badai Petir dengan Hujan Es Ringan",
  99: "Badai Petir dengan Hujan Es Deras",
};

function getWeatherEmoji(code: number): string {
  if (code === 0) return "☀️";
  if (code <= 2) return "⛅";
  if (code <= 3) return "☁️";
  if (code <= 48) return "🌫️";
  if (code <= 57) return "🌦️";
  if (code <= 67) return "🌧️";
  if (code <= 86) return "🌧️";
  if (code >= 95) return "⛈️";
  return "🌤️";
}

export default function WeatherCard() {
  const [data, setData] = useState<WeatherData | null>(null);
  const [gpsStatus, setGpsStatus] = useState<"idle" | "locating" | "done" | "denied">("idle");
  const [loading, setLoading] = useState(false);

  const fetchWeather = useCallback(async (lat: number, lon: number) => {
    if (!WEATHER_BASE) {
      setLoading(false);
      return;
    }

    try {
      const geo = await reverseGeocode(lat, lon);
      const location = geo
        ? [geo.city, geo.region].filter(Boolean).join(", ")
        : `${lat.toFixed(4)}, ${lon.toFixed(4)}`;

      const res = await fetch(
        `${WEATHER_BASE}/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=auto`
      );
      if (!res.ok) throw new Error("Gagal mengambil data cuaca");

      const json = await res.json();

      setData({
        location,
        temperature: Math.round(json.current.temperature_2m),
        humidity: json.current.relative_humidity_2m,
        condition: WMO_CONDITIONS[json.current.weather_code] ?? "Tidak diketahui",
        weatherCode: json.current.weather_code,
        windSpeed: Math.round(json.current.wind_speed_10m),
      });
    } catch {
      setData(null);
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
          fetchWeather(pos.coords.latitude, pos.coords.longitude);
        },
        () => {
          setGpsStatus("denied");
          setLoading(false);
        },
        { timeout: 5000, enableHighAccuracy: false }
      );
    }, 0);
    return () => clearTimeout(id);
  }, [fetchWeather]);

  if (loading) {
    return (
      <div className="mb-4 rounded-xl bg-white shadow-sm animate-pulse">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="h-10 w-10 shrink-0 rounded-full bg-zinc-200" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-32 rounded bg-zinc-200" />
            <div className="h-3 w-48 rounded bg-zinc-200" />
          </div>
        </div>
      </div>
    );
  }

  if (gpsStatus === "denied" || !data) {
    if (gpsStatus === "denied" && !data) {
      return (
        <div className="mb-4 rounded-xl bg-white shadow-sm">
          <div className="px-4 py-3 text-center text-sm text-[#737373]">
            Aktifkan GPS untuk melihat cuaca terkini
          </div>
        </div>
      );
    }
    return null;
  }

  return (
    <div className="mb-4 rounded-xl bg-white shadow-sm">
      <div className="flex items-center gap-3 px-4 py-2.5">
        <span className="text-3xl shrink-0">
          {getWeatherEmoji(data.weatherCode)}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold text-[#1a1a1a]">
              {data.temperature}°C
            </span>
            <span className="text-sm text-[#737373] truncate">
              {data.condition}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-[#737373]">
            <span className="truncate">📍 {data.location}</span>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-xs text-[#737373]">💧 {data.humidity}%</div>
          <div className="text-xs text-[#737373]">💨 {data.windSpeed} km/h</div>
        </div>
      </div>
      {WEATHER_BASE && (
        <p className="px-4 pb-1.5 text-right text-[10px] text-[#737373] opacity-50">
          Sumber: {new URL(WEATHER_BASE).hostname.split(".").slice(-2).join(".")}
        </p>
      )}
    </div>
  );
}

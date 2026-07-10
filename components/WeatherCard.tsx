"use client";

import { useCallback, useEffect, useRef, useState } from "react";

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

function getEmoji(code: number): string {
  const map: Record<number, string> = {
    0: "☀️",
    1: "🌤️",
    2: "☁️",
    3: "🌦️",
    4: "🌧️",
    5: "🌧️",
    61: "🌦️",
    63: "🌧️",
    80: "🌦️",
    95: "⛈️",
  };
  return map[code] ?? "🌤️";
}

export default function WeatherCard() {
  const [data, setData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [usingGps, setUsingGps] = useState(false);
  const [showDbg, setShowDbg] = useState(false);
  const gpsRef = useRef(false);

  const fetchWeather = useCallback(async (lat?: number, lon?: number) => {
    const params = new URLSearchParams();
    if (lat !== undefined && lon !== undefined) {
      params.set("lat", String(lat));
      params.set("lon", String(lon));
    }
    try {
      const res = await fetch(`/api/weather?${params.toString()}`);
      if (!res.ok) throw new Error("Failed");
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      if (!(gpsRef.current && !lat)) {
        setData(json);
        setLoading(false);
      }
    } catch {
      if (!(gpsRef.current && !lat)) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const id = setTimeout(() => {
      fetchWeather();

      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            gpsRef.current = true;
            setUsingGps(true);
            fetchWeather(pos.coords.latitude, pos.coords.longitude);
          },
          () => {},
          { timeout: 5000, enableHighAccuracy: false },
        );
      }
    }, 0);

    return () => clearTimeout(id);
  }, [fetchWeather]);

  async function refresh() {
    setRefreshing(true);
    gpsRef.current = false;
    setUsingGps(false);

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          gpsRef.current = true;
          setUsingGps(true);
          fetchWeather(pos.coords.latitude, pos.coords.longitude).finally(() => setRefreshing(false));
        },
        () => {
          fetchWeather().finally(() => setRefreshing(false));
        },
        { timeout: 5000, enableHighAccuracy: false },
      );
    } else {
      await fetchWeather();
      setRefreshing(false);
    }
  }

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

  if (!data) return null;

  return (
    <div className="mb-4 rounded-xl bg-white shadow-sm">
      <div className="flex items-center gap-3 px-4 py-2.5">
        <span className="text-3xl shrink-0">{getEmoji(data.weatherCode)}</span>
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
            <span className="truncate">
              📍 {data.location}
            </span>
            {usingGps && (
              <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-zinc-100">
                GPS
              </span>
            )}
            {data._fallback && !usingGps && (
              <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-zinc-100">
                Predetermined
              </span>
            )}
          </div>
        </div>
        <div className="shrink-0 text-right relative">
          <button
            onClick={refresh}
            disabled={refreshing}
            className="mb-1 p-1 rounded hover:bg-zinc-100 transition-colors disabled:opacity-50 ml-auto"
            title="Refresh cuaca"
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
              className={`${refreshing ? "animate-spin" : ""}`}
            >
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
          </button>
          <div className="text-xs text-[#737373]">💧 {data.humidity}%</div>
          <div className="text-xs text-[#737373]">💨 {data.windSpeed} km/h</div>
          {data._errors.length > 0 && (
            <button
              onClick={() => setShowDbg(!showDbg)}
              className="mt-1 text-[10px] text-zinc-400 hover:text-zinc-600 underline"
            >
              [i] detail
            </button>
          )}
          {showDbg && (
            <div className="absolute right-0 top-full mt-1 w-64 bg-white border border-zinc-200 rounded-lg shadow-lg p-2.5 text-[11px] text-red-600 z-10 space-y-1">
              {data._errors.map((e, i) => (
                <div key={i}>⚠ {e}</div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

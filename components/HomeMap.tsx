"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Destination, DestinationImage } from "@/utils/supabase/types";
import {
  formatDistance,
  haversineKm,
  type Coordinates,
} from "@/utils/geo";
import NearestPlaceSlider, {
  MAP_CATEGORY_META,
  type MapCategory,
} from "@/components/NearestPlaceSlider";

const DEFAULT_CENTER: L.LatLngTuple = [-5.15, 105.7];
const DEFAULT_ZOOM = 10;

const MAP_CATEGORIES = ["wisata", "penginapan", "kuliner"] as const;

interface MapPlace extends Coordinates {
  id: string;
  title: string;
  slug: string;
  category: MapCategory;
}

interface UserLocation extends Coordinates {
  accuracy: number;
}

interface HomeMapProps {
  destinations: Destination[];
  imagesByDestination?: Map<string, DestinationImage[]>;
}

function isMapCategory(category: string): category is MapCategory {
  return (MAP_CATEGORIES as readonly string[]).includes(category);
}

function toMapPlace(destination: Destination): MapPlace | null {
  if (!isMapCategory(destination.category)) return null;

  const lat = destination.latitude;
  const lon = destination.longitude;

  if (
    lat === null ||
    lon === null ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lon) ||
    lat < -90 ||
    lat > 90 ||
    lon < -180 ||
    lon > 180
  ) {
    return null;
  }

  return {
    id: destination.id,
    title: destination.title,
    slug: destination.slug,
    category: destination.category,
    lat,
    lon,
  };
}

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character] ?? character,
  );
}

function markerIcon(category: MapCategory): L.DivIcon {
  const meta = MAP_CATEGORY_META[category];

  return L.divIcon({
    className: "",
    html: `
      <div style="position:relative;width:30px;height:38px;filter:drop-shadow(0 2px 2px rgba(0,0,0,.28))">
        <svg width="30" height="38" viewBox="0 0 30 38" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M15 1C7.268 1 1 7.268 1 15c0 9.9 14 21.5 14 21.5S29 24.9 29 15C29 7.268 22.732 1 15 1Z" fill="${meta.color}" stroke="white" stroke-width="2"/>
        </svg>
        <span style="position:absolute;left:5px;top:3px;width:20px;height:20px;border-radius:9999px;background:#fff;display:flex;align-items:center;justify-content:center;font-size:13px;line-height:1;font-family:'Segoe UI Emoji','Apple Color Emoji','Noto Color Emoji',sans-serif">${meta.icon}</span>
      </div>
    `,
    iconSize: [30, 38],
    iconAnchor: [15, 37],
    popupAnchor: [0, -33],
  });
}

function popupHtml(place: MapPlace, distanceKm?: number): string {
  const meta = MAP_CATEGORY_META[place.category];
  const href = `/destinasi/${encodeURIComponent(place.slug)}`;
  const distance =
    distanceKm === undefined
      ? ""
      : `<div style="margin-top:3px;font-size:11px;color:#52525b">${formatDistance(distanceKm)} dari lokasi Anda</div>`;

  return `
    <div style="min-width:170px;font-family:inherit;line-height:1.35">
      <div style="font-size:10px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:${meta.color}">${meta.label}</div>
      <div style="margin-top:2px;font-size:13px;font-weight:600;color:#18181b">${escapeHtml(place.title)}</div>
      ${distance}
      <a href="${href}" style="display:inline-block;margin-top:6px;font-size:11px;font-weight:600;color:#0066cc;text-decoration:none">Lihat detail</a>
    </div>
  `;
}

export default function HomeMap({
  destinations,
  imagesByDestination,
}: HomeMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const layerRefs = useRef<Partial<Record<MapCategory, L.LayerGroup>>>({});
  const markerRefs = useRef(new Map<string, L.Marker>());
  const userLayerRef = useRef<L.LayerGroup | null>(null);
  const fittedRef = useRef(false);
  const [map, setMap] = useState<L.Map | null>(null);
  const [activeCategories, setActiveCategories] = useState<MapCategory[]>([
    ...MAP_CATEGORIES,
  ]);
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [locationStatus, setLocationStatus] = useState<
    "idle" | "locating" | "ready" | "denied" | "unsupported"
  >("idle");

  const places = useMemo(
    () =>
      destinations
        .map(toMapPlace)
        .filter((place): place is MapPlace => place !== null),
    [destinations],
  );

  const placesRef = useRef(places);

  useEffect(() => {
    placesRef.current = places;
  }, [places]);

  const visiblePlaces = useMemo(() => {
    if (activeCategories.length === 0) return [];

    const active = new Set(activeCategories);
    return places.filter((place) => active.has(place.category));
  }, [activeCategories, places]);

  const nearest = useMemo(() => {
    if (!location) return [];

    return visiblePlaces
      .map((place) => ({
        ...place,
        distanceKm: haversineKm(location, place),
      }))
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, 5);
  }, [visiblePlaces, location]);

  const activeCategoryLabel =
    activeCategories.length === 1
      ? MAP_CATEGORY_META[activeCategories[0]].label
      : undefined;

  const requestLocation = useCallback(() => {
    if (
      typeof navigator === "undefined" ||
      !("geolocation" in navigator)
    ) {
      setLocationStatus("unsupported");
      return;
    }

    setLocationStatus("locating");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
        setLocationStatus("ready");
      },
      () => {
        setLocationStatus("denied");
      },
      {
        enableHighAccuracy: false,
        timeout: 8000,
        maximumAge: 300000,
      },
    );
  }, []);

  useEffect(() => {
    const id = window.setTimeout(requestLocation, 1200);
    return () => window.clearTimeout(id);
  }, [requestLocation]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const instance = L.map(container, {
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      zoomControl: true,
      attributionControl: false,
    });

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
    }).addTo(instance);

    const groups: Partial<Record<MapCategory, L.LayerGroup>> = {};
    const overlays: Record<string, L.LayerGroup> = {};

    for (const category of MAP_CATEGORIES) {
      const count = placesRef.current.filter(
        (place) => place.category === category,
      ).length;

      if (count === 0) continue;

      const group = L.layerGroup().addTo(instance);
      groups[category] = group;
      overlays[`${MAP_CATEGORY_META[category].label} (${count})`] = group;
    }

    layerRefs.current = groups;
    userLayerRef.current = L.layerGroup().addTo(instance);

    const syncActiveCategories = () => {
      setActiveCategories(
        MAP_CATEGORIES.filter((category) => {
          const group = groups[category];
          return group ? instance.hasLayer(group) : false;
        }),
      );
    };

    syncActiveCategories();
    instance.on("overlayadd", syncActiveCategories);
    instance.on("overlayremove", syncActiveCategories);

    if (Object.keys(overlays).length > 0) {
      L.control
        .layers(undefined, overlays, {
          position: "topright",
          collapsed: true,
        })
        .addTo(instance);
    }

    const resize = () => instance.invalidateSize();
    window.addEventListener("resize", resize);
    const resizeTimer = window.setTimeout(resize, 0);

    fittedRef.current = false;
    setMap(instance);

    return () => {
      window.clearTimeout(resizeTimer);
      window.removeEventListener("resize", resize);
      instance.off("overlayadd", syncActiveCategories);
      instance.off("overlayremove", syncActiveCategories);
      instance.remove();
      layerRefs.current = {};
      userLayerRef.current = null;
      fittedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!map) return;

    markerRefs.current.clear();

    for (const category of MAP_CATEGORIES) {
      const group = layerRefs.current[category];
      if (!group) continue;

      group.clearLayers();

      for (const place of places) {
        if (place.category !== category) continue;

        const distanceKm = location ? haversineKm(location, place) : undefined;
        const marker = L.marker([place.lat, place.lon], {
          icon: markerIcon(category),
          riseOnHover: true,
        })
          .bindPopup(popupHtml(place, distanceKm), {
            maxWidth: 260,
            closeButton: true,
          })
          .addTo(group);

        markerRefs.current.set(place.id, marker);
      }
    }

    if (!fittedRef.current && places.length > 0) {
      const bounds = L.latLngBounds(
        places.map((place) => [place.lat, place.lon] as [number, number]),
      );
      map.fitBounds(bounds, { padding: [24, 24], maxZoom: 12 });
      fittedRef.current = true;
    }
  }, [map, places, location]);

  useEffect(() => {
    if (!map) return;

    const userLayer = userLayerRef.current;
    if (!userLayer) return;

    userLayer.clearLayers();

    if (!location) return;

    L.circle([location.lat, location.lon], {
      radius: Math.max(50, location.accuracy),
      color: "#dc2626",
      weight: 1,
      fillColor: "#dc2626",
      fillOpacity: 0.08,
    }).addTo(userLayer);

    L.circleMarker([location.lat, location.lon], {
      radius: 8,
      weight: 3,
      color: "#ffffff",
      fillColor: "#dc2626",
      fillOpacity: 1,
    })
      .bindPopup("Lokasi Anda")
      .addTo(userLayer);
  }, [map, location]);

  useEffect(() => {
    if (!map || !location) return;

    const bounds = L.latLngBounds([
      [location.lat, location.lon],
      ...nearest.map(
        (place) => [place.lat, place.lon] as [number, number],
      ),
    ]);

    map.fitBounds(bounds, {
      paddingTopLeft: [30, 30],
      paddingBottomRight: [30, 140],
      maxZoom: 13,
    });
  }, [map, location, nearest]);

  function focusPlace(place: MapPlace) {
    if (!map) return;

    map.flyTo([place.lat, place.lon], 14, { duration: 0.6 });
    window.setTimeout(() => {
      markerRefs.current.get(place.id)?.openPopup();
    }, 350);
  }

  const locating = locationStatus === "locating";

  return (
    <section className="mb-6 overflow-hidden rounded-xl bg-white shadow-sm">
      <div className="flex items-start justify-between gap-3 px-4 pb-3 pt-3.5">
        <div>
          <h2 className="text-sm font-semibold text-[#1a1a1a]">
            Destinasi Terdekat
          </h2>
          <p className="mt-0.5 text-[11px] text-[#737373]">
            Destinasi di sekitar Anda
          </p>
        </div>
        <button
          type="button"
          onClick={requestLocation}
          disabled={locating}
          className="shrink-0 rounded-full bg-[#0066cc]/10 px-3 py-1.5 text-[11px] font-semibold text-[#0066cc] transition-colors hover:bg-[#0066cc]/15 disabled:opacity-50"
        >
          {locating
            ? "Mencari lokasi..."
            : location
              ? "Perbarui lokasi"
              : "Gunakan lokasi saya"}
        </button>
      </div>

      {(locationStatus === "denied" ||
        locationStatus === "unsupported") && (
        <p className="px-4 pb-3 text-[11px] text-[#737373]">
          {locationStatus === "unsupported"
            ? "Perangkat ini tidak mendukung lokasi. Peta menampilkan semua lokasi."
            : "Izin lokasi tidak aktif. Peta menampilkan semua lokasi; aktifkan lokasi untuk melihat yang terdekat."}
        </p>
      )}

      <div className="relative z-0">
        <div
          ref={containerRef}
          role="region"
          aria-label="Peta Destinasi di Lampung Timur"
          className="h-[320px] w-full bg-zinc-100 sm:h-[400px]"
        />

        {location && nearest.length > 0 && (
          <NearestPlaceSlider
            places={nearest}
            imagesByDestination={imagesByDestination}
            categoryLabel={activeCategoryLabel}
            onSelect={focusPlace}
          />
        )}
      </div>

      <p className="px-4 py-1.5 text-right text-[9px] text-zinc-400">
        Peta:{" "}
        <a
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noreferrer"
          className="underline decoration-zinc-300 underline-offset-2 hover:text-zinc-500"
        >
          © OpenStreetMap contributors
        </a>
      </p>
    </section>
  );
}

"use client";

import { useEffect, useState } from "react";

export default function AdminDashboard() {
  const [stats, setStats] = useState({ wisata: 0, kuliner: 0, penginapan: 0, event: 0, ulasan: 0, user: 0 });

  useEffect(() => {
    let stale = false;
    fetch("/api/admin/stats")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (stale || !json?.success) return;
        const d = json.data;
        setStats({
          wisata: d.wisata,
          kuliner: d.kuliner,
          penginapan: d.penginapan,
          event: d.events,
          ulasan: d.ulasan,
          user: d.users,
        });
      })
      .catch(() => {});
    return () => {
      stale = true;
    };
  }, []);

  const cards = [
    { label: "Wisata", value: stats.wisata, color: "bg-blue-50 text-blue-700" },
    { label: "Kuliner", value: stats.kuliner, color: "bg-orange-50 text-orange-700" },
    { label: "Penginapan", value: stats.penginapan, color: "bg-rose-50 text-rose-700" },
    { label: "Events", value: stats.event, color: "bg-indigo-50 text-indigo-700" },
    { label: "Ulasan", value: stats.ulasan, color: "bg-green-50 text-green-700" },
    { label: "User", value: stats.user, color: "bg-purple-50 text-purple-700" },
  ];

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold text-[#1a1a1a]">Dashboard</h1>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className={`rounded-xl p-4 shadow-sm ${c.color}`}>
            <p className="text-3xl font-bold">{c.value}</p>
            <p className="mt-1 text-sm opacity-80">{c.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

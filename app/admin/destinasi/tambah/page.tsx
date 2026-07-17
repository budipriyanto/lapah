"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

interface ImageEntry {
  url: string;
  is_hero: boolean;
  order: number;
}

export default function TambahDestinasi() {
  const router = useRouter();
  const supabase = createClient();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: "",
    category: "wisata" as "wisata" | "kuliner" | "penginapan",
    subcategory: "",
    description: "",
    location: "",
    address: "",
    price_range: "",
    opening_hours: "",
    latitude: "",
    longitude: "",
  });
  const [images, setImages] = useState<ImageEntry[]>([{ url: "", is_hero: true, order: 0 }]);
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);
  const [uploadMsg, setUploadMsg] = useState<{ idx: number; ok: boolean } | null>(null);

  function addImage() {
    setImages((prev) => [...prev, { url: "", is_hero: false, order: prev.length }]);
  }

  function removeImage(i: number) {
    setImages((prev) => prev.filter((_, idx) => idx !== i));
  }

  function updateImage(i: number, field: keyof ImageEntry, value: any) {
    setImages((prev) =>
      prev.map((img, idx) => (idx === i ? { ...img, [field]: value } : img)),
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    const { data: dest, error } = await supabase
      .from("destinations")
      .insert({
        title: form.title,
        category: form.category,
        subcategory: form.subcategory || null,
        description: form.description || null,
        location: form.location || null,
        address: form.address || null,
        price_range: form.price_range || null,
        opening_hours: form.opening_hours || null,
        latitude: form.latitude ? Number(form.latitude) : null,
        longitude: form.longitude ? Number(form.longitude) : null,
      })
      .select()
      .single();

    if (error || !dest) {
      alert("Gagal menyimpan: " + (error?.message || "Unknown"));
      setSubmitting(false);
      return;
    }

    const imageRows = images
      .filter((img) => img.url.trim())
      .map((img, i) => ({
        destination_id: dest.id,
        image_url: img.url.trim(),
        is_hero: img.is_hero,
        image_order: i,
      }));

    if (imageRows.length > 0) {
      await supabase.from("destination_images").insert(imageRows);
    }

    router.push("/admin/destinasi");
    router.refresh();
  }

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold text-[#1a1a1a]">Tambah Destinasi</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Title *" value={form.title} onChange={(v) => setForm((f) => ({ ...f, title: v }))} required />
          <Select
            label="Category *"
            value={form.category}
            onChange={(v) => setForm((f) => ({ ...f, category: v as any }))}
            options={[
              { value: "wisata", label: "Wisata" },
              { value: "kuliner", label: "Kuliner" },
              { value: "penginapan", label: "Penginapan" },
            ]}
            required
          />
          <Input label="Subcategory" value={form.subcategory} onChange={(v) => setForm((f) => ({ ...f, subcategory: v }))} />
          <Input label="Location" value={form.location} onChange={(v) => setForm((f) => ({ ...f, location: v }))} />
          <Input label="Price Range" value={form.price_range} onChange={(v) => setForm((f) => ({ ...f, price_range: v }))} />
          <Input label="Opening Hours" value={form.opening_hours} onChange={(v) => setForm((f) => ({ ...f, opening_hours: v }))} />
          <Input label="Latitude" value={form.latitude} onChange={(v) => setForm((f) => ({ ...f, latitude: v }))} type="number" step="any" />
          <Input label="Longitude" value={form.longitude} onChange={(v) => setForm((f) => ({ ...f, longitude: v }))} type="number" step="any" />
        </div>

        <Textarea label="Description" value={form.description} onChange={(v) => setForm((f) => ({ ...f, description: v }))} />
        <Textarea label="Address" value={form.address} onChange={(v) => setForm((f) => ({ ...f, address: v }))} />

        {/* Images */}
        <div>
          <label className="mb-1 block text-sm font-medium text-[#1a1a1a]">Images</label>
          <div className="space-y-2">
            {images.map((img, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-zinc-100">
                  {img.url.trim() ? (
                    <img
                      src={img.url}
                      alt=""
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                      onLoad={(e) => {
                        (e.target as HTMLImageElement).style.display = "block";
                      }}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-[#737373]">
                      📷
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    if (uploadingIdx !== null) return;
                    const input = document.createElement("input");
                    input.type = "file";
                    input.accept = "image/*";
                    input.onchange = async () => {
                      const file = input.files?.[0];
                      if (!file) return;
                      setUploadingIdx(i);
                      setUploadMsg(null);
                      const fd = new FormData();
                      fd.append("file", file);
                      try {
                        const res = await fetch("/api/upload", { method: "POST", body: fd });
                        const json = await res.json();
                        if (json.url) {
                          updateImage(i, "url", json.url);
                          setUploadMsg({ idx: i, ok: true });
                        } else {
                          setUploadMsg({ idx: i, ok: false });
                        }
                      } catch {
                        setUploadMsg({ idx: i, ok: false });
                      }
                      setUploadingIdx(null);
                      setTimeout(() => setUploadMsg(null), 1500);
                    };
                    input.click();
                  }}
                  className="shrink-0 rounded p-1.5 text-[#737373] hover:bg-zinc-100 disabled:opacity-50"
                  title="Upload gambar"
                >
                  {uploadingIdx === i ? (
                    <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="2" x2="12" y2="6" />
                      <line x1="12" y1="18" x2="12" y2="22" />
                      <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
                      <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
                      <line x1="2" y1="12" x2="6" y2="12" />
                      <line x1="18" y1="12" x2="22" y2="12" />
                      <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" />
                      <line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
                    </svg>
                  ) : uploadMsg?.idx === i && uploadMsg.ok ? (
                    <svg className="text-green-500" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : uploadMsg?.idx === i && !uploadMsg.ok ? (
                    <svg className="text-red-500" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                  )}
                </button>
                <input
                  type="url"
                  placeholder="URL gambar"
                  value={img.url}
                  onChange={(e) => updateImage(i, "url", e.target.value)}
                  className="flex-1 rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-[#0066cc]"
                />
                <label className="flex items-center gap-1 text-xs text-[#737373]">
                  <input
                    type="checkbox"
                    checked={img.is_hero}
                    onChange={(e) => updateImage(i, "is_hero", e.target.checked)}
                  />
                  Utama
                </label>
                {images.length > 1 && (
                  <button type="button" onClick={() => removeImage(i)} className="text-xs text-red-500 hover:underline">
                    Hapus
                  </button>
                )}
              </div>
            ))}
          </div>
          <button type="button" onClick={addImage} className="mt-2 text-xs text-[#0066cc] hover:underline">
            + Tambah gambar
          </button>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={submitting || !form.title}
            className="rounded-lg bg-[#0066cc] px-4 py-2 text-sm font-medium text-white hover:bg-[#0052a3] disabled:opacity-50"
          >
            {submitting ? "Menyimpan..." : "Simpan"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/admin/destinasi")}
            className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-[#737373] hover:bg-zinc-50"
          >
            Batal
          </button>
        </div>
      </form>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  required,
  type = "text",
  step,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  type?: string;
  step?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-[#1a1a1a]">{label}</label>
      <input
        type={type}
        required={required}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-[#0066cc]"
      />
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-[#1a1a1a]">{label}</label>
      <select
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-[#0066cc]"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function Textarea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-[#1a1a1a]">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-[#0066cc] resize-none"
      />
    </div>
  );
}

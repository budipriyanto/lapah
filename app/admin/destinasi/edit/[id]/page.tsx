"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { slugify } from "@/utils/slug";
import { uploadImageFile } from "@/utils/client-image";
import SaveProgressModal, { type SaveStage } from "@/components/SaveProgressModal";
import type { Destination, DestinationImage } from "@/utils/types";

type EditImageEntry = DestinationImage & { file?: File; preview?: string };

export default function EditDestinasi() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
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
  const [images, setImages] = useState<EditImageEntry[]>([]);
  const [save, setSave] = useState({
    open: false,
    stage: "upload" as SaveStage,
    progress: 0,
    uploaded: 0,
    total: 0,
    error: null as string | null,
  });

  useEffect(() => {
    let stale = false;
    fetch(`/api/destinations/${id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (stale) return;
        const d: Destination & { images?: DestinationImage[] } | null =
          json?.success ? json.data : null;
        if (!d) {
          router.push("/admin/destinasi");
          return;
        }
        setForm({
          title: d.title,
          category: d.category,
          subcategory: d.subcategory ?? "",
          description: d.description ?? "",
          location: d.location ?? "",
          address: d.address ?? "",
          price_range: d.price_range ?? "",
          opening_hours: d.opening_hours ?? "",
          latitude: d.latitude?.toString() ?? "",
          longitude: d.longitude?.toString() ?? "",
        });
        setImages(Array.isArray(d.images) ? d.images : []);
        setLoading(false);
      })
      .catch(() => {
        if (!stale) router.push("/admin/destinasi");
      });
    return () => {
      stale = true;
    };
  }, [id, router]);

  function addImage() {
    setImages((prev) => [
      ...prev,
      { id: "", destination_id: id, image_url: "", is_hero: false, image_order: prev.length, created_at: "" },
    ]);
  }

  function removeImage(i: number) {
    setImages((prev) => {
      const target = prev[i];
      if (target?.preview) URL.revokeObjectURL(target.preview);
      return prev.filter((_, idx) => idx !== i);
    });
  }

  function pickImage(i: number) {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      setImages((prev) =>
        prev.map((img, idx) => {
          if (idx !== i) return img;
          if (img.preview) URL.revokeObjectURL(img.preview);
          return { ...img, file, preview: URL.createObjectURL(file), image_url: "" };
        }),
      );
    };
    input.click();
  }

  function setManualUrl(i: number, value: string) {
    setImages((prev) =>
      prev.map((img, idx) => {
        if (idx !== i) return img;
        if (img.preview) URL.revokeObjectURL(img.preview);
        return { ...img, image_url: value, file: undefined, preview: undefined };
      }),
    );
  }

  function updateImage(i: number, field: string, value: string | boolean | number) {
    setImages((prev) => prev.map((img, idx) => (idx === i ? { ...img, [field]: value } : img)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);

    const pending = images.filter((img) => img.file);
    const steps = pending.length + 1;
    let completed = 0;
    setSave({
      open: true,
      stage: pending.length > 0 ? "upload" : "save",
      progress: pending.length > 0 ? 0 : 10,
      uploaded: 0,
      total: pending.length,
      error: null,
    });

    try {
      const built: { url: string; is_hero: boolean }[] = [];
      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        let url = img.image_url.trim();
        if (img.file) {
          url = await uploadImageFile(img.file, {
            slug: slugify(form.title),
            order: i,
          });
          completed++;
          setSave((s) => ({
            ...s,
            uploaded: completed,
            progress: Math.round((completed / steps) * 100),
          }));
        }
        if (url) built.push({ url, is_hero: img.is_hero });
      }

      setSave((s) => ({ ...s, stage: "save" }));

      const res = await fetch(`/api/destinations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          slug: slugify(form.title),
          category: form.category,
          subcategory: form.subcategory || null,
          description: form.description || null,
          location: form.location || null,
          address: form.address || null,
          price_range: form.price_range || null,
          opening_hours: form.opening_hours || null,
          latitude: form.latitude ? Number(form.latitude) : null,
          longitude: form.longitude ? Number(form.longitude) : null,
          images: built,
        }),
      });

      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        throw new Error(json?.error || `HTTP ${res.status}`);
      }

      setSave((s) => ({ ...s, stage: "done", progress: 100 }));
      setTimeout(() => {
        router.push("/admin/destinasi");
        router.refresh();
      }, 1000);
    } catch (err) {
      setSave((s) => ({
        ...s,
        stage: "error",
        error: err instanceof Error ? err.message : "Gagal menyimpan",
      }));
      setSubmitting(false);
    }
  }

  if (loading) return <div className="h-40 animate-pulse rounded-xl bg-zinc-200" />;

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold text-[#1a1a1a]">Edit Destinasi</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Title *" value={form.title} onChange={(v) => setForm((f) => ({ ...f, title: v }))} required />
          <div>
            <label className="mb-1 block text-sm font-medium text-[#1a1a1a]">Slug</label>
            <input type="text" value={slugify(form.title)} readOnly
              className="w-full cursor-not-allowed rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-500 outline-none" />
          </div>
          <Select
            label="Category *"
            value={form.category}
            onChange={(v) => setForm((f) => ({ ...f, category: v as "wisata" | "kuliner" | "penginapan" }))}
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

        <div>
          <label className="mb-1 block text-sm font-medium text-[#1a1a1a]">Images</label>
          <div className="space-y-2">
            {images.map((img, i) => (
              <div key={i} className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
                <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-zinc-100">
                  {img.preview || img.image_url.trim() ? (
                    <img
                      src={img.preview || img.image_url}
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
                  onClick={() => pickImage(i)}
                  className="shrink-0 rounded p-1.5 text-[#737373] hover:bg-zinc-100 disabled:opacity-50"
                  title="Pilih gambar"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                </button>
                {img.file && (
                  <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                    belum diunggah
                  </span>
                )}
<input
                  placeholder="URL gambar"
                  value={img.image_url}
                  onChange={(e) => setManualUrl(i, e.target.value)}
                  className="min-w-[130px] flex-1 rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-[#0066cc]"
                />
                <div className="flex shrink-0 items-center gap-2">
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
      <SaveProgressModal
        open={save.open}
        stage={save.stage}
        progress={save.progress}
        uploaded={save.uploaded}
        total={save.total}
        error={save.error}
        onClose={() => setSave((s) => ({ ...s, open: false }))}
      />
    </div>
  );
}

function Input({ label, value, onChange, required, type = "text", step }: {
  label: string; value: string; onChange: (v: string) => void; required?: boolean; type?: string; step?: string;
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

function Select({ label, value, onChange, options, required }: {
  label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; required?: boolean;
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

function Textarea({ label, value, onChange }: {
  label: string; value: string; onChange: (v: string) => void;
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

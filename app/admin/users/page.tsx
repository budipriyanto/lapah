"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

type Role = "user" | "admin" | "moderator";

interface AdminUser {
  id: string;
  email: string;
  full_name: string | null;
  role: Role;
  is_active: number;
  is_verified: number;
  created_at: string;
}

const ROLE_OPTIONS: Role[] = ["user", "admin", "moderator"];

const ROLE_BADGE: Record<Role, string> = {
  user: "bg-zinc-100 text-zinc-600",
  admin: "bg-blue-100 text-blue-700",
  moderator: "bg-purple-100 text-purple-700",
};

export default function AdminUsers() {
  const { user } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    role: "admin" as Role,
  });

  useEffect(() => {
    let stale = false;
    fetch("/api/admin/users")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (stale) return;
        if (json?.success && Array.isArray(json.data)) {
          setUsers(json.data);
        }
        setLoading(false);
      })
      .catch(() => {
        if (!stale) setLoading(false);
      });
    return () => {
      stale = true;
    };
  }, []);

  async function patchUser(id: string, body: Record<string, unknown>): Promise<boolean> {
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => null);
      alert(json?.error || "Gagal memperbarui pengguna");
      return false;
    }
    return true;
  }

  async function handleRoleChange(u: AdminUser, role: Role) {
    if (role === u.role) return;
    if (!confirm(`Ubah role ${u.email} menjadi "${role}"?\nSesi aktif pengguna akan hangus (wajib login ulang).`)) {
      return;
    }
    if (await patchUser(u.id, { role })) {
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, role } : x)));
    }
  }

  async function handleToggleActive(u: AdminUser) {
    const next = u.is_active ? 0 : 1;
    const msg = next === 0
      ? `Nonaktifkan ${u.email}? Ia tidak bisa login sampai diaktifkan lagi.`
      : `Aktifkan kembali ${u.email}?`;
    if (!confirm(msg)) return;
    if (await patchUser(u.id, { isActive: Boolean(next) })) {
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, is_active: next } : x)));
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!form.fullName || !form.email || !form.password) {
      setFormError("Nama, email, dan password wajib diisi.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: form.fullName,
          email: form.email,
          password: form.password,
          role: form.role,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setFormError(json?.error || "Gagal membuat pengguna");
        return;
      }
      setUsers((prev) => [json.data, ...prev]);
      setForm({ fullName: "", email: "", password: "", role: "admin" });
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div>
        <div className="mb-4 h-8 w-40 animate-pulse rounded bg-zinc-200" />
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-white shadow-sm" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-[#1a1a1a]">Pengguna ({users.length})</h1>
        <button
          onClick={() => {
            setFormError(null);
            setShowForm(true);
          }}
          className="rounded-lg bg-[#0066cc] px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-[#0055aa]"
        >
          + Tambah Pengguna
        </button>
      </div>

      {users.length === 0 ? (
        <p className="py-8 text-center text-sm text-[#737373]">Belum ada pengguna</p>
      ) : (
        <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-100 text-xs text-[#737373]">
                <th className="px-4 py-3 font-medium">Pengguna</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Terdaftar</th>
                <th className="px-4 py-3 text-right font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const isSelf = u.id === user?.id;
                return (
                  <tr key={u.id} className="border-b border-zinc-50 last:border-0">
                    <td className="px-4 py-3">
                      <p className="font-medium text-[#1a1a1a]">
                        {u.full_name || "(tanpa nama)"}
                        {isSelf && (
                          <span className="ml-1.5 text-xs font-normal text-[#737373]">(Anda)</span>
                        )}
                      </p>
                      <p className="text-xs text-[#737373]">{u.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_BADGE[u.role]}`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <span className={u.is_active ? "text-emerald-600" : "text-red-500"}>
                        {u.is_active ? "Aktif" : "Nonaktif"}
                      </span>
                      <span className="ml-2 text-[#737373]">
                        {u.is_verified ? "· terverifikasi" : "· belum verifikasi"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-[#737373]">
                      {new Date(u.created_at).toLocaleDateString("id-ID")}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <select
                          value={u.role}
                          disabled={isSelf}
                          onChange={(e) => handleRoleChange(u, e.target.value as Role)}
                          className="rounded border border-zinc-200 px-2 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {ROLE_OPTIONS.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => handleToggleActive(u)}
                          disabled={isSelf}
                          className={`rounded px-2 py-1 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                            u.is_active
                              ? "text-red-500 hover:bg-red-50"
                              : "text-emerald-600 hover:bg-emerald-50"
                          }`}
                        >
                          {u.is_active ? "Nonaktifkan" : "Aktifkan"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form
            onSubmit={handleCreate}
            className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
          >
            <h2 className="mb-4 text-lg font-bold text-[#1a1a1a]">Tambah Pengguna</h2>

            {formError && (
              <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
                {formError}
              </p>
            )}

            <label className="mb-1 block text-xs font-medium text-[#737373]">
              Nama lengkap
            </label>
            <input
              type="text"
              required
              value={form.fullName}
              onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
              className="mb-3 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-[#0066cc] focus:outline-none"
            />

            <label className="mb-1 block text-xs font-medium text-[#737373]">Email</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className="mb-3 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-[#0066cc] focus:outline-none"
            />

            <label className="mb-1 block text-xs font-medium text-[#737373]">Password</label>
            <input
              type="password"
              required
              minLength={8}
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              className="mb-3 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-[#0066cc] focus:outline-none"
            />

            <label className="mb-1 block text-xs font-medium text-[#737373]">Role</label>
            <select
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as Role }))}
              className="mb-5 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-[#0066cc] focus:outline-none"
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-lg border border-zinc-200 px-3 py-2 text-xs font-medium text-[#737373] hover:bg-zinc-50"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-[#0066cc] px-3 py-2 text-xs font-medium text-white hover:bg-[#0055aa] disabled:opacity-50"
              >
                {saving ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

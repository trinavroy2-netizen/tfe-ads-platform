"use client";

import { useState } from "react";
import { api, Ad, Placement, API_BASE, getToken } from "@/lib/api";

function toLocalInput(dt: string | null) {
  if (!dt) return "";
  return dt.slice(0, 16);
}

export default function AdForm({
  placements,
  editingAd,
  onSaved,
  onCancel,
}: {
  placements: Placement[];
  editingAd: Ad | null;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    placement_id: editingAd?.placement_id || placements[0]?.id || "",
    title: editingAd?.title || "",
    image_url: editingAd?.image_url || "",
    target_url: editingAd?.target_url || "",
    alt_text: editingAd?.alt_text || "",
    sort_order: editingAd?.sort_order ?? 0,
    start_at: toLocalInput(editingAd?.start_at ?? null),
    end_at: toLocalInput(editingAd?.end_at ?? null),
    open_in_new_tab: editingAd?.open_in_new_tab ?? true,
    is_active: editingAd?.is_active ?? true,
  });
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`${API_BASE}/api/admin/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
        body: fd,
      });
      if (!res.ok) throw new Error((await res.json()).detail || "Upload failed");
      const data = await res.json();
      setForm((f) => ({ ...f, image_url: data.url }));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    const payload = {
      ...form,
      start_at: form.start_at ? new Date(form.start_at).toISOString() : null,
      end_at: form.end_at ? new Date(form.end_at).toISOString() : null,
    };
    try {
      if (editingAd) {
        await api.patch(`/api/admin/ads/${editingAd.id}`, payload);
      } else {
        await api.post("/api/admin/ads", payload);
      }
      onSaved();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-4">
      <h2 className="font-semibold">{editingAd ? "Edit ad" : "New ad"}</h2>
      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label>Placement</label>
          <select value={form.placement_id} onChange={(e) => setForm({ ...form, placement_id: e.target.value })}>
            {placements.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label>Title (internal reference)</label>
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
        </div>
      </div>

      <div>
        <label>Ad image</label>
        <input type="file" accept="image/*" onChange={handleUpload} />
        {uploading && <p className="text-xs text-gray-400 mt-1">Uploading...</p>}
        {form.image_url && (
          <div className="mt-2 flex items-center gap-3">
            <img src={form.image_url} alt="preview" className="h-16 rounded border border-[#2a3140]" />
            <input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="or paste an image URL" />
          </div>
        )}
        {!form.image_url && (
          <input className="mt-2" value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="or paste an image URL" />
        )}
      </div>

      <div>
        <label>Destination link (CTA)</label>
        <input value={form.target_url} onChange={(e) => setForm({ ...form, target_url: e.target.value })} placeholder="https://advertiser-site.com/campaign" required />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label>Alt text</label>
          <input value={form.alt_text} onChange={(e) => setForm({ ...form, alt_text: e.target.value })} />
        </div>
        <div>
          <label>Sort order (lower = shown first)</label>
          <input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: +e.target.value })} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label>Start showing at (optional)</label>
          <input type="datetime-local" value={form.start_at} onChange={(e) => setForm({ ...form, start_at: e.target.value })} />
        </div>
        <div>
          <label>Stop showing at (optional)</label>
          <input type="datetime-local" value={form.end_at} onChange={(e) => setForm({ ...form, end_at: e.target.value })} />
        </div>
      </div>

      <div className="flex items-center gap-6">
        <label className="flex items-center gap-2 normal-case text-sm text-gray-300">
          <input type="checkbox" className="w-auto" checked={form.open_in_new_tab} onChange={(e) => setForm({ ...form, open_in_new_tab: e.target.checked })} />
          Open link in new tab
        </label>
        <label className="flex items-center gap-2 normal-case text-sm text-gray-300">
          <input type="checkbox" className="w-auto" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
          Active
        </label>
      </div>

      <div className="flex gap-3">
        <button className="btn" disabled={saving || uploading}>{saving ? "Saving..." : "Save ad"}</button>
        <button type="button" className="btn-secondary btn" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

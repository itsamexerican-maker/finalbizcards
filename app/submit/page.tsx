// app/submit/page.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast, Toaster } from "sonner";

type Category = { id: string; name: string; color: string };

const RANK_OPTIONS = ["Major", "Lieutenant Colonel", "Colonel"];

export default function SubmitPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted]   = useState(false);
  const fileInputRef                = useRef<HTMLInputElement>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile]       = useState<File | null>(null);

  const [form, setForm] = useState({
    name:             "",
    rank:             "Major",
    regiment:         "",
    category_id:      "",
    years_of_service: "",
  });

  useEffect(() => {
    supabase
      .from("categories")
      .select("id, name, color")
      .order("name")
      .then(({ data }) => { if (data) setCategories(data); });
  }, []);

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!["image/png", "image/jpeg", "image/jpg"].includes(file.type)) {
      toast.error("Photo must be PNG or JPG.", { duration: 6000 });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Photo must be under 2MB.", { duration: 6000 });
      return;
    }

    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.name.trim())    return toast.warning("Name is required.", { duration: 4000 });
    if (!form.regiment.trim()) return toast.warning("Regiment is required.", { duration: 4000 });
    if (!form.category_id)    return toast.warning("Please select a country.", { duration: 4000 });

    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("name",             form.name.trim());
      formData.append("rank",             form.rank);
      formData.append("regiment",         form.regiment.trim());
      formData.append("category_id",      form.category_id);
      formData.append("years_of_service", form.years_of_service || "0");
      if (photoFile) formData.append("photo", photoFile);

      const res  = await fetch("/api/submit", { method: "POST", body: formData });
      const json = await res.json();

      if (!res.ok) {
        toast.error(json.error ?? "Submission failed. Please try again.", { duration: 6000 });
      } else {
        setSubmitted(true);
        toast.success("Submission received! Awaiting admin approval.", { duration: 4000 });
      }
    } catch {
      toast.error("Network error. Please try again.", { duration: 6000 });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Toaster position="top-center" richColors />
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700;900&family=IM+Fell+English:ital@0;1&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      `}</style>

      <main
        className="min-h-screen px-6 py-12"
        style={{
          backgroundColor: "#f0deb4",
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='400' height='400' filter='url(%23noise)' opacity='0.07'/%3E%3C/svg%3E")`,
        }}
      >
        <div className="mx-auto max-w-xl">

          {/* Back link */}
          <a href="/" className="mb-8 inline-block font-[Cinzel] text-[10px] font-bold uppercase tracking-widest text-amber-800/60 border-b border-amber-700/30 pb-0.5 transition-all hover:text-amber-800">
            ← Return to Roster
          </a>

          {/* Header */}
          <div
            className="relative mb-8 border-2 border-amber-700/50 px-8 py-7 text-center"
            style={{ background: "rgba(253,246,227,0.85)", boxShadow: "inset 0 0 40px rgba(139,109,56,0.07)" }}
          >
            <div className="pointer-events-none absolute inset-2 border border-amber-700/20" />
            <p className="mb-2 font-[Cinzel] text-[11px] tracking-[0.5em] text-amber-600">✦ ✦ ✦</p>
            <h1 className="font-[Cinzel] text-2xl font-black uppercase tracking-widest text-[#2c1810]">
              Submit an Officer
            </h1>
            <p className="mt-2 font-['IM_Fell_English'] text-[14px] italic text-amber-800/70">
              Nominations for the Grand Army Officer Roster are reviewed by the General Staff before publication.
            </p>
            <p className="mt-2 font-[Cinzel] text-[11px] tracking-[0.5em] text-amber-600">✦ ✦ ✦</p>
          </div>

          {submitted ? (
            /* Success state */
            <div
              className="border border-green-700/30 p-8 text-center"
              style={{ background: "rgba(240,253,244,0.9)" }}
            >
              <div className="mb-4 text-4xl">✓</div>
              <h2 className="mb-2 font-[Cinzel] text-[14px] font-bold uppercase tracking-widest text-green-800">
                Submission Received
              </h2>
              <p className="font-['IM_Fell_English'] text-[14px] italic text-green-700/80">
                Your nomination has been forwarded to the General Staff for review.
                You will not be notified of the outcome, but approved officers will
                appear on the public roster.
              </p>
              <a
                href="/"
                className="mt-6 inline-block font-[Cinzel] text-[10px] font-bold uppercase tracking-widest text-green-800 border-b border-green-700/40 pb-0.5"
              >
                Return to Roster
              </a>
            </div>
          ) : (
            /* Form */
            <form
              onSubmit={handleSubmit}
              className="border border-amber-700/40 p-8 space-y-5"
              style={{ background: "rgba(253,246,227,0.9)" }}
            >
              {/* Name */}
              <div>
                <label className="block font-[Cinzel] text-[9px] uppercase tracking-widest text-amber-800/70 mb-1">
                  Full Name <span className="text-red-600">*</span>
                </label>
                <input
                  className="w-full rounded-sm border border-amber-700/30 bg-amber-50 px-3 py-2 font-[Cinzel] text-[11px] text-[#2c1810] outline-none focus:ring-2 focus:ring-amber-700/40"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Officer's full name"
                />
              </div>

              {/* Rank */}
              <div>
                <label className="block font-[Cinzel] text-[9px] uppercase tracking-widest text-amber-800/70 mb-1">
                  Rank
                </label>
                <select
                  className="w-full rounded-sm border border-amber-700/30 bg-amber-50 px-3 py-2 font-[Cinzel] text-[11px] text-[#2c1810] outline-none focus:ring-2 focus:ring-amber-700/40"
                  value={form.rank}
                  onChange={(e) => setForm({ ...form, rank: e.target.value })}
                >
                  {RANK_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>

              {/* Regiment */}
              <div>
                <label className="block font-[Cinzel] text-[9px] uppercase tracking-widest text-amber-800/70 mb-1">
                  Regiment <span className="text-red-600">*</span>
                </label>
                <input
                  className="w-full rounded-sm border border-amber-700/30 bg-amber-50 px-3 py-2 font-[Cinzel] text-[11px] text-[#2c1810] outline-none focus:ring-2 focus:ring-amber-700/40"
                  value={form.regiment}
                  onChange={(e) => setForm({ ...form, regiment: e.target.value })}
                  placeholder="e.g. 3rd Foot Infantry"
                />
              </div>

              {/* Country */}
              <div>
                <label className="block font-[Cinzel] text-[9px] uppercase tracking-widest text-amber-800/70 mb-1">
                  Country <span className="text-red-600">*</span>
                </label>
                <select
                  className="w-full rounded-sm border border-amber-700/30 bg-amber-50 px-3 py-2 font-[Cinzel] text-[11px] text-[#2c1810] outline-none focus:ring-2 focus:ring-amber-700/40"
                  value={form.category_id}
                  onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                >
                  <option value="">— Select a country —</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              {/* Years of Service */}
              <div>
                <label className="block font-[Cinzel] text-[9px] uppercase tracking-widest text-amber-800/70 mb-1">
                  Years of Service
                </label>
                <input
                  type="number" min={0}
                  className="w-full rounded-sm border border-amber-700/30 bg-amber-50 px-3 py-2 font-[Cinzel] text-[11px] text-[#2c1810] outline-none focus:ring-2 focus:ring-amber-700/40"
                  value={form.years_of_service}
                  onChange={(e) => setForm({ ...form, years_of_service: e.target.value })}
                  placeholder="0"
                />
              </div>

              {/* Profile photo upload */}
              <div>
                <label className="block font-[Cinzel] text-[9px] uppercase tracking-widest text-amber-800/70 mb-1">
                  Portrait Photo <span className="text-amber-700/50">(Optional — PNG/JPG, max 2MB)</span>
                </label>

                {photoPreview && (
                  <div className="mb-3 flex items-center gap-3">
                    <img
                      src={photoPreview}
                      alt="Preview"
                      className="h-16 w-16 rounded-full border-2 border-amber-700/40 object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => { setPhotoPreview(null); setPhotoFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                      className="font-[Cinzel] text-[9px] font-bold uppercase tracking-widest text-red-700/70 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg"
                  onChange={handlePhotoChange}
                  className="w-full rounded-sm border border-amber-700/30 bg-amber-50 px-3 py-2 font-[Cinzel] text-[10px] text-amber-800/70 file:mr-3 file:rounded-sm file:border-0 file:bg-amber-700/10 file:px-3 file:py-1 file:font-[Cinzel] file:text-[9px] file:font-bold file:uppercase file:tracking-widest file:text-amber-800"
                />
              </div>

              {/* Submit */}
              <div className="flex justify-end gap-3 pt-2">
                <a
                  href="/"
                  className="cursor-pointer rounded-sm border border-amber-700/30 bg-amber-50 px-5 py-2 font-[Cinzel] text-[10px] font-bold uppercase tracking-widest text-amber-900/70 transition-all hover:bg-amber-100"
                >
                  Cancel
                </a>
                <button
                  type="submit"
                  disabled={submitting}
                  className="cursor-pointer rounded-sm bg-[#2c1810] px-6 py-2 font-[Cinzel] text-[10px] font-bold uppercase tracking-widest text-amber-100 shadow transition-all hover:-translate-y-0.5 hover:shadow-md disabled:opacity-50"
                >
                  {submitting ? "Submitting…" : "Submit Nomination"}
                </button>
              </div>
            </form>
          )}

        </div>
      </main>
    </>
  );
}

"use client";
export const dynamic = "force-dynamic";

import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";
import OfficerCard, { Officer } from "@/components/OfficerCard";
import AuthButton from "@/components/AuthButton";

// ── Types ──────────────────────────────────────────────────────────────────

type Category = {
  id: string;
  name: string;
  color: string;
};

type RawCard = {
  id: string;
  name: string;
  rank: string;
  regiment: string;
  years_of_service: number;
  categories: { name: string; color: string }[] | { name: string; color: string } | null;
};

function normalize(raw: RawCard): Officer | null {
  const cat = Array.isArray(raw.categories)
    ? raw.categories[0]
    : raw.categories;
  if (!cat) return null;
  return {
    id: raw.id,
    name: raw.name,
    rank: raw.rank,
    regiment: raw.regiment,
    years_of_service: raw.years_of_service,
    categories: { name: cat.name, color: cat.color },
  };
}

const RANK_OPTIONS = ["Major", "Lieutenant Colonel", "Colonel"];

const EMPTY_FORM = {
  name: "",
  rank: "Major",
  regiment: "",
  years_of_service: "",
  category_id: "",
};

const RING_COLOR: Record<string, string> = {
  "bg-blue-800":   "ring-blue-800",
  "bg-gray-700":   "ring-gray-700",
  "bg-indigo-700": "ring-indigo-700",
  "bg-yellow-600": "ring-yellow-600",
  "bg-green-700":  "ring-green-700",
  "bg-slate-600":  "ring-slate-600",
  "bg-red-700":    "ring-red-700",
  "bg-amber-700":  "ring-amber-700",
};

// ── Component ──────────────────────────────────────────────────────────────

export default function Page() {
  const [officers, setOfficers]             = useState<Officer[]>([]);
  const [categories, setCategories]         = useState<Category[]>([]);
  const [user, setUser]                     = useState<any>(null);
  const [loading, setLoading]               = useState(true);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  // Add form
  const [showAddForm, setShowAddForm] = useState(false);
  const [addFormData, setAddFormData] = useState<any>(EMPTY_FORM);
  const [adding, setAdding]           = useState(false);

  // Edit form
  const [editingId, setEditingId]       = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<any>({});

  // ── Auth + data fetch ──────────────────────────────────────────────────

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };

    const fetchData = async () => {
      const [cardsRes, catsRes] = await Promise.all([
        supabase
          .from("cards")
          .select("id, name, rank, regiment, years_of_service, categories ( name, color )")
          .order("name"),
        supabase
          .from("categories")
          .select("id, name, color")
          .order("name"),
      ]);

      if (catsRes.error)  console.error("categories error:", catsRes.error);
      if (cardsRes.error) console.error("cards error:", cardsRes.error);

      if (catsRes.data)  setCategories(catsRes.data);
      if (cardsRes.data) {
        const normalized = (cardsRes.data as RawCard[])
          .map(normalize)
          .filter((o): o is Officer => o !== null);
        setOfficers(normalized);
      }
      setLoading(false);
    };

    getUser();
    fetchData();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => setUser(session?.user ?? null)
    );
    return () => subscription.unsubscribe();
  }, []);

  // ── Real-time ──────────────────────────────────────────────────────────

  useEffect(() => {
    const channel = supabase
      .channel("roster-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "cards" },
        async () => {
          const { data } = await supabase
            .from("cards")
            .select("id, name, rank, regiment, years_of_service, categories ( name, color )")
            .order("name");
          if (data) {
            const normalized = (data as RawCard[])
              .map(normalize)
              .filter((o): o is Officer => o !== null);
            setOfficers(normalized);
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // ── Add handler ───────────────────────────────────────────────────────

  const handleAdd = async () => {
    const { name, rank, regiment, years_of_service, category_id } = addFormData;
    if (!name.trim())     return alert("Name is required.");
    if (!regiment.trim()) return alert("Regiment is required.");
    if (!category_id)     return alert("Country is required.");

    setAdding(true);
    const { data, error } = await supabase
      .from("cards")
      .insert([{
        name,
        rank,
        regiment,
        years_of_service: parseInt(years_of_service) || 0,
        category_id,
      }])
      .select("id, name, rank, regiment, years_of_service, categories ( name, color )")
      .single();

    if (error) {
      alert(`Add failed: ${error.message}`);
    } else if (data) {
      const normalized = normalize(data as RawCard);
      if (normalized)
        setOfficers((prev) =>
          [...prev, normalized].sort((a, b) => a.name.localeCompare(b.name))
        );
      setAddFormData(EMPTY_FORM);
      setShowAddForm(false);
    }
    setAdding(false);
  };

  // ── Edit handlers ─────────────────────────────────────────────────────

  const handleEditClick = (officer: Officer) => {
    setEditingId(officer.id);
    setEditFormData({
      name: officer.name,
      rank: officer.rank,
      regiment: officer.regiment,
      years_of_service: officer.years_of_service,
    });
  };

  const handleSave = async (id: string) => {
    const { name, rank, regiment, years_of_service } = editFormData;
    const { error } = await supabase
      .from("cards")
      .update({ name, rank, regiment, years_of_service: parseInt(years_of_service) || 0 })
      .eq("id", id);

    if (error) {
      alert(`Update failed: ${error.message}`);
    } else {
      setOfficers((prev) =>
        prev.map((o) =>
          o.id === id
            ? { ...o, name, rank, regiment, years_of_service: parseInt(years_of_service) || 0 }
            : o
        )
      );
      setEditingId(null);
    }
  };

  // ── Filter ────────────────────────────────────────────────────────────

  const displayed = activeCategory
    ? officers.filter((o) => o.categories.name === activeCategory)
    : officers;

  // ── Render ────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center"
        style={{ backgroundColor: "#f0deb4" }}>
        <p className="font-['IM_Fell_English'] text-lg italic tracking-widest text-amber-800/60">
          Unfurling the roster…
        </p>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700;900&family=IM+Fell+English:ital@0;1&display=swap');
      `}</style>

      <main
        className="min-h-screen px-6 py-10"
        style={{
          backgroundColor: "#f0deb4",
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='400' height='400' filter='url(%23noise)' opacity='0.07'/%3E%3C/svg%3E")`,
        }}
      >
        <div className="mx-auto max-w-5xl">

          {/* ── Auth bar — uses AuthButton component from components/AuthButton.tsx ── */}
          <nav className="mb-6 flex justify-end">
            <AuthButton />
          </nav>

          {/* ── Page header ── */}
          <header
            className="relative mb-10 border-2 border-amber-700/50 px-8 py-8 text-center"
            style={{
              background: "rgba(253,246,227,0.72)",
              boxShadow: "inset 0 0 48px rgba(139,109,56,0.08), 0 4px 16px rgba(0,0,0,0.08)",
            }}
          >
            <div className="pointer-events-none absolute inset-2 border border-amber-700/25" />
            <p className="mb-1 font-[Cinzel] text-[11px] tracking-[0.5em] text-amber-600">✦ ✦ ✦</p>
            <h1 className="font-[Cinzel] text-3xl font-black uppercase tracking-widest text-[#2c1810] sm:text-4xl">
              Grand Army Officer Roster
            </h1>
            <p className="mt-2 font-['IM_Fell_English'] text-[15px] italic tracking-wide text-amber-800/70">
              Field Officers of the Allied Nations — Candidates for Brigade Command
            </p>
            <p className="mt-2 font-[Cinzel] text-[11px] tracking-[0.5em] text-amber-600">✦ ✦ ✦</p>

            {/* Enlist Officer button — only when logged in */}
            {user && (
              <button
                onClick={() => { setShowAddForm(!showAddForm); setAddFormData(EMPTY_FORM); }}
                className="mt-6 inline-flex cursor-pointer items-center gap-2 rounded-sm border border-amber-700/50 bg-[#2c1810] px-6 py-2 font-[Cinzel] text-[10.5px] font-bold uppercase tracking-widest text-amber-100 shadow transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <span className="text-base leading-none">{showAddForm ? "✕" : "+"}</span>
                {showAddForm ? "Cancel" : "Enlist Officer"}
              </button>
            )}
          </header>

          {/* ── Add Officer form — only when logged in ── */}
          {user && showAddForm && (
            <div
              className="mb-10 border border-amber-700/40 p-8 max-w-2xl mx-auto"
              style={{ background: "rgba(253,246,227,0.9)" }}
            >
              <h2 className="font-[Cinzel] text-[13px] font-bold uppercase tracking-widest text-[#2c1810] mb-6">
                New Officer Record
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="block font-[Cinzel] text-[9px] uppercase tracking-widest text-amber-800/70 mb-1">
                    Name <span className="text-red-600">*</span>
                  </label>
                  <input
                    className="w-full rounded-sm border border-amber-700/30 bg-amber-50 px-3 py-2 font-[Cinzel] text-[11px] text-[#2c1810] outline-none focus:ring-2 focus:ring-amber-700/40"
                    value={addFormData.name}
                    onChange={(e) => setAddFormData({ ...addFormData, name: e.target.value })}
                    placeholder="Officer's full name"
                  />
                </div>
                <div>
                  <label className="block font-[Cinzel] text-[9px] uppercase tracking-widest text-amber-800/70 mb-1">
                    Rank <span className="text-red-600">*</span>
                  </label>
                  <select
                    className="w-full rounded-sm border border-amber-700/30 bg-amber-50 px-3 py-2 font-[Cinzel] text-[11px] text-[#2c1810] outline-none focus:ring-2 focus:ring-amber-700/40"
                    value={addFormData.rank}
                    onChange={(e) => setAddFormData({ ...addFormData, rank: e.target.value })}
                  >
                    {RANK_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block font-[Cinzel] text-[9px] uppercase tracking-widest text-amber-800/70 mb-1">
                    Regiment <span className="text-red-600">*</span>
                  </label>
                  <input
                    className="w-full rounded-sm border border-amber-700/30 bg-amber-50 px-3 py-2 font-[Cinzel] text-[11px] text-[#2c1810] outline-none focus:ring-2 focus:ring-amber-700/40"
                    value={addFormData.regiment}
                    onChange={(e) => setAddFormData({ ...addFormData, regiment: e.target.value })}
                    placeholder="e.g. 3rd Foot Infantry"
                  />
                </div>
                <div>
                  <label className="block font-[Cinzel] text-[9px] uppercase tracking-widest text-amber-800/70 mb-1">
                    Years of Service
                  </label>
                  <input
                    type="number" min={0}
                    className="w-full rounded-sm border border-amber-700/30 bg-amber-50 px-3 py-2 font-[Cinzel] text-[11px] text-[#2c1810] outline-none focus:ring-2 focus:ring-amber-700/40"
                    value={addFormData.years_of_service}
                    onChange={(e) => setAddFormData({ ...addFormData, years_of_service: e.target.value })}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block font-[Cinzel] text-[9px] uppercase tracking-widest text-amber-800/70 mb-1">
                    Country <span className="text-red-600">*</span>
                  </label>
                  <select
                    className="w-full rounded-sm border border-amber-700/30 bg-amber-50 px-3 py-2 font-[Cinzel] text-[11px] text-[#2c1810] outline-none focus:ring-2 focus:ring-amber-700/40"
                    value={addFormData.category_id}
                    onChange={(e) => setAddFormData({ ...addFormData, category_id: e.target.value })}
                  >
                    <option value="">— Select a country —</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setShowAddForm(false)}
                  className="cursor-pointer rounded-sm border border-amber-700/30 bg-amber-50 px-5 py-2 font-[Cinzel] text-[10px] font-bold uppercase tracking-widest text-amber-900/70 transition-all hover:bg-amber-100"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAdd}
                  disabled={adding}
                  className="cursor-pointer rounded-sm bg-[#2c1810] px-6 py-2 font-[Cinzel] text-[10px] font-bold uppercase tracking-widest text-amber-100 shadow transition-all hover:-translate-y-0.5 hover:shadow-md disabled:opacity-50"
                >
                  {adding ? "Enlisting…" : "Enlist Officer"}
                </button>
              </div>
            </div>
          )}

          {/* ── Category filter buttons ── */}
          <nav className="mb-3 flex flex-wrap justify-center gap-2.5">
            <button
              onClick={() => setActiveCategory(null)}
              className={[
                "cursor-pointer rounded-sm px-4 py-1.5",
                "font-[Cinzel] text-[10.5px] font-bold uppercase tracking-widest text-amber-100",
                "bg-[#2c1810] transition-all duration-150 hover:-translate-y-0.5 hover:shadow-lg",
                activeCategory === null
                  ? "ring-2 ring-[#2c1810] ring-offset-2 ring-offset-[#f0deb4]"
                  : "",
              ].join(" ")}
            >
              All Nations
            </button>
            {categories.map((cat) => {
              const isActive  = activeCategory === cat.name;
              const ringClass = RING_COLOR[cat.color] ?? "ring-stone-600";
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(isActive ? null : cat.name)}
                  className={[
                    cat.color,
                    "cursor-pointer rounded-sm px-4 py-1.5",
                    "font-[Cinzel] text-[10.5px] font-bold uppercase tracking-widest text-white drop-shadow-sm",
                    "transition-all duration-150 hover:-translate-y-0.5 hover:shadow-lg",
                    isActive ? `ring-2 ${ringClass} ring-offset-2 ring-offset-[#f0deb4]` : "",
                  ].join(" ")}
                >
                  {cat.name}
                </button>
              );
            })}
          </nav>

          {/* ── Officer count ── */}
          <p className="mb-8 text-center font-['IM_Fell_English'] text-[13px] italic tracking-wide text-amber-800/65">
            {displayed.length} officer{displayed.length !== 1 ? "s" : ""} on record
          </p>

          {/* ── Card grid ── */}
          <div className="flex flex-wrap justify-center gap-7">
            {displayed.map((officer) => (
              <div key={officer.id} className="flex flex-col items-center gap-2">
                <OfficerCard officer={officer} />

                {/* Edit controls — only when logged in */}
                {user && (
                  editingId === officer.id ? (
                    <div
                      className="w-52 border border-amber-700/40 p-3 space-y-2"
                      style={{ background: "rgba(253,246,227,0.95)" }}
                    >
                      {[
                        { key: "name",             label: "Name",        type: "text"   },
                        { key: "regiment",         label: "Regiment",    type: "text"   },
                        { key: "years_of_service", label: "Yrs Service", type: "number" },
                      ].map(({ key, label, type }) => (
                        <div key={key}>
                          <label className="block font-[Cinzel] text-[8px] uppercase tracking-widest text-amber-800/60 mb-0.5">
                            {label}
                          </label>
                          <input
                            type={type}
                            className="w-full rounded-sm border border-amber-700/30 bg-amber-50 px-2 py-1 font-[Cinzel] text-[10px] text-[#2c1810] outline-none"
                            value={editFormData[key] ?? ""}
                            onChange={(e) => setEditFormData({ ...editFormData, [key]: e.target.value })}
                          />
                        </div>
                      ))}
                      <div>
                        <label className="block font-[Cinzel] text-[8px] uppercase tracking-widest text-amber-800/60 mb-0.5">
                          Rank
                        </label>
                        <select
                          className="w-full rounded-sm border border-amber-700/30 bg-amber-50 px-2 py-1 font-[Cinzel] text-[10px] text-[#2c1810] outline-none"
                          value={editFormData.rank ?? "Major"}
                          onChange={(e) => setEditFormData({ ...editFormData, rank: e.target.value })}
                        >
                          {RANK_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => handleSave(officer.id)}
                          className="flex-1 cursor-pointer rounded-sm bg-[#2c1810] py-1 font-[Cinzel] text-[9px] font-bold uppercase tracking-widest text-amber-100 hover:opacity-90"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="flex-1 cursor-pointer rounded-sm border border-amber-700/30 bg-amber-50 py-1 font-[Cinzel] text-[9px] font-bold uppercase tracking-widest text-amber-900/70 hover:bg-amber-100"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleEditClick(officer)}
                      className="cursor-pointer rounded-sm border border-amber-700/30 bg-[#fdf6e3] px-4 py-1 font-[Cinzel] text-[9px] font-bold uppercase tracking-widest text-amber-800/70 shadow-sm transition-all hover:bg-amber-100 hover:shadow-md"
                    >
                      Edit Officer
                    </button>
                  )
                )}
              </div>
            ))}
          </div>

          {/* ── Footer ── */}
          <footer className="mt-16 text-center">
            <p className="mb-1 font-[Cinzel] text-[11px] tracking-[0.5em] text-amber-600">✦ ✦ ✦</p>
            <p className="font-['IM_Fell_English'] text-[13px] italic tracking-widest text-amber-800/55">
              By Order of the Allied General Staff
            </p>
            <div className="mt-6">
              <a
                href="/privacy"
                className="inline-block font-[Cinzel] text-[9px] font-bold uppercase tracking-widest text-amber-800/50 border-b border-amber-700/30 pb-0.5 transition-all hover:text-amber-800 hover:border-amber-700"
              >
                Privacy Policy &amp; Terms of Service
              </a>
            </div>
          </footer>

        </div>
      </main>
    </>
  );
}

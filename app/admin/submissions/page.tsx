// app/admin/submissions/page.tsx
"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { toast, Toaster } from "sonner";
import DeleteModal from "@/components/DeleteModal";

type Submission = {
  id:                string;
  name:              string;
  rank:              string;
  regiment:          string;
  years_of_service:  number;
  status:            "pending" | "approved" | "rejected";
  profile_photo_url: string | null;
  submitted_at:      string | null;
  session_id:        string | null;
  categories:        { name: string; color: string } | null;
};

type RawSubmission = Omit<Submission, "categories"> & {
  categories: { name: string; color: string }[] | { name: string; color: string } | null;
};

function normalizeSubmission(raw: RawSubmission): Submission {
  const cat = Array.isArray(raw.categories) ? raw.categories[0] : raw.categories;
  return { ...raw, categories: cat ?? null };
}

const STATUS_FILTER = ["all", "pending", "approved", "rejected"] as const;
type StatusFilter = typeof STATUS_FILTER[number];

export default function AdminSubmissionsPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  const [user, setUser]             = useState<any>(null);
  const [isAdmin, setIsAdmin]       = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading]         = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Delete modal state
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; id: string; name: string }>({
    open: false, id: "", name: "",
  });
  const [isDeleting, setIsDeleting] = useState(false);

  // Admin emails list — must match server side
  const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? "").split(",").map((e) => e.trim()).filter(Boolean);

  // ── Auth check ───────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user;
      setUser(u);
      // Check admin by email
      const adminList = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? "itsamexerican55@gmail.com")
        .split(",").map((e) => e.trim());
      if (u && adminList.includes(u.email ?? "")) {
        setIsAdmin(true);
      }
      setAuthLoading(false);
    });
  }, []);

  // Redirect non-admins
  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      router.push("/");
    }
  }, [authLoading, user, isAdmin, router]);

  // ── Handle email approve/reject links ────────────────────────────────────
  useEffect(() => {
    const action  = searchParams.get("action");
    const id      = searchParams.get("id");
    const success = searchParams.get("success");
    const error   = searchParams.get("error");

    if (success === "approve") toast.success("Officer approved successfully.", { duration: 4000 });
    if (success === "reject")  toast.success("Submission rejected.", { duration: 4000 });
    if (error)                 toast.error(`Error: ${error}`, { duration: 6000 });

    if (action && id && isAdmin) {
      handleApproveReject(id, action as "approve" | "reject");
    }
  }, [searchParams, isAdmin]);

  // ── Fetch submissions ────────────────────────────────────────────────────
  async function fetchSubmissions() {
    setLoading(true);
    const query = supabase
      .from("cards")
      .select("id, name, rank, regiment, years_of_service, status, profile_photo_url, submitted_at, session_id, categories ( name, color )")
      .order("submitted_at", { ascending: false });

    const { data, error } = statusFilter === "all"
      ? await query
      : await query.eq("status", statusFilter);

    if (error) {
      toast.error("Failed to load submissions.", { duration: 6000 });
    } else if (data) {
      setSubmissions((data as RawSubmission[]).map(normalizeSubmission));
    }
    setLoading(false);
  }

  useEffect(() => {
    if (isAdmin) fetchSubmissions();
  }, [isAdmin, statusFilter]);

  // ── Approve / Reject ─────────────────────────────────────────────────────
  async function handleApproveReject(id: string, action: "approve" | "reject") {
    setActionLoading(id + action);
    try {
      const res  = await fetch("/api/admin/approve", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ id, action }),
      });
      const json = await res.json();

      if (!res.ok) {
        toast.error(json.error ?? "Action failed.", { duration: 6000 });
      } else {
        toast.success(
          action === "approve" ? "Officer approved and published." : "Submission rejected.",
          { duration: 4000 }
        );
        fetchSubmissions();
      }
    } catch {
      toast.error("Network error.", { duration: 6000 });
    } finally {
      setActionLoading(null);
    }
  }

  // ── Delete ───────────────────────────────────────────────────────────────
  async function handleDelete() {
    setIsDeleting(true);
    try {
      const res  = await fetch("/api/admin/delete", {
        method:  "DELETE",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ id: deleteModal.id }),
      });
      const json = await res.json();

      if (!res.ok) {
        toast.error(json.error ?? "Delete failed.", { duration: 6000 });
      } else {
        toast.success(json.message ?? "Record deleted.", { duration: 4000 });
        setDeleteModal({ open: false, id: "", name: "" });
        fetchSubmissions();
      }
    } catch {
      toast.error("Network error.", { duration: 6000 });
    } finally {
      setIsDeleting(false);
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: "#f0deb4" }}>
        <p className="font-['IM_Fell_English'] text-lg italic text-amber-800/60">Verifying credentials…</p>
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <>
      <Toaster position="top-center" richColors />
      <DeleteModal
        isOpen={deleteModal.open}
        cardName={deleteModal.name}
        onCancel={() => setDeleteModal({ open: false, id: "", name: "" })}
        onConfirm={handleDelete}
        isDeleting={isDeleting}
      />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700;900&family=IM+Fell+English:ital@0;1&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      `}</style>

      <main
        className="min-h-screen px-6 py-10"
        style={{
          backgroundColor: "#f0deb4",
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='400' height='400' filter='url(%23noise)' opacity='0.07'/%3E%3C/svg%3E")`,
        }}
      >
        <div className="mx-auto max-w-5xl">

          {/* Back link */}
          <a href="/" className="mb-6 inline-block font-[Cinzel] text-[10px] font-bold uppercase tracking-widest text-amber-800/60 border-b border-amber-700/30 pb-0.5 transition-all hover:text-amber-800">
            ← Return to Roster
          </a>

          {/* Header */}
          <header
            className="relative mb-8 border-2 border-amber-700/50 px-8 py-7 text-center"
            style={{ background: "rgba(253,246,227,0.85)", boxShadow: "inset 0 0 40px rgba(139,109,56,0.07)" }}
          >
            <div className="pointer-events-none absolute inset-2 border border-amber-700/20" />
            <p className="mb-2 font-[Cinzel] text-[11px] tracking-[0.5em] text-amber-600">✦ ✦ ✦</p>
            <h1 className="font-[Cinzel] text-2xl font-black uppercase tracking-widest text-[#2c1810]">
              General Staff — Submissions Review
            </h1>
            <p className="mt-2 font-['IM_Fell_English'] text-[14px] italic text-amber-800/70">
              Signed in as: {user?.email}
            </p>
            <p className="mt-2 font-[Cinzel] text-[11px] tracking-[0.5em] text-amber-600">✦ ✦ ✦</p>
          </header>

          {/* Status filter tabs */}
          <div className="mb-6 flex flex-wrap justify-center gap-2">
            {STATUS_FILTER.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={[
                  "cursor-pointer rounded-sm px-4 py-1.5 font-[Cinzel] text-[10px] font-bold uppercase tracking-widest transition-all",
                  statusFilter === s
                    ? "bg-[#2c1810] text-amber-100 shadow"
                    : "border border-amber-700/30 bg-amber-50 text-amber-800/70 hover:bg-amber-100",
                ].join(" ")}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Submissions list */}
          {loading ? (
            <div className="py-16 text-center font-['IM_Fell_English'] text-lg italic text-amber-800/60">
              Consulting the rolls…
            </div>
          ) : submissions.length === 0 ? (
            <div className="py-16 text-center font-['IM_Fell_English'] text-lg italic text-amber-800/60">
              No {statusFilter === "all" ? "" : statusFilter} submissions found.
            </div>
          ) : (
            <div className="space-y-4">
              {submissions.map((s) => (
                <div
                  key={s.id}
                  className="border border-amber-700/30 p-5"
                  style={{ background: "rgba(253,246,227,0.85)" }}
                >
                  <div className="flex items-start gap-4">

                    {/* Avatar */}
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full border-2 border-amber-700/40 bg-amber-100">
                      {s.profile_photo_url ? (
                        <img src={s.profile_photo_url} alt={s.name} className="h-full w-full object-cover" />
                      ) : (
                        <img
                          src={`https://api.dicebear.com/7.x/personas/svg?seed=${encodeURIComponent(s.name)}&backgroundColor=b6e3f4,c0aede`}
                          alt={s.name}
                          className="h-full w-full object-cover"
                        />
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className="font-[Cinzel] text-[13px] font-bold text-[#2c1810]">{s.name}</h3>
                        <span className={[
                          "rounded-sm px-2 py-0.5 font-[Cinzel] text-[8px] font-bold uppercase tracking-widest",
                          s.status === "pending"  ? "bg-amber-100 text-amber-800 border border-amber-700/30" :
                          s.status === "approved" ? "bg-green-100 text-green-800 border border-green-700/30" :
                                                    "bg-red-100 text-red-800 border border-red-700/30",
                        ].join(" ")}>
                          {s.status}
                        </span>
                      </div>

                      <p className="font-['IM_Fell_English'] text-[12px] text-amber-800/70">
                        {s.rank} · {s.regiment} · {s.categories?.name ?? "Unknown"}
                      </p>
                      <p className="mt-0.5 font-['IM_Fell_English'] text-[11px] italic text-amber-700/50">
                        {s.years_of_service} yrs service
                        {s.submitted_at ? ` · Submitted ${new Date(s.submitted_at).toLocaleDateString()}` : ""}
                      </p>
                      {s.session_id && (
                        <p className="mt-0.5 font-mono text-[9px] text-amber-700/40">
                          ID: {s.session_id}
                        </p>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex shrink-0 flex-col gap-2 items-end">
                      {s.status === "pending" && (
                        <>
                          <button
                            onClick={() => handleApproveReject(s.id, "approve")}
                            disabled={actionLoading === s.id + "approve"}
                            className="cursor-pointer rounded-sm bg-green-700 px-3 py-1.5 font-[Cinzel] text-[9px] font-bold uppercase tracking-widest text-white transition-all hover:bg-green-800 disabled:opacity-50"
                          >
                            {actionLoading === s.id + "approve" ? "…" : "Approve"}
                          </button>
                          <button
                            onClick={() => handleApproveReject(s.id, "reject")}
                            disabled={actionLoading === s.id + "reject"}
                            className="cursor-pointer rounded-sm bg-amber-700 px-3 py-1.5 font-[Cinzel] text-[9px] font-bold uppercase tracking-widest text-white transition-all hover:bg-amber-800 disabled:opacity-50"
                          >
                            {actionLoading === s.id + "reject" ? "…" : "Reject"}
                          </button>
                        </>
                      )}
                      {s.status === "approved" && (
                        <button
                          onClick={() => handleApproveReject(s.id, "reject")}
                          disabled={!!actionLoading}
                          className="cursor-pointer rounded-sm border border-amber-700/30 bg-amber-50 px-3 py-1.5 font-[Cinzel] text-[9px] font-bold uppercase tracking-widest text-amber-800/70 hover:bg-amber-100 disabled:opacity-50"
                        >
                          Revoke
                        </button>
                      )}
                      {s.status === "rejected" && (
                        <button
                          onClick={() => handleApproveReject(s.id, "approve")}
                          disabled={!!actionLoading}
                          className="cursor-pointer rounded-sm border border-green-700/30 bg-green-50 px-3 py-1.5 font-[Cinzel] text-[9px] font-bold uppercase tracking-widest text-green-800/70 hover:bg-green-100 disabled:opacity-50"
                        >
                          Re-approve
                        </button>
                      )}
                      <button
                        onClick={() => setDeleteModal({ open: true, id: s.id, name: s.name })}
                        className="cursor-pointer rounded-sm bg-red-700 px-3 py-1.5 font-[Cinzel] text-[9px] font-bold uppercase tracking-widest text-white transition-all hover:bg-red-800"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      </main>
    </>
  );
}

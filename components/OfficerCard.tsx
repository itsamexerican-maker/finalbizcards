// components/OfficerCard.tsx
"use client";

import Image from "next/image";

export type Officer = {
  id: string;
  name: string;
  rank: string;
  regiment: string;
  years_of_service: number;
  profile_photo_url?: string | null;
  categories: {
    name: string;
    color: string;
  };
};

const RANK_ABBR: Record<string, string> = {
  "Colonel":            "COL.",
  "Lieutenant Colonel": "LT. COL.",
  "Major":              "MAJ.",
};

const BORDER_COLOR: Record<string, string> = {
  "bg-blue-800":   "border-blue-800",
  "bg-gray-700":   "border-gray-700",
  "bg-indigo-700": "border-indigo-700",
  "bg-yellow-600": "border-yellow-600",
  "bg-green-700":  "border-green-700",
  "bg-slate-600":  "border-slate-600",
  "bg-red-700":    "border-red-700",
  "bg-amber-700":  "border-amber-700",
};

const DIVIDER_COLOR: Record<string, string> = {
  "bg-blue-800":   "bg-blue-800",
  "bg-gray-700":   "bg-gray-700",
  "bg-indigo-700": "bg-indigo-700",
  "bg-yellow-600": "bg-yellow-600",
  "bg-green-700":  "bg-green-700",
  "bg-slate-600":  "bg-slate-600",
  "bg-red-700":    "bg-red-700",
  "bg-amber-700":  "bg-amber-700",
};

const TEXT_COLOR: Record<string, string> = {
  "bg-blue-800":   "text-blue-800",
  "bg-gray-700":   "text-gray-700",
  "bg-indigo-700": "text-indigo-700",
  "bg-yellow-600": "text-yellow-600",
  "bg-green-700":  "text-green-700",
  "bg-slate-600":  "text-slate-600",
  "bg-red-700":    "text-red-700",
  "bg-amber-700":  "text-amber-700",
};

function getDiceBearUrl(name: string): string {
  const seed = encodeURIComponent(name);
  return `https://api.dicebear.com/7.x/personas/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
}

export default function OfficerCard({ officer }: { officer: Officer }) {
  const twColor      = officer.categories.color;
  const borderClass  = BORDER_COLOR[twColor]  ?? "border-stone-600";
  const dividerClass = DIVIDER_COLOR[twColor] ?? "bg-stone-600";
  const textClass    = TEXT_COLOR[twColor]    ?? "text-stone-600";
  const abbr         = RANK_ABBR[officer.rank] ?? officer.rank.toUpperCase();

  // Use uploaded photo if available, otherwise fall back to DiceBear
  const avatarSrc = officer.profile_photo_url ?? getDiceBearUrl(officer.name);
  const isRealPhoto = !!officer.profile_photo_url;

  return (
    <div
      className="group relative w-52 cursor-default rounded-sm border border-amber-700/40 bg-[#fdf6e3] shadow-md transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:-translate-y-2.5 hover:-rotate-1 hover:shadow-2xl"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='0.045'/%3E%3C/svg%3E")`,
      }}
    >
      {/* Country color header band */}
      <div className={`${twColor} flex items-center justify-between px-3 py-1.5`}>
        <span className="font-[Cinzel] text-[9px] font-bold tracking-widest text-white/95 uppercase">
          {abbr}
        </span>
        <span className="font-[Cinzel] text-[9px] font-semibold tracking-wider text-white/85 uppercase">
          {officer.categories.name}
        </span>
      </div>

      {/* Thin accent rule */}
      <div className={`mx-2.5 h-px ${dividerClass} opacity-30`} />

      {/* Avatar — real photo or DiceBear fallback */}
      <div
        className={`mx-auto mt-3.5 mb-2 flex h-[84px] w-[84px] items-center justify-center overflow-hidden rounded-full border-2 ${borderClass} bg-amber-50 shadow-md`}
      >
        {isRealPhoto ? (
          <img
            src={avatarSrc}
            alt={`Portrait of ${officer.name}`}
            className="h-full w-full object-cover"
          />
        ) : (
          <Image
            src={avatarSrc}
            alt={`Portrait of ${officer.name}`}
            width={84}
            height={84}
            className="h-full w-full object-cover"
            unoptimized
          />
        )}
      </div>

      {/* Card body */}
      <div className="px-4 pb-4 text-center">
        <h2 className="font-[Cinzel] mt-1.5 mb-2 text-[12.5px] font-bold leading-snug tracking-wide text-[#2c1810]">
          {officer.name}
        </h2>

        <div className={`mx-auto mb-2.5 h-px w-3/5 ${dividerClass} opacity-40`} />

        <dl className="flex flex-col gap-1 text-left">
          <div className="flex items-baseline justify-between gap-1.5 border-b border-dotted border-amber-700/30 pb-1">
            <dt className="font-['IM_Fell_English'] shrink-0 text-[9px] uppercase tracking-wider text-amber-800/70">Rank</dt>
            <dd className="font-[Cinzel] text-right text-[10px] font-semibold text-[#2c1810]">{officer.rank}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-1.5 border-b border-dotted border-amber-700/30 pb-1">
            <dt className="font-['IM_Fell_English'] shrink-0 text-[9px] uppercase tracking-wider text-amber-800/70">Regiment</dt>
            <dd className="font-[Cinzel] text-right text-[10px] font-semibold text-[#2c1810]">{officer.regiment}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-1.5 pb-1">
            <dt className="font-['IM_Fell_English'] shrink-0 text-[9px] uppercase tracking-wider text-amber-800/70">Yrs. Service</dt>
            <dd className="font-[Cinzel] text-right text-[10px] font-semibold text-[#2c1810]">{officer.years_of_service}</dd>
          </div>
        </dl>
      </div>

      {/* Corner ornaments */}
      <span className={`absolute top-7 left-1.5 text-[8px] leading-none ${textClass} opacity-50`}>✦</span>
      <span className={`absolute top-7 right-1.5 text-[8px] leading-none ${textClass} opacity-50`}>✦</span>
      <span className={`absolute bottom-1.5 left-1.5 text-[8px] leading-none ${textClass} opacity-50`}>✦</span>
      <span className={`absolute right-1.5 bottom-1.5 text-[8px] leading-none ${textClass} opacity-50`}>✦</span>
    </div>
  );
}

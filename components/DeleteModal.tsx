// components/DeleteModal.tsx
"use client";

type DeleteModalProps = {
  isOpen:    boolean;
  cardName:  string;
  onCancel:  () => void;
  onConfirm: () => void;
  isDeleting: boolean;
};

export default function DeleteModal({
  isOpen,
  cardName,
  onCancel,
  onConfirm,
  isDeleting,
}: DeleteModalProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center"
        style={{ backgroundColor: "rgba(44, 24, 16, 0.6)", backdropFilter: "blur(2px)" }}
        onClick={onCancel}
      >
        {/* Modal panel */}
        <div
          className="relative mx-4 w-full max-w-md border-2 border-amber-700/60 p-8"
          style={{
            background: "#fdf6e3",
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E")`,
            boxShadow: "0 24px 64px rgba(0,0,0,0.35)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Inner border */}
          <div className="pointer-events-none absolute inset-2 border border-amber-700/20" />

          {/* Warning icon */}
          <div className="mb-4 flex justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-red-700/40 bg-red-50">
              <span className="text-xl text-red-700">⚠</span>
            </div>
          </div>

          {/* Title */}
          <h2 className="mb-3 text-center font-[Cinzel] text-[14px] font-bold uppercase tracking-widest text-[#2c1810]">
            Delete Officer Record
          </h2>

          {/* Message */}
          <p className="mb-2 text-center font-['IM_Fell_English'] text-[14px] leading-relaxed text-[#3d2b1f]">
            Are you sure you want to permanently delete{" "}
            <strong>{cardName}</strong>'s record?
          </p>
          <p className="mb-8 text-center font-['IM_Fell_English'] text-[12px] italic text-amber-800/60">
            This action cannot be undone. The officer's record and portrait
            will be permanently removed from the roster.
          </p>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              disabled={isDeleting}
              className="flex-1 cursor-pointer rounded-sm border border-amber-700/30 bg-amber-50 py-2.5 font-[Cinzel] text-[10px] font-bold uppercase tracking-widest text-amber-900/70 transition-all hover:bg-amber-100 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isDeleting}
              className="flex-1 cursor-pointer rounded-sm bg-red-700 py-2.5 font-[Cinzel] text-[10px] font-bold uppercase tracking-widest text-white shadow transition-all hover:bg-red-800 disabled:opacity-50"
            >
              {isDeleting ? "Removing…" : "Delete Permanently"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

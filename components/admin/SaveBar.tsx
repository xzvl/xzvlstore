"use client";

export default function SaveBar({
  saving,
  message,
  error,
  onSave,
  label = "Save Section",
}: {
  saving: boolean;
  message: string;
  error: string;
  onSave: () => void;
  label?: string;
}) {
  return (
    <div className="flex items-center gap-4 sticky bottom-0 bg-deep/95 backdrop-blur-sm py-4 border-t border-line/30">
      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        className="hidden sm:inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-primary text-white text-[12px] font-medium hover:bg-primary/90 transition-colors shadow-sm"
      >
        {saving
          ? <span className="material-symbols-outlined animate-spin text-[14px]">progress_activity</span>
          : <span className="material-symbols-outlined text-[14px]">save</span>}
        {saving ? "Saving…" : label}
      </button>
      {message && (
        <span className="tabular-nums text-[11px] text-green-400 flex items-center gap-1">
          <span className="material-symbols-outlined text-[14px]">check_circle</span>
          {message}
        </span>
      )}
      {error && (
        <span className="tabular-nums text-[11px] text-red-400 flex items-center gap-1">
          <span className="material-symbols-outlined text-[14px]">error</span>
          {error}
        </span>
      )}
    </div>
  );
}

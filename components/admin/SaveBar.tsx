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
        className="flex items-center gap-2 px-5 py-2.5 bg-primary border border-primary text-white tabular-nums text-[11px] hover:bg-primary/90 transition-colors disabled:opacity-50 font-medium shadow-sm"
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

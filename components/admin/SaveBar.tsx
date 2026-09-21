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
    <div className="flex items-center gap-4 sticky bottom-0 bg-[#0e0e0e]/95 backdrop-blur-sm py-4 border-t border-[#603e39]/30">
      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        className="flex items-center gap-2 px-5 py-2.5 bg-primary/10 border border-primary text-primary font-mono text-[11px] tracking-widest uppercase hover:bg-primary/20 transition-colors disabled:opacity-50"
      >
        {saving
          ? <span className="material-symbols-outlined animate-spin text-[14px]">progress_activity</span>
          : <span className="material-symbols-outlined text-[14px]">save</span>}
        {saving ? "Saving…" : label}
      </button>
      {message && (
        <span className="font-mono text-[11px] text-green-400 flex items-center gap-1">
          <span className="material-symbols-outlined text-[14px]">check_circle</span>
          {message}
        </span>
      )}
      {error && (
        <span className="font-mono text-[11px] text-primary flex items-center gap-1">
          <span className="material-symbols-outlined text-[14px]">error</span>
          {error}
        </span>
      )}
    </div>
  );
}

"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect } from "react";

const btnBase =
  "px-2 py-1 font-mono text-[11px] border border-transparent transition-colors";
const btnActive = "border-primary text-primary bg-primary/10";
const btnIdle = "text-[#ebbbb4]/50 hover:text-[#e2e2e2] hover:border-[#603e39]/60";

export default function RichTextEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (html: string) => void;
}) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value || "",
    editorProps: {
      attributes: {
        class:
          "min-h-[120px] px-4 py-3 text-[#e2e2e2] font-mono text-[13px] leading-relaxed focus:outline-none prose prose-invert prose-sm max-w-none",
      },
    },
    onUpdate({ editor }) {
      const html = editor.getHTML();
      onChange(html === "<p></p>" ? "" : html);
    },
    immediatelyRender: false,
  });

  // Sync external value changes (e.g. when modal opens with existing product)
  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    const normalised = !value || value === "<p></p>" ? "" : value;
    const normalisedCurrent = current === "<p></p>" ? "" : current;
    if (normalisedCurrent !== normalised) {
      editor.commands.setContent(value || "", { emitUpdate: false });
    }
  }, [value, editor]);

  if (!editor) return null;

  const btn = (active: boolean, onClick: () => void, label: string) => (
    <button
      key={label}
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      className={`${btnBase} ${active ? btnActive : btnIdle}`}
      title={label}
    >
      {label}
    </button>
  );

  return (
    <div className="border border-[#603e39] focus-within:border-primary transition-colors bg-[#1f1f1f]">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-[#603e39]/50">
        {btn(editor.isActive("bold"), () => editor.chain().focus().toggleBold().run(), "B")}
        {btn(editor.isActive("italic"), () => editor.chain().focus().toggleItalic().run(), "I")}
        {btn(editor.isActive("strike"), () => editor.chain().focus().toggleStrike().run(), "S")}
        <span className="w-px h-4 bg-[#603e39]/40 mx-1" />
        {btn(editor.isActive("heading", { level: 2 }), () => editor.chain().focus().toggleHeading({ level: 2 }).run(), "H2")}
        {btn(editor.isActive("heading", { level: 3 }), () => editor.chain().focus().toggleHeading({ level: 3 }).run(), "H3")}
        <span className="w-px h-4 bg-[#603e39]/40 mx-1" />
        {btn(editor.isActive("bulletList"), () => editor.chain().focus().toggleBulletList().run(), "• List")}
        {btn(editor.isActive("orderedList"), () => editor.chain().focus().toggleOrderedList().run(), "1. List")}
        <span className="w-px h-4 bg-[#603e39]/40 mx-1" />
        {btn(false, () => editor.chain().focus().clearNodes().unsetAllMarks().run(), "Clear")}
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}

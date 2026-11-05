"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

const MESSENGER_URL = "https://m.me/xzviel";
const FACEBOOK_URL = "https://www.facebook.com/xzviel";

// Floating chat box (bottom-right) that hands the visitor off to the Facebook
// page's Messenger. Facebook retired its embeddable chat plugin, so the typed
// message is prefilled in m.me (and copied to the clipboard as a fallback).
export default function MessengerChat() {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin") ?? false;
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (isAdmin) return null;

  function send() {
    const text = message.trim();
    if (text) {
      navigator.clipboard?.writeText(text).catch(() => {});
    }
    const url = text ? `${MESSENGER_URL}?text=${encodeURIComponent(text)}` : MESSENGER_URL;
    window.open(url, "_blank", "noopener,noreferrer");
    setMessage("");
    setOpen(false);
  }

  return (
    <div className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-[90] flex flex-col items-end gap-3">
      {open && (
        <div
          role="dialog"
          aria-labelledby="messenger-chat-title"
          className="w-[calc(100vw-2rem)] max-w-[340px] bg-panel border border-line/40 shadow-2xl animate-fade-up"
        >
          <div className="flex items-start justify-between gap-4 px-4 py-3 border-b border-line/30">
            <div>
              <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-primary flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                Chat With Us
              </p>
              <h2 id="messenger-chat-title" className="font-inter font-black text-[16px] uppercase text-fg mt-0.5">
                xzvl.store
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-accent/40 hover:text-primary transition-colors"
              aria-label="Close chat"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          <div className="p-4 space-y-3">
            <div className="bg-deep border border-line/40 px-3 py-2.5">
              <p className="font-mono text-[12px] text-accent/70 leading-relaxed">
                Hi! Questions about an order or product? Send us a message and we&apos;ll reply on Messenger.
              </p>
            </div>
            <textarea
              ref={inputRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              rows={3}
              placeholder="Type your message…"
              className="w-full resize-none bg-deep border border-line/40 px-3 py-2 font-mono text-[12px] text-fg placeholder:text-accent/30 focus:outline-none focus:border-primary"
            />
          </div>

          <div className="px-4 pb-4 space-y-2">
            <button
              type="button"
              onClick={send}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-primary text-white font-mono text-[11px] tracking-widest uppercase hover:brightness-110 transition-all"
            >
              <span className="material-symbols-outlined text-[16px]">send</span>
              Send on Messenger
            </button>
            <a
              href={FACEBOOK_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-center font-mono text-[10px] tracking-widest uppercase text-accent/40 hover:text-primary transition-colors"
            >
              facebook.com/xzviel
            </a>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-14 h-14 rounded-full bg-primary text-white shadow-lg flex items-center justify-center hover:brightness-110 transition-all"
        aria-label={open ? "Close chat" : "Chat with us on Messenger"}
        aria-expanded={open}
      >
        <span className="material-symbols-outlined text-[26px]">{open ? "close" : "chat"}</span>
      </button>
    </div>
  );
}

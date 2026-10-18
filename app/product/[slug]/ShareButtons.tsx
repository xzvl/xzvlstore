"use client";

import { useEffect, useState } from "react";

const ICON_BTN =
  "w-8 h-8 flex items-center justify-center text-fg/40 hover:text-primary transition-colors";

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.149-.15.33-.39.495-.584.165-.195.219-.335.33-.557.11-.223.055-.419-.038-.567-.093-.148-.84-2.006-1.154-2.738-.3-.713-.608-.615-.836-.627-.213-.01-.457-.012-.701-.012-.244 0-.64.092-.973.46-.335.368-1.28 1.247-1.28 3.043 0 1.795 1.31 3.53 1.489 3.776.18.248 2.46 3.752 5.96 5.108 2.953 1.149 3.548 .923 4.19.865.64-.058 2.054-.838 2.343-1.648.288-.81.288-1.505.202-1.647-.085-.142-.297-.221-.595-.371z" />
      <path d="M12.04 2c-5.52 0-10 4.48-10 10 0 1.76.45 3.41 1.24 4.84L2 22l5.29-1.39c1.37.72 2.92 1.13 4.57 1.13h.01c5.52 0 10-4.48 10-10s-4.48-10-10-10zm0 18.17h-.01c-1.43 0-2.83-.38-4.05-1.1l-.29-.17-3.14.82.84-3.06-.19-.3a7.96 7.96 0 0 1-1.22-4.26c0-4.41 3.59-8 8.03-8 2.14 0 4.16.84 5.67 2.35a7.98 7.98 0 0 1 2.35 5.66c0 4.42-3.59 8.03-7.99 8.03z" />
    </svg>
  );
}

function TwitterIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

export default function ShareButtons({ path, title }: { path: string; title: string }) {
  const [url, setUrl] = useState(path);
  const [copied, setCopied] = useState(false);

  useEffect(() => { setUrl(`${window.location.origin}${path}`); }, [path]);

  const u = encodeURIComponent(url);
  const t = encodeURIComponent(title);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const el = document.createElement("textarea");
      el.value = url;
      document.body.appendChild(el);
      el.select();
      try { document.execCommand("copy"); } catch {}
      el.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="flex items-center gap-1">
      <a
        href={`https://www.facebook.com/sharer/sharer.php?u=${u}`}
        target="_blank"
        rel="noopener noreferrer"
        title="Share on Facebook"
        aria-label="Share on Facebook"
        className={ICON_BTN}
      >
        <FacebookIcon />
      </a>
      <a
        href={`https://wa.me/?text=${t}%20${u}`}
        target="_blank"
        rel="noopener noreferrer"
        title="Share on WhatsApp"
        aria-label="Share on WhatsApp"
        className={ICON_BTN}
      >
        <WhatsAppIcon />
      </a>
      <a
        href={`https://twitter.com/intent/tweet?url=${u}&text=${t}`}
        target="_blank"
        rel="noopener noreferrer"
        title="Share on Twitter"
        aria-label="Share on Twitter"
        className={ICON_BTN}
      >
        <TwitterIcon />
      </a>
      <button type="button" onClick={copyLink} title="Copy link" aria-label="Copy link" className={ICON_BTN}>
        <span className="material-symbols-outlined text-[16px]">{copied ? "check" : "link"}</span>
      </button>
    </div>
  );
}

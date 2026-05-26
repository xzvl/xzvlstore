import Link from "next/link";

export default function Home() {
  return (
    <main className="relative min-h-screen bg-[#131313] cyber-grid flex flex-col items-center justify-center px-4 overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 blur-[160px] rounded-full pointer-events-none" />
      <div className="absolute left-1/4 bottom-1/4 w-[300px] h-[300px] bg-primary/3 blur-[120px] rounded-full pointer-events-none" />

      {/* Top label */}
      <p
        className="font-mono text-[11px] tracking-[0.2em] uppercase text-primary mb-8 animate-fade-up"
        style={{ animationDelay: "0ms" }}
      >
        XZVL_STORE // INITIALIZING
      </p>

      {/* Main headline */}
      <h1
        className="font-inter font-black text-center uppercase leading-none tracking-tight animate-fade-up"
        style={{
          fontSize: "clamp(2.5rem, 8vw, 7rem)",
          animationDelay: "120ms",
        }}
      >
        <span className="text-[#e2e2e2]">xzvl</span>
        <span className="text-primary">.</span>
        <span className="text-[#e2e2e2]">store</span>
        <br />
        <span className="text-[#e2e2e2]/50 italic text-[0.55em]">
          is coming soon
        </span>
      </h1>

      {/* Divider */}
      <div
        className="flex items-center gap-4 my-10 w-full max-w-md animate-fade-up"
        style={{ animationDelay: "240ms" }}
      >
        <div className="flex-1 h-px bg-[#603e39]/60" />
        <span className="material-symbols-outlined text-primary text-[16px]">
          storefront
        </span>
        <div className="flex-1 h-px bg-[#603e39]/60" />
      </div>

      {/* Sub-text */}
      <p
        className="font-mono text-[13px] text-[#ebbbb4]/60 text-center max-w-sm leading-relaxed animate-fade-up"
        style={{ animationDelay: "320ms" }}
      >
        Something is being built. <br />
        Pre-orders are open now.
      </p>

      {/* CTA */}
      <div
        className="mt-10 animate-fade-up"
        style={{ animationDelay: "440ms" }}
      >
        <Link
          href="/pre-order"
          className="inline-flex items-center gap-3 px-10 py-4 bg-primary text-white font-mono text-[12px] tracking-[0.15em] uppercase hover:brightness-110 active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined text-[18px]">
            shopping_cart
          </span>
          Pre-Order Now
        </Link>
      </div>

      {/* Bottom bar */}
      <div
        className="absolute bottom-6 left-0 right-0 flex items-center justify-center gap-2 animate-fade-up"
        style={{ animationDelay: "560ms" }}
      >
        <span className="font-mono text-[10px] tracking-widest text-[#e2e2e2]/20 uppercase">
          © 2026 xzvl.store
        </span>
        <span className="text-primary text-[10px]">·</span>
        <span className="font-mono text-[10px] tracking-widest text-[#e2e2e2]/20 uppercase">
          All rights reserved
        </span>
      </div>
    </main>
  );
}

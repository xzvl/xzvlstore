"use client";

import { useState, useEffect, useCallback, type CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import type { HeroSlide } from "@/lib/site-content";
import { channels } from "@/lib/theme";

// A slide's dark and light colors as CSS variables. Inside a .hero-colors
// element, --hero-bg / --hero-fg resolve to the pair for the current mode
// (globals.css), so the server-rendered slider never needs to know the mode.
function slideVars(s: HeroSlide) {
  return {
    "--hero-bg-dark": channels(s.colors.dark.background),
    "--hero-fg-dark": channels(s.colors.dark.text),
    "--hero-bg-light": channels(s.colors.light.background),
    "--hero-fg-light": channels(s.colors.light.text),
  } as CSSProperties;
}

const bg = (alpha = 1) => `rgb(var(--hero-bg) / ${alpha})`;
const fg = (alpha = 1) => `rgb(var(--hero-fg) / ${alpha})`;

export default function HeroSlider({ slides }: { slides: HeroSlide[] }) {
  const [current, setCurrent] = useState(0);
  const [animating, setAnimating] = useState(false);
  const count = slides.length;

  const goTo = useCallback(
    (index: number) => {
      if (animating || index === current) return;
      setAnimating(true);
      setCurrent(index);
      setTimeout(() => setAnimating(false), 600);
    },
    [animating, current]
  );

  const next = useCallback(() => {
    goTo((current + 1) % count);
  }, [current, goTo, count]);

  useEffect(() => {
    if (count < 2) return;
    const id = setInterval(next, 5500);
    return () => clearInterval(id);
  }, [next, count]);

  if (count === 0) return null;

  const slide = slides[current];

  return (
    <section
      className="hero-colors relative overflow-hidden"
      style={{ ...slideVars(slide), minHeight: "88vh", backgroundColor: bg() }}
    >
      {/* Per-slide background: solid color + optional full-bleed image */}
      {slides.map((s, i) => (
        <div
          key={s.id}
          aria-hidden
          className="hero-colors absolute inset-0 pointer-events-none transition-opacity duration-700"
          style={{ ...slideVars(s), opacity: i === current ? 1 : 0, backgroundColor: bg() }}
        >
          {s.background && (
            <>
              <Image src={s.background} alt="" fill sizes="100vw" className="object-cover" priority={i === 0} />
              {/* Keeps the text readable on top of a busy background image */}
              <div
                className="absolute inset-0"
                style={{
                  background: `linear-gradient(to right, ${bg(0.9)}, ${bg(0.5)} 55%, ${bg(0.15)})`,
                }}
              />
            </>
          )}
        </div>
      ))}
      <div className="absolute inset-0 cyber-grid pointer-events-none" />

      {/* Right side image */}
      <div className="absolute inset-y-0 right-0 hidden md:block w-[60%] pointer-events-none">
        {slides.map((s, i) => (
          <div
            key={s.id}
            className="hero-colors absolute inset-0 transition-opacity duration-700"
            style={{ ...slideVars(s), opacity: i === current ? 1 : 0 }}
          >
            {s.image && (
              <div className="absolute inset-[7.5%]">
                <Image
                  src={s.image}
                  alt={s.titleWhite}
                  fill
                  sizes="60vw"
                  className="object-contain object-center"
                  priority={i === 0}
                />
              </div>
            )}
            {/* Gradient fade to left so image blends into the slide's background color */}
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(to right, ${bg()}, ${bg(0.4)} 50%, transparent)`,
              }}
            />
          </div>
        ))}
      </div>

      {/* Background glow */}
      <div
        className="absolute left-1/3 top-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full pointer-events-none blur-[160px] transition-opacity duration-700"
        style={{ background: "rgba(237,13,17,0.06)" }}
      />

      {/* Vertical red accent line */}
      <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-primary" />

      <div className="relative max-w-[1440px] mx-auto px-6 md:px-20 flex items-center" style={{ minHeight: "88vh" }}>
        {/* Left: text content */}
        <div
          key={current}
          className="animate-fade-up max-w-2xl"
        >
          {/* Tag */}
          {slide.tag && (
            <p className="font-mono text-[10px] tracking-[0.3em] uppercase text-primary mb-5">
              {slide.tag}
            </p>
          )}

          {/* Heading */}
          <h1
            className="font-inter font-black uppercase leading-[0.9] tracking-tight"
            style={{ fontSize: "clamp(3rem, 8vw, 6.5rem)", color: fg() }}
          >
            {slide.titleWhite}
            {slide.titleWhite && slide.titleRed && <br />}
            <span className="text-primary">{slide.titleRed}</span>
          </h1>

          {/* Divider */}
          <div className="flex items-center gap-4 my-7">
            <div className="w-12 h-px bg-primary" />
            <div className="flex-1 h-px" style={{ backgroundColor: fg(0.15) }} />
          </div>

          {/* Body */}
          {slide.description && (
            <p className="font-mono text-[13px] leading-relaxed max-w-md" style={{ color: fg(0.65) }}>
              {slide.description}
            </p>
          )}

          {/* CTA */}
          {slide.buttonLabel && (
            <div className="mt-8">
              <Link
                href={slide.buttonLink}
                className="inline-flex items-center gap-3 px-8 py-4 bg-primary text-white font-mono text-[11px] tracking-[0.2em] uppercase hover:brightness-110 active:scale-95 transition-all"
              >
                {slide.buttonLabel}
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </Link>
            </div>
          )}
        </div>
      </div>

      {count > 1 && (
        <>
          {/* Bottom controls */}
          <div className="absolute bottom-8 left-6 md:left-20 flex items-center gap-6">
            {/* Dots */}
            <div className="flex gap-2">
              {slides.map((s, i) => (
                <button
                  key={s.id}
                  onClick={() => goTo(i)}
                  aria-label={`Go to slide ${i + 1}`}
                  className={`transition-all duration-300 ${
                    i === current ? "w-8 h-[3px] bg-primary" : "w-3 h-[3px] opacity-25 hover:opacity-50"
                  }`}
                  style={i === current ? undefined : { backgroundColor: fg() }}
                />
              ))}
            </div>

            {/* Counter */}
            <span className="font-mono text-[10px]" style={{ color: fg(0.3) }}>
              {String(current + 1).padStart(2, "0")} / {String(count).padStart(2, "0")}
            </span>
          </div>

          {/* Nav arrows */}
          <div className="absolute bottom-6 right-6 md:right-20 flex gap-2">
            <button
              onClick={() => goTo((current - 1 + count) % count)}
              aria-label="Previous slide"
              className="w-10 h-10 border flex items-center justify-center hover:!border-primary hover:!text-primary transition-all"
              style={{ borderColor: fg(0.25), color: fg(0.45) }}
            >
              <span className="material-symbols-outlined text-[18px]">chevron_left</span>
            </button>
            <button
              onClick={() => goTo((current + 1) % count)}
              aria-label="Next slide"
              className="w-10 h-10 border flex items-center justify-center hover:!border-primary hover:!text-primary transition-all"
              style={{ borderColor: fg(0.25), color: fg(0.45) }}
            >
              <span className="material-symbols-outlined text-[18px]">chevron_right</span>
            </button>
          </div>
        </>
      )}
    </section>
  );
}

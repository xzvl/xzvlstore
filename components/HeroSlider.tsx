"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";

const slides = [
  {
    tag: "XZVL.STORE // 2026",
    heading: "Beyblade X",
    subheading: "The Next Generation",
    body: "Discover the Beyblade X. Authentic products from Takara Tomy and Hasbro, delivered to your door across the Philippines.",
    cta: "Shop Now",
    href: "/collection/all",
    accent: "#ed0d11",
    image: "/assets/shop-v2.webp",
  },
  {
    tag: "EXCLUSIVE // PRE-ORDER",
    heading: "Secure Your",
    subheading: "Next Blade",
    body: "Pre-order the latest releases before they sell out. Lock in your price today and get your Beyblade delivered on release day.",
    cta: "Pre-Order Now",
    href: "/pre-order",
    accent: "#ed0d11",
    image: "/assets/new-releases-v2.webp",
  },
  {
    tag: "PREMIUM // COLLECTION",
    heading: "Takara Tomy",
    subheading: "Official Series",
    body: "The official Japanese Beyblade brand trusted by champions worldwide. Browse our full Takara Tomy collection featuring BX, CX, and limited editions.",
    cta: "Browse Collection",
    href: "/collection/takara-tomy",
    accent: "#ed0d11",
    image: "/assets/takara-tomy-v2.webp",
  },
];

export default function HeroSlider() {
  const [current, setCurrent] = useState(0);
  const [animating, setAnimating] = useState(false);

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
    goTo((current + 1) % slides.length);
  }, [current, goTo]);

  useEffect(() => {
    const id = setInterval(next, 5500);
    return () => clearInterval(id);
  }, [next]);

  const slide = slides[current];

  return (
    <section className="relative overflow-hidden bg-[#0e0e0e] cyber-grid" style={{ minHeight: "88vh" }}>
      {/* Right side background image */}
      <div className="absolute inset-y-0 right-0 hidden md:block w-[60%] pointer-events-none">
        {slides.map((s, i) => (
          <div
            key={i}
            className="absolute inset-[7.5%] transition-opacity duration-700"
            style={{ opacity: i === current ? 1 : 0 }}
          >
            <Image
              src={s.image}
              alt={s.heading}
              fill
              sizes="60vw"
              className="object-contain object-center"
              priority={i === 0}
            />
          </div>
        ))}
        {/* Gradient fade to left so image blends into dark bg */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0e0e0e] via-[#0e0e0e]/40 to-transparent" />
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
          <p className="font-mono text-[10px] tracking-[0.3em] uppercase text-primary mb-5">
            {slide.tag}
          </p>

          {/* Heading */}
          <h1
            className="font-inter font-black uppercase leading-[0.9] tracking-tight text-[#e2e2e2]"
            style={{ fontSize: "clamp(3rem, 8vw, 6.5rem)" }}
          >
            {slide.heading}
            <br />
            <span className="text-primary">{slide.subheading}</span>
          </h1>

          {/* Divider */}
          <div className="flex items-center gap-4 my-7">
            <div className="w-12 h-px bg-primary" />
            <div className="flex-1 h-px bg-[#603e39]/40" />
          </div>

          {/* Body */}
          <p className="font-mono text-[13px] text-[#ebbbb4]/60 leading-relaxed max-w-md">
            {slide.body}
          </p>

          {/* CTA */}
          <div className="mt-8">
            <Link
              href={slide.href}
              className="inline-flex items-center gap-3 px-8 py-4 bg-primary text-white font-mono text-[11px] tracking-[0.2em] uppercase hover:brightness-110 active:scale-95 transition-all"
            >
              {slide.cta}
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Bottom controls */}
      <div className="absolute bottom-8 left-6 md:left-20 flex items-center gap-6">
        {/* Dots */}
        <div className="flex gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={`transition-all duration-300 ${
                i === current
                  ? "w-8 h-[3px] bg-primary"
                  : "w-3 h-[3px] bg-[#603e39]/60 hover:bg-[#603e39]"
              }`}
            />
          ))}
        </div>

        {/* Counter */}
        <span className="font-mono text-[10px] text-[#e2e2e2]/20">
          {String(current + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}
        </span>
      </div>

      {/* Nav arrows */}
      <div className="absolute bottom-6 right-6 md:right-20 flex gap-2">
        <button
          onClick={() => goTo((current - 1 + slides.length) % slides.length)}
          className="w-10 h-10 border border-[#603e39]/40 flex items-center justify-center text-[#e2e2e2]/40 hover:border-primary hover:text-primary transition-all"
        >
          <span className="material-symbols-outlined text-[18px]">chevron_left</span>
        </button>
        <button
          onClick={() => goTo((current + 1) % slides.length)}
          className="w-10 h-10 border border-[#603e39]/40 flex items-center justify-center text-[#e2e2e2]/40 hover:border-primary hover:text-primary transition-all"
        >
          <span className="material-symbols-outlined text-[18px]">chevron_right</span>
        </button>
      </div>
    </section>
  );
}

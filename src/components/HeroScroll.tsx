"use client";

import { useRef } from "react";
import Image from "next/image";
import {
  motion,
  useScroll,
  useTransform,
  useReducedMotion,
} from "motion/react";
import { Mic2, Music2, Clapperboard, Star } from "lucide-react";

const USES = [
  { icon: Mic2,         label: "VOCAL",   ko: "보컬" },
  { icon: Music2,       label: "DANCE",   ko: "댄스" },
  { icon: Clapperboard, label: "ACT",     ko: "연기" },
  { icon: Star,         label: "MUSICAL", ko: "뮤지컬" },
] as const;

export default function HeroScroll() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: wrapperRef,
    offset: ["start start", "end end"],
  });

  /* ── logo: fades out early ── */
  const logoScale   = useTransform(scrollYProgress, [0, 0.52], reduced ? [1, 1]       : [1, 0.28]);
  const logoY       = useTransform(scrollYProgress, [0, 0.52], reduced ? ["0%", "0%"] : ["0%", "-24%"]);
  const logoOpacity = useTransform(scrollYProgress, [0, 0.40], reduced ? [1, 1]       : [1, 0]);

  /* ── scroll hint ── */
  const hintOpacity = useTransform(scrollYProgress, [0, 0.16], [1, 0]);

  /* ── hero background: dark → brand-light ── */
  const heroBg = useTransform(
    scrollYProgress,
    [0.42, 0.92],
    reduced ? ["#0f0e0d", "#0f0e0d"] : ["#0f0e0d", "#F7F3EB"]
  );

  /* ── studio info: appears after logo fades, before card ── */
  const infoOpacity = useTransform(
    scrollYProgress,
    [0.30, 0.44, 0.54, 0.66],
    reduced ? [0, 0, 0, 0] : [0, 1, 1, 0]
  );
  const infoScale = useTransform(
    scrollYProgress,
    [0.30, 0.44],
    reduced ? [1, 1] : [0.96, 1]
  );

  /* ── ambient glow: fade out as bg brightens ── */
  const glowOpacity = useTransform(
    scrollYProgress,
    [0.38, 0.80],
    reduced ? [1, 1] : [1, 0]
  );

  /* ── preview card ── */
  const cardY = useTransform(
    scrollYProgress,
    [0.40, 0.88],
    reduced ? ["0px", "0px"] : ["88px", "0px"]
  );
  const cardOpacity = useTransform(
    scrollYProgress,
    [0.40, 0.84],
    reduced ? [1, 1] : [0, 1]
  );
  const cardBoxShadow = useTransform(
    scrollYProgress,
    [0.42, 0.92],
    [
      "0 -28px 72px rgba(0,0,0,0.60)",
      "0 -12px 32px rgba(0,0,0,0.08)",
    ]
  );

  return (
    <div ref={wrapperRef} className="relative h-[300vh]">

      {/* ───────── sticky hero ───────── */}
      <motion.div
        style={{ backgroundColor: heroBg }}
        className="sticky top-0 h-screen overflow-hidden flex items-center justify-center"
      >

        {/* ambient glow */}
        <motion.div
          style={{ opacity: glowOpacity }}
          className="pointer-events-none absolute inset-0"
          aria-hidden="true"
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[560px] w-[560px] rounded-full bg-[#B98768]/[0.08] blur-[130px]" />
          <div className="absolute top-1/4 right-1/3 h-[280px] w-[280px] rounded-full bg-[#B98768]/[0.05] blur-[100px]" />
          <div className="absolute bottom-1/4 left-1/3 h-[200px] w-[200px] rounded-full bg-[#c9a882]/[0.04] blur-[80px]" />
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E\")",
            }}
          />
        </motion.div>

        {/* ── logo ── */}
        <motion.div
          style={{ scale: logoScale, y: logoY, opacity: logoOpacity }}
          className="relative z-10 flex flex-col items-center select-none px-4"
        >
          <div className="mb-6 flex items-center gap-3">
            <span className="block h-px w-10 sm:w-16 bg-white/10" />
            <span className="text-[9px] font-semibold tracking-[0.55em] text-white/25 uppercase">
              Premium Practice Studio
            </span>
            <span className="block h-px w-10 sm:w-16 bg-white/10" />
          </div>

          <Image
            src="/logo.png"
            alt="A1STUDIO"
            width={400}
            height={400}
            priority
            className="w-36 sm:w-52 md:w-64 lg:w-80 h-auto"
            style={{ filter: "drop-shadow(0 2px 16px rgba(0,0,0,0.25))" }}
          />

          <p className="mt-5 text-[10px] sm:text-xs tracking-[0.5em] text-white/30 uppercase">
            Vocal&nbsp;·&nbsp;Dance&nbsp;·&nbsp;Act&nbsp;·&nbsp;Musical
          </p>

          <div className="mt-6 flex items-center gap-3">
            <span className="block h-px w-6 bg-white/10" />
            <span className="block h-1 w-1 rounded-full bg-[#B98768]/50" />
            <span className="block h-px w-6 bg-white/10" />
          </div>
        </motion.div>

        {/* ── studio info overlay ── */}
        <motion.div
          style={{ opacity: infoOpacity, scale: infoScale }}
          className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center px-6 pointer-events-none select-none"
        >
          <span className="text-[9px] font-semibold tracking-[0.55em] text-white/25 uppercase mb-8">
            Premium Practice Studio
          </span>

          <h2 className="text-5xl sm:text-6xl font-black tracking-tight text-white/90 mb-3">
            A1 STUDIO
          </h2>

          <p className="text-sm sm:text-base font-medium tracking-[0.3em] text-[#B98768]/80 uppercase mb-8">
            보컬&nbsp;·&nbsp;댄스&nbsp;·&nbsp;연기&nbsp;·&nbsp;뮤지컬 연습실
          </p>

          <span className="block h-px w-14 bg-white/10 mb-8" />

          <p className="text-xs sm:text-sm text-white/45 leading-relaxed">
            서울특별시 송파구 새말로 103, 지하1층 (문정동, 기백빌딩)
          </p>
          <p className="text-xs sm:text-sm text-white/35 mt-1">
            문정역 도보 8분&nbsp;·&nbsp;장지역 도보 10분
          </p>
          <p className="mt-4 text-[10px] sm:text-xs text-white/25 tracking-widest">
            전신거울&nbsp;·&nbsp;전자피아노&nbsp;·&nbsp;촬영용 조명 완비
          </p>
        </motion.div>

        {/* ── scroll indicator ── */}
        <motion.div
          style={{ opacity: hintOpacity }}
          className="absolute bottom-9 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2.5"
        >
          <span className="text-[9px] tracking-[0.45em] text-white/25 uppercase">Scroll</span>
          <div className="relative h-10 w-[18px] rounded-full border border-white/12 flex items-start justify-center pt-2">
            <motion.div
              animate={reduced ? {} : { y: [0, 12, 0] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
              className="h-1.5 w-0.5 rounded-full bg-white/25"
            />
          </div>
        </motion.div>

        {/* ── preview card ── */}
        <motion.div
          style={{ y: cardY, opacity: cardOpacity, boxShadow: cardBoxShadow }}
          className="absolute bottom-0 left-0 right-0 z-20 flex justify-center px-4 rounded-t-3xl"
        >
          <div className="w-full max-w-xl rounded-t-3xl bg-[#F7F3EB]">
            <div className="flex justify-center pt-3.5">
              <span className="block h-1 w-10 rounded-full bg-[#D8CCBC]" />
            </div>

            <div className="px-5 pt-4 pb-6 sm:px-7 sm:pt-5">
              <p className="text-center text-[9px] font-bold tracking-[0.5em] text-[#B98768] uppercase mb-4">
                One Space · Four Uses
              </p>

              <div className="grid grid-cols-4 gap-2 sm:gap-3">
                {USES.map(({ icon: Icon, label, ko }) => (
                  <div
                    key={label}
                    className="flex flex-col items-center gap-1.5 rounded-xl border border-[#D8CCBC]/70 bg-white/70 py-3 px-1"
                  >
                    <div className="rounded-full bg-[#B98768]/10 p-2">
                      <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-[#B98768]" />
                    </div>
                    <p className="text-[7px] sm:text-[9px] font-bold tracking-widest text-[#B98768] uppercase leading-none">
                      {label}
                    </p>
                    <p className="text-[10px] sm:text-xs font-semibold text-[#3B342F] leading-none">
                      {ko}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex justify-center">
                <motion.span
                  animate={reduced ? {} : { y: [0, 4, 0] }}
                  transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
                  className="text-[#B98768]/50 text-xs"
                  aria-hidden="true"
                >
                  ↓
                </motion.span>
              </div>
            </div>
          </div>
        </motion.div>

      </motion.div>
    </div>
  );
}

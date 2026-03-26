"use client";

import { motion } from "motion/react";
import { STUDIO_NAME, STUDIO_TAGLINE, STUDIO_DESCRIPTION } from "@/lib/constants";

export default function StudioIntro() {
  return (
    <motion.section
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: "-8%" }}
      transition={{ duration: 0.9, ease: "easeOut" }}
      className="bg-[#F7F3EB] py-24 text-center"
    >
      <div className="mx-auto max-w-2xl px-6">
        <p className="text-[10px] font-semibold tracking-[0.55em] text-[#B98768] uppercase mb-5">
          Premium Practice Studio
        </p>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[#3B342F]">
          {STUDIO_NAME}
        </h1>
        <p className="mt-4 text-lg sm:text-xl font-medium text-[#B98768]">
          {STUDIO_TAGLINE}
        </p>
        <p className="mt-5 text-sm sm:text-base leading-relaxed text-[#9b9189]">
          {STUDIO_DESCRIPTION}
          <br />
          전신거울·전자피아노·촬영용 조명 완비.
        </p>
      </div>
    </motion.section>
  );
}

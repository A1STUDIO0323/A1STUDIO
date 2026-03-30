"use client";

import { motion } from "motion/react";
import { STUDIO_NAME, STUDIO_TAGLINE, STUDIO_DESCRIPTION } from "@/lib/constants";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.75, ease: [0.22, 1, 0.36, 1], delay: i * 0.13 },
  }),
};

export default function StudioIntro() {
  return (
    <motion.section
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-8%" }}
      className="bg-[#F7F3EB] py-24 text-center"
    >
      <div className="mx-auto max-w-2xl px-6">
        <motion.p
          custom={0}
          variants={fadeUp}
          className="text-[10px] font-semibold tracking-[0.55em] text-[#B98768] uppercase mb-5"
        >
          Premium Practice Studio
        </motion.p>
        <motion.h1
          custom={1}
          variants={fadeUp}
          className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[#3B342F]"
        >
          {STUDIO_NAME}
        </motion.h1>
        <motion.p
          custom={2}
          variants={fadeUp}
          className="mt-4 text-lg sm:text-xl font-medium text-[#B98768]"
        >
          {STUDIO_TAGLINE}
        </motion.p>
        <motion.p
          custom={3}
          variants={fadeUp}
          className="mt-5 text-sm sm:text-base leading-relaxed text-[#9b9189]"
        >
          {STUDIO_DESCRIPTION}
          <br />
          전신거울·전자피아노·촬영용 조명 완비.
        </motion.p>
      </div>
    </motion.section>
  );
}

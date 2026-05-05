import { Metadata } from "next";
import AboutSection from "@/components/home/AboutSection";

export const metadata: Metadata = {
  title: "대표 소개 | A1 STUDIO",
  description: "A1 STUDIO 대표 소개",
};

export default function CeoPage() {
  return (
    <div className="min-h-screen bg-[#F7F3EB]">
      <AboutSection />
    </div>
  );
}

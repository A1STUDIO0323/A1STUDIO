import { Metadata } from "next";
import GallerySection from "@/components/home/GallerySection";

export const metadata: Metadata = {
  title: "공간 소개 | A1 STUDIO",
  description: "A1 STUDIO 연습실 공간 소개",
};

export default function SpacePage() {
  return (
    <div className="min-h-screen bg-[#F7F3EB]">
      <GallerySection />
    </div>
  );
}
